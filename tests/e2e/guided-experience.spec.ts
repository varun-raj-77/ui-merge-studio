import { expect, test } from '@playwright/test';

test('clearly distinguishes the hosted replay from real local Git execution', async ({ page }) => {
  await page.goto('/?mode=showcase');
  await expect(page.getByRole('heading', { name: 'Compare React branches. Keep the best parts.' })).toBeVisible();
  await expect(page.getByText('Interactive sample — no Git operations run in your browser.')).toBeVisible();
  await expect(page.getByText(/local mode launches branches in isolated worktrees/i)).toBeVisible();
  await page.getByRole('button', { name: 'Try interactive sample' }).click();
  await expect(page.getByRole('heading', { name: 'Choose the interface you want.' })).toBeVisible();
});

test('is keyboard operable and structurally labelled in landing and comparison states', async ({ page }) => {
  await page.goto('/?mode=showcase');
  await page.getByRole('button', { name: 'Try interactive sample' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('tab', { name: 'Branch B' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Quick view/ }).first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Arc Headphones quick view' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('h1').count()).toBe(1);
  expect(await page.locator('button').evaluateAll(buttons => buttons.filter(button => !(button.getAttribute('aria-label') || button.textContent?.trim())).length)).toBe(0);
});
