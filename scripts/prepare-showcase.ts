import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { CandidateGenerator } from '../packages/candidate-generation/src/candidateGenerator';
import type { CandidateGenerationReport, CandidateSourceConfiguration } from '../packages/candidate-generation/src/types';
import { FeatureSliceAnalyzer } from '../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../packages/source-analysis/src/gitModel';
import type { FeatureSliceArtifact } from '../packages/source-analysis/src/types';
import {
  canonicalSelectionKey,
  validatePublicShowcaseReport,
  type ArtifactKind,
  type FeatureId,
  type PublicArtifact,
  type PublicCandidate,
  type PublicFeature,
  type PublicShowcaseReport,
  type PublicVerificationGate
} from '../packages/showcase-evidence/src/schema';
import { captureShowcaseSelections } from './capture-showcase-selections';
import { promoteShowcasePackage } from './promote-showcase';
import { verifyFixture } from './verify-phase0-fixture';
import { canonicalPublicPathPrefix, hashDirectory, manifestHash, publicRoot, repositoryRoot } from './showcase-lib';

const fixture = resolve(repositoryRoot, 'fixtures/generated/product-catalogue');
const repo = new GitSourceRepository(fixture);
const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const artifactRoot = resolve(publicRoot, 'showcase-runs');
const publicRepository = 'https://github.com/varun-raj-77/ui-merge-studio';
const commands = ['npm ci --no-audit --no-fund', 'npm run typecheck', 'npm test', 'npm run build'];

function git(args: string[], cwd = fixture) {
  return execFileSync('git', ['-c', `safe.directory=${fixture.replaceAll('\\', '/')}`, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(command: string, args: string[], cwd: string) {
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

function npmVerification(name: string, args: string[]) {
  return process.platform === 'win32'
    ? { name, executable: process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe', args: ['/d', '/s', '/c', 'npm', ...args] }
    : { name, executable: 'npm', args };
}

function verificationGate(name: string, command: string, reference: string): PublicVerificationGate {
  const purposes: Record<string, string> = {
    install: 'Install exactly the locked fixture dependencies.',
    typecheck: 'Check the generated candidate with TypeScript.',
    tests: 'Run the complete Product Catalogue fixture suite.',
    'focused-feature-tests': 'Run the AST-selected feature test modules.',
    'production-build': 'Compile the candidate as a production Vite application.'
  };
  return { id: name, command, purpose: purposes[name] ?? 'Verify the generated candidate.', exitCode: 0, result: 'passed', evidenceReference: reference };
}

function reportGates(report: CandidateGenerationReport, key: string) {
  return report.verification.map(item => verificationGate(item.name, item.command.replace(/^.*?npm(?:\.cmd)?\s+/, 'npm '), `run-report.json#/candidates/${key}/verification/${item.name}`));
}

function feature(id: FeatureId, name: string, summary: string, branchLabel: 'Branch A' | 'Branch B', artifact: FeatureSliceArtifact): PublicFeature {
  const slice = artifact.slice;
  const sourceFile = slice.selection.repositoryRelativePath;
  const support = new Map<string, string>();
  for (const item of slice.includedChanges) if (item.path !== sourceFile) support.set(item.path, item.reason);
  return {
    id,
    name,
    summary,
    branchLabel,
    branch: slice.repository.branchRef,
    branchCommit: slice.repository.branchCommit,
    selectedBoundary: slice.boundary.original,
    analyzedBoundary: slice.boundary.analyzed,
    sourceFile,
    sourceLine: slice.selection.line,
    supportingFiles: [...support].map(([path, reason]) => ({ path, reason })).sort((a, b) => a.path.localeCompare(b.path)),
    excludedFiles: slice.excludedChanges.map(item => ({ path: item.path, symbol: item.symbol?.name ?? null, reason: item.reason })).sort((a, b) => `${a.path}:${a.symbol}`.localeCompare(`${b.path}:${b.symbol}`))
  };
}

function prepareArtifactShell(target: string) {
  const indexPath = resolve(target, 'index.html');
  if (!existsSync(indexPath)) throw new Error(`Missing build output at ${indexPath}.`);
  const source = readFileSync(indexPath, 'utf8');
  writeFileSync(indexPath, `<base href="./"><script>history.replaceState({}, "", "/catalogue")</script>${source}`);
}

function artifact(id: string, kind: ArtifactKind, label: string, ref: string, commit: string, target: string, suffix: string): PublicArtifact {
  return { id, kind, label, ref, commit, path: `${canonicalPublicPathPrefix}${suffix}/`, sha256: hashDirectory(target) };
}

function buildStaticArtifact(id: 'baseline' | 'branch-a' | 'branch-b', label: string, ref: string, commit: string, outputRoot: string, temporaryRoot: string) {
  const worktree = resolve(temporaryRoot, id);
  git(['worktree', 'add', '--detach', worktree, commit]);
  try {
    run(npmExecutable, ['ci', '--no-audit', '--no-fund'], worktree);
    run(npmExecutable, ['run', 'typecheck'], worktree);
    run(npmExecutable, ['test'], worktree);
    run(npmExecutable, ['run', 'build', '--', '--base=./'], worktree);
    const target = resolve(outputRoot, 'static', id);
    mkdirSync(target, { recursive: true });
    cpSync(resolve(worktree, 'dist'), target, { recursive: true });
    prepareArtifactShell(target);
    return artifact(id, id, label, ref, commit, target, `static/${id}`);
  } finally {
    try { git(['worktree', 'remove', '--force', worktree]); } catch {}
  }
}

function subsets(items: string[]) {
  return Array.from({ length: 2 ** items.length }, (_, mask) => items.filter((_, index) => mask & (1 << index)));
}

function branchName(sidebar: boolean, ids: string[]) {
  return `showcase-s${sidebar ? 1 : 0}-q-${ids.length ? ids.map(id => id.replace(/^p-/, '')).join('-') : 'none'}`;
}

function fixtureProductIds() {
  const source = git(['show', 'main:src/fixtures/products.ts']);
  return [...source.matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]).sort();
}

export async function prepareShowcase() {
  if (!existsSync(resolve(fixture, '.git'))) throw new Error('Missing controlled fixture. Run npm run fixture:create.');
  verifyFixture(fixture);
  const base = await repo.resolveRef('main');
  const branchA = await repo.resolveRef('branch-a');
  const branchB = await repo.resolveRef('branch-b');
  const incompatibleCommit = await repo.resolveRef('branch-incompatible');
  if (await repo.git(['merge-base', 'branch-a', 'branch-b']) !== base) throw new Error('Incompatible common base for controlled branches.');

  const selections = await captureShowcaseSelections(fixture, resolve(repositoryRoot, 'apps/studio/preview.vite.config.ts'));
  const analyzer = new FeatureSliceAnalyzer(fixture);
  const [category, quickView, incompatible] = await Promise.all([
    analyzer.analyze({ baseRef: 'main', branchRef: 'branch-a', expectedBranchCommit: branchA, selection: selections.categorySidebar }),
    analyzer.analyze({ baseRef: 'main', branchRef: 'branch-b', expectedBranchCommit: branchB, selection: selections.quickView }),
    analyzer.analyze({ baseRef: 'main', branchRef: 'branch-incompatible', expectedBranchCommit: incompatibleCommit, selection: selections.identityBadge })
  ]);
  for (const [name, result] of [['category-sidebar', category], ['quick-view', quickView], ['incompatible-product-id', incompatible]] as const) {
    if (result.slice.status !== 'resolved') throw new Error(`Visual selection ${name} did not resolve: ${result.slice.status}. ${result.slice.unresolvedDependencies.map(item => item.reason).join(' ')}`);
  }

  const refusalGenerator = new CandidateGenerator(fixture, { artifactRoot: repositoryRoot });
  const refusal = await refusalGenerator.preflight({ repositoryRoot: fixture, baseRef: 'main', expectedBaseCommit: base, candidateBranch: 'incompatible-result', artifacts: [quickView, incompatible], analyzerSchemaVersion: 2 });
  const conflict = refusal.plan.conflicts.find(item => item.kind === 'changed-dependency-contract');
  if (refusal.plan.status !== 'refused' || !conflict) throw new Error('The Product.id incompatibility was not refused by engine preflight.');

  const productIds = fixtureProductIds();
  const stableRunId = createHash('sha256').update([base, branchA, branchB, incompatibleCommit, 'candidate-matrix-v1'].join(':')).digest('hex').slice(0, 16);
  const outputRoot = resolve(artifactRoot, stableRunId);
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'ui-merge-showcase-'));
  rmSync(artifactRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  try {
    const staticArtifacts = [
      buildStaticArtifact('baseline', 'Baseline', 'main', base, outputRoot, temporaryRoot),
      buildStaticArtifact('branch-a', 'Branch A · Category navigation', 'branch-a', branchA, outputRoot, temporaryRoot),
      buildStaticArtifact('branch-b', 'Branch B · Product Quick View', 'branch-b', branchB, outputRoot, temporaryRoot)
    ] as PublicShowcaseReport['artifacts'];

    const baselineGates = [
      verificationGate('install', commands[0], 'run-report.json#/candidates/baseline/verification/install'),
      verificationGate('typecheck', commands[1], 'run-report.json#/candidates/baseline/verification/typecheck'),
      verificationGate('tests', commands[2], 'run-report.json#/candidates/baseline/verification/tests'),
      verificationGate('production-build', commands[3], 'run-report.json#/candidates/baseline/verification/production-build')
    ];
    const sharedDependencies = resolve(temporaryRoot, 'shared-dependencies');
    mkdirSync(sharedDependencies, { recursive: true });
    copyFileSync(resolve(fixture, 'package.json'), resolve(sharedDependencies, 'package.json'));
    copyFileSync(resolve(fixture, 'package-lock.json'), resolve(sharedDependencies, 'package-lock.json'));
    run(npmExecutable, ['ci', '--no-audit', '--no-fund'], sharedDependencies);
    const candidates: PublicCandidate[] = [];
    const states = subsets(productIds).flatMap(ids => [false, true].map(sidebar => ({ sidebar, quickViewProductIds: ids }))).sort((left, right) => canonicalSelectionKey(left).localeCompare(canonicalSelectionKey(right)));

    const generateState = async (index: number, state: typeof states[number]) => {
      const key = canonicalSelectionKey(state);
      if (!state.sidebar && !state.quickViewProductIds.length) {
        const source = staticArtifacts[0];
        candidates[index] = {
          key,
          selection: state,
          candidateBranch: 'main',
          candidateCommit: base,
          buildId: createHash('sha256').update(`${key}:${base}:${source.sha256}`).digest('hex').slice(0, 16),
          artifact: { ...source, id: `candidate:${key}`, kind: 'candidate', label: 'Combined · Baseline' },
          sliceIds: [],
          configuredSource: null,
          excludedChanges: [],
          verification: baselineGates
        };
        return;
      }

      const selectedArtifacts = [state.sidebar ? category : null, state.quickViewProductIds.length ? quickView : null].filter((item): item is FeatureSliceArtifact => Boolean(item));
      const sourceConfigurations: CandidateSourceConfiguration[] = state.quickViewProductIds.length ? [{
        sliceId: quickView.analysisId,
        path: 'src/config/quickViewTargets.ts',
        declaration: 'quickViewTargetIds',
        value: [...state.quickViewProductIds]
      }] : [];
      const target = resolve(outputRoot, 'candidates', key);
      const focusedTests = [
        ...(state.sidebar ? ['src/test/category-sidebar.test.tsx'] : []),
        ...(state.quickViewProductIds.length ? ['src/test/quick-view.test.tsx'] : [])
      ];
      const generator = new CandidateGenerator(fixture, {
        artifactRoot: repositoryRoot,
        verificationCommands: [
          npmVerification('typecheck', ['run', 'typecheck']),
          npmVerification('focused-feature-tests', ['test', '--', ...focusedTests]),
          npmVerification('production-build', ['run', 'build', '--', '--base=./'])
        ],
        onWorktreePrepared(worktree) {
          symlinkSync(resolve(sharedDependencies, 'node_modules'), resolve(worktree, 'node_modules'), 'junction');
        },
        onVerifiedWorkspace(worktree) {
          mkdirSync(target, { recursive: true });
          cpSync(resolve(worktree, 'dist'), target, { recursive: true });
          prepareArtifactShell(target);
        }
      });
      const generated = await generator.generate({
        repositoryRoot: fixture,
        baseRef: 'main',
        expectedBaseCommit: base,
        candidateBranch: branchName(state.sidebar, state.quickViewProductIds),
        artifacts: selectedArtifacts,
        analyzerSchemaVersion: 2,
        sourceConfigurations
      });
      if (generated.status !== 'succeeded' || !generated.repository.candidateCommit) throw new Error(`Candidate ${key} failed: ${generated.message}`);
      const commit = generated.repository.candidateCommit;
      const candidateArtifact = artifact(`candidate:${key}`, 'candidate', 'Combined candidate', generated.repository.candidateBranch, commit, target, `candidates/${key}`);
      candidates[index] = {
        key,
        selection: state,
        candidateBranch: generated.repository.candidateBranch,
        candidateCommit: commit,
        buildId: createHash('sha256').update(`${key}:${commit}:${candidateArtifact.sha256}`).digest('hex').slice(0, 16),
        artifact: candidateArtifact,
        sliceIds: [...generated.sliceIds].sort(),
        configuredSource: state.quickViewProductIds.length ? { path: 'src/config/quickViewTargets.ts', declaration: 'quickViewTargetIds', productIds: [...state.quickViewProductIds] } : null,
        excludedChanges: generated.excludedSourceChanges.map(item => ({ path: item.path, symbol: item.symbol, reason: item.reason })),
        verification: [
          verificationGate('locked-dependencies', 'npm ci --no-audit --no-fund (shared immutable lockfile)', `run-report.json#/candidates/${key}/verification/locked-dependencies`),
          ...reportGates(generated, key)
        ]
      };
      if ((index + 1) % 8 === 0 || index === states.length - 1) console.log(`Prepared ${index + 1}/${states.length} deterministic candidate states.`);
    };
    let matrixCursor = 0;
    const matrixWorker = async () => {
      while (matrixCursor < states.length) {
        const index = matrixCursor++;
        await generateState(index, states[index]);
      }
    };
    await Promise.all([matrixWorker(), matrixWorker(), matrixWorker()]);

    const withoutHash = {
      schemaVersion: 3,
      runId: stableRunId,
      generatedAt: git(['show', '-s', '--format=%cI', base]),
      fixture: 'fixtures/generated/product-catalogue',
      engineVersion: 1,
      repository: { baseRef: 'main', commonBaseCommit: base, branchA: { name: 'branch-a', commit: branchA }, branchB: { name: 'branch-b', commit: branchB }, incompatible: { name: 'branch-incompatible', commit: incompatibleCommit } },
      productIds,
      features: [
        feature('category-sidebar', 'Category sidebar', 'Filters the product grid and preserves accessible collapse state.', 'Branch A', category),
        feature('quick-view', 'Product Quick View', 'Enables a focused, keyboard-dismissible product detail panel for configured stable IDs.', 'Branch B', quickView)
      ],
      refusal: {
        status: 'refused',
        branch: 'branch-incompatible',
        branchCommit: incompatibleCommit,
        selectedBoundary: incompatible.slice.boundary.original,
        sourceFile: incompatible.slice.selection.repositoryRelativePath,
        sourceLine: incompatible.slice.selection.line,
        pairedWith: 'quick-view',
        conflictKind: conflict.kind,
        contractPath: conflict.path,
        contractSymbol: conflict.symbol,
        reason: conflict.reason,
        manualResolution: conflict.manualResolution,
        evidenceReference: 'run-report.json#/refusal'
      },
      artifacts: staticArtifacts,
      candidates,
      commands: ['npm run showcase:prepare', ...commands],
      result: 'succeeded',
      links: {
        report: `${publicRepository}/blob/main/docs/evidence/showcase/latest/run-report.json`,
        completion: `${publicRepository}/blob/main/docs/evaluation.md`,
        evaluation: `${publicRepository}/blob/main/docs/evaluation.md`,
        architecture: `${publicRepository}/blob/main/docs/adr/0010-recorded-real-artifact-showcase.md`,
        limitations: `${publicRepository}/blob/main/docs/limitations.md`,
        source: publicRepository,
        localSetup: `${publicRepository}#run-the-controlled-demo`
      }
    } satisfies Omit<PublicShowcaseReport, 'manifestSha256'>;
    const report = validatePublicShowcaseReport({ ...withoutHash, manifestSha256: manifestHash(withoutHash) });
    promoteShowcasePackage(report);
    console.log(`PASS: prepared ${candidates.length} Product Catalogue candidates in engine run ${stableRunId}.`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
    if (git(['worktree', 'list', '--porcelain']).includes('ui-merge-showcase-')) throw new Error('Temporary Showcase worktree cleanup failed.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) prepareShowcase();
