import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const foundationBranch = 'prompt014-foundation';
const leftBranch = 'prompt014-workspace-status';
const rightBranch = 'prompt014-revenue-pulse';
const candidateBranch = 'prompt015-external-candidate';
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? resolve(import.meta.dirname, '../../.validation-worktrees/prompt015-external-vite'));
const card = (page: Page, side: 'left' | 'right') => page.locator(`[data-preview-id="${side}"]`);

test.afterEach(async ({ request }) => {
  await request.delete('/api/preview').catch(() => undefined);
});

test('refuses unsupported external CSS source analysis without altering the valid selection or Git refs', async ({ page, request }) => {
  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Continue to comparison/ }).click();
  await expect(page.getByText('Two running versions', { exact: true })).toBeVisible({ timeout: 180_000 });
  await expect(card(page, 'left')).toContainText(leftBranch);
  await expect(card(page, 'right')).toContainText(rightBranch);

  const repository = await request.get('/api/repository').then(response => response.json()) as {
    foundation: { branchRef: string; commitSha: string; commonAncestorCommit: string };
    sessions: Array<{ branch: string; branchCommit: string; worktreePath: string }>;
  };
  expect(repository.foundation).toMatchObject({
    branchRef: foundationBranch, commitSha: foundationCommit, commonAncestorCommit: foundationCommit
  });
  expect(repository.sessions).toHaveLength(2);
  expect(new Set(repository.sessions.map(session => session.worktreePath)).size).toBe(2);

  const leftFrame = page.frameLocator('[data-preview-id="left"] iframe');
  const rightFrame = page.frameLocator('[data-preview-id="right"] iframe');
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByText('Release workspace ready')).toBeVisible();
  await expect(leftFrame.getByText('Experimental density controls enabled')).toBeVisible();
  await expect(rightFrame.getByText('Revenue pulse: healthy')).toBeVisible();
  await expect(rightFrame.getByText(/revenue experiment footer/)).toBeVisible();

  await page.getByRole('button', { name: 'Select parts' }).click();

  // The other feature remains independently analyzable. This is not a
  // pretense that the blocked CSS feature reached candidate preflight.
  const acceptedResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/previews/right/analysis') && response.request().method() === 'POST'
  );
  await rightFrame.getByLabel('Revenue pulse').click();
  const accepted = await acceptedResponse.then(async response => ({
    request: response.request().postDataJSON(), value: await response.json()
  }));
  expect(accepted.request).toEqual({
    selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/)
  });
  expect(accepted.value.artifact.slice).toMatchObject({
    status: 'resolved',
    selection: { componentName: 'RevenuePulseBadge', branch: rightBranch }
  });
  await expect(card(page, 'right').locator('.attached-selection')).toBeVisible({ timeout: 120_000 });

  const refusedResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/previews/left/analysis') && response.request().method() === 'POST'
  );
  await leftFrame.getByText('Release workspace ready').click();
  const refused = await refusedResponse.then(async response => ({
    request: response.request().postDataJSON(), value: await response.json()
  }));
  expect(refused.request).toEqual({
    selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/)
  });
  const slice = refused.value.artifact.slice as {
    status: string;
    selection: { componentName: string; branch: string };
    includedChanges: Array<{ path: string }>;
    unresolvedDependencies: Array<{ path: string; reason: string }>;
  };
  expect(slice).toMatchObject({
    status: 'refused',
    selection: { componentName: 'WorkspaceStatusBanner', branch: leftBranch }
  });
  expect(slice.includedChanges.map(change => change.path)).toContain(
    'src/components/layout/workspace-status/WorkspaceStatusBanner.module.css'
  );
  expect(slice.unresolvedDependencies).toContainEqual(expect.objectContaining({
    path: 'src/components/layout/workspace-status/WorkspaceStatusBanner.module.css',
    reason: expect.stringContaining('CSS Module declaration property is outside the bounded local-property set')
  }));
  await expect(card(page, 'right').locator('.attached-selection')).toBeVisible();

  // The strict source-graph refusal occurs BEFORE a two-feature plan can
  // legitimately exist. Keep both original Git branches and all worktrees.
  const candidateRefs = execFileSync('git', ['branch', '--list', candidateBranch], {
    cwd: externalRepository, encoding: 'utf8', windowsHide: true
  }).trim();
  expect(candidateRefs).toBe('');
  const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: externalRepository, encoding: 'utf8', windowsHide: true
  });
  expect(worktrees).not.toContain('ui-merge-studio-candidate-');
  expect(execFileSync('git', ['status', '--porcelain'], {
    cwd: externalRepository, encoding: 'utf8', windowsHide: true
  }).trim()).toBe('');

  const evidencePath = resolve(import.meta.dirname, '../../test-results/ums-external-vite-refusal/refusal.json');
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify({
    outcome: 'correct-source-analysis-refusal',
    foundationCommit,
    validatedSourceBranch: rightBranch,
    rejectedSourceBranch: leftBranch,
    component: 'WorkspaceStatusBanner',
    refusalStage: 'feature-slice-analysis',
    candidateBranch,
    candidateCreated: false,
    refusalReasons: slice.unresolvedDependencies.map(item => ({ path: item.path, reason: item.reason }))
  }, null, 2) + '\n');
});
