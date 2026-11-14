// Work on one upcoming scene at a time. Small idle slices leave the
// animation loop and a new touch or camera session free to go first.
export class WorldPreparation {
  constructor({ schedule, cancel, canWork, build }) {
    Object.assign(this, { schedule, cancel, canWork, build });
    this.prepared = new Set();
    this.job = null;
    this.pending = null;
  }

  select(id) {
    if (this.job?.id === id) return;
    this.clear();
    if (id && !this.prepared.has(id)) this.job = { id, steps: null };
  }

  markPrepared(id) {
    this.prepared.add(id);
    if (this.job?.id === id) this.clear();
  }

  queue() {
    if (!this.schedule || !this.job || this.pending !== null || !this.canWork()) return;
    const job = this.job;
    this.pending = this.schedule(deadline => {
      if (this.job !== job) return;
      this.pending = null;
      if (!this.canWork()) return;
      const minimum = job.steps ? 5 : 14;
      if (deadline.timeRemaining() < minimum) return;
      try {
        if (!job.steps) job.steps = this.build(job.id);
        else job.steps.shift()?.();
        if (!job.steps.length) this.markPrepared(job.id);
      } catch {
        // A failed estimate or idle build must not block an explicit switch.
        this.clear();
      }
    });
  }

  clear() {
    if (this.pending !== null) this.cancel?.(this.pending);
    this.pending = null;
    this.job = null;
  }

  reset() {
    this.clear();
    this.prepared.clear();
  }
}
