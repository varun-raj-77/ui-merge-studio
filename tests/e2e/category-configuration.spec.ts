import { expect, test, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function addAndConfigureSidebar(page: Page) {
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  const customize = page.getByRole('button', { name: 'Edit categories' });
  await customize.focus();
  await customize.click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('button', { name: 'Close category customization' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Save customization' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(customize).toBeFocused();
  await customize.click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog).toContainText('Version A · /catalogue');
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await expect(dialog.getByRole('button', { name: 'Save customization' })).toBeDisabled();
  await expect(dialog).toContainText('Choose a default category from the categories you kept.');
  await dialog.getByRole('radio', { name: 'Desk' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
}

async function openMobileReviewIfCollapsed(page: Page) {
  const review = page.getByRole('button', { name: /1 selection Review/ });
  if (await review.isVisible()) await review.click();
}

async function runCustomizeBeforeAddJourney(page: Page, mobile: boolean) {
  await versionA(page).getByRole('button', { name: 'Details for Category sidebar' }).click();
  const details = page.getByRole('dialog', { name: 'Category sidebar' });
  await details.getByRole('button', { name: 'Customize categories' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('button', { name: 'Add customized sidebar' })).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Desk' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Travel' }).uncheck();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  if (mobile) await page.getByRole('button', { name: '1 selection Review' }).click();
  await expect(dock).toContainText('1 selection');
  await expect(dock).toContainText('Category sidebar');
  await expect(dock).toContainText('All, Audio');
  await expect(dock).toContainText('Default: All');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Remove Category sidebar' })).toContainText('Added');
  await expect(versionA(page).getByRole('button', { name: 'Add Category sidebar' })).toHaveCount(0);
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');

  if (mobile) {
    await page.getByRole('button', { name: '1 selection Minimize' }).click();
    await page.getByRole('button', { name: 'Version B', exact: true }).click();
    await expect(page.locator('article[data-view="branch-b"]')).toHaveClass(/mobile-active/);
  }
  const addArcQuickView = versionB(page).getByRole('button', { name: 'Add Quick View on Arc Headphones' });
  await expect(addArcQuickView).toBeVisible();
  await addArcQuickView.click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 selections');
  if (mobile) {
    const review = page.getByRole('button', { name: /2 selections Review/ });
    if (await review.isVisible()) await review.click();
  }
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  const arcCard = combined(page).getByRole('heading', { name: 'Arc Headphones' }).locator('xpath=ancestor::article');
  await expect(arcCard.getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  if (mobile) {
    await page.getByRole('button', { name: 'Version A', exact: true }).click();
    await expect(page.locator('article[data-view="branch-a"]')).toHaveClass(/mobile-active/);
  }
  await page.getByRole('button', { name: 'Edit categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('button', { name: 'Save customization' })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'All' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Desk' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'All' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).toContainText('1 selection');
  await expect(dock).toContainText('All, Audio');
  await expect(dock).not.toContainText('Quick View · Arc Headphones');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('2 selections');
  await expect(dock).toContainText('All, Audio');
  await expect(dock).toContainText('Quick View · Arc Headphones');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} customizes and atomically adds the sidebar from Details`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await runCustomizeBeforeAddJourney(page, viewport.name === 'mobile');
  });
}

test('ordinary sidebar is updated in place by appearance-only customization', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  const dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'Show “Categories” heading' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Show product counts' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('1 selection');
  await expect(dock.locator('.selection-chip')).toHaveCount(1);
  await expect(dock).toContainText('Heading: Hidden');
  await expect(dock).toContainText('Counts: Shown');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true }).locator('[data-ums-product-count="audio"]')).toHaveText('2');
});

async function runRecordedAudioConfigurationJourney(page: Page) {
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await dialog.getByRole('radio', { name: 'Audio' }).check();
  await dialog.getByRole('button', { name: 'Save customization' }).click();

  await openMobileReviewIfCollapsed(page);
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Category sidebar');
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');

  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'All' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Desk' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'All' })).toHaveCount(0);
  await expect(dialog.getByRole('radio', { name: 'Audio' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Desk' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Travel' })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).not.toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Audio');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} persists the exact recorded Audio configuration through previews, reopening, Undo, and Redo`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(compareUrl);
    await runRecordedAudioConfigurationJourney(page);
    if (viewport.name === 'mobile') {
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
}

test('production journey persists one Travel-excluded sidebar decision everywhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await versionA(page).getByRole('button', { name: 'Add Category sidebar' }).click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'Travel' }).uncheck();
  await dialog.getByRole('button', { name: 'Save customization' }).click();

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('All, Audio, Desk');
  await expect(dock).toContainText('Default: All');
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();

  await page.getByRole('button', { name: 'Edit categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'Travel' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'All' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await expect(dock).not.toContainText('Default: All');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true })).toHaveCount(0);
  await expect(dock).toContainText('All, Audio, Desk');
  await expect(dock).toContainText('Default: All');
});

test('desktop configures the sidebar atomically and composes it with Desk Stand Quick View', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);

  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('region', { name: 'Selection history' })).toContainText('Customized Category sidebar');
  await page.getByRole('button', { name: 'History' }).click();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).not.toContainText('Default: Desk');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('Default: Desk');

  await versionB(page).getByRole('heading', { name: 'Desk Stand' }).scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.getByText('Configured preview', { exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(1);
  await expect(combined(page).getByRole('heading', { name: 'Desk Stand' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();
  await combined(page).getByRole('button', { name: 'Audio', exact: true }).click();
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('unsupported temporary All falls back to permanent Desk with an explanation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(compareUrl);
  await expect(versionA(page).getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await addAndConfigureSidebar(page);
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(page.locator('.context-notice')).toContainText('All is not included in this result. Showing the default category, Desk.');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.comparison-shell')).toHaveAttribute('data-context-category', 'all');
});

test('mobile editor, Review, and configured result remain reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await addAndConfigureSidebar(page);
  const review = page.getByRole('button', { name: '1 selection Review' });
  await review.click();
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

async function runAppearanceConfigurationJourney(page: Page, mobile: boolean) {
  await page.goto(compareUrl);
  await page.getByRole('button', { name: 'Customize & add' }).click();
  let dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await dialog.getByRole('checkbox', { name: 'All' }).uncheck();
  await dialog.getByRole('radio', { name: 'Desk' }).check();
  await dialog.getByRole('checkbox', { name: 'Show “Categories” heading' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Show product counts' }).check();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();

  if (mobile) await openMobileReviewIfCollapsed(page);
  const dock = page.getByRole('complementary', { name: 'Current selections' });
  await expect(dock).toContainText('Audio, Desk, Travel');
  await expect(dock).toContainText('Default: Desk');
  await expect(dock).toContainText('Heading: Hidden');
  await expect(dock).toContainText('Counts: Shown');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(versionA(page).getByRole('button', { name: 'Audio', exact: true }).locator('[data-ums-product-count="audio"]')).toHaveText('2');
  await expect(versionA(page).getByRole('button', { name: 'Desk', exact: true }).locator('[data-ums-product-count="desk"]')).toHaveText('2');
  await expect(versionA(page).getByRole('button', { name: 'Travel', exact: true }).locator('[data-ums-product-count="travel"]')).toHaveText('1');

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dock).not.toContainText('Heading: Hidden');
  await expect(dock).toContainText('0 selections');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeVisible();
  await expect(versionA(page).locator('[data-ums-product-count]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(dock).toContainText('Heading: Hidden');
  await expect(versionA(page).getByText('Categories', { exact: true })).toBeHidden();

  if (mobile) {
    const minimize = page.getByRole('button', { name: /1 selection Minimize/ });
    if (await minimize.isVisible()) await minimize.click();
    await page.getByRole('button', { name: 'Version B', exact: true }).click();
  }
  await versionB(page).getByRole('heading', { name: 'Desk Stand' }).scrollIntoViewIfNeeded();
  await versionB(page).getByRole('button', { name: 'Add Quick View on Desk Stand' }).click();
  if (mobile) {
    const review = page.getByRole('button', { name: /2 selections Review/ });
    if (await review.isVisible()) await review.click();
  }
  await page.getByRole('button', { name: 'View combined' }).click();
  await expect(combined(page).getByText('Categories', { exact: true })).toBeHidden();
  await expect(combined(page).getByRole('button', { name: 'All', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).getByRole('button', { name: 'Audio', exact: true }).locator('[data-ums-product-count="audio"]')).toHaveText('2');
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true }).locator('[data-ums-product-count="desk"]')).toHaveText('2');
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true }).locator('[data-ums-product-count="travel"]')).toHaveText('1');
  await expect(combined(page).getByRole('heading', { name: 'Desk Stand' }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Back to comparison', exact: true }).first().click();
  if (mobile) await page.getByRole('button', { name: 'Version A', exact: true }).click();
  await page.getByRole('button', { name: 'Edit categories' }).click();
  dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'Show “Categories” heading' })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Show product counts' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Desk' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`${viewport.name} applies one atomic category and appearance decision in both previews`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await runAppearanceConfigurationJourney(page, viewport.name === 'mobile');
  });
}
