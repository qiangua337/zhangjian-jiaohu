export function inferenceInterval(cost, mobile, engaged, worker = false) {
  const base = engaged ? 32 : mobile ? 62 : 49;
  // Sample the next video frame when there is headroom. A slower detector
  // has to leave most of the main thread to rendering and touch input.
  const budget = cost * (worker ? (engaged ? 1.1 : 1.7) : (engaged ? 3.1 : 3.8));
  return Math.max(base, Math.min(160, budget));
}

export class InferencePacer {
  constructor() { this.reset(); }

  reset() {
    this.last = -Infinity;
    this.next = -Infinity;
    this.interval = 0;
  }

  take(time, interval) {
    const deadline = this.next + interval - this.interval;
    const minimumGap = interval * .6;
    if (time + .8 < Math.max(deadline, this.last + minimumGap)) return false;
    // Keep the fractional deadline across video frames, with bounded catch-up
    // after a late callback so we never run a burst of overdue inferences.
    this.next = Math.max(deadline, time - interval * .5) + interval;
    this.last = time;
    this.interval = interval;
    return true;
  }
}

export class GestureContinuity {
  constructor() { this.reset(); }

  reset() {
    this.hands = [];
    this.lastSeen = -Infinity;
    this.pairSince = null;
  }

  sample(hands, time) {
    let next = hands.slice(0, 2);
    if (next.length === 2 && this.hands.length !== 2) {
      this.pairSince ??= time;
      if (time - this.pairSince < 72) {
        const anchor = this.hands[0];
        if (anchor) {
          const distance = hand => Math.hypot(hand.x - anchor.x, hand.y - anchor.y);
          next = [distance(next[0]) <= distance(next[1]) ? next[0] : next[1]];
        } else {
          next = next.slice(0, 1);
        }
      }
    } else {
      this.pairSince = null;
    }

    if (next.length < this.hands.length && time - this.lastSeen < 170) {
      return { hands: this.hands, stale: true };
    }
    this.hands = next;
    if (next.length) this.lastSeen = time;
    return { hands: next, stale: false };
  }
}

export class TwoHandZoom {
  reset() { this.anchor = null; }

  target(spacing, radius, minimum, maximum) {
    if (spacing < .085) {
      this.reset();
      return null;
    }
    this.anchor ??= { spacing, radius };
    const travel = Math.log(spacing / this.anchor.spacing);
    const change = Math.sign(travel) * Math.max(0, Math.abs(travel) - .045);
    const desired = this.anchor.radius * Math.exp(-change * .92);
    return Math.min(maximum, Math.max(minimum, desired));
  }
}
