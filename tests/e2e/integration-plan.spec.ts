import { expect, test, type FrameLocator, type Page } from '@playwright/test';

const compareUrl = '/?mode=showcase&view=compare&select=parts';
const versionB = (page: Page) => page.frameLocator('iframe[title="Version B live application"]');
const combined = (page: Page) => page.frameLocator('iframe[title="Combined result application"]');

async function configureSidebar(page: Page, options: {
  enabled: ('All' | 'Audio' | 'Desk' | 'Travel')[];
  defaultCategory: 'All' | 'Audio' | 'Desk' | 'Travel';
  heading: boolean;
  counts: boolean;
}) {
  await page.getByRole('button', { name: 'More selection actions for Version A' }).click();
  await page.getByRole('menuitem', { name: 'Customize Category sidebar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  for (const label of ['All', 'Audio', 'Desk', 'Travel'] as const) {
    const checkbox = dialog.getByRole('checkbox', { name: label });
    if (options.enabled.includes(label)) await checkbox.check(); else await checkbox.uncheck();
  }
  await dialog.getByRole('radio', { name: options.defaultCategory }).check();
  const heading = dialog.getByRole('checkbox', { name: /Show.*heading/ });
  const counts = dialog.getByRole('checkbox', { name: 'Show product counts' });
  if (options.heading) await heading.check(); else await heading.uncheck();
  if (options.counts) await counts.check(); else await counts.uncheck();
  await dialog.getByRole('button', { name: 'Add customized sidebar' }).click();
}

async function keepQuickView(page: Page, product: string) {
  await versionB(page).getByRole('heading', { name: product }).locator('xpath=ancestor::article').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await page.getByRole('button', { name: `Keep Quick View on ${product} from Version B` }).click();
}

async function expectQuickView(frame: FrameLocator, product: string, present: boolean) {
  const button = frame.getByRole('heading', { name: product }).locator('xpath=ancestor::article').getByRole('button', { name: 'Quick view', exact: true });
  if (present) await expect(button).toBeVisible(); else await expect(button).toHaveCount(0);
}

async function workspaceAction(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name: 'More workspace actions' }).click();
  await page.getByRole('menuitem', { name }).click();
}

test('complete canonical plan drives configured result, history, and editor hydration', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Desk', 'Travel'], defaultCategory: 'Desk', heading: false, counts: true });
  await keepQuickView(page, 'Desk Stand');
  await keepQuickView(page, 'Task Lamp');
  await expect(page.getByRole('complementary', { name: 'Current selections' })).toContainText('3 picked');

  const shell = page.locator('main.comparison-shell');
  const planIdentity = await shell.getAttribute('data-integration-plan-id');
  expect(planIdentity).toMatch(/^plan-v2-[a-f0-9]{8}$/);
  await expect(shell).toHaveAttribute('data-preview-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-generation-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-verification-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-evidence-plan-id', planIdentity!);
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');

  await page.getByRole('button', { name: /Combine 3 parts/ }).click();
  const frame = page.getByTitle('Combined result application');
  await expect(frame).not.toHaveAttribute('src');
  await expect(frame).toHaveAttribute('srcdoc', /<body><\/body>/);
  await expect(combined(page).getByText('Form & Field · Combined edit', { exact: true })).toBeVisible();
  await expect(combined(page).getByText('Categories', { exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(combined(page).locator('[data-ums-product-count="audio"]')).toHaveText('2');
  await expectQuickView(combined(page), 'Task Lamp', true);
  await expectQuickView(combined(page), 'Desk Stand', true);

  await workspaceAction(page, /Undo/);
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(1);
  await workspaceAction(page, 'Redo');
  await expect(combined(page).getByRole('button', { name: 'Quick view', exact: true })).toHaveCount(2);

  await page.getByRole('button', { name: 'Compare again' }).click();
  await page.getByRole('button', { name: 'Pick parts' }).click();
  await page.getByRole('button', { name: 'More selection actions for Version A' }).click();
  await page.getByRole('menuitem', { name: 'Edit category selection' }).click();
  const dialog = page.getByRole('dialog', { name: 'Category sidebar' });
  await expect(dialog.getByRole('checkbox', { name: 'All' })).not.toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Desk' })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: /Show.*heading/ })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Show product counts' })).toBeChecked();
});

test('non-matrix plan renders without a historical candidate and keeps projection identities aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Travel'], defaultCategory: 'Travel', heading: false, counts: true });
  await keepQuickView(page, 'Arc Headphones');
  await keepQuickView(page, 'Carry Case');
  const shell = page.locator('main.comparison-shell');
  const identity = await shell.getAttribute('data-integration-plan-id');
  await expect(shell).toHaveAttribute('data-generation-plan-id', identity!);
  await expect(shell).toHaveAttribute('data-verification-plan-id', identity!);
  await expect(shell).toHaveAttribute('data-historical-artifact-required', 'false');
  await page.getByRole('button', { name: /Combine 3 parts/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Showing the default category, Travel.' })).toBeVisible();
  await expect(combined(page).getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0);
  await expect(combined(page).getByRole('button', { name: 'Travel', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectQuickView(combined(page), 'Carry Case', true);
  await combined(page).getByRole('button', { name: 'Audio', exact: true }).click();
  await expectQuickView(combined(page), 'Arc Headphones', true);
  await expectQuickView(combined(page), 'Studio Speaker', false);
  await expect(shell).toHaveAttribute('data-integration-plan-id', identity!);
});

test('mobile configured plan, refusal recovery, undo, and redo remain reachable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(compareUrl);
  await configureSidebar(page, { enabled: ['Audio', 'Travel'], defaultCategory: 'Travel', heading: false, counts: true });
  await page.getByRole('button', { name: 'Version B', exact: true }).click();
  await keepQuickView(page, 'Arc Headphones');
  await page.getByRole('button', { name: /Combine 2 parts/ }).click();
  await expectQuickView(combined(page), 'Carry Case', false);
  await workspaceAction(page, /Undo/);
  await workspaceAction(page, 'Redo');
  await page.getByRole('button', { name: 'Compare again' }).click();
  await workspaceAction(page, 'Experimental Product-ID change');
  await page.getByRole('button', { name: 'Review refusal' }).click();
  const refusal = page.getByRole('dialog', { name: 'Cannot combine safely' });
  await expect(refusal).toContainText('shared product identity contract');
  await refusal.getByRole('button', { name: 'Change selection' }).click();
  await expect(page.getByRole('button', { name: /Combine 2 parts/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
