export const BLOOMED_FLOWER = .55;

const clamp01 = value => Math.min(1, Math.max(0, value));
function smooth(low, high, value) {
  const t = clamp01((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

export function sculptingPose(world, progress) {
  if (world === 'flower') {
    return {
      open: smooth(0, BLOOMED_FLOWER, progress),
      scatter: .94 * smooth(BLOOMED_FLOWER, 1, progress)
    };
  }
  return { open: progress, scatter: .94 * progress };
}

export function handMorph(world, openness) {
  if (world !== 'flower') return smooth(.19, .88, openness);
  // A relaxed open hand can hold the bloom; opening further releases its petals.
  return BLOOMED_FLOWER * smooth(.16, .70, openness) +
    (1 - BLOOMED_FLOWER) * smooth(.76, .94, openness);
}

export function handResponse(current, target, base, boost, distance) {
  const amount = clamp01(Math.abs(target - current) / distance);
  return base + boost * amount;
}

export class FramePacer {
  constructor() { this.reset(); }

  reset() { this.last = this.next = this.rate = null; }

  take(time, rate) {
    const interval = 1000 / rate;
    if (rate !== this.rate) {
      this.rate = rate;
      this.next = time;
    }
    // Keep a stable clock on 60/90/120 Hz displays instead of delaying
    // another refresh whenever one callback lands just before the deadline.
    const slack = .9;
    if (time + slack < this.next) return null;
    const elapsed = this.last === null ? interval : time - this.last;
    this.last = time;
    this.next += (1 + Math.floor((time + slack - this.next) / interval)) * interval;
    return elapsed;
  }
}

const phone = [
  { rate: 60, density: .64, ratio: 1.4, pixels: 1550000, bloom: .68 },
  { rate: 60, density: .52, ratio: 1.2, pixels: 1180000, bloom: .55 },
  { rate: 30, density: .40, ratio: 1, pixels: 880000, bloom: .45 },
  { rate: 30, density: .32, ratio: .84, pixels: 665000, bloom: .38 },
];

export function maxRenderTier(mobile) {
  return mobile ? phone.length - 1 : 1;
}

export class RenderHealth {
  constructor() { this.reset(); }

  reset() {
    this.clearWindow();
    this.stableMs = 0;
    this.ignore = 2;
  }

  clearWindow() { this.frames = this.ms = this.longFrames = 0; }

  skipTransition() {
    // A new sculpture can compile its shaders in one frame. The ongoing
    // load still counts, but a single transition does not choose the tier.
    this.ignore = 2;
    this.stableMs = 0;
  }

  observe(elapsed, rate, allowRecovery) {
    if (this.ignore) { this.ignore--; return 0; }
    this.frames++;
    this.ms += Math.min(400, elapsed);
    const targetInterval = 1000 / rate;
    if (elapsed > Math.max(42, targetInterval * 1.75)) this.longFrames++;
    if (this.ms < 3200) return 0;

    const observedRate = this.frames * 1000 / this.ms;
    const longShare = this.longFrames / this.frames;
    const stable = observedRate >= rate * .94 && longShare < .025;
    this.stableMs = stable && allowRecovery ? this.stableMs + this.ms : 0;
    this.clearWindow();
    if (observedRate < rate * .81 || longShare > .15) return 1;
    if (this.stableMs >= 25600) { this.stableMs = 0; return -1; }
    return 0;
  }
}

export function renderBudget({ mobile, camera, mode, tier }) {
  let budget;
  if (mode === 'high') budget = { rate: 60, density: 1, ratio: mobile ? 1.6 : 1.9, pixels: mobile ? 2450000 : 4500000, bloom: mobile ? .78 : 1 };
  else if (mode === 'low') budget = { rate: mobile ? 30 : 60, density: .38, ratio: 1, pixels: 1250000, bloom: .5 };
  else if (mobile) budget = phone[tier];
  else budget = tier ? { rate: 60, density: .73, ratio: 1.45, pixels: 2250000, bloom: .8 }
    : { rate: 60, density: 1, ratio: 1.8, pixels: 3000000, bloom: 1 };

  if (camera && mobile && mode === 'auto') {
    if (tier === 0) return { ...budget, ratio: 1.18, pixels: 1080000, bloom: .54 };
    if (tier === 1) return { ...budget, ratio: 1.05, pixels: 940000, bloom: .46 };
  }
  return budget;
}
