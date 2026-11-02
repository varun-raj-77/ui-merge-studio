export type VisualSnapshotSource = 'A' | 'B';

export interface VisualSnapshotCapture {
  version: 3;
  /** Immutable relative pathname shown in both managed preview screenshots. */
  route: string;
  /** Digests of the private local PNG bytes, rechecked on every read. */
  sourceSha256: string;
  candidateSha256: string;
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
