export type VisualSnapshotSource = 'A' | 'B';

export interface VisualSnapshotCapture {
  version: 1;
  generationId: string;
  source: VisualSnapshotSource;
  planIdentity: string;
  sourceBranch: string;
  sourceCommit: string;
  candidateCommit: string;
  candidateTree: string;
  capturedAt: string;
  viewport: { width: number; height: number };
}

export interface VisualSnapshotState {
  status: 'ready' | 'stale' | 'unavailable';
  captures: Record<VisualSnapshotSource, VisualSnapshotCapture | null>;
  candidateCommit?: string;
  sourcePins?: Record<VisualSnapshotSource, { branch: string; commit: string }>;
  reason?: string;
}
