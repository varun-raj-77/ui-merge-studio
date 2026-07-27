import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';
const evidence = resolve(import.meta.dirname, '../../docs/evidence/prompt-012');
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); }
async function start(page: Page) { await page.getByRole('button', { name: /inspect the real recorded run/i }).click(); }
async function selectBoth(page: Page) {
  await page.getByRole('button', { name: /collapsible navigation/i }).click();
  await page.getByRole('button', { name: /activity filters/i }).click();
}
test('captures complete real-artifact desktop evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: /two branch features become one/i })).toBeVisible();
  await expect(page.frameLocator('iframe').getByText('Sample Support Desk').first()).toBeVisible();
  await noOverflow(page); await page.screenshot({ path: resolve(evidence, '01-landing.png'), fullPage: true });
  await start(page);
  await expect(page.getByTitle(/baseline actual compiled application/i)).toBeVisible();
  await expect(page.getByTitle(/branch a actual compiled application/i)).toBeVisible();
  await expect(page.getByTitle(/branch b actual compiled application/i)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '02-baseline.png'), fullPage: true });
  await page.screenshot({ path: resolve(evidence, '03-branch-a.png'), fullPage: true });
  await page.screenshot({ path: resolve(evidence, '04-branch-b.png'), fullPage: true });
  await page.getByRole('button', { name: /continue to feature selection/i }).click();
  await page.screenshot({ path: resolve(evidence, '05-selections.png'), fullPage: true });
  await page.getByRole('button', { name: /collapsible navigation/i }).click();
  await expect(page.getByRole('button', { name: /review recorded source plan/i })).toBeDisabled();
  await page.getByRole('button', { name: /activity filters/i }).click();
  await page.getByRole('button', { name: /review recorded source plan/i }).click();
  await expect(page.getByText('src/hooks/useActivityFilter.ts')).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '06-source-plan.png'), fullPage: true });
  await page.getByRole('button', { name: /inspect recorded run/i }).click();
  await expect(page.getByText(/checks ran during the recorded local/i)).toBeVisible();
  await page.screenshot({ path: resolve(evidence, '07-recorded-verification.png'), fullPage: true });
  await page.screenshot({ path: resolve(evidence, '08-baseline-versus-candidate.png'), fullPage: true });
  await noOverflow(page);
});
test('captures mobile comparison and result without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=showcase'); await noOverflow(page); await start(page); await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '09-mobile-comparison.png'), fullPage: true });
  await page.getByRole('button', { name: /continue to feature selection/i }).click(); await selectBoth(page);
  await page.getByRole('button', { name: /review recorded source plan/i }).click();
  await page.getByRole('button', { name: /inspect recorded run/i }).click(); await noOverflow(page);
  await page.screenshot({ path: resolve(evidence, '10-mobile-result.png'), fullPage: true });
});
for (const width of [1024, 768]) test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/?mode=showcase'); await noOverflow(page); await start(page); await noOverflow(page);
});
