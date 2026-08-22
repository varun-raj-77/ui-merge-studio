import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { staticBoundaryId } from '../../packages/source-instrumentation/src/instrumentReactSource';

const expectedSourcePath = 'src/views/dashboard/index.tsx';
const expectedComponent = 'RevenueTrendChart';
const expectedBoundaryId = staticBoundaryId(expectedSourcePath, 26, 7, expectedComponent);

async function restartPreview(request: APIRequestContext, previewId: string, branch: string) {
  const launched = await request.post(`/api/previews/${previewId}`, { data: { branch } });
  expect(launched.status()).toBe(202);
  const acknowledgement = await launched.json() as { operationId: string };
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const operation = await request.get(`/api/preview-operations/${acknowledgement.operationId}`).then(response => response.json()) as { state: string; error?: string };
    if (operation.state === 'ready') return;
    if (operation.state === 'failed' || operation.state === 'cancelled' || operation.state === 'superseded') throw new Error(operation.error ?? `Preview restart ended as ${operation.state}.`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Preview restart timed out.');
}

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('external rendered click resolves only its opaque receipt to server-owned source identity', async ({ page, request }) => {
  test.setTimeout(600_000);
  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Try sample demo/i }).click();
  const leftCard = page.locator('[data-preview-id="left"]');
  const rightCard = page.locator('[data-preview-id="right"]');
  await expect(leftCard).toContainText('Live and synchronized', { timeout: 180_000 });
  await expect(rightCard).toContainText('Live and synchronized', { timeout: 180_000 });

  const repositoryState = await request.get('/api/repository').then(response => response.json()) as {
    repositoryId: string;
    sessions: Array<{ previewId: string; branch: string; branchCommit: string; sessionId: string; generation: number; origin: string; worktreePath: string }>;
  };
  const firstLeft = repositoryState.sessions.find(session => session.previewId === 'left')!;
  const right = repositoryState.sessions.find(session => session.previewId === 'right')!;
  expect(firstLeft).toMatchObject({ branch: 'main', generation: 1 });
  expect(right.branch).toBe('ui-merge-validation-alternate');

  const wrapper = await readFile(resolve(firstLeft.worktreePath, '.ums/ui-merge.preview.vite.config.ts'), 'utf8');
  expect(wrapper).toContain('vite.config.ts');
  expect(wrapper).not.toContain(expectedSourcePath);
  const nativeTransformedDashboard = await request.get(`${firstLeft.origin}/${expectedSourcePath}`).then(response => response.text());
  expect(nativeTransformedDashboard).toMatch(/react-refresh|RefreshReg|__vite__injectQuery/);
  expect(nativeTransformedDashboard).toContain('data-ums-boundary');

  const leftFrame = page.frameLocator('[data-preview-id="left"] iframe');
  await leftFrame.getByRole('button', { name: 'Login as Demo User' }).click();
  await expect(leftFrame.getByRole('img', { name: 'Revenue trend over the last six months' })).toBeVisible({ timeout: 30_000 });

  await leftCard.getByRole('button', { name: 'Choose feature' }).click();
  await leftFrame.locator('body').evaluate(body => body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await expect(leftCard).toContainText('No eligible project-owned React boundary');

  const analysisResponsePromise = page.waitForResponse(response => response.url().endsWith('/api/previews/left/analysis') && response.request().method() === 'POST');
  await leftFrame.getByRole('img', { name: 'Revenue trend over the last six months' }).click({ position: { x: 320, y: 120 } });
  const analysisResponse = await analysisResponsePromise;
  expect(analysisResponse.status()).toBe(200);
  const browserRequest = analysisResponse.request().postDataJSON() as { selectionReceipt: string };
  expect(browserRequest).toEqual({ selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/) });
  expect(JSON.stringify(browserRequest)).not.toMatch(/repositoryRelativePath|componentName|sourceIdentity|\.tsx/i);

  const evidence = await analysisResponse.json() as {
    artifact: { slice: { repository: { branchRef: string; branchCommit: string }; selection: Record<string, unknown> } };
  };
  expect(evidence.artifact.slice.selection).toMatchObject({
    boundaryId: expectedBoundaryId,
    repositoryRelativePath: expectedSourcePath,
    line: 26,
    column: 7,
    componentName: expectedComponent,
    exportName: null,
    branch: 'main',
    previewId: 'left',
    sessionId: firstLeft.sessionId,
    generation: firstLeft.generation,
    confidence: 'exact'
  });
  expect(evidence.artifact.slice.repository).toEqual({
    baseRef: 'main',
    branchRef: 'main',
    mergeBaseCommit: firstLeft.branchCommit,
    branchCommit: firstLeft.branchCommit
  });

  const forgedIdentity = await request.post('/api/previews/left/analysis', { data: { selection: evidence.artifact.slice.selection } });
  expect(forgedIdentity.status()).toBe(400);
  const receiptWithRawSource = await request.post('/api/previews/left/analysis', { data: { selectionReceipt: browserRequest.selectionReceipt, repositoryRelativePath: expectedSourcePath } });
  expect(receiptWithRawSource.status()).toBe(400);
  const guessed = await request.post('/api/previews/left/analysis', { data: { selectionReceipt: `rendered-${'f'.repeat(32)}` } });
  expect(guessed.status()).toBe(409);
  const otherBranch = await request.post('/api/previews/right/analysis', { data: { selectionReceipt: browserRequest.selectionReceipt } });
  expect(otherBranch.status()).toBe(409);

  await restartPreview(request, 'left', 'main');
  const restartedState = await request.get('/api/repository').then(response => response.json()) as typeof repositoryState;
  const restartedLeft = restartedState.sessions.find(session => session.previewId === 'left')!;
  expect(restartedLeft.generation).toBe(firstLeft.generation + 1);
  expect(restartedLeft.sessionId).not.toBe(firstLeft.sessionId);
  const stale = await request.post('/api/previews/left/analysis', { data: { selectionReceipt: browserRequest.selectionReceipt } });
  expect(stale.status()).toBe(409);
});
