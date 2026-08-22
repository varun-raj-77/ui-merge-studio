import { expect, test } from '@playwright/test';

test.afterEach(async ({ request }) => { await request.delete('/api/preview').catch(() => undefined); });

test('controlled Phase 0 click still resolves through an opaque receipt', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?mode=local');
  await page.getByRole('button', { name: /Try sample demo/i }).click();
  const leftCard = page.locator('[data-preview-id="left"]');
  await expect(leftCard).toContainText('Live and synchronized', { timeout: 120_000 });

  await leftCard.getByRole('button', { name: 'Choose feature' }).click();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/previews/left/analysis') && response.request().method() === 'POST');
  await page.frameLocator('[data-preview-id="left"] iframe').getByRole('complementary', { name: 'Category sidebar' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ selectionReceipt: expect.stringMatching(/^rendered-[A-Za-z0-9_-]{32}$/) });
  const evidence = await response.json() as { artifact: { slice: { selection: Record<string, unknown> } } };
  expect(evidence.artifact.slice.selection).toMatchObject({
    repositoryRelativePath: 'src/features/catalogue/CategorySidebar.tsx',
    componentName: 'CategorySidebar',
    branch: 'branch-a',
    previewId: 'left',
    confidence: 'exact'
  });
});
