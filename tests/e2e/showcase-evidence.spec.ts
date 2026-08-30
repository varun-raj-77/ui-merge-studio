import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
}

async function keepQuickView(page: Page, product: string) {
  await versionB(page).getByRole('heading', { name: product }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

async function keepSidebar(page: Page) {
  await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
}

async function setTryMode(page: Page) {
  const control = page.getByRole('button', { name: 'Return to Try mode' });
  if (await control.isVisible()) await control.click();
}

async function setPickMode(page: Page) {
  const control = page.getByRole('button', { name: 'Pick parts' });
  if (await control.isVisible()) await control.click();
}

async function cardHasQuickView(frame: FrameLocator, product: string, expected: boolean) {
  const card = frame.locator('article').filter({ hasText: product });
  await expect(card).toHaveCount(1);
  const button = card.getByRole('button', { name: 'Quick view' });
  if (expected) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

test.describe('outcome-first landing', () => {
  test('communicates the product without exposing implementation detail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?mode=showcase');
    await expect(page.getByRole('heading', { name: 'Build the version you actually want.' })).toBeVisible();
    await expect(page.getByText('Compare parallel implementations, select the parts you prefer, and create one verified branch.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try interactive demo' })).toBeVisible();
    await expect(page.getByText(/branch-a|branch-b|dependency closure/i)).toHaveCount(0);
  });
});

test.describe('mode-free comparison workspace', () => {
  test('supports the complete desktop journey with exact result, evidence, refusal, and recovery', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(compareUrl);
    await expect(page.locator('.mode-toggle')).toHaveCount(0);
    await expect(page.getByTitle('Version A live application')).toBeVisible();
    await expect(page.getByTitle('Version B live application')).toBeVisible();
    await expect(page.getByTitle('Combined result application')).not.toBeVisible();

    await setTryMode(page);
    await versionA(page).getByRole('button', { name: 'Desk' }).click();
    await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
    await versionA(page).getByRole('button', { name: 'All' }).click();
    await setPickMode(page);
    await keepQuickView(page, 'Studio Speaker');
    await keepQuickView(page, 'Carry Case');
    await keepSidebar(page);
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 picked');

    await page.getByRole('button', { name: 'Remove Quick View on Studio Speaker' }).click();
    await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
    await page.getByRole('button', { name: /Combine 2 parts/ }).click();
    await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
    await expect(page.getByTitle('Version A live application')).not.toBeVisible();
    await expect(page.getByTitle('Version B live application')).not.toBeVisible();
    await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await cardHasQuickView(combined(page), 'Carry Case', true);
    await cardHasQuickView(combined(page), 'Arc Headphones', false);

    await page.getByRole('button', { name: 'Compare again' }).click();
    await page.getByRole('button', { name: 'Inspect Quick View · Carry Case selection' }).click();
    await page.getByRole('button', { name: 'Inspect evidence' }).click();
    const evidence = page.getByRole('dialog', { name: 'Quick View · Carry Case' });
    await expect(evidence).toContainText('ProductQuickViewShelf');
    await evidence.getByRole('tab', { name: 'dependencies' }).click();
    await expect(evidence).toContainText('Hooks');
    await evidence.getByRole('tab', { name: 'verification' }).click();
    await expect(evidence).toContainText('TypeScript');
    await expect(evidence).toContainText('AST-selected feature test modules');
    await expect(evidence).toContainText('production Vite application');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'More workspace actions' }).click();
    await page.getByRole('menuitem', { name: 'Experimental Product-ID change' }).click();
    await page.getByRole('button', { name: 'Review refusal' }).click();
    const conflict = page.getByRole('dialog', { name: 'Cannot combine safely' });
    await expect(conflict).not.toContainText('src/types/product.ts#Product');
    await conflict.getByRole('button', { name: 'Why?' }).click();
    await expect(conflict).toContainText('src/types/product.ts#Product');
    await expect(conflict).toContainText('One selected slice replaces the existing Product contract');
    await conflict.getByRole('button', { name: 'Change selection' }).click();
    await expect(page.getByRole('button', { name: /Combine 2 parts/ })).toBeVisible();
  });

  test('mobile keeps one preview visible and exposes evidence from the compact action island', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(compareUrl);
    await expect(page.getByRole('button', { name: 'Version A', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Version B', exact: true }).click();
    await expect(page.getByTitle('Version B live application')).toBeVisible();

    await setTryMode(page);
    const arcLauncher = versionB(page).getByRole('button', { name: 'Quick view Arc Headphones', exact: true });
    await arcLauncher.press('Enter');
    await expect(versionB(page).getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
    await versionB(page).getByRole('button', { name: 'Close quick view' }).click();
    await setPickMode(page);
    await keepQuickView(page, 'Arc Headphones');
    await keepQuickView(page, 'Task Lamp');

    await page.getByRole('button', { name: 'Review 2 selected parts' }).click();
    await page.getByRole('menuitem', { name: 'Inspect Quick View · Task Lamp' }).click();
    await expect(page.getByRole('dialog', { name: 'Quick View · Task Lamp' })).toBeVisible();
    await page.keyboard.press('Escape');

    await versionB(page).getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
    await page.getByRole('button', { name: 'Remove Quick View on Arc Headphones' }).click();
    await page.getByRole('button', { name: /Combine 1 part/ }).click();
    await expect(combined(page).getByRole('button', { name: 'Quick view' })).toHaveCount(1);
    await cardHasQuickView(combined(page), 'Task Lamp', true);
    await page.getByRole('button', { name: 'Compare again' }).click();
    await expect(page.getByRole('button', { name: 'Version B', exact: true })).toBeVisible();
    await noOverflow(page);
  });
});
