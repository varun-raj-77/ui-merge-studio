import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const evidence = resolve(import.meta.dirname, '../../docs/evidence/prompt-011');

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function startAndCompare(page: Page) {
  await page.getByRole('button', { name: /Explore the verified demo/i }).click();
  await expect(page.getByRole('heading', { name: /One shared baseline/i })).toBeVisible();
}

test('captures the complete desktop evidence flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: /Choose visible features/i })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '01-landing-1440.png'), fullPage: true });

  await startAndCompare(page);
  await expect(page.locator('[aria-label="Baseline application before either feature"]')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '02-comparison-1440.png'), fullPage: true });

  await page.getByRole('button', { name: /I understand the comparison/i }).click();
  await page.getByRole('button', { name: /Collapsible navigation.*Add to candidate preview/i }).click();
  await expect(page.getByText('1 feature selected')).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '03-one-selection-preview-1440.png'), fullPage: true });

  await page.getByRole('button', { name: /Activity filters.*Add to candidate preview/i }).click();
  await page.getByRole('button', { name: /Review integration plan/i }).click();
  await expect(page.getByText('src/hooks/useActivityFilter.ts')).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '04-integration-plan-1440.png'), fullPage: true });

  await page.getByRole('button', { name: /Approve candidate generation/i }).click();
  await page.getByRole('button', { name: /Inspect next gate/i }).click();
  await expect(page.getByText(/No checks are running in this browser/i)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '05-verification-evidence-1440.png'), fullPage: true });
  for (let index = 1; index < 4; index++) await page.getByRole('button', { name: /Inspect next gate/i }).click();
  await page.getByRole('button', { name: /Open verified result/i }).click();
  await expect(page.getByRole('heading', { name: /Verified combined result/i })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '06-final-result-1440.png'), fullPage: true });
});

test('captures mobile landing, comparison, preview, and result', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase');
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '07-mobile-landing-390.png'), fullPage: true });
  await startAndCompare(page);
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '08-mobile-comparison-390.png'), fullPage: true });
  await page.getByRole('button', { name: /I understand the comparison/i }).click();
  await page.getByRole('button', { name: /Collapsible navigation.*Add to candidate preview/i }).click();
  await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '09-mobile-result-preview-390.png'), fullPage: true });
});

for (const width of [1024, 768]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?mode=showcase');
    await noOverflow(page);
    await startAndCompare(page);
    await noOverflow(page);
  });
}
