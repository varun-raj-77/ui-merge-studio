export class CandidateGenerationGate {
  private active = false;
  private identity: string | null = null;

  acquire() {
    if (this.active) return false;
    this.active = true;
    this.identity = null;
    return true;
  }

  bind(planIdentity: string) {
    if (!this.active) throw new Error('Candidate generation gate is not active.');
    this.identity = planIdentity;
  }

  release() {
    this.active = false;
    this.identity = null;
  }

  get isActive() { return this.active; }
  get planIdentity() { return this.identity; }
}
