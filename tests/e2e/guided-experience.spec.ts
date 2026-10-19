import { expect, test } from '@playwright/test';

test('clearly distinguishes the hosted configured preview from real local Git delivery', async ({ page }) => {
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: 'Build the version you actually want.' })).toBeVisible();
  const hostedBoundary = page.getByRole('note', { name: 'Hosted showcase boundary' });
  await expect(hostedBoundary).toContainText('Controlled, recorded proof');
  await expect(hostedBoundary).toContainText('No repository access in the browser');
  await expect(page.getByRole('region', { name: 'The real workspace stays local.' })).toContainText('worktrees');
  await page.getByRole('button', { name: 'Try interactive demo' }).click();
  await expect(page.getByRole('region', { name: 'Compare versions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare versions' })).toHaveCount(0);
});

test('is keyboard operable and structurally labelled in landing and comparison states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase');
  await page.getByRole('button', { name: 'Try interactive demo' }).press('Enter');
  await expect(page.getByRole('region', { name: 'Compare versions' })).toBeVisible();
  await page.getByRole('button', { name: 'Version B', exact: true }).press('Enter');
  await expect(page.locator('article[data-view="branch-b"]')).toHaveClass(/mobile-active/);
  expect(await page.locator('h1').count()).toBe(0);
  expect(await page.locator('button').evaluateAll(buttons => buttons.filter(button => !(button.getAttribute('aria-label') || button.textContent?.trim())).length)).toBe(0);
});

test('guides mobile visitors from trying to picking without losing their selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase');
  await page.getByRole('button', { name: 'Try interactive demo' }).click();
  const guidance = page.getByRole('note', { name: 'Comparison guidance' });
  await expect(guidance).toContainText('Explore both versions');
  await guidance.getByRole('button', { name: 'Start selecting' }).click();
  await expect(guidance).toContainText('Choose what to keep');
  await expect(guidance).toContainText('This does not create a Git branch');
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
  await expect(guidance).toContainText('1 part picked');
  await page.getByRole('button', { name: 'Return to Try mode' }).click();
  await expect(guidance).toContainText('Explore both versions');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
