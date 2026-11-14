import {checkAbort,downloadBinary} from './asset-loader.js';
import {GestureFeedback} from './gesture-feedback.js';
import {HandSignalFilter} from './hand-filter.js';
import {GestureContinuity,InferencePacer,inferenceInterval} from './gesture-motion.js';

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const handConnections = [[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17],[5,17]];

export function measureHand(points, aspect = 1) {
  if (!Array.isArray(points) || points.length < 21 || points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
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
    pose, openness, pinch, pinchRatio, palm,
    x: clamp(1 - center.x), y: clamp(center.y),
    pointer: { x: clamp(1 - points[8].x), y: clamp(points[8].y) },
    grab: { x: clamp(1 - (points[8].x + points[4].x) / 2), y: clamp((points[8].y + points[4].y) / 2) },
    roll: Math.atan2(points[5].y - points[17].y, (points[5].x - points[17].x) * aspect),
  };
}

export class PoseConfirmation {
  constructor(duration = 750) { this.duration = duration; this.reset(); }
  update(pose, time, stale = false) {
    if (stale) {
      this.pausedSince ??= this.lastAt ?? time;
      return { progress: this.progress, action: null };
    }
    if (!['victory', 'thumb'].includes(pose)) { this.reset(); return { progress: 0, action: null }; }
    if (pose !== this.pose) {
      this.pose = pose;
      this.since = time;
      this.fired = false;
    } else if (this.pausedSince !== null) {
      this.since += time - this.pausedSince;
    }
    this.lastAt = time;
    this.pausedSince = null;
    const progress = clamp((time - this.since) / this.duration);
    this.progress = progress;
    if (progress === 1 && !this.fired) { this.fired = true; return { progress, action: pose === 'victory' ? 'next' : 'freeze' }; }
    return { progress, action: null };
  }
  reset() { this.pose = null; this.fired = false; this.since = 0; this.lastAt = this.pausedSince = null; this.progress = 0; }
}

export class GestureCamera {
  constructor({ video, overlay, onStatus, onHands, onError, onProgress=()=>{}, drawPreview=()=>true, mobile=false }) {
    Object.assign(this, { video, overlay, onStatus, onHands, onError, onProgress, drawPreview, mobile });
    this.feedback=new GestureFeedback();this.filter=new HandSignalFilter();this.continuity=new GestureContinuity();this.luminance=null;
    this.running = false; this.starting = false; this.sequence = 0; this.stream = null;
    this.inFlight = false;
    this.frame = null; this.model = null; this.lastVideoTime = -1; this.inferenceCost = 0; this.lastHandAt = -Infinity;
    this.pacer = new InferencePacer();
    this.overlayContext = overlay.getContext('2d');
    this.videoClock = typeof video.requestVideoFrameCallback === 'function' && typeof video.cancelVideoFrameCallback === 'function';
    this.confirmation = new PoseConfirmation();
    this.handleVisibility = () => { if (document.hidden && (this.running || this.starting)) this.stop(); };
    document.addEventListener('visibilitychange', this.handleVisibility);
  }
  async loadModel(signal,report) {
    if(this.model)return;
    if(this.modelLoading){try{await this.modelLoading;}catch{}checkAbort(signal);if(this.model)return;}
    const loading=this.createModel(signal,report);this.modelLoading=loading;
    try{return await loading;}finally{if(this.modelLoading===loading)this.modelLoading=null;}
  }
  async createModel(signal,report) {
    report({phase:'runtime',ratio:null});
    const loadBuffer=async()=>{
      const buffer=await downloadBinary('/models/hand_landmarker.task?v=1',{signal,expectedBytes:7819105,onProgress:p=>report({phase:'download',...p})});
      checkAbort(signal);
      report({phase:'initializing',ratio:null});
      return buffer;
    };
    let buffer=await loadBuffer();
    if (this.mobile && !this.useMainThread) {
      try {
        const { supportsHandWorker, openWorkerHandModel } = await import('./worker-hand-model.js');
        checkAbort(signal);
        if (supportsHandWorker()) {
          const model = await openWorkerHandModel(buffer, signal);
          if (signal.aborted) { model.close(); checkAbort(signal); }
          this.model = model;
          return;
        }
      } catch {
        checkAbort(signal);
        report({phase:'adjusting',ratio:null});
        if (!buffer.byteLength) buffer=await loadBuffer();
      }
      this.useMainThread = true;
    }
    const { createHandModel } = await import('./hand-model.js');
    checkAbort(signal);
    const model = await createHandModel(buffer, { signal, onFallback:()=>report({phase:'adjusting',ratio:null}) });
    if (signal.aborted) { model.close(); checkAbort(signal); }
    this.model = model;
  }
  async start() {
    if (this.running || this.starting) return;
    const sequence = ++this.sequence;
    const controller=new AbortController();this.startController=controller;
    this.starting = true;
    this.onStatus({ state: 'permission', text: '请允许摄像头访问' });
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('需要 HTTPS 或 localhost 才能开启摄像头'), { name: 'InsecureContext' });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: this.mobile ? 480 : 640 }, height: { ideal: this.mobile ? 360 : 480 }, frameRate: { ideal: 30, max: 30 } },
        audio: false,
      });
      if (sequence !== this.sequence) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (sequence !== this.sequence) return;
      this.onStatus({ state: 'loading', text: '正在准备手势识别' });
      await this.loadModel(controller.signal,progress=>{if(sequence===this.sequence)this.onProgress(progress);});
      if (sequence !== this.sequence) return;
      this.running = true; this.starting = false;
      this.lastVideoTime = -1;this.lastHandAt=-Infinity;this.inferenceCost=0;this.pacer.reset();this.feedback.reset(performance.now());this.filter.reset();this.continuity.reset();this.luminance=null;this.lastLightSample=0;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (sequence === this.sequence && this.running) this.stop(); }, { once: true });
      this.onStatus({ state: 'ready', text: '举起一只手，让世界回应你' });
      if (sequence === this.sequence) this.queueFrame();
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
      this.onError(errors[error.name] || '识别资源暂时未能准备好。可以重试或换用系统浏览器，也可以先直接探索。');
    } finally {if(this.startController===controller)this.startController=null;}
  }
  queueFrame() {
    const sequence = this.sequence;
    const next = (time, metadata) => { if (this.sequence === sequence) this.tick(time, metadata); };
    this.frame = this.videoClock ? this.video.requestVideoFrameCallback(next) : requestAnimationFrame(next);
  }
  tick(now = performance.now(), metadata) {
    if (!this.running) return;
    this.queueFrame();
    const videoTime = metadata?.mediaTime ?? this.video.currentTime;
    if (this.inFlight || this.video.readyState < 2 || videoTime === this.lastVideoTime) return;
    const worker = this.model?.usesWorker ? this.model : null;
    if (worker && !(this.video.videoWidth && this.video.videoHeight)) return;
    const interval = inferenceInterval(this.inferenceCost, this.mobile, now - this.lastHandAt < 220, Boolean(worker));
    if (!this.pacer.take(now, interval)) return;
    this.lastVideoTime = videoTime;
    if (worker) {
      void this.inferInWorker(worker, now);
      return;
    }
    try {
      const started = performance.now();
      const { landmarks } = this.model.detectForVideo(this.video, now);
      this.applyInference(landmarks, now, performance.now() - started, 'main', started);
    } catch (error) {
      this.inferenceFailed(error);
    }
  }
  async inferInWorker(worker, time) {
    const sequence = this.sequence;
    const started = performance.now();
    this.inFlight = true;
    try {
      const { landmarks, cost } = await worker.infer(this.video, time);
      if (sequence !== this.sequence) return;
      this.applyInference(landmarks, time, cost, 'worker', started);
    } catch (error) {
      if (sequence === this.sequence) {
        if (this.model === worker) await this.recoverInference(worker, sequence);
        else this.inferenceFailed(error);
      }
    } finally {
      if (sequence === this.sequence) this.inFlight = false;
    }
  }
  async recoverInference(worker, sequence) {
    worker.close();
    this.model = null;
    this.useMainThread = true;
    const controller = new AbortController();
    this.startController = controller;
    this.onHands({ hands: [], stopped: true, confirmation: { progress: 0, action: null }, time: performance.now() });
    try {
      if (sequence !== this.sequence) return;
      this.onProgress({phase:'adjusting',ratio:null});
      await this.loadModel(controller.signal, progress=>{if(sequence===this.sequence)this.onProgress(progress);});
      if (sequence !== this.sequence) return;
      this.pacer.reset();
      this.inferenceCost = 0;
      this.lastHandAt = -Infinity;
      this.filter.reset();
      this.continuity.reset();
      this.confirmation.reset();
      this.onStatus({state:'ready',text:'举起一只手，让世界回应你'});
    } catch (error) {
      if (sequence === this.sequence) this.inferenceFailed(error);
    } finally {
      if (this.startController === controller) this.startController = null;
    }
  }
  applyInference(landmarks, time, cost, mode, started) {
    const aspect = (this.video.videoWidth / this.video.videoHeight) || 1;
    const detected = this.filter.update(landmarks.map(points => measureHand(points, aspect)).filter(Boolean), time);
    if (detected.length) this.lastHandAt = time;
    const { hands, stale } = this.continuity.sample(detected, time);
    const confirmation = this.confirmation.update(hands.length === 1 ? hands[0].pose : null, time, stale);
    const guidance = this.feedback.update({time,hasHands:detected.length>0,luminance:detected.length ? null : this.sampleLight(time)});
    this.onHands({ hands, stale, confirmation, guidance, time });
    if (this.drawPreview()) this.drawLandmarks(landmarks);
    const deliveredAt = performance.now();
    this.inferenceCost += (Math.min(180, deliveredAt - started) - this.inferenceCost) * .28;
    this.onMeasure?.({time,deliveredAt,cost,tracked:detected.length>0,mode});
  }
  inferenceFailed(error) {
    console.warn('Hand inference failed', error);
    this.stop(false);
    this.onStatus({state:'error',text:'手势识别已暂停'});
    this.onError('手势识别暂时中断，摄像头已关闭。点击“重试手势”即可重新开启。');
  }
  sampleLight(now){
    if(now-(this.lastLightSample||0)<900)return this.luminance;
    this.lastLightSample=now;
    try{
      if(!this.lightCanvas){this.lightCanvas=document.createElement('canvas');this.lightCanvas.width=16;this.lightCanvas.height=12;this.lightContext=this.lightCanvas.getContext('2d',{willReadFrequently:true});}
      const ctx=this.lightContext;ctx.drawImage(this.video,0,0,16,12);const pixels=ctx.getImageData(0,0,16,12).data;let value=0;
      for(let i=0;i<pixels.length;i+=4)value+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
      this.luminance=value/(192*255);
    }catch{this.luminance=null;}
    return this.luminance;
  }
  drawLandmarks(hands) {
    const canvas = this.overlay;
    const ctx = this.overlayContext;
    if (!ctx || (!hands.length && !this.overlayHasHands)) return;
    this.overlayHasHands = hands.length > 0;
    const w = canvas.width, h = canvas.height;
    const videoWidth = this.video.videoWidth || w, videoHeight = this.video.videoHeight || h;
    const scale = Math.max(w / videoWidth, h / videoHeight);
    const drawW = videoWidth * scale, drawH = videoHeight * scale;
    const x = p => p.x * drawW + (w - drawW) / 2;
    const y = p => p.y * drawH + (h - drawH) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e6d0ae'; ctx.fillStyle = '#fff2d6'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const points of hands) for (const line of handConnections) {
      ctx.moveTo(x(points[line[0]]), y(points[line[0]]));
      for (let i=1;i<line.length;i++) ctx.lineTo(x(points[line[i]]), y(points[line[i]]));
    }
    ctx.stroke();
    ctx.beginPath();
    for (const points of hands) for (const p of points) {
      const px=x(p),py=y(p);
      ctx.moveTo(px+2,py);ctx.arc(px,py,2,0,Math.PI*2);
    }
    ctx.fill();
  }
  stop(notify = true) {
    ++this.sequence;this.startController?.abort();this.startController=null; this.running = false; this.starting = false;
    if (this.frame !== null) {
      if (this.videoClock) this.video.cancelVideoFrameCallback(this.frame);
      else cancelAnimationFrame(this.frame);
    }
    this.frame = null;
    if (this.model?.usesWorker) { this.model.close(); this.model = null; }
    this.inFlight = false;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.video.pause(); this.video.srcObject = null;
    this.confirmation.reset();this.filter.reset();this.continuity.reset();this.feedback.reset(0);this.luminance=null;this.lightContext?.clearRect(0,0,16,12);
    this.overlayContext?.clearRect(0, 0, this.overlay.width, this.overlay.height);this.overlayHasHands=false;
    this.onHands({ hands: [], stopped: true, confirmation: { progress: 0, action: null }, time: performance.now() });
    if (notify) this.onStatus({ state: 'off', text: '摄像头已关闭' });
  }
  dispose() { this.disposed=true;this.stop(); this.model?.close(); document.removeEventListener('visibilitychange', this.handleVisibility); }
}
