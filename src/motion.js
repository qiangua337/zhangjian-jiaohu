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
];

export function renderBudget({ mobile, camera, mode, tier }) {
  let budget;
  if (mode === 'high') budget = { rate: 60, density: 1, ratio: mobile ? 1.6 : 1.9, pixels: mobile ? 2450000 : 4500000, bloom: mobile ? .78 : 1 };
  else if (mode === 'low') budget = { rate: mobile ? 30 : 60, density: .38, ratio: 1, pixels: 1250000, bloom: .5 };
  else if (mobile) budget = phone[tier];
  else budget = tier ? { rate: 60, density: .73, ratio: 1.45, pixels: 2250000, bloom: .8 }
    : { rate: 60, density: 1, ratio: 1.8, pixels: 3000000, bloom: 1 };

  if (!camera || !mobile || mode !== 'auto') return budget;
  return { ...budget, ratio: Math.min(budget.ratio, 1.18), pixels: Math.min(budget.pixels, 1080000), bloom: Math.min(budget.bloom, .54) };
}
