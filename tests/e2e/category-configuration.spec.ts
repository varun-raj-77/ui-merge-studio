import { expect, test, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function previewAction(page: Page, version: 'A' | 'B', name: string | RegExp) {
  await page.getByRole('button', { name: `More selection actions for Version ${version}` }).click();
  await page.getByRole('menuitem', { name }).click();
}

async function keepSidebar(page: Page) {
  await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
}

async function keepQuickView(page: Page, product: string) {
  await versionB(page).getByRole('heading', { name: product }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

async function openCustomize(page: Page, selected: boolean) {
  await previewAction(page, 'A', selected ? 'Edit category selection' : 'Customize Category sidebar');
  return page.getByRole('dialog', { name: 'Category sidebar' });
}

async function addAndConfigureSidebar(page: Page) {
  await keepSidebar(page);
  const dialog = await openCustomize(page, true);
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await expect(dialog.getByRole('button', { name: 'Save customization' })).toBeDisabled();
  await dialog.getByRole('radio', { name: 'Desk' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
}

async function compareAgainInSelectMode(page: Page) {
  await page.getByRole('button', { name: 'Compare again' }).click();
  await page.getByRole('button', { name: 'Pick parts' }).click();
}

async function customizeBeforeAddJourney(page: Page, mobile: boolean) {
  let dialog = await openCustomize(page, false);
  await dialog.getByRole('checkbox', { name: 'Desk' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Travel' }).uncheck();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();

  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);

  if (mobile) await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await keepQuickView(page, 'Arc Headphones');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();

  await compareAgainInSelectMode(page);
  if (mobile) await page.getByRole('button', { name: 'Version A', exact: true }).click();
  dialog = await openCustomize(page, true);
  await expect(dialog.getByRole('checkbox', { name: 'All' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Desk' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} customizes and atomically adds the sidebar from contextual controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await customizeBeforeAddJourney(page, viewport.name === 'mobile');
  });
}

test('ordinary sidebar is updated in place by appearance-only customization', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await keepSidebar(page);
  const dialog = await openCustomize(page, true);
  await dialog.getByRole('checkbox', { name: 'Show “Categories” heading' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Show product counts' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true }).locator('[data-ums-product-count="audio"]')).toHaveText('2');
});

async function recordedAudioJourney(page: Page, mobile: boolean) {
  await keepSidebar(page);
  let dialog = await openCustomize(page, true);
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await dialog.getByRole('radio', { name: 'Audio' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await compareAgainInSelectMode(page);
  if (mobile) await page.getByRole('button', { name: 'Version A', exact: true }).click();
  dialog = await openCustomize(page, true);
  await expect(dialog.getByRole('radio', { name: 'Audio' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.keyboard.press('Control+Z');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Control+Shift+Z');
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} persists the exact recorded Audio configuration through previews, reopening, Undo, and Redo`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await recordedAudioJourney(page, viewport.name === 'mobile');
    if (viewport.name === 'mobile') await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('production journey persists one Travel-excluded sidebar decision everywhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await keepSidebar(page);
  let dialog = await openCustomize(page, true);
  await dialog.getByRole('checkbox', { name: 'Travel' }).uncheck();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await compareAgainInSelectMode(page);
  dialog = await openCustomize(page, true);
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await page.keyboard.press('Control+Z');
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await page.keyboard.press('Control+Shift+Z');
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
});

test('desktop configures the sidebar atomically and composes it with Desk Stand Quick View', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name: 'Selection history' }).click();
  await expect(page.getByRole('dialog', { name: 'Selection history' })).toContainText('Customized Category sidebar');
  await page.getByRole('button', { name: 'Close technical evidence' }).click();
  await keepQuickView(page, 'Desk Stand');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(page.getByRole('heading', { name: 'Combined result' })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('heading', { name: 'Desk Stand' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();
});

test('unsupported temporary All falls back to permanent Desk with an explanation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);
  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All is not included in this result.' })).toContainText('Showing the default category, Desk.');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('mobile editor and configured result remain reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

async function appearanceJourney(page: Page, mobile: boolean) {
  const dialog = await openCustomize(page, false);
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await dialog.getByRole('radio', { name: 'Desk' }).check();
  await dialog.getByRole('checkbox', { name: 'Show “Categories” heading' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Show product counts' }).check();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true }).locator('[data-ums-product-count="desk"]')).toHaveText('2');
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toHaveCount(0);
  await page.keyboard.press('Control+Shift+Z');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();

  if (mobile) await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await keepQuickView(page, 'Desk Stand');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(combined(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true }).locator('[data-ums-product-count="audio"]')).toHaveText('2');
  await expect(combined(page).getByRole('heading', { name: 'Desk Stand' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} applies one atomic category and appearance decision in both previews`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await appearanceJourney(page, viewport.name === 'mobile');
  });
}
