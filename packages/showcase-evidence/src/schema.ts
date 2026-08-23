export const showcaseSchemaVersion = 3 as const;
export type FeatureId = 'category-sidebar' | 'quick-view';
export type ArtifactKind = 'baseline' | 'branch-a' | 'branch-b' | 'candidate';

export interface CandidateSelectionState {
  sidebar: boolean;
  quickViewProductIds: string[];
}

export function canonicalSelectionKey(state: CandidateSelectionState) {
  const ids = [...new Set(state.quickViewProductIds)].sort();
  return `sidebar-${state.sidebar ? 1 : 0}--quick-${ids.length ? ids.join('_') : 'none'}`;
}

export interface PublicArtifact {
  id: string;
  kind: ArtifactKind;
  label: string;
  ref: string;
  commit: string;
  path: string;
  sha256: string;
}

export interface PublicFeature {
  id: FeatureId;
  name: string;
  summary: string;
  branchLabel: 'Branch A' | 'Branch B';
  branch: string;
  branchCommit: string;
  selectedBoundary: string;
  analyzedBoundary: string;
  sourceFile: string;
  sourceLine: number;
  supportingFiles: { path: string; reason: string }[];
  excludedFiles: { path: string; symbol: string | null; reason: string }[];
}

export interface PublicVerificationGate {
  id: string;
  command: string;
  purpose: string;
  exitCode: number;
  result: 'passed';
  evidenceReference: string;
}

export interface PublicCandidate {
  key: string;
  selection: CandidateSelectionState;
  candidateBranch: string;
  candidateCommit: string;
  buildId: string;
  artifact: PublicArtifact;
  sliceIds: string[];
  configuredSource: null | {
    path: string;
    declaration: string;
    productIds: string[];
  };
  excludedChanges: { path: string; symbol: string | null; reason: string }[];
  verification: PublicVerificationGate[];
}

export interface PublicRefusal {
  status: 'refused';
  branch: string;
  branchCommit: string;
  selectedBoundary: string;
  sourceFile: string;
  sourceLine: number;
  pairedWith: FeatureId;
  conflictKind: string;
  contractPath: string;
  contractSymbol: string | null;
  reason: string;
  manualResolution: string;
  evidenceReference: string;
}

export interface PublicShowcaseReport {
  schemaVersion: typeof showcaseSchemaVersion;
  runId: string;
  generatedAt: string;
  fixture: 'fixtures/generated/product-catalogue';
  engineVersion: number;
  repository: {
    baseRef: string;
    commonBaseCommit: string;
    branchA: { name: string; commit: string };
    branchB: { name: string; commit: string };
    incompatible: { name: string; commit: string };
  };
  productIds: string[];
  features: [PublicFeature, PublicFeature];
  refusal: PublicRefusal;
  artifacts: [PublicArtifact, PublicArtifact, PublicArtifact];
  candidates: PublicCandidate[];
  commands: string[];
  result: 'succeeded';
  links: {
    report: string;
    completion: string;
    evaluation: string;
    architecture: string;
    limitations: string;
    source: string;
    localSetup: string;
  };
  manifestSha256: string;
}

const absolutePath = /(?:(?:^|["'\s])[A-Za-z]:[\\/]|\/(?:Users|home|tmp|var\/folders)\/)/;
const sha256 = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;

function subsets<T>(items: T[]) {
  return Array.from({ length: 2 ** items.length }, (_, mask) => items.filter((_, index) => mask & (1 << index)));
}

export function validatePublicShowcaseReport(value: unknown): PublicShowcaseReport {
  const fail = (message: string): never => { throw new Error(`Invalid public Showcase report: ${message}`); };
  if (!value || typeof value !== 'object') fail('expected an object');
  const report = value as PublicShowcaseReport;
  if (report.schemaVersion !== showcaseSchemaVersion || report.fixture !== 'fixtures/generated/product-catalogue') fail('unsupported schema or fixture');
  if (!report.runId || !report.generatedAt) fail('missing run identity');
  const commits = [report.repository?.commonBaseCommit, report.repository?.branchA?.commit, report.repository?.branchB?.commit, report.repository?.incompatible?.commit];
  if (commits.some(value => !commit.test(value ?? ''))) fail('missing or malformed repository commit');
  if (report.result !== 'succeeded') fail('run is not successful');
  if (report.features?.length !== 2 || report.features.map(item => item.id).join(',') !== 'category-sidebar,quick-view') fail('both visual feature definitions are required');
  for (const feature of report.features) {
    if (!feature.sourceFile?.startsWith('src/') || !feature.sourceLine || !feature.selectedBoundary || !feature.supportingFiles?.length || !feature.excludedFiles?.length) fail(`feature ${feature.id} is incomplete`);
  }
  if (report.refusal?.status !== 'refused' || report.refusal.conflictKind !== 'changed-dependency-contract' || !report.refusal.contractPath?.startsWith('src/')) fail('engine refusal evidence is incomplete');
  if (!report.productIds?.length || new Set(report.productIds).size !== report.productIds.length || [...report.productIds].sort().join(',') !== report.productIds.join(',')) fail('stable product IDs must be unique and sorted');
  if (report.artifacts?.length !== 3 || report.artifacts.map(item => item.kind).join(',') !== 'baseline,branch-a,branch-b') fail('baseline and two branch artifacts are required');
  const expectedKeys = new Set(subsets(report.productIds).flatMap(ids => [false, true].map(sidebar => canonicalSelectionKey({ sidebar, quickViewProductIds: ids }))));
  const actualKeys = new Set(report.candidates?.map(item => item.key));
  if (actualKeys.size !== expectedKeys.size || [...expectedKeys].some(key => !actualKeys.has(key))) fail('candidate matrix is incomplete');
  for (const candidate of report.candidates) {
    if (candidate.key !== canonicalSelectionKey(candidate.selection)) fail(`candidate ${candidate.key} is not canonical`);
    if (candidate.selection.quickViewProductIds.some(id => !report.productIds.includes(id))) fail(`candidate ${candidate.key} has an unsupported product ID`);
    if (!commit.test(candidate.candidateCommit) || !candidate.buildId || candidate.sliceIds.join(',') !== [...candidate.sliceIds].sort().join(',')) fail(`candidate ${candidate.key} has incomplete deterministic identity`);
    if (candidate.selection.quickViewProductIds.length && (candidate.configuredSource?.declaration !== 'quickViewTargetIds' || candidate.configuredSource.productIds.join(',') !== candidate.selection.quickViewProductIds.join(','))) fail(`candidate ${candidate.key} has stale Quick View configuration evidence`);
    if (!candidate.verification.length || candidate.verification.some(gate => gate.result !== 'passed' || gate.exitCode !== 0 || !gate.command || !gate.purpose)) fail(`candidate ${candidate.key} verification is incomplete`);
    if (candidate.artifact.kind !== 'candidate' || candidate.artifact.commit !== candidate.candidateCommit) fail(`candidate ${candidate.key} artifact is mismatched`);
  }
  for (const artifact of [...report.artifacts, ...report.candidates.map(item => item.artifact)]) {
    if (!artifact.path.startsWith('/showcase/') || !sha256.test(artifact.sha256) || !commit.test(artifact.commit)) fail(`artifact ${artifact.id} is invalid`);
  }
  if (!sha256.test(report.manifestSha256)) fail('manifest hash is invalid');
  const serialized = JSON.stringify(report);
  if (absolutePath.test(serialized) || serialized.includes('.ums/') || serialized.includes('codex-prompts')) fail('private or unavailable path leaked');
  for (const href of Object.values(report.links ?? {})) if (!href.startsWith('https://github.com/varun-raj-77/ui-merge-studio')) fail(`invalid public link: ${href}`);
  return report;
}
