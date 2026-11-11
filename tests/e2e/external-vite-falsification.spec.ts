import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const foundationBranch = 'prompt014-foundation';
const leftBranch = 'prompt014-workspace-status';
const rightBranch = 'prompt014-revenue-pulse';
const candidateBranch = 'prompt015-external-candidate';
const foundationCommit = '8223897259151c450f954e462c57df3703d5508d';
const externalRepository = resolve(process.env.UI_MERGE_EXTERNAL_REPOSITORY ?? resolve(import.meta.dirname, '../../.validation-worktrees/prompt015-external-vite'));
const card = (page: Page, side: 'left' | 'right') => page.locator(`[data-preview-id="${side}"]`);
const field = (panel: Locator, name: string) => panel.locator('dt', { hasText: new RegExp('^' + name + '$') }).locator('xpath=following-sibling::dd[1]');

test.afterEach(async ({ request }) => {
  await request.delete('/api/preview').catch(() => undefined);
});

test('refuses a two-feature external selection with CSS and co-located JSX exclusions before mutation', async ({ page, request }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    const text = message.text();
    if (message.type() === 'error' && !text.startsWith('Warning: [antd:')) consoleErrors.push(text);
  });

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
    branchRef: foundationBranch,
    commitSha: foundationCommit,
    commonAncestorCommit: foundationCommit
  });
  expect(repository.sessions).toHaveLength(2);
  expect(new Set(repository.sessions.map(session => session.worktreePath)).size).toBe(2);

  let leftFrame = page.frameLocator('iframe').nth(0);
  let rightFrame = page.frameLocator('iframe').nth(1);
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await rightFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByText('Release workspace ready')).toBeVisible();
  await expect(leftFrame.getByText('Experimental density controls enabled')).toBeVisible();
  await expect(rightFrame.getByText('Revenue pulse: healthy')).toBeVisible();
  await expect(rightFrame.getByText(/revenue experiment footer/)).toBeVisible();

  await page.getByRole('button', { name: 'Select parts' }).click();
  await leftFrame.getByText('Release workspace ready').click();
  await expect(card(page, 'left').locator('.attached-selection')).toBeVisible({ timeout: 120_000 });
  const preflightResponse = page.waitForResponse(response => response.url().endsWith('/api/candidate/preflight') && response.request().method() === 'POST');
  await rightFrame.getByText('Revenue pulse: healthy').click();
  await expect(card(page, 'right').locator('.attached-selection')).toBeVisible({ timeout: 120_000 });

  await page.getByRole('button', { name: 'Inspect evidence' }).click();
  const versions = page.getByRole('dialog').locator('.evidence-section');
  const leftSelection = versions.nth(0);
  const rightSelection = versions.nth(1);
  await expect(field(leftSelection, 'Component')).toHaveText('WorkspaceStatusBanner');
  await expect(field(leftSelection, 'Source')).toHaveText(/WorkspaceStatusBanner\.tsx:\d+:\d+/);
  await expect(field(leftSelection, 'Source commit')).toHaveCount(1);
  await expect(field(rightSelection, 'Component')).toHaveText('RevenuePulseBadge');
  await expect(field(rightSelection, 'Source')).toHaveText(/RevenuePulseBadge\.tsx:\d+:\d+/);
  await expect(versions.nth(0)).toContainText('Expanded from WorkspaceStatusBanner to PageContent');
  await expect(versions.nth(1)).toContainText('Expanded from RevenuePulseBadge to RevenueTrendChart');
  await page.getByRole('tab', { name: 'Dependencies' }).click();
  const dependencySections = page.getByRole('dialog').locator('.evidence-section');
  await expect(dependencySections.nth(0)).toContainText('WorkspaceStatusBanner.module.css');
  await expect(dependencySections.nth(0)).toContainText('useWorkspaceStatus');
  await expect(dependencySections.nth(0)).toContainText('workspaceStatusConfig');
  await expect(dependencySections.nth(1)).toContainText('useRevenuePulse');
  await expect(dependencySections.nth(1)).toContainText('revenuePulseConfig');
  await expect(dependencySections.nth(1)).toContainText('src/components/layout/index.tsx');
  await page.getByRole('button', { name: 'Close evidence drawer' }).click();

  const preflight = await preflightResponse.then(async response => ({ request: response.request().postDataJSON(), value: await response.json() }));
  expect(preflight.request.plan.version).toBe(2);
  expect(preflight.request.plan.foundation).toMatchObject({ branchRef: foundationBranch, commitSha: foundationCommit, commonAncestorCommit: foundationCommit });
  expect(preflight.request.plan.selections).toHaveLength(2);
  expect(preflight.value.plan.status, JSON.stringify(preflight.value.plan, null, 2)).toBe('refused');
  const operations = preflight.value.plan.operations as Array<{ kind: string; target: { path: string; symbol: string | null }; jsxProjection?: { mode: string; renderedBoundary: { path: string; symbol: string }; integrationBoundary: { path: string; symbol: string }; excludedSourceSiblingCount: number; anchor: { side: string } } }>;
  expect(operations).toContainEqual(expect.objectContaining({ kind: 'replace-jsx-region', target: expect.objectContaining({ path: 'src/components/layout/contentbar.tsx', symbol: 'PageContent' }), jsxProjection: expect.objectContaining({ mode: 'insert-child', renderedBoundary: { path: 'src/components/layout/workspace-status/WorkspaceStatusBanner.tsx', symbol: 'WorkspaceStatusBanner' }, integrationBoundary: { path: 'src/components/layout/contentbar.tsx', symbol: 'PageContent' }, excludedSourceSiblingCount: 1, anchor: expect.objectContaining({ side: 'before' }) }) }));
  expect(operations).toContainEqual(expect.objectContaining({ kind: 'replace-jsx-region', target: expect.objectContaining({ path: 'src/views/dashboard/index.tsx', symbol: 'RevenueTrendChart' }), jsxProjection: expect.objectContaining({ mode: 'insert-child', renderedBoundary: { path: 'src/views/dashboard/RevenuePulseBadge.tsx', symbol: 'RevenuePulseBadge' }, integrationBoundary: { path: 'src/views/dashboard/index.tsx', symbol: 'RevenueTrendChart' }, excludedSourceSiblingCount: 0, anchor: expect.objectContaining({ side: 'before' }) }) }));
  expect(operations.some(operation => operation.target.path === 'src/components/layout/index.tsx')).toBe(false);

  const unresolved = preflight.value.plan.unresolved as Array<{ path: string; reason: string }>;
  expect(unresolved).toEqual(expect.arrayContaining([
    expect.objectContaining({
      path: 'src/components/layout/contentbar.tsx',
      reason: expect.stringContaining('Unrelated source changes modify the same JSX integration parent')
    }),
    expect.objectContaining({
      path: 'src/components/layout/workspace-status/WorkspaceStatusBanner.module.css',
      reason: expect.stringContaining('CSS rule ownership is not implemented')
    }),
    expect.objectContaining({
      path: 'src/components/layout/workspace-status/WorkspaceStatusBanner.module.css',
      reason: expect.stringContaining('outside the bounded external React/Vite transform grammar')
    })
  ]));

  // Submitting the same server-validated plan cannot bypass the refusal.
  const refusedResponse = await request.post('/api/candidate/generate', { data: preflight.request });
  expect(refusedResponse.ok()).toBe(true);
  const refusedReport = await refusedResponse.json();
  expect(refusedReport).toMatchObject({
    status: 'refused',
    stage: 'plan',
    repository: { candidateBranch },
    appliedOperations: [],
    verification: []
  });
  expect(refusedReport.repository.candidateCommit).toBeUndefined();
  expect(refusedReport.repository.candidateTree).toBeUndefined();

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
  expect(consoleErrors).toEqual([]);

  const evidencePath = resolve(import.meta.dirname, '../../test-results/ums-external-vite-refusal/refusal.json');
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify({
    outcome: 'correct-refusal',
    foundationCommit,
    selectedBranches: [leftBranch, rightBranch],
    selectedComponents: ['WorkspaceStatusBanner', 'RevenuePulseBadge'],
    candidateBranch,
    candidateCreated: false,
    generationStatus: refusedReport.status,
    refusalReasons: unresolved.map(item => ({ path: item.path, reason: item.reason }))
  }, null, 2) + '\n');
});
