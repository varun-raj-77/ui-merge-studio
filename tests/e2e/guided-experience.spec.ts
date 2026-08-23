import { expect, test } from '@playwright/test';

test('clearly distinguishes the hosted configured preview from real local Git delivery', async ({ page }) => {
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: 'Compare two implementations. Click the parts you prefer. Create one verified branch.' })).toBeVisible();
  const hostedBoundary = page.getByRole('note', { name: 'Hosted showcase boundary' });
  await expect(hostedBoundary).toContainText('Controlled, recorded proof');
  await expect(hostedBoundary).toContainText('No repository access in the browser');
  await expect(page.getByRole('region', { name: 'Try it on your repository.' })).toContainText('UI Merge Studio runs locally');
  await page.getByRole('button', { name: 'Try the interactive example' }).click();
  await expect(page.getByRole('heading', { name: 'Compare versions' })).toBeVisible();
});

test('is keyboard operable and structurally labelled in landing and comparison states', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase');
  await page.getByRole('button', { name: 'Try the interactive example' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Compare versions' })).toBeVisible();
  await page.getByRole('button', { name: 'Version B', exact: true }).press('Enter');
  await expect(page.locator('article[data-view="branch-b"]')).toHaveClass(/mobile-active/);
  expect(await page.locator('h1').count()).toBeGreaterThanOrEqual(1);
  expect(await page.locator('button').evaluateAll(buttons => buttons.filter(button => !(button.getAttribute('aria-label') || button.textContent?.trim())).length)).toBe(0);
});
