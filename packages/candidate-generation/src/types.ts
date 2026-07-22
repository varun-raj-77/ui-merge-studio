import type { FeatureSliceArtifact, ImportRequirement, SourceRegion, TestFileSlice } from '../../source-analysis/src/types';

export const candidateGenerationVersion = 1 as const;
export type CandidateStatus = 'succeeded' | 'refused' | 'failed';
export type CandidateOperationKind =
  | 'add-file'
  | 'replace-declaration'
  | 'insert-declaration'
  | 'insert-import-specifier'
  | 'insert-export'
  | 'replace-jsx-region'
  | 'reconstruct-test-file'
  | 'reconstruct-source-file'
  | 'add-style-file'
  | 'replace-style-file'
  | 'add-asset';

export interface CandidateGenerationRequest {
  repositoryRoot: string;
  baseRef: string;
  expectedBaseCommit: string;
  candidateBranch: string;
  artifacts: FeatureSliceArtifact[];
  analyzerSchemaVersion: number;
}
export interface CandidateOperation {
  id: string;
  kind: CandidateOperationKind;
  sliceIds: string[];
  source: { branchCommit: string; path: string; region: SourceRegion | null; contentHash: string };
  target: { path: string; region: SourceRegion | null; symbol: string | null };
  evidenceEdgeIds: string[];
  precondition: { baseContentHash: string | null; targetContentHash: string | null; description: string };
  postcondition: { expectedContentHash: string; description: string };
  detail: string;
  importRequirement?: ImportRequirement;
  testSlice?: TestFileSlice;
  declarationNames?: string[];
  exportRequirement?: { exported: string; imported: string; source: string };
}
export interface CandidateConflict {
  id: string;
  kind: string;
  path: string;
  symbol: string | null;
  sliceIds: string[];
  operationIds: string[];
  evidenceEdgeIds: string[];
  reason: string;
  manualResolution: string;
}
export interface CandidateUnresolved { path: string; sliceId: string | null; reason: string; manualResolution: string }
export interface CandidatePlan {
  version: typeof candidateGenerationVersion;
  repository: { baseCommit: string; candidateBranch: string };
  sliceIds: string[];
  operations: CandidateOperation[];
  conflicts: CandidateConflict[];
  unresolved: CandidateUnresolved[];
  status: 'ready' | 'refused';
}
export interface AppliedOperation { operationId: string; path: string; status: 'applied' | 'deduplicated'; resultingContentHash: string; detail: string }
export interface ExcludedSourceChange { sliceId: string; path: string; symbol: string | null; reason: string }
export interface VerificationResult { name: string; command: string; status: 'passed' | 'failed'; exitCode: number; outputTail: string }
export interface CleanupResult { worktreeRemoved: boolean; processesStopped: boolean; detail: string }
export interface CandidateGenerationReport {
  version: typeof candidateGenerationVersion;
  generationId: string;
  status: CandidateStatus;
  stage: 'validate' | 'plan' | 'transform' | 'verify' | 'commit' | 'complete';
  message: string;
  repository: { baseCommit: string; candidateBranch: string; candidateCommit?: string; candidateTree?: string; worktreePath?: string; idempotent?: boolean };
  sliceIds: string[];
  plan: CandidatePlan;
  appliedOperations: AppliedOperation[];
  excludedSourceChanges: ExcludedSourceChange[];
  conflicts: CandidateConflict[];
  verification: VerificationResult[];
  cleanup: CleanupResult;
  relativePath: string;
}
export interface CandidatePreflight { generationId: string; plan: CandidatePlan }
