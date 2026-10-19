const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function measureHand(points) {
  if (!Array.isArray(points) || points.length < 21 || points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const palm = Math.max(distance(points[5], points[17]), 0.025);
  const fingers = [[8, 6, 5], [12, 10, 9], [16, 14, 13], [20, 18, 17]].map(([tip, pip, mcp]) => {
    const wristRatio = distance(points[tip], points[0]) / Math.max(distance(points[mcp], points[0]), 0.025);
    const separation = distance(points[tip], points[mcp]) / palm;
    const straight = distance(points[tip], points[0]) > distance(points[pip], points[0]) * 1.11 && separation > 0.62;
    return { extended: straight, amount: clamp((wristRatio - 1.06) / 1.05) };
  });
  const pinchRatio = distance(points[4], points[8]) / palm;
  const index = fingers[0].extended, middle = fingers[1].extended;
  const ring = fingers[2].extended, little = fingers[3].extended;
  const pinch = pinchRatio < 0.36 && (fingers.some(finger => finger.extended) || distance(points[8], points[0]) > distance(points[5], points[0]) * 1.05);
  const victory = index && middle && !ring && !little && distance(points[8], points[12]) / palm > 0.45 && !pinch;
  const pointing = index && !middle && !ring && !little && !pinch;
  const thumbUp = !index && !middle && !ring && !little && points[4].y < points[5].y - palm * 0.2 && points[4].y < points[3].y - palm * 0.15 && distance(points[4], points[2]) > palm * 0.65;
  let pose = 'palm';
  if (pinch) pose = 'pinch';
  else if (victory) pose = 'victory';
  else if (pointing) pose = 'point';
  else if (thumbUp) pose = 'thumb';
  const openness = fingers.reduce((sum, finger) => sum + finger.amount, 0) / 4;
  if (pose === 'palm' && openness < 0.25) pose = 'fist';
  const center = { x: (points[0].x + points[5].x + points[17].x) / 3, y: (points[0].y + points[9].y) / 2 };
  return {
    pose, openness, pinch, palm,
    x: clamp(1 - center.x), y: clamp(center.y),
    pointer: { x: clamp(1 - points[8].x), y: clamp(points[8].y) },
    grab: { x: clamp(1 - (points[8].x + points[4].x) / 2), y: clamp((points[8].y + points[4].y) / 2) },
    roll: Math.atan2(points[5].y - points[17].y, points[5].x - points[17].x),
  };
}

export class PoseConfirmation {
  constructor(duration = 750) { this.duration = duration; this.pose = null; this.since = 0; this.fired = false; }
  update(pose, time) {
    if (!['victory', 'thumb'].includes(pose)) { this.reset(); return { progress: 0, action: null }; }
    if (pose !== this.pose) { this.pose = pose; this.since = time; this.fired = false; }
    const progress = clamp((time - this.since) / this.duration);
    if (progress === 1 && !this.fired) { this.fired = true; return { progress, action: pose === 'victory' ? 'next' : 'freeze' }; }
    return { progress, action: null };
  }
  reset() { this.pose = null; this.fired = false; this.since = 0; }
}

export class GestureCamera {
  constructor({ video, overlay, onStatus, onHands, onError }) {
    Object.assign(this, { video, overlay, onStatus, onHands, onError });
    this.running = false; this.starting = false; this.sequence = 0; this.stream = null;
    this.frame = null; this.model = null; this.lastVideoTime = -1; this.lastInference = 0;
    this.confirmation = new PoseConfirmation();
    this.handleVisibility = () => { if (document.hidden && (this.running || this.starting)) this.stop(); };
    document.addEventListener('visibilitychange', this.handleVisibility);
  }
  async loadModel() {
    if (this.model) return this.model;
    if (this.modelLoading) return this.modelLoading;
    this.modelLoading=this.createModel();
    try { return await this.modelLoading; }
    finally { this.modelLoading=null; }
  }
  async createModel() {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks('/vision');
    const options = {
      baseOptions: { modelAssetPath: '/models/hand_landmarker.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 2,
      minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.55,
    };
    try { this.model = await HandLandmarker.createFromOptions(vision, options); }
    catch { options.baseOptions.delegate = 'CPU'; this.model = await HandLandmarker.createFromOptions(vision, options); }
    return this.model;
  }
  async start() {
    if (this.running || this.starting) return;
    const sequence = ++this.sequence;
    this.starting = true;
    this.onStatus({ state: 'permission', text: '请允许摄像头访问' });
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('需要 HTTPS 或 localhost 才能开启摄像头'), { name: 'InsecureContext' });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false,
      });
      if (sequence !== this.sequence) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      this.onStatus({ state: 'loading', text: '正在准备手势识别' });
      await this.loadModel();
      if (sequence !== this.sequence) return;
      this.running = true; this.starting = false;
      this.lastVideoTime = -1;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (this.running) this.stop(); }, { once: true });
      this.onStatus({ state: 'ready', text: '举起一只手，让世界回应你' });
      this.tick();
    } catch (error) {
      if (sequence !== this.sequence) return;
      this.stop(false);
      const errors = {
        NotAllowedError: '摄像头未获授权。请在浏览器地址栏允许摄像头，再试一次。',
        NotFoundError: '没有找到摄像头。你仍然可以拖动、双指缩放和点击游玩。',
        NotReadableError: '摄像头正被其他应用占用，请关闭占用它的应用后重试。',
        OverconstrainedError: '当前摄像头不支持这个拍摄模式，请尝试其他浏览器。',
        InsecureContext: '请通过 HTTPS 网站或本机 localhost 打开，再开启摄像头。',
      };
      this.onStatus({ state: 'error', text: '摄像头暂未开启' });
      this.onError(errors[error.name] || '手势识别暂时未能加载，请检查网络后重试。');
    }
  }
  tick() {
    if (!this.running) return;
    this.frame = requestAnimationFrame(() => this.tick());
    const now = performance.now();
    const interval = matchMedia('(pointer: coarse)').matches ? 90 : 66;
    if (now - this.lastInference < interval || this.video.currentTime === this.lastVideoTime || this.video.readyState < 2) return;
    this.lastInference = now; this.lastVideoTime = this.video.currentTime;
    try {
      const result = this.model.detectForVideo(this.video, now);
      const hands = result.landmarks.map(measureHand).filter(Boolean);
      const confirmation = this.confirmation.update(hands.length===1?hands[0]?.pose:null, now);
      this.onHands({ hands, confirmation, time: now });
      this.drawLandmarks(result.landmarks);
    } catch (error) {
      if (!this.inferenceFailed) { this.inferenceFailed = true; console.warn('Hand inference failed', error); this.onError('手势识别暂时中断，关闭摄像头后可以重新开启。'); }
    }
  }
  drawLandmarks(hands) {
    const canvas = this.overlay;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e6d0ae'; ctx.fillStyle = '#fff2d6'; ctx.lineWidth = 1.6;
    const lines = [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17],[5,17]];
    hands.forEach(points => {
      lines.forEach(line => { ctx.beginPath(); line.forEach((i,j) => { const p=points[i]; if(j===0)ctx.moveTo(p.x*w,p.y*h);else ctx.lineTo(p.x*w,p.y*h); }); ctx.stroke(); });
      points.forEach(p => { ctx.beginPath(); ctx.arc(p.x*w,p.y*h,2,0,Math.PI*2); ctx.fill(); });
    });
  }
  stop(notify = true) {
    ++this.sequence; this.running = false; this.starting = false;
    cancelAnimationFrame(this.frame); this.frame = null;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.video.pause(); this.video.srcObject = null;
    this.confirmation.reset(); this.inferenceFailed = false;
    this.overlay.getContext('2d').clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.onHands({ hands: [], confirmation: { progress: 0, action: null }, time: performance.now() });
    if (notify) this.onStatus({ state: 'off', text: '摄像头已关闭' });
  }
  dispose() { this.stop(); this.model?.close(); document.removeEventListener('visibilitychange', this.handleVisibility); }
}
