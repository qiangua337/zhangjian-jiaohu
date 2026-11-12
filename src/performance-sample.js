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
      late: 0, tracked: 0,
    }));
    this.elapsed = 0;
    this.rates = new Set();
    this.lastTier = null;
    this.qualityChanges = 0;
    this.pause();
  }

  pause() {
    this.lastFrame = null;
    this.lastHand = null;
  }

  window() { return this.windows[Math.min(2, Math.floor(this.elapsed / minute))]; }

  frame({ time, rate, tier }) {
    if (this.lastFrame !== null && time > this.lastFrame) {
      const interval = time - this.lastFrame;
      const window = this.window();
      window.frames.add(interval);
      if (interval > 50) window.late++;
      this.elapsed += interval;
      if (this.lastTier !== null && tier !== this.lastTier) this.qualityChanges++;
      this.lastTier = tier;
      this.rates.add(rate);
    }
    this.lastFrame = time;
    return this.elapsed >= CHECK_DURATION;
  }

  inference({ time, cost, tracked }) {
    const window = this.window();
    window.inference.add(cost);
    if (tracked) {
      window.tracked++;
      if (this.lastHand !== null && time - this.lastHand <= 750) window.handIntervals.add(time - this.lastHand);
    }
    this.lastHand = tracked ? time : null;
  }

  summary() {
    return this.windows.map(({ frames, inference, handIntervals, late, tracked }) => ({
      fps: frames.sum ? Math.round(frames.count * 1000 / frames.sum * 10) / 10 : null,
      frameP95: frames.p95(),
      late,
      inferenceP95: inference.p95(),
      handIntervalP95: handIntervals.p95(),
      trackedPercent: inference.count ? Math.round(tracked * 100 / inference.count) : null,
    }));
  }
}
