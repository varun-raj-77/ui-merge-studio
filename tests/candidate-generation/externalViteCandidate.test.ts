import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { buildSourceIndex } from '../../packages/source-analysis/src/sourceIndex';
import type { FeatureSliceArtifact } from '../../packages/source-analysis/src/types';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';

const externalRoot = process.env.UI_MERGE_EXTERNAL_REPOSITORY;
const externalTest = externalRoot ? test : test.skip;
const baseRef = 'main';
const leftBranch = 'ui-merge-validation-left-deps';
const rightBranch = 'ui-merge-validation-right-deps';
const alternateBranch = 'ui-merge-validation-alternate';

async function selection(repository: GitSourceRepository, branch: string, path: string, name: string, previewId: string): Promise<SourceIdentity> {
  const commit = await repository.resolveRef(branch);
  const declaration = (await buildSourceIndex(repository, commit)).moduleByPath.get(path)?.declarations.find(item => item.name === name);
  if (!declaration) throw new Error(`Missing expected external declaration ${name} in ${path}.`);
  return {
    boundaryId: `${name}-external-boundary`,
    instanceId: `${name}-external-instance`,
    repositoryRelativePath: path,
    line: declaration.startLine,
    column: 7,
    componentName: name,
    exportName: null,
    branch,
    previewId,
    sessionId: `${previewId}-external-session`,
    generation: 1,
    confidence: 'exact'
  };
}

async function artifacts(root: string) {
  const repository = new GitSourceRepository(root);
  const analyzer = new FeatureSliceAnalyzer(root, resolve(process.cwd()));
  const [leftCommit, rightCommit] = await Promise.all([repository.resolveRef(leftBranch), repository.resolveRef(rightBranch)]);
  return {
    repository,
    leftCommit,
    rightCommit,
    values: await Promise.all([
      analyzer.analyze({ baseRef, branchRef: leftBranch, expectedBranchCommit: leftCommit, selection: await selection(repository, leftBranch, 'src/components/layout/contentbar.tsx', 'PageContent', 'left') }),
      analyzer.analyze({ baseRef, branchRef: rightBranch, expectedBranchCommit: rightCommit, selection: await selection(repository, rightBranch, 'src/views/dashboard/index.tsx', 'RevenueTrendChart', 'right') })
    ])
  };
}

function rehash(artifact: FeatureSliceArtifact) {
  artifact.analysisId = createHash('sha256').update(JSON.stringify(artifact.slice)).digest('hex').slice(0, 16);
  artifact.relativePath = `.ums/analysis/${artifact.analysisId}/feature-slice.json`;
  return artifact;
}

externalTest('extracts dependency-rich external slices, excludes unrelated edits, and plans exact-base generation', async () => {
  const root = resolve(externalRoot!);
  const { repository, values } = await artifacts(root);
  expect(values.map(value => value.slice.status)).toEqual(['resolved', 'resolved']);

  const leftPaths = new Set(values[0].slice.includedChanges.map(change => change.path));
  expect(leftPaths).toEqual(new Set([
    'src/components/layout/contentbar.tsx',
    'src/components/layout/validationWorkspace.ts',
    'src/components/layout/validationWorkspaceConfig.ts'
  ]));
  expect(values[0].slice.excludedChanges.map(change => change.path)).toContain('src/components/layout/headerbar.tsx');

  const rightPaths = new Set(values[1].slice.includedChanges.map(change => change.path));
  expect(rightPaths).toEqual(new Set([
    'src/views/dashboard/index.tsx',
    'src/views/dashboard/revenueOutlook.ts',
    'src/views/dashboard/revenueOutlookConfig.ts'
  ]));
  expect(values[1].slice.excludedChanges.map(change => change.path)).toContain('src/components/layout/index.tsx');

  const base = await repository.resolveRef(baseRef);
  const preflight = await new CandidateGenerator(root).preflight({
    repositoryRoot: root,
    baseRef,
    expectedBaseCommit: base,
    candidateBranch: 'ui-merge-validation-combined',
    artifacts: values,
    analyzerSchemaVersion: 2
  });
  expect(preflight.plan.status, JSON.stringify(preflight.plan, null, 2)).toBe('ready');
  expect(new Set(preflight.plan.operations.map(operation => operation.target.path))).toEqual(new Set([...leftPaths, ...rightPaths]));
}, 120_000);

externalTest('refuses stale external selection evidence before creating a candidate workspace', async () => {
  const root = resolve(externalRoot!);
  const { repository, values } = await artifacts(root);
  const stale = structuredClone(values[0]);
  stale.slice.repository.branchCommit = '0'.repeat(40);
  rehash(stale);
  const preflight = await new CandidateGenerator(root).preflight({
    repositoryRoot: root,
    baseRef,
    expectedBaseCommit: await repository.resolveRef(baseRef),
    candidateBranch: 'ui-merge-validation-stale-refusal',
    artifacts: [stale, values[1]],
    analyzerSchemaVersion: 2
  });
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.unresolved.some(item => item.reason.includes('Feature branch'))).toBe(true);
  await expect(repository.resolveRef('ui-merge-validation-stale-refusal')).rejects.toThrow();
  expect((await repository.git(['worktree', 'list', '--porcelain']))).not.toContain('ui-merge-studio-candidate-');
}, 90_000);

externalTest('refuses incompatible edits to the same real declaration before mutation', async () => {
  const root = resolve(externalRoot!);
  const { repository, values } = await artifacts(root);
  const alternateCommit = await repository.resolveRef(alternateBranch);
  const alternate = await new FeatureSliceAnalyzer(root, resolve(process.cwd())).analyze({
    baseRef,
    branchRef: alternateBranch,
    expectedBranchCommit: alternateCommit,
    selection: await selection(repository, alternateBranch, 'src/components/layout/contentbar.tsx', 'PageContent', 'right')
  });
  expect(alternate.slice.status).toBe('resolved');

  const candidateBranch = 'ui-merge-validation-conflict-refusal';
  const preflight = await new CandidateGenerator(root).preflight({
    repositoryRoot: root,
    baseRef,
    expectedBaseCommit: await repository.resolveRef(baseRef),
    candidateBranch,
    artifacts: [values[0], alternate],
    analyzerSchemaVersion: 2
  });
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.conflicts).toEqual(expect.arrayContaining([
    expect.objectContaining({
      kind: 'overlapping-declaration',
      path: 'src/components/layout/contentbar.tsx',
      symbol: 'PageContent'
    })
  ]));
  await expect(repository.resolveRef(candidateBranch)).rejects.toThrow();
  expect((await repository.git(['worktree', 'list', '--porcelain']))).not.toContain('ui-merge-studio-candidate-');
}, 120_000);
