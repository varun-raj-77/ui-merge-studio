import { expect, test } from '@playwright/test';
import { createServer } from 'vite';
import { CandidateGenerator } from '../../packages/candidate-generation/src/candidateGenerator';
import { choices, createTwoBranchPlan, linkTrustedDependencies, realVerification } from '../candidate-generation/twoBranchFixture';
import { cleanupRepositories, git } from '../source-analysis/testRepository';

test.afterEach(() => cleanupRepositories());

test('real Chromium loads both independently selected features from one verified candidate', async ({ page }) => {
  test.setTimeout(240_000);
  const { root, base, commits, request, planIdentity } = await createTwoBranchPlan(false, true);
  const runtimeErrors: string[] = [];
  const httpFailures: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).hostname === '127.0.0.1') {
      httpFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  let visitedCandidate = false;
  const generator = new CandidateGenerator(root, {
    verificationCommands: realVerification,
    onWorktreePrepared: linkTrustedDependencies,
    onVerifiedWorkspace: async worktree => {
      const vite = await createServer({
        root: worktree,
        configFile: false,
        esbuild: { jsx: 'automatic' },
        server: { host: '127.0.0.1', port: 0, strictPort: false },
        logLevel: 'silent'
      });
      try {
        await vite.listen();
        const address = vite.httpServer?.address();
        if (!address || typeof address === 'string') throw new Error('Candidate Vite server has no bound test port');
        const url = `http://127.0.0.1:${address.port}/`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
        await expect(page.getByRole('heading', { name: 'Left panel' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Right panel' })).toBeVisible();
        await expect(page.getByText('Status: healthy')).toBeVisible();
        await expect(page.getByText('Forecast: stable')).toBeVisible();
        await expect(page.getByText('UNSELECTED EXPERIMENT')).toHaveCount(0);
        await page.reload({ waitUntil: 'networkidle' });
        await expect(page.getByText('Status: healthy')).toBeVisible();
        await expect(page.getByText('Forecast: stable')).toBeVisible();
        expect(runtimeErrors).toEqual([]);
        expect(httpFailures).toEqual([]);
        visitedCandidate = true;
      } finally {
        await vite.close();
      }
    }
  });
  const preflight = await generator.preflight(request);
  expect(preflight.plan.status, JSON.stringify(preflight.plan.unresolved)).toBe('ready');
  const report = await generator.generate(request);
  expect(report.status, report.message).toBe('succeeded');
  expect(visitedCandidate).toBe(true);
  expect(report.integrationPlan.identity).toBe(planIdentity);
  expect(report.verification).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'candidate-typescript', status: 'passed' }),
    expect.objectContaining({ name: 'candidate-vite-build', status: 'passed' })
  ]));
  expect(git(root, ['rev-parse', 'combined-result^'])).toBe(base);
  expect(choices.map(choice => git(root, ['rev-parse', choice.branch]))).toEqual(
    choices.map(choice => commits.get(choice.branch))
  );
  expect(git(root, ['status', '--porcelain'])).toBe('');
  expect(report.cleanup).toMatchObject({ worktreeRemoved: true, processesStopped: true });
  expect(git(root, ['worktree', 'list', '--porcelain'])).not.toContain('ui-merge-studio-candidate-');
});
