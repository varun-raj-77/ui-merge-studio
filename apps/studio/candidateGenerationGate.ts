export class CandidateGenerationGate {
  private activePlanIdentity: string | null = null;

  tryStart(planIdentity: string) {
    if (this.activePlanIdentity) return false;
    this.activePlanIdentity = planIdentity;
    return true;
  }

  finish(planIdentity: string) {
    if (this.activePlanIdentity === planIdentity) this.activePlanIdentity = null;
  }

  active() {
    return this.activePlanIdentity;
  }
}
