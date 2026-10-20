// @vitest-environment node
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { afterEach, expect, test } from 'vitest';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { cleanupRepositories, git, writeFiles } from '../source-analysis/testRepository';
import { choices, createTwoBranchPlan, realVerification, linkTrustedDependencies } from './twoBranchFixture';

afterEach(cleanupRepositories);

// The generator mutates only temporary Git repositories. Avoid executing repo
// package scripts here; separate local browser CI already covers real builds.
const verification = [{ name: 'bounded-git-contract', executable: process.execPath, args: ['-e', 'process.exit(0)'] }];

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
