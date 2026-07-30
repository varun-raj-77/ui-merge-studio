export const showcaseSchemaVersion = 2 as const;
export type ArtifactId = 'baseline' | 'branch-a' | 'branch-b' | 'combined-result';
export type FeatureId = 'category-sidebar' | 'quick-view';

export interface PublicArtifact { id: ArtifactId; label: string; ref: string; commit: string; path: string; sha256: string }
export interface PublicFeature {
  id: FeatureId; name: string; summary: string; branchLabel: 'Branch A' | 'Branch B'; branch: string; branchCommit: string;
  selectedBoundary: string; analyzedBoundary: string; sourceFile: string; sourceLine: number;
  supportingFiles: { path: string; reason: string }[]; excludedFiles: { path: string; symbol: string | null; reason: string }[];
}
export interface PublicVerificationGate { id: string; command: string; purpose: string; exitCode: number; result: 'passed'; evidenceReference: string }
export interface PublicRefusal {
  status: 'refused'; branch: string; branchCommit: string; selectedBoundary: string; sourceFile: string; sourceLine: number;
  pairedWith: FeatureId; conflictKind: string; contractPath: string; contractSymbol: string | null;
  reason: string; manualResolution: string; evidenceReference: string;
}
export interface PublicShowcaseReport {
  schemaVersion: typeof showcaseSchemaVersion; runId: string; generatedAt: string; fixture: 'fixtures/generated/product-catalogue'; engineVersion: number;
  repository: { baseRef: string; commonBaseCommit: string; branchA: { name: string; commit: string }; branchB: { name: string; commit: string }; candidateBranch: string; candidateCommit: string; compatibility: 'compatible' };
  selectedFeatureIds: [FeatureId, FeatureId]; features: [PublicFeature, PublicFeature]; refusal: PublicRefusal;
  verification: PublicVerificationGate[]; commands: string[]; result: 'succeeded';
  artifacts: [PublicArtifact, PublicArtifact, PublicArtifact, PublicArtifact];
  links: { report: string; completion: string; evaluation: string; architecture: string; limitations: string; source: string; localSetup: string };
  manifestSha256: string;
}

const absolutePath = /(?:(?:^|["'\s])[A-Za-z]:[\\/]|\/(?:Users|home|tmp|var\/folders)\/)/;
const sha256 = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
export function validatePublicShowcaseReport(value: unknown): PublicShowcaseReport {
  const fail = (message: string): never => { throw new Error(`Invalid public Showcase report: ${message}`); };
  if (!value || typeof value !== 'object') fail('expected an object');
  const report = value as PublicShowcaseReport;
  if (report.schemaVersion !== showcaseSchemaVersion || report.fixture !== 'fixtures/generated/product-catalogue') fail('unsupported schema or fixture');
  if (!report.runId || !report.generatedAt) fail('missing run identity');
  if (!commit.test(report.repository?.commonBaseCommit) || !commit.test(report.repository?.branchA?.commit) || !commit.test(report.repository?.branchB?.commit) || !commit.test(report.repository?.candidateCommit)) fail('missing or malformed commit');
  if (report.repository.compatibility !== 'compatible' || report.result !== 'succeeded') fail('run is not successful and compatible');
  if (report.selectedFeatureIds.join(',') !== 'category-sidebar,quick-view' || report.features?.length !== 2) fail('both visual selections are required');
  for (const feature of report.features) if (!feature.sourceFile?.startsWith('src/') || !feature.sourceLine || !feature.selectedBoundary || !feature.supportingFiles?.length || !feature.excludedFiles?.length) fail(`feature ${feature.id} is incomplete`);
  if (report.refusal?.status !== 'refused' || report.refusal.conflictKind !== 'changed-dependency-contract' || !report.refusal.contractPath?.startsWith('src/')) fail('engine refusal evidence is incomplete');
  if (!report.verification?.length || report.verification.some(gate => gate.result !== 'passed' || gate.exitCode !== 0 || !gate.command || !gate.purpose)) fail('verification is incomplete');
  if (report.artifacts?.length !== 4 || new Set(report.artifacts.map(item => item.id)).size !== 4) fail('four distinct artifacts are required');
  for (const artifact of report.artifacts) if (!artifact.path.startsWith('/showcase-runs/') || !sha256.test(artifact.sha256) || !commit.test(artifact.commit)) fail(`artifact ${artifact.id} is invalid`);
  if (!sha256.test(report.manifestSha256)) fail('manifest hash is invalid');
  const serialized = JSON.stringify(report);
  if (absolutePath.test(serialized) || serialized.includes('.ums/') || serialized.includes('codex-prompts')) fail('private or unavailable path leaked');
  for (const href of Object.values(report.links ?? {})) if (!href.startsWith('https://github.com/varun-raj-77/ui-merge-studio')) fail(`invalid public link: ${href}`);
  return report;
}
