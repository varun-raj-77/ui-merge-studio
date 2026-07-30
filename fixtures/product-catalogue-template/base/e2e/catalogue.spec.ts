import { expect, test } from '@playwright/test';
test('renders the catalogue', async ({ page }) => { await page.goto('/catalogue'); await expect(page.getByLabel('Product Catalogue')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Objects for focused work.' })).toBeVisible(); });
