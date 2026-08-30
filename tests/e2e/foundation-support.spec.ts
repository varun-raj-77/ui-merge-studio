import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function chooseFoundation(page: Page, name: RegExp) {
  await page.getByRole('button', { name: /^Foundation / }).click();
  await page.getByRole('radio', { name }).check();
  await page.keyboard.press('Escape');
  const select = page.getByRole('button', { name: 'Pick parts' });
  if (await select.isVisible()) await select.click();
}

async function keepSidebar(page: Page) {
  await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
}

async function keepQuickView(page: Page, product: string) {
  await versionB(page).getByRole('heading', { name: product }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

async function quickView(frame: FrameLocator, product: string, present: boolean) {
  const button = frame.locator('article').filter({ hasText: product }).getByRole('button', { name: 'Quick view', exact: true });
  if (present) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

async function workspaceAction(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name }).click();
}

async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test('Main foundation preserves the historical selective composition', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await page.getByRole('button', { name: /^Foundation / }).click();
  await expect(page.getByRole('radio', { name: /Main/ })).toBeChecked();
  await page.keyboard.press('Escape');
  await keepSidebar(page);
  await keepQuickView(page, 'Desk Stand');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await quickView(combined(page), 'Desk Stand', true);
  await quickView(combined(page), 'Task Lamp', false);
  await expectNoOverflow(page);
});

test('Version A foundation includes its complete behavior and exactly two Version B additions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await chooseFoundation(page, /Version A/);
  await expect(page.getByRole('button', { name: /Foundation Version A/ })).toBeVisible();
  await keepQuickView(page, 'Desk Stand');
  await keepQuickView(page, 'Task Lamp');

  await page.getByRole('button', { name: /Foundation Version A/ }).click();
  await page.getByRole('button', { name: 'Inspect foundation evidence' }).click();
  const evidence = page.getByRole('dialog', { name: 'Foundation · Version A' });
  await expect(evidence).toContainText('branch-a');
  await expect(evidence).toContainText('Pinned commit');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(combined(page).getByText('Seasonal edit')).toBeVisible();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await quickView(combined(page), 'Desk Stand', true);
  await quickView(combined(page), 'Task Lamp', true);
  await quickView(combined(page), 'Arc Headphones', false);
  await page.getByRole('button', { name: 'Compare again' }).click();
  await page.keyboard.press('Control+Z');
  await page.keyboard.press('Control+Z');
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('button', { name: /Foundation Main/ })).toBeVisible();
  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('button', { name: /Foundation Version A/ })).toBeVisible();
  await expectNoOverflow(page);
});

test('Version B foundation includes every Quick View and accepts the Version A sidebar once', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(compareUrl);
  await chooseFoundation(page, /Version B/);
  await page.getByRole('button', { name: 'More selection actions for Version B' }).click();
  await page.getByRole('menuitem', { name: 'Included with Version B' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'already included because Version B is the foundation' })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss selection explanation' }).click();
  await keepSidebar(page);
  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await expect(combined(page).getByRole('complementary', { name: 'Category sidebar' })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(5);
  await expect(combined(page).getByText('5 products ready')).toBeVisible();
  await expectNoOverflow(page);
});

test('incompatible foundation is refused and the previous safe plan remains active', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await keepQuickView(page, 'Desk Stand');
  const safeIdentity = await page.locator('main.comparison-shell').getAttribute('data-integration-plan-id');
  await page.getByRole('button', { name: /^Foundation / }).click();
  await page.getByRole('radio', { name: /Experimental Product-ID/ }).click();
  const refusal = page.getByRole('alertdialog', { name: 'Cannot use this foundation' });
  await expect(refusal).toContainText('replaces stable product IDs');
  await expect(page.locator('main.comparison-shell')).toHaveAttribute('data-integration-plan-id', safeIdentity!);
  await refusal.getByRole('button', { name: 'Keep previous foundation' }).click();
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
});

test('mobile foundation plan remains keyboard accessible, reversible, and overflow-free', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(compareUrl);
  await page.getByRole('button', { name: /^Foundation / }).click();
  const main = page.getByRole('radio', { name: /Main/ });
  await main.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /Version A/ })).toBeChecked();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await keepQuickView(page, 'Desk Stand');
  await page.getByRole('button', { name: /Combine 1 part/ }).click();
  await quickView(combined(page), 'Desk Stand', true);
  await workspaceAction(page, /Undo/);
  await quickView(combined(page), 'Desk Stand', false);
  await workspaceAction(page, 'Redo');
  await quickView(combined(page), 'Desk Stand', true);
  await expectNoOverflow(page);
});
