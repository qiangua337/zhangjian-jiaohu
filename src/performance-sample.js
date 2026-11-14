const minute = 60_000;
export const CHECK_DURATION = 3 * minute;

class Distribution {
  constructor() {
    this.bins = new Uint32Array(1001);
    this.count = 0;
    this.sum = 0;
  }

  add(ms) {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.count++;
    this.sum += ms;
    this.bins[Math.min(1000, Math.ceil(ms))]++;
  }

  p95() {
    if (!this.count) return null;
    const rank = Math.ceil(this.count * .95);
    let seen = 0;
    for (let i = 0; i < this.bins.length; i++) {
      seen += this.bins[i];
      if (seen >= rank) return i;
    }
    return null;
  }
}

export class PerformanceSample {
  constructor() {
    this.windows = Array.from({ length: 3 }, () => ({
      frames: new Distribution(), inference: new Distribution(), handIntervals: new Distribution(),
      late: 0, switchMax: null, tracked: 0,
    }));
    this.elapsed = 0;
    this.rates = new Set();
    this.inferenceModes = new Set();
    this.lastTier = null;
    this.qualityChanges = 0;
    this.pause();
  }

  pause() {
    this.lastFrame = null;
    this.lastHand = null;
    this.lastWorld = null;
    this.switchTime = -Infinity;
  }

  window() { return this.windows[Math.min(2, Math.floor(this.elapsed / minute))]; }

  frame({ time, rate, tier, world }) {
    if (this.lastFrame !== null && time > this.lastFrame) {
      const interval = time - this.lastFrame;
      const window = this.window();
      window.frames.add(interval);
      if (interval > 50) window.late++;
      if (world !== this.lastWorld) this.switchTime = time;
      if (time - this.switchTime < 500) {
        window.switchMax = Math.max(window.switchMax ?? 0, Math.ceil(interval));
      }
      this.elapsed += interval;
      if (this.lastTier !== null && tier !== this.lastTier) this.qualityChanges++;
      this.lastTier = tier;
      this.rates.add(rate);
    }
    this.lastFrame = time;
    this.lastWorld = world;
    return this.elapsed >= CHECK_DURATION;
  }

  inference({ time, deliveredAt = time, cost, tracked, mode }) {
    if (mode) this.inferenceModes.add(mode);
    const window = this.window();
    window.inference.add(cost);
    if (tracked) {
      window.tracked++;
      if (this.lastHand !== null && deliveredAt - this.lastHand <= 750) window.handIntervals.add(deliveredAt - this.lastHand);
    }
    this.lastHand = tracked ? deliveredAt : null;
  }

  summary() {
    return this.windows.map(({ frames, inference, handIntervals, late, switchMax, tracked }) => ({
      fps: frames.sum ? Math.round(frames.count * 1000 / frames.sum * 10) / 10 : null,
      frameP95: frames.p95(),
      late,
      switchMax,
      inferenceP95: inference.p95(),
      handIntervalP95: handIntervals.p95(),
      trackedPercent: inference.count ? Math.round(tracked * 100 / inference.count) : null,
    }));
  }
}
