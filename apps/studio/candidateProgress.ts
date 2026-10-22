import type { CandidateGenerationReport } from '../../packages/candidate-generation/src/types';
import type { CandidateProgressEvent } from '../../packages/candidate-generation/src/candidateGenerator';

// Status is owned by a generation attempt, not by safety/preflight requests.
// Preflights return their result directly and must not replace this record.
export interface CandidateProgressSnapshot {
  status: 'idle' | 'running' | 'succeeded' | 'refused' | 'failed';
  stage: string | null;
  message: string;
  planIdentity?: string;
  generationId?: string;
  sliceId?: string;
  path?: string;
  verification?: string;
}

export class CandidateProgressTracker {
  private snapshot: CandidateProgressSnapshot = {
    status: 'idle',
    stage: null,
    message: 'No candidate generation is running.'
  };
  private attempt: symbol | null = null;

  get() { return { ...this.snapshot }; }

  begin(planIdentity: string, generationId: string): symbol {
    if (!/^[a-f0-9]{16}$/i.test(generationId)) throw new Error('A valid generation identity is required before tracking candidate progress.');
    const attempt = Symbol('candidate-generation');
    this.attempt = attempt;
    this.snapshot = {
      status: 'running',
      stage: 'validate',
      message: 'Candidate generation is running: validate.',
      planIdentity,
      generationId
    };
    return attempt;
  }

  update(attempt: symbol | null, event: CandidateProgressEvent) {
    if (!attempt || this.attempt !== attempt || this.snapshot.status !== 'running') return;
    this.snapshot = { status: 'running', planIdentity: this.snapshot.planIdentity, generationId: this.snapshot.generationId, ...event };
  }

  finish(attempt: symbol | null, report: Pick<CandidateGenerationReport, 'generationId' | 'status' | 'stage' | 'message'>) {
    if (!attempt || this.attempt !== attempt || this.snapshot.status !== 'running') return;
    if (report.generationId !== this.snapshot.generationId) throw new Error('The completed candidate does not match the tracked generation.');
    this.snapshot = {
      status: report.status,
      stage: report.stage,
      message: report.message,
      planIdentity: this.snapshot.planIdentity,
      generationId: this.snapshot.generationId
    };
    this.attempt = null;
  }

  fail(attempt: symbol | null, error: unknown) {
    if (!attempt || this.attempt !== attempt || this.snapshot.status !== 'running') return;
    this.snapshot = {
      status: 'failed',
      stage: this.snapshot.stage,
      message: error instanceof Error ? error.message : String(error),
      planIdentity: this.snapshot.planIdentity,
      generationId: this.snapshot.generationId
    };
    this.attempt = null;
  }
}
