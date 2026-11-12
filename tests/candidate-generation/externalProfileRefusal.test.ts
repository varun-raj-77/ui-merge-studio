import { afterEach, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import type { SourceIdentity } from '../../packages/shared/src/sourceIdentity';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

test.each([
  { label: 'safe direct-child insertion', hasStyles: false, hasUnselectedSibling: false },
  { label: 'CSS Module alone', hasStyles: true, hasUnselectedSibling: false },
  { label: 'unrelated JSX sibling alone', hasStyles: false, hasUnselectedSibling: true },
  { label: 'CSS Module and unrelated JSX sibling together', hasStyles: true, hasUnselectedSibling: true }
])('external profile checks $label with exact branch outcomes', async ({ hasStyles, hasUnselectedSibling }) => {
  const root = createRepository({
    '.gitignore': '.ums/\n',
    'package.json': '{"scripts":{"dev":"vite"},"dependencies":{"@vitejs/plugin-react":"latest","react":"latest","vite":"latest"}}\n',
    'vite.config.ts': "import react from '@vitejs/plugin-react'; import { defineConfig } from 'vite'; export default defineConfig({plugins:[react()]});\n",
    'src/App.tsx': 'export function App(){return <main><section>Foundation</section></main>}\n'
  });
  git(root, ['switch', '-c', 'feature']);
  const selectedFile = [
    ...(hasStyles ? ["import styles from './StatusBanner.module.css';"] : []),
    `export function StatusBanner(){return <aside${hasStyles ? ' className={styles.banner}' : ''}>Selected feature</aside>}`,
    ''
  ].join('\n');
  writeFiles(root, {
    'src/App.tsx': [
      "import { StatusBanner } from './StatusBanner';",
      `export function App(){return <main><StatusBanner/><section>Foundation</section>${hasUnselectedSibling ? '<p>Unselected sibling</p>' : ''}</main>}`,
      ''
    ].join('\n'),
    'src/StatusBanner.tsx': selectedFile,
    ...(hasStyles ? { 'src/StatusBanner.module.css': '.banner { display: flex; margin-bottom: 10px; }\n' } : {})
  });
  const sourceCommit = commit(root, 'selected feature with adversarial dependency shape');
  const selection: SourceIdentity = {
    boundaryId: 'status-banner', instanceId: 'status-banner-1',
    repositoryRelativePath: 'src/StatusBanner.tsx',
    line: hasStyles ? 2 : 1, column: 8, componentName: 'StatusBanner', exportName: 'StatusBanner',
    branch: 'feature', previewId: 'left', sessionId: 'external-profile-test',
    generation: 1, confidence: 'exact'
  };
  const artifact = await new FeatureSliceAnalyzer(root).analyzeExternal({
    baseRef: 'main', branchRef: 'feature', expectedBranchCommit: sourceCommit, selection
  });
  expect(artifact.slice.status, JSON.stringify(artifact.slice.unresolvedDependencies)).toBe('resolved');
  if (hasStyles) expect(artifact.slice.includedChanges.map(change => change.path)).toContain('src/StatusBanner.module.css');

  const repository = new GitSourceRepository(root);
  const generator = new CandidateGenerator(root, {
    verificationCommands: [{ name: 'bounded-git-control', executable: process.execPath, args: ['-e', 'process.exit(0)'] }]
  });
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
  if (!hasStyles && !hasUnselectedSibling) {
    expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
    const first = await generator.generate(request);
    expect(first.status, first.message).toBe('succeeded');
    expect(first.repository.candidateCommit).toBeTruthy();
    expect(first.verification).toContainEqual(expect.objectContaining({
      name: 'bounded-git-control', status: 'passed'
    }));
    const output = await repository.readFile('external-unsafe-result', 'src/App.tsx');
    expect(output).toContain('<StatusBanner');
    expect(output).toContain('Foundation');
    expect(output).not.toContain('Unselected sibling');
    const replay = await generator.generate(request);
    expect(replay).toMatchObject({ status: 'succeeded', repository: {
      candidateCommit: first.repository.candidateCommit,
      candidateTree: first.repository.candidateTree,
      idempotent: true
    } });
    expect(await repository.git(['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
    return;
  }
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.operations).toContainEqual(expect.objectContaining({
    kind: 'replace-jsx-region',
    target: expect.objectContaining({ path: 'src/App.tsx', symbol: 'App' }),
    jsxProjection: expect.objectContaining({
      mode: 'insert-child', excludedSourceSiblingCount: hasUnselectedSibling ? 1 : 0
    })
  }));

  const reasons = preflight.plan.unresolved.map(item => item.reason).join('\n');
  if (hasStyles) {
    expect(preflight.plan.operations).toContainEqual(expect.objectContaining({
      kind: 'add-style-file', target: expect.objectContaining({ path: 'src/StatusBanner.module.css' })
    }));
    expect(reasons).toContain('CSS rule ownership is not implemented');
    expect(reasons).toContain('outside the bounded external React/Vite transform grammar');
  }
  if (hasUnselectedSibling) {
    expect(reasons).toContain('Unrelated source changes modify the same JSX integration parent');
  }

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

test.each([
  {
    label: 'unsupported global-risk CSS shorthand',
    style: '.banner { background: #fff; }\n',
    selected: 'export function StatusBanner(){return <aside className={styles.banner}>Ready</aside>}\n',
    reason: 'CSS Module declaration property is outside the bounded local-property set'
  },
  {
    label: 'dynamic content inside the rendered stylesheet root',
    style: '.banner { background-color: #fff; }\n',
    selected: "export function StatusBanner({label}:{label:string}){return <aside className={styles.banner}><strong>{label}</strong></aside>}\n",
    reason: 'Dynamic, fragment, or spread JSX children are outside the selected root ownership grammar'
  }
])('strict external analysis rejects $label before candidate planning can authorize it', async ({ style, selected, reason }) => {
  const root = createRepository({
    '.gitignore': '.ums/\n',
    'package.json': '{"scripts":{"dev":"vite"},"dependencies":{"@vitejs/plugin-react":"latest","react":"latest","vite":"latest"}}\n',
    'vite.config.ts': "import react from '@vitejs/plugin-react'; import { defineConfig } from 'vite'; export default defineConfig({plugins:[react()]});\n",
    'src/App.tsx': 'export function App(){return <main><section>Foundation</section></main>}\n'
  });
  git(root, ['switch', '-c', 'feature']);
  writeFiles(root, {
    'src/App.tsx': "import { StatusBanner } from './StatusBanner';\nexport function App(){return <main><StatusBanner label=\"Ready\"/><section>Foundation</section></main>}\n",
    'src/StatusBanner.tsx': "import styles from './StatusBanner.module.css';\n" + selected,
    'src/StatusBanner.module.css': style
  });
  const commitSha = commit(root, 'unsafe selected CSS ownership');
  const selection: SourceIdentity = {
    boundaryId: 'status-banner', instanceId: 'status-banner-1',
    repositoryRelativePath: 'src/StatusBanner.tsx',
    line: 2, column: 8, componentName: 'StatusBanner', exportName: 'StatusBanner',
    branch: 'feature', previewId: 'left', sessionId: 'strict-css-regression',
    generation: 1, confidence: 'exact'
  };
  const artifact = await new FeatureSliceAnalyzer(root).analyzeExternal({
    baseRef: 'main', branchRef: 'feature', expectedBranchCommit: commitSha, selection
  });
  expect(artifact.slice.status).toBe('refused');
  expect(artifact.slice.unresolvedDependencies).toContainEqual(expect.objectContaining({
    path: 'src/StatusBanner.module.css', reason: expect.stringContaining(reason)
  }));

  const repository = new GitSourceRepository(root);
  const request = {
    repositoryRoot: root,
    baseRef: 'main',
    expectedBaseCommit: await repository.resolveRef('main'),
    candidateBranch: 'blocked-external-css',
    artifacts: [artifact],
    analyzerSchemaVersion: 2 as const,
    generationProfile: 'external-react-vite' as const,
    integrationPlan: { version: 2 as const, identity: 'plan-v2-01234567' }
  };
  const generator = new CandidateGenerator(root);
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status).toBe('refused');
  const report = await generator.generate(request);
  expect(report).toMatchObject({
    status: 'refused', stage: 'plan',
    appliedOperations: [], verification: [],
    cleanup: { detail: 'No worktree created.' }
  });
  expect(await repository.resolveRef('blocked-external-css').catch(() => null)).toBeNull();
  expect(await repository.git(['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 120_000);
