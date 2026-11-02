export type VisualReviewDecision = 'looks-as-intended' | 'needs-changes';

export interface VisualReviewReceipt {
  version: 1;
  scope: 'local-self-attested-visual-review';
  generationId: string;
  planIdentity: string;
  candidateBranch: string;
  candidateCommit: string;
  candidateTree: string;
  decision: VisualReviewDecision;
  notes: string;
  recordedAt: string;
}

export interface VisualReviewSnapshot {
  status: 'pending' | 'recorded' | 'stale';
  receipt: VisualReviewReceipt | null;
  reason?: string;
}
