// @vitest-environment node
import { symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { afterEach, expect, test } from 'vitest';
import { LocalPlanAuthority, localRepositoryId } from '../../apps/studio/localPlanAuthority';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { localIntegrationPlanIdentity } from '../../packages/integration-plan/src/localPlan';
import type { PreviewSession } from '../../packages/preview-runtime/src/previewController';
import { FeatureSliceAnalyzer } from '../../packages/source-analysis/src/featureSliceAnalyzer';
import { GitSourceRepository } from '../../packages/source-analysis/src/gitModel';
import { instrumentReactSource } from '../../packages/source-instrumentation/src/instrumentReactSource';
import { cleanupRepositories, commit, createRepository, git, writeFiles } from '../source-analysis/testRepository';

afterEach(cleanupRepositories);

// The generator mutates only temporary Git repositories. Avoid executing repo
// package scripts here; separate local browser CI already covers real builds.
const verification = [{ name: 'bounded-git-contract', executable: process.execPath, args: ['-e', 'process.exit(0)'] }];
const leftFeature = "import { leftStatus } from './statusCopy';\nexport function StatusBadge(){return <strong>{leftStatus}</strong>}\n";
const rightFeature = "import { rightForecast } from './forecastCopy';\nexport function ForecastChip(){return <strong>{rightForecast}</strong>}\n";

type Choice = { previewId: 'left' | 'right'; branch: string; path: string; name: string };
const choices: Choice[] = [
  { previewId: 'left', branch: 'feature-status', path: 'src/left/StatusBadge.tsx', name: 'StatusBadge' },
  { previewId: 'right', branch: 'feature-forecast', path: 'src/right/ForecastChip.tsx', name: 'ForecastChip' }
];

function branchFiles(choice: Choice, sharedParent: boolean, brokenRight = false): Record<string, string> {
  const feature = choice.previewId === 'left' ? leftFeature : brokenRight
    ? "import { rightForecast } from './forecastCopy';\nexport function ForecastChip(){const invalid: number = 'wrong type';return <strong>{rightForecast}{invalid}</strong>}\n"
    : rightFeature;
  const copy: Record<string, string> = choice.previewId === 'left'
    ? { 'src/left/statusCopy.ts': "export const leftStatus='Status: healthy';\n" }
    : { 'src/right/forecastCopy.ts': "export const rightForecast='Forecast: stable';\n" };
  const integration = sharedParent
    ? choice.previewId === 'left'
      ? "import { StatusBadge } from './left/StatusBadge';\nexport function App(){return <main><StatusBadge/><h1>Dashboard</h1></main>}\n"
      : "import { ForecastChip } from './right/ForecastChip';\nexport function App(){return <main><h1>Dashboard</h1><ForecastChip/></main>}\n"
    : choice.previewId === 'left'
      ? "import { StatusBadge } from './StatusBadge';\nexport function LeftPanel(){return <section><StatusBadge/><h2>Left panel</h2></section>}\n"
      : "import { ForecastChip } from './ForecastChip';\nexport function RightPanel(){return <aside><h2>Right panel</h2><ForecastChip/></aside>}\n";
  const integrationPath = sharedParent ? 'src/App.tsx'
    : choice.previewId === 'left' ? 'src/left/LeftPanel.tsx' : 'src/right/RightPanel.tsx';
  return {
    [choice.path]: feature,
    ...copy,
    [integrationPath]: integration,
    [choice.previewId === 'left' ? 'src/left/UnselectedExperiment.tsx' : 'src/right/UnselectedExperiment.tsx']:
      'export function UnselectedExperiment(){return <span>UNSELECTED EXPERIMENT</span>}\n'
  };
}

async function createTwoBranchPlan(sharedParent = false, runnable = false, brokenRight = false) {
  const root = createRepository({
    '.gitignore': '.ums/\nnode_modules\ndist/\n',
    'package.json': '{"name":"ums-multibranch-proof","private":true,"scripts":{"dev":"vite","build":"vite build"}}\n',
    'src/App.tsx': sharedParent
      ? 'export function App(){return <main><h1>Dashboard</h1></main>}\n'
      : "import { LeftPanel } from './left/LeftPanel';\nimport { RightPanel } from './right/RightPanel';\nexport function App(){return <main><LeftPanel/><RightPanel/></main>}\n",
    'src/left/LeftPanel.tsx': 'export function LeftPanel(){return <section><h2>Left panel</h2></section>}\n',
    'src/right/RightPanel.tsx': 'export function RightPanel(){return <aside><h2>Right panel</h2></aside>}\n',
    ...(runnable ? {
      'index.html': '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
      'src/main.tsx': "import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import { App } from './App'; createRoot(document.getElementById('root')!).render(createElement(App));\n",
      'vite.config.ts': "export default { esbuild: { jsx: 'automatic' } };\n",
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM'], module: 'ESNext', moduleResolution: 'Bundler',
          jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: true },
        include: ['src']
      }) + '\n'
    } : {})
  });
  const base = git(root, ['rev-parse', 'main']);
  const sessions = new Map<string, PreviewSession>();
  const commits = new Map<string, string>();
  for (const choice of choices) {
    git(root, ['switch', '-c', choice.branch, 'main']);
    writeFiles(root, branchFiles(choice, sharedParent, brokenRight && choice.previewId === 'right'));
    const sha = commit(root, 'Add selected feature and unrelated experiment');
    commits.set(choice.branch, sha);
    sessions.set(choice.previewId, {
      previewId: choice.previewId,
      branch: choice.branch,
      repositoryPath: root,
      commit: sha,
      branchCommit: sha,
      packageManager: 'npm',
      generation: 1,
      sessionId: 'ums06-' + choice.previewId,
      protocolVersion: 2,
      url: 'http://127.0.0.1:5191',
      origin: 'http://127.0.0.1:5191',
      port: 5191,
      processId: 5191,
      worktreePath: root,
      status: 'running',
      failure: null
    });
  }
  git(root, ['switch', 'main']);
  const authority = new LocalPlanAuthority(root, localRepositoryId(root), 'main', 'combined-result',
    id => sessions.get(id) ?? null, () => [...sessions.values()], 'external-react-vite');
  const selections = [];
  let foundation: Awaited<ReturnType<typeof authority.foundation>> | null = null;
  for (const choice of choices) {
    const session = sessions.get(choice.previewId)!;
    const source = await new GitSourceRepository(root).readFile(session.branchCommit, choice.path);
    const instrumented = instrumentReactSource(source, resolve(root, choice.path), {
      repositoryRoot: root,
      branch: choice.branch,
      selectionReceipt: () => 'rendered-' + (choice.previewId === 'left' ? 'l' : 'r').repeat(32)
    });
    const mapping = instrumented?.boundaries.find(item => item.source.componentName === choice.name);
    if (!mapping) throw new Error('Missing instrumented JSX boundary for ' + choice.name);
    authority.registerInstrumentedBoundaries(session, [mapping]);
    const selection = authority.resolveRenderedSelection(session, mapping.selectionReceipt);
    const artifact = await new FeatureSliceAnalyzer(root).analyzeExternal({
      baseRef: 'main',
      branchRef: choice.branch,
      expectedBranchCommit: session.branchCommit,
      selection
    });
    expect(artifact.slice.status, JSON.stringify(artifact.slice.unresolvedDependencies)).toBe('resolved');
    const registered = await authority.register(session, artifact, '/');
    foundation = registered.foundation;
    selections.push(registered.selection);
  }
  const plan = { version: 2 as const, foundation: foundation!, selections };
  const projected = await authority.project({ plan, planIdentity: localIntegrationPlanIdentity(plan) });
  return { root, base, commits, request: projected.request, planIdentity: projected.planIdentity };
}

test('combines independently rendered features from separate React/Vite branches into one verified Git tree', async () => {
  const { root, base, commits, request, planIdentity } = await createTwoBranchPlan();
  const originalBranches = choices.map(choice => git(root, ['rev-parse', choice.branch]));
  expect(request.integrationPlan?.identity).toBe(planIdentity);
  expect(request.artifacts).toHaveLength(2);
  expect(new Set(request.artifacts.map(item => item.slice.repository.branchCommit))).toEqual(new Set(choices.map(choice => commits.get(choice.branch))));

  const generator = new CandidateGenerator(root, { verificationCommands: verification });
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  expect(preflight.plan.conflicts).toEqual([]);
  expect(preflight.plan.operations.filter(item => item.kind === 'replace-jsx-region')).toHaveLength(2);
  expect(new Set(preflight.plan.operations.map(item => item.target.path))).toEqual(new Set([
    'src/left/LeftPanel.tsx',
    'src/left/StatusBadge.tsx',
    'src/left/statusCopy.ts',
    'src/right/RightPanel.tsx',
    'src/right/ForecastChip.tsx',
    'src/right/forecastCopy.ts'
  ]));

  const first = await generator.generate(request);
  const again = await generator.generate(request);
  expect(first.status, first.message).toBe('succeeded');
  expect(again).toMatchObject({
    status: 'succeeded',
    repository: { idempotent: true, candidateTree: first.repository.candidateTree, candidateCommit: first.repository.candidateCommit }
  });
  expect(git(root, ['rev-parse', 'combined-result^'])).toBe(base);
  expect(git(root, ['diff', '--name-only', 'main..combined-result']).split(/\r?\n/)).toEqual([
    'src/left/LeftPanel.tsx',
    'src/left/StatusBadge.tsx',
    'src/left/statusCopy.ts',
    'src/right/ForecastChip.tsx',
    'src/right/RightPanel.tsx',
    'src/right/forecastCopy.ts'
  ]);
  const left = git(root, ['show', 'combined-result:src/left/LeftPanel.tsx']);
  const right = git(root, ['show', 'combined-result:src/right/RightPanel.tsx']);
  expect(left).toContain('<StatusBadge/><h2>Left panel</h2>');
  expect(right).toContain('<h2>Right panel</h2><ForecastChip/>');
  expect(git(root, ['show', 'combined-result:src/App.tsx'])).toContain('<LeftPanel/><RightPanel/>');
  expect(git(root, ['grep', '-n', 'Status: healthy', 'combined-result'])).toContain('statusCopy.ts');
  expect(git(root, ['grep', '-n', 'Forecast: stable', 'combined-result'])).toContain('forecastCopy.ts');
  expect(() => git(root, ['grep', '-n', 'UNSELECTED EXPERIMENT', 'combined-result'])).toThrow();
  expect(git(root, ['show', '-s', '--format=%B', 'combined-result'])).toContain('UI-Merge-Plan: ' + planIdentity);
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(originalBranches);
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 90_000);

const trustedWorkspace = resolve(import.meta.dirname, '../..');
const trustedNodeModules = resolve(trustedWorkspace, 'node_modules');
const realVerification = [
  { name: 'candidate-typescript', executable: process.execPath,
    args: [resolve(trustedNodeModules, 'typescript/bin/tsc'), '--project', 'tsconfig.json'] },
  { name: 'candidate-vite-build', executable: process.execPath,
    args: [resolve(trustedNodeModules, 'vite/bin/vite.js'), 'build', '--config', 'vite.config.ts'] }
];

function linkTrustedDependencies(worktree: string) {
  // No npm install, lifecycle scripts, or network: use already-locked CI deps.
  // The temp candidate .gitignore excludes this symlink and generated dist.
  symlinkSync(trustedNodeModules, join(worktree, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
}

test('typechecks, builds and server-renders both selected React/Vite features before writing a verified candidate', async () => {
  const { root, request, base, commits } = await createTwoBranchPlan(false, true);
  let rendered = '';
  const generator = new CandidateGenerator(root, {
    verificationCommands: realVerification,
    onWorktreePrepared: linkTrustedDependencies,
    onVerifiedWorkspace: async worktree => {
      // Execute the transformed components in Vite SSR; this is an actual
      // runtime assertion, not a snapshot or a simulated verification pass.
      const server = await createServer({
        root: worktree,
        configFile: false,
        esbuild: { jsx: 'automatic' },
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'silent'
      });
      try {
        const { App } = await server.ssrLoadModule('/src/App.tsx');
        rendered = renderToStaticMarkup(createElement(App));
        expect(rendered).toContain('Status: healthy');
        expect(rendered).toContain('Forecast: stable');
        expect(rendered).toContain('Left panel');
        expect(rendered).toContain('Right panel');
        expect(rendered).not.toContain('UNSELECTED EXPERIMENT');
      } finally {
        await server.close();
      }
    }
  });

  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  const report = await generator.generate(request);
  expect(report.status, report.message).toBe('succeeded');
  expect(report.verification).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'candidate-typescript', status: 'passed', exitCode: 0 }),
    expect.objectContaining({ name: 'candidate-vite-build', status: 'passed', exitCode: 0 })
  ]));
  expect(rendered).toContain('<strong>Status: healthy</strong>');
  expect(rendered).toContain('<strong>Forecast: stable</strong>');
  expect(git(root, ['rev-parse', 'combined-result^'])).toBe(base);
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(
    choices.map(choice => commits.get(choice.branch))
  );
  expect(report.cleanup).toMatchObject({ worktreeRemoved: true, processesStopped: true });
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 120_000);

test('rejects a two-feature candidate when real TypeScript verification fails', async () => {
  const { root, request, commits } = await createTwoBranchPlan(false, true, true);
  const generator = new CandidateGenerator(root, {
    verificationCommands: realVerification,
    onWorktreePrepared: linkTrustedDependencies
  });
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  const report = await generator.generate(request);
  expect(report.status).toBe('failed');
  expect(report.stage).toBe('verify');
  expect(report.verification).toContainEqual(expect.objectContaining({
    name: 'candidate-typescript', status: 'failed'
  }));
  expect(report.verification.find(result => result.name === 'candidate-typescript')?.outputTail).toContain(
    "Type 'string' is not assignable to type 'number'"
  );
  expect(report.verification.some(result => result.name === 'candidate-vite-build')).toBe(false);
  expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(
    choices.map(choice => commits.get(choice.branch))
  );
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(report.cleanup).toMatchObject({ worktreeRemoved: true, processesStopped: true });
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 120_000);

test('removes the candidate worktree and leaves both source branches untouched after second-slice precondition failure', async () => {
  const { root, request, commits } = await createTwoBranchPlan();
  const originalBranches = choices.map(choice => git(root, ['rev-parse', choice.branch]));
  const generator = new CandidateGenerator(root, {
    verificationCommands: verification,
    onWorktreePrepared: worktree => {
      // Simulate local foundation drift after immutable planning and before
      // operation application. Only the disposable detached worktree changes.
      writeFiles(worktree, {
        'src/right/RightPanel.tsx':
          'export function RightPanel(){return <aside>Unexpected worktree drift</aside>}\n'
      });
    }
  });

  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  const report = await generator.generate(request);
  expect(report).toMatchObject({
    status: 'refused',
    stage: 'transform',
    cleanup: { worktreeRemoved: true, processesStopped: true }
  });
  expect(report.message).toContain('Base content hash precondition failed for src/right/RightPanel.tsx');
  expect(report.appliedOperations.some(operation => operation.path === 'src/left/LeftPanel.tsx')).toBe(true);
  expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(originalBranches);
  expect(originalBranches).toEqual(choices.map(choice => commits.get(choice.branch)));
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 90_000);

test('verification failure after both external feature slices prevents candidate registration', async () => {
  const { root, request, base, commits } = await createTwoBranchPlan();
  const generator = new CandidateGenerator(root, {
    verificationCommands: [{
      name: 'intentional-two-slice-verification-failure',
      executable: process.execPath,
      args: ['-e', 'process.exit(7)']
    }]
  });

  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  const report = await generator.generate(request);
  expect(report.status).toBe('failed');
  expect(report.stage).toBe('verify');
  expect(report.appliedOperations.length).toBeGreaterThan(0);
  expect(report.verification).toContainEqual(expect.objectContaining({
    name: 'intentional-two-slice-verification-failure',
    status: 'failed',
    exitCode: 7
  }));
  expect(report.cleanup).toMatchObject({ worktreeRemoved: true, processesStopped: true });
  expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
  expect(git(root, ['rev-parse', 'main'])).toBe(base);
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(
    choices.map(choice => commits.get(choice.branch))
  );
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 90_000);

test('refuses two independently selected features that compete for the same App declaration', async () => {
  const { root, request, commits } = await createTwoBranchPlan(true);
  const generator = new CandidateGenerator(root, { verificationCommands: verification });
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status).toBe('refused');
  expect(preflight.plan.unresolved).toContainEqual(expect.objectContaining({ path: 'src/App.tsx', reason: expect.stringContaining('cross-slice shared-path composition') }));
  expect(preflight.plan.conflicts).toContainEqual(expect.objectContaining({
    kind: 'overlapping-declaration',
    path: 'src/App.tsx',
    symbol: 'App',
    sliceIds: expect.arrayContaining(request.artifacts.map(item => item.analysisId))
  }));
  expect(() => git(root, ['rev-parse', 'combined-result'])).toThrow();
  const refusal = await generator.generate(request);
  expect(refusal.status).toBe('refused');
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(choices.map(choice => commits.get(choice.branch)));
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
}, 90_000);
