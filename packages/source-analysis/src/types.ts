import type { SourceIdentity } from '../../shared/src/sourceIdentity';

export const featureSliceVersion = 2 as const;
export type SliceStatus = 'resolved' | 'partial' | 'refused';
export type Confidence = 'exact' | 'conservative' | 'unresolved';
export type ChangeCategory = 'selected-definition' | 'component' | 'hook' | 'utility' | 'type' | 'integration' | 'style' | 'asset' | 'test' | 'module';
export type EvidenceEdgeType = 'imports-symbol' | 'imports-module' | 'renders-component' | 'exported-through' | 'integrated-by' | 'uses-type' | 'imports-style' | 'imports-asset' | 'tested-by' | 'changed-within' | 'existing-base-edge' | 'test-unit' | 'test-ui-contract' | 'test-support' | 'test-import' | 'test-enclosure' | 'test-hook' | 'excluded-test-unit';

export interface SourceRegion { startLine: number; endLine: number }
export interface SymbolIdentity { name: string; kind: string; region: SourceRegion }
export interface IncludedChange {
  path: string;
  category: ChangeCategory;
  symbol: SymbolIdentity | null;
  branchChangeId: string;
  wholeFile: boolean;
  reason: string;
  evidenceEdgeIds: string[];
  confidence: Confidence;
}
export interface ExcludedChange {
  path: string;
  symbol: SymbolIdentity | null;
  branchChangeId: string;
  classification: 'proven-unrelated' | 'not-reached-by-supported-analysis' | 'unsupported-analysis' | 'ambiguous-shared-region';
  proof: 'proven' | 'unproven';
  reason: string;
}
export interface UnresolvedDependency { path: string; symbol: string | null; reason: string; edge: string; manualNextStep: string; ancestorBoundaryMayHelp: boolean }
export interface SliceEvidence { id: string; type: EvidenceEdgeType; from: string; to: string; detail: string; baseState: 'added' | 'changed' | 'existing' }
export interface ChangedFile { path: string; previousPath: string | null; status: 'added' | 'modified' | 'deleted' | 'renamed' | 'binary' | 'unsupported'; hunks: SourceRegion[] }
export interface FeatureBoundary { original: string; analyzed: string; status: 'selected-boundary-sufficient' | 'expanded-to-integration-boundary' | 'unresolved'; reason: string }
export type TestUnitKind = 'describe' | 'test' | 'it' | 'beforeEach' | 'afterEach' | 'beforeAll' | 'afterAll';
export interface TestUnitChange {
  id: string;
  kind: TestUnitKind;
  title: string | null;
  region: SourceRegion;
  changedHunks: SourceRegion[];
  reason: string;
  evidenceEdgeIds: string[];
  confidence: Confidence;
  enclosingDescribeIds: string[];
}
export interface ImportRequirement { source: string; local: string; imported: string; kind: string; reason: string }
export interface SupportDeclaration { name: string; kind: 'helper' | 'fixture' | 'constant'; region: SourceRegion; changedHunks: SourceRegion[]; reason: string; evidenceEdgeIds: string[]; confidence: Confidence }
export interface ExcludedTestUnit extends TestUnitChange { proof: 'proven' | 'unproven' }
export interface TestFileSlice {
  path: string;
  mode: 'whole-file' | 'test-units' | 'partial' | 'refused';
  includedUnits: TestUnitChange[];
  excludedUnits: ExcludedTestUnit[];
  requiredImports: ImportRequirement[];
  excludedImports: ImportRequirement[];
  requiredSupportDeclarations: SupportDeclaration[];
  unresolvedDependencies: UnresolvedDependency[];
  evidenceEdgeIds: string[];
}
export interface FeatureSlice {
  version: typeof featureSliceVersion;
  repository: { baseRef: string; branchRef: string; mergeBaseCommit: string; branchCommit: string };
  selection: SourceIdentity;
  status: SliceStatus;
  boundary: FeatureBoundary;
  changedFiles: ChangedFile[];
  includedChanges: IncludedChange[];
  excludedChanges: ExcludedChange[];
  unresolvedDependencies: UnresolvedDependency[];
  testFileSlices: TestFileSlice[];
  evidence: SliceEvidence[];
}
export interface FeatureSliceArtifact { analysisId: string; relativePath: string; slice: FeatureSlice }
export interface AnalyzeFeatureRequest { baseRef: string; branchRef: string; expectedBranchCommit: string; selection: SourceIdentity }
