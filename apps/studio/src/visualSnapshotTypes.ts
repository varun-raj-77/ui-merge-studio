export type VisualSnapshotSource = 'A' | 'B';

export interface VisualSnapshotCapture {
  version: 3;
  /** Immutable relative pathname shown in both managed preview screenshots. */
  route: string;
  /** Deterministic route identity used for image retrieval; derived by the server. */
  routeKey: string;
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
  /** Additional immutable route pairs; first capture stays in captures for v3 compatibility. */
  additionalCaptures?: Record<VisualSnapshotSource, VisualSnapshotCapture[]>;
  candidateCommit?: string;
  sourcePins?: Record<VisualSnapshotSource, { branch: string; commit: string }>;
  reason?: string;
}
