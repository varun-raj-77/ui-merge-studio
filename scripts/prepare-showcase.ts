import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { CandidateGenerator } from '../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../packages/source-analysis/src/gitModel';
import type { FeatureSliceArtifact } from '../packages/source-analysis/src/types';
import type { SourceIdentity } from '../packages/shared/src/sourceIdentity';
import { validatePublicShowcaseReport, type ArtifactId, type PublicFeature, type PublicShowcaseReport } from '../packages/showcase-evidence/src/schema';
import { verifyFixture } from './verify-phase0-fixture';
import { generatedManifestPath, hashDirectory, manifestHash, normalizedJson, publicRoot, reportPath, repositoryRoot } from './showcase-lib';

const fixture = resolve(repositoryRoot, 'fixtures/generated/support-dashboard');
const repo = new GitSourceRepository(fixture);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const artifactRoot = resolve(publicRoot, 'showcase-runs');
const publicRepository = 'https://github.com/varun-raj-77/ui-merge-studio';
const commands = ['npm ci --no-audit --no-fund', 'npm run typecheck', 'npm test', 'npm test -- src/test/sidebar.test.tsx src/test/inspector.test.tsx', 'npm run build'];

function selection(branch: string, path: string, line: number, componentName: string, previewId: string): SourceIdentity {
  return { boundaryId: `${componentName}-showcase-boundary`, instanceId: `${componentName}-showcase-instance`, repositoryRelativePath: path, line, column: 8, componentName, exportName: componentName, branch, previewId, sessionId: 'showcase-preparation', generation: 1, confidence: 'exact' };
}
function git(args: string[], cwd = fixture) {
  return execFileSync('git', ['-c', `safe.directory=${fixture.replaceAll('\\', '/')}`, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function run(command: string, args: string[], cwd: string) {
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}
function cleanCommand(name: string) {
  const index: Record<string, string> = { install: commands[0], typecheck: commands[1], tests: commands[2], 'focused-feature-tests': commands[3], 'production-build': commands[4] };
  return index[name] ?? name;
}
function gatePurpose(name: string) {
  const purposes: Record<string, string> = {
    install: 'Install exactly the dependencies recorded by the fixture lockfile.',
    typecheck: 'Check the generated candidate with TypeScript.',
    tests: 'Run the complete controlled-fixture test suite.',
    'focused-feature-tests': 'Run the selected navigation and activity-filter tests.',
    'production-build': 'Compile the generated candidate as a production Vite application.'
  };
  return purposes[name] ?? 'Verify the generated candidate.';
}
function feature(id: 'navigation' | 'activity', name: string, summary: string, branchLabel: 'Branch A' | 'Branch B', artifact: FeatureSliceArtifact): PublicFeature {
  const slice = artifact.slice;
  const sourceFile = slice.selection.repositoryRelativePath;
  const support = new Map<string, string>();
  for (const item of slice.includedChanges) if (item.path !== sourceFile) support.set(item.path, item.reason);
  return {
    id, name, summary, branchLabel, branch: slice.repository.branchRef, branchCommit: slice.repository.branchCommit,
    selectedBoundary: slice.boundary.original, analyzedBoundary: slice.boundary.analyzed, sourceFile,
    supportingFiles: [...support].map(([path, reason]) => ({ path, reason })).sort((a, b) => a.path.localeCompare(b.path)),
    excludedFiles: slice.excludedChanges.map(item => ({ path: item.path, symbol: item.symbol?.name ?? null, reason: item.reason })).sort((a, b) => `${a.path}:${a.symbol}`.localeCompare(`${b.path}:${b.symbol}`))
  };
}
function buildArtifact(id: ArtifactId, label: string, ref: string, commit: string, outputRoot: string, temporaryRoot: string) {
  const worktree = resolve(temporaryRoot, id);
  git(['worktree', 'add', '--detach', worktree, commit]);
  try {
    run(npmExecutable, ['ci', '--no-audit', '--no-fund'], worktree);
    run(npmExecutable, ['run', 'build', '--', '--base=./'], worktree);
    const dist = resolve(worktree, 'dist');
    if (!existsSync(resolve(dist, 'index.html'))) throw new Error(`Missing build output for ${id}.`);
    const target = resolve(outputRoot, id);
    mkdirSync(target, { recursive: true }); cpSync(dist, target, { recursive: true });
    const indexPath = resolve(target, 'index.html');
    const index = readFileSync(indexPath, 'utf8');
    writeFileSync(indexPath, `<base href="./"><script>history.replaceState({}, "", "/tickets")</script>${index}`);
    return { id, label, ref, commit, path: `/showcase-runs/${outputRoot.split(/[\\/]/).at(-1)}/${id}/`, sha256: hashDirectory(target) };
  } finally {
    try { git(['worktree', 'remove', '--force', worktree]); } catch { /* final cleanup below validates */ }
  }
}

export async function prepareShowcase() {
  if (!existsSync(resolve(fixture, '.git'))) throw new Error('Missing controlled fixture. Run npm run fixture:create.');
  verifyFixture(fixture);
  const base = await repo.resolveRef('main');
  const branchA = await repo.resolveRef('branch-sidebar');
  const branchB = await repo.resolveRef('branch-inspector');
  if (await repo.git(['merge-base', 'branch-sidebar', 'branch-inspector']) !== base) throw new Error('Incompatible common base for controlled branches.');
  const analyzer = new FeatureSliceAnalyzer(fixture);
  const [navigation, activity] = await Promise.all([
    analyzer.analyze({ baseRef: 'main', branchRef: 'branch-sidebar', expectedBranchCommit: branchA, selection: selection('branch-sidebar', 'src/features/navigation/AppSidebar.tsx', 4, 'AppSidebar', 'branch-a') }),
    analyzer.analyze({ baseRef: 'main', branchRef: 'branch-inspector', expectedBranchCommit: branchB, selection: selection('branch-inspector', 'src/features/tickets/ActivityFilters.tsx', 3, 'ActivityFilters', 'branch-b') })
  ]);
  for (const artifact of [navigation, activity]) if (artifact.slice.status !== 'resolved') throw new Error(`Missing selected feature evidence: ${artifact.slice.status}.`);
  const generator = new CandidateGenerator(fixture, { artifactRoot: repositoryRoot });
  const generated = await generator.generate({ repositoryRoot: fixture, baseRef: 'main', expectedBaseCommit: base, candidateBranch: 'combined-result', artifacts: [navigation, activity], analyzerSchemaVersion: 2 });
  if (generated.status !== 'succeeded' || !generated.repository.candidateCommit) throw new Error(`Candidate generation failed: ${generated.message}`);
  if (generated.verification.some(item => item.status !== 'passed' || item.exitCode !== 0)) throw new Error('Candidate verification failed.');
  const candidate = generated.repository.candidateCommit;
  const stableRunId = createHash('sha256').update([base, branchA, branchB, candidate].join(':')).digest('hex').slice(0, 16);
  const outputRoot = resolve(artifactRoot, stableRunId);
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'ui-merge-showcase-'));
  rmSync(outputRoot, { recursive: true, force: true }); mkdirSync(outputRoot, { recursive: true });
  try {
    const artifacts = [
      buildArtifact('baseline', 'Baseline', 'main', base, outputRoot, temporaryRoot),
      buildArtifact('branch-a', 'Branch A', 'branch-sidebar', branchA, outputRoot, temporaryRoot),
      buildArtifact('branch-b', 'Branch B', 'branch-inspector', branchB, outputRoot, temporaryRoot),
      buildArtifact('combined-result', 'Combined result', 'combined-result', candidate, outputRoot, temporaryRoot)
    ] as PublicShowcaseReport['artifacts'];
    const reportWithoutHash = {
      schemaVersion: 1, runId: stableRunId, generatedAt: new Date().toISOString(), fixture: 'fixtures/generated/support-dashboard', engineVersion: generated.version,
      repository: { baseRef: 'main', commonBaseCommit: base, branchA: { name: 'branch-sidebar', commit: branchA }, branchB: { name: 'branch-inspector', commit: branchB }, candidateBranch: 'combined-result', candidateCommit: candidate, compatibility: 'compatible' },
      selectedFeatureIds: ['navigation', 'activity'],
      features: [
        feature('navigation', 'Collapsible navigation', 'Adds persistent collapse behavior and compact navigation.', 'Branch A', navigation),
        feature('activity', 'Activity filters', 'Adds All, Notes, and Replies filtering to ticket activity.', 'Branch B', activity)
      ],
      verification: generated.verification.map(item => ({ id: item.name, command: cleanCommand(item.name), purpose: gatePurpose(item.name), exitCode: item.exitCode, result: 'passed', evidenceReference: `run-report.json#/verification/${item.name}` })),
      commands: ['npm run showcase:prepare', ...commands], result: 'succeeded', artifacts,
      links: {
        report: `${publicRepository}/blob/main/docs/evidence/showcase/latest/run-report.json`,
        completion: `${publicRepository}/blob/main/docs/completion-report-012.md`,
        evaluation: `${publicRepository}/blob/main/docs/evaluation.md`,
        architecture: `${publicRepository}/blob/main/docs/adr/0010-recorded-real-artifact-showcase.md`,
        limitations: `${publicRepository}/blob/main/docs/limitations.md`,
        source: publicRepository,
        localSetup: `${publicRepository}#run-the-controlled-demo`
      }
    } satisfies Omit<PublicShowcaseReport, 'manifestSha256'>;
    const report = validatePublicShowcaseReport({ ...reportWithoutHash, manifestSha256: manifestHash(reportWithoutHash) });
    mkdirSync(dirname(reportPath), { recursive: true }); mkdirSync(dirname(generatedManifestPath), { recursive: true });
    writeFileSync(reportPath, normalizedJson(report)); writeFileSync(generatedManifestPath, normalizedJson(report));
    console.log(`PASS: prepared real Showcase run ${stableRunId} at candidate ${candidate}.`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
    const worktrees = git(['worktree', 'list', '--porcelain']);
    if (worktrees.includes('ui-merge-showcase-')) throw new Error('Temporary Showcase worktree cleanup failed.');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) prepareShowcase();
