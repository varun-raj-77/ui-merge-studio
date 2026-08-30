import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';
const versionA = (page: Page) => page.frameLocator('iframe[title="Version A live application"]');
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

function productCard(frame: FrameLocator, name: string) {
  return frame.locator('article').filter({ hasText: name });
}

async function keepSidebar(page: Page) {
  await versionA(page).getByRole('complementary', { name: 'Category sidebar' }).evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: 'Keep Category sidebar from Version A' }).click();
}

async function keepQuickView(page: Page, product: string) {
  await versionB(page).getByRole('heading', { name: product }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

async function workspaceAction(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name }).click();
}

async function setTryMode(page: Page) {
  const control = page.getByRole('button', { name: 'Return to Try mode' });
  if (await control.isVisible()) await control.click();
}

async function setPickMode(page: Page) {
  const control = page.getByRole('button', { name: 'Pick parts' });
  if (await control.isVisible()) await control.click();
}

test('desktop selections support undo, redo, redo invalidation, and context exclusion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  const shell = page.locator('main.comparison-shell');

  await setTryMode(page);
  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('desk');
  await setPickMode(page);
  await keepSidebar(page);
  await keepQuickView(page, 'Task Lamp');
  await keepQuickView(page, 'Desk Stand');
  await expect(shell).toHaveAttribute('data-history-past', '3');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 picked');

  await page.keyboard.press('Control+Z');
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await expect(shell).toHaveAttribute('data-history-future', '2');

  await page.keyboard.press('Control+Shift+Z');
  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 picked');
  await page.keyboard.press('Control+Z');
  await page.getByRole('button', { name: 'Remove Quick View on Task Lamp' }).click();
  await expect(shell).toHaveAttribute('data-history-future', '0');
  await expect(versionA(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
});

test('combined result removes a feature and Undo restores its exact candidate in place', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await setTryMode(page);
  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await setPickMode(page);
  await keepSidebar(page);
  await keepQuickView(page, 'Desk Stand');
  await versionB(page).getByRole('button', { name: 'Quick view Desk Stand', exact: true }).press('Enter');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Quick View · Desk Stand' }).click();
  await expect(combined(page).getByRole('button', { name: 'Desk' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.ums-history-feedback')).toContainText('Removed Quick View · Desk Stand');
  await page.keyboard.press('Control+Z');
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toBeVisible();

  await combined(page).getByRole('button', { name: 'Desk' }).focus();
  await page.keyboard.press('Control+Z');
  await expect(combined(page).getByRole('dialog', { name: 'Desk Stand quick view' })).toHaveCount(0);
});

test('Clear selections is one reversible action and keyboard shortcuts respect typing controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(compareUrl);
  const shell = page.locator('main.comparison-shell');
  await keepSidebar(page);
  await keepQuickView(page, 'Studio Speaker');
  await workspaceAction(page, 'Clear selections');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toHaveCount(0);
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('2 picked');
  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toHaveCount(0);

  await page.keyboard.press('Control+Z');
  const pastBeforeTyping = await shell.getAttribute('data-history-past');
  await versionB(page).getByLabel('Browse category').focus();
  await page.keyboard.press('Control+Z');
  await expect(shell).toHaveAttribute('data-history-past', pastBeforeTyping ?? '');
  await expect(versionB(page).getByLabel('Browse category')).toHaveValue('all');
});

test('mobile overflow keeps history controls reachable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await setTryMode(page);
  await versionA(page).getByRole('button', { name: 'Desk' }).click();
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await setPickMode(page);
  await keepQuickView(page, 'Desk Stand');

  await workspaceAction(page, /Undo/);
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toHaveCount(0);
  await workspaceAction(page, 'Redo');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('1 picked');
  await workspaceAction(page, 'Selection history');
  await expect(page.getByRole('dialog', { name: 'Selection history' })).toContainText('Added Quick View · Desk Stand');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
