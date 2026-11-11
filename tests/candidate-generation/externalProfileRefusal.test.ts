import { expect, test, afterEach } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

test('external profile refuses an owned-looking CSS Module and unrelated JSX sibling without making a branch', async () => {
  const root = createRepository({
    '.gitignore': '.ums/\n',
    'src/App.tsx': 'export function App(){return <main><section>Foundation</section></main>}\n'
  });
  git(root, ['switch', '-c', 'feature']);
  const selectedFile = [
    "import styles from './StatusBanner.module.css';",
    'export function StatusBanner(){return <aside className={styles.banner}>Selected feature</aside>}',
    ''
  ].join('\n');
  writeFiles(root, {
    'src/App.tsx': [
      "import { StatusBanner } from './StatusBanner';",
      'export function App(){return <main><StatusBanner/><section>Foundation</section><p>Unselected sibling</p></main>}',
      ''
    ].join('\n'),
    'src/StatusBanner.tsx': selectedFile,
    'src/StatusBanner.module.css': '.banner { display: flex; margin-bottom: 10px; }\n'
  });
  const sourceCommit = commit(root, 'feature with CSS Module and unrelated sibling');
  const selection: SourceIdentity = {
    boundaryId: 'status-banner', instanceId: 'status-banner-1',
    repositoryRelativePath: 'src/StatusBanner.tsx',
    line: 2, column: 8, componentName: 'StatusBanner', exportName: 'StatusBanner',
    branch: 'feature', previewId: 'left', sessionId: 'external-profile-test',
    generation: 1, confidence: 'exact'
  };
  const analyzer = new FeatureSliceAnalyzer(root);
  const artifact = await analyzer.analyze({
    baseRef: 'main', branchRef: 'feature', expectedBranchCommit: sourceCommit, selection
  });
  expect(artifact.slice.status, JSON.stringify(artifact.slice.unresolvedDependencies)).toBe('resolved');
  expect(artifact.slice.includedChanges.map(change => change.path)).toContain('src/StatusBanner.module.css');

  const repository = new GitSourceRepository(root);
  const generator = new CandidateGenerator(root);
  const request = {
    repositoryRoot: root,
    baseRef: 'main',
    expectedBaseCommit: await repository.resolveRef('main'),
    candidateBranch: 'external-unsafe-result',
    artifacts: [artifact],
    analyzerSchemaVersion: 2 as const,
    generationProfile: 'external-react-vite' as const,
    integrationPlan: { version: 2 as const, identity: 'plan-v2-01234567' }
  };
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.operations).toEqual(expect.arrayContaining([
    expect.objectContaining({
      kind: 'replace-jsx-region',
      target: expect.objectContaining({ path: 'src/App.tsx', symbol: 'App' }),
      jsxProjection: expect.objectContaining({ mode: 'insert-child', excludedSourceSiblingCount: 1 })
    }),
    expect.objectContaining({ kind: 'add-style-file', target: expect.objectContaining({ path: 'src/StatusBanner.module.css' }) })
  ]));
  const reasons = preflight.plan.unresolved.map(item => item.reason).join('\n');
  expect(reasons).toContain('CSS rule ownership is not implemented');
  expect(reasons).toContain('outside the bounded external React/Vite transform grammar');
  expect(reasons).toContain('Unrelated source changes modify the same JSX integration parent');

  const report = await generator.generate(request);
  expect(report).toMatchObject({
    status: 'refused', stage: 'plan',
    appliedOperations: [], verification: [],
    cleanup: { detail: 'No worktree created.' }
  });
  expect(report.repository.candidateCommit).toBeUndefined();
  expect(report.repository.candidateTree).toBeUndefined();
  expect(await repository.resolveRef('external-unsafe-result').catch(() => null)).toBeNull();
  expect(await repository.git(['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 120_000);
