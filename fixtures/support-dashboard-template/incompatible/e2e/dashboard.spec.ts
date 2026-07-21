import { test, expect } from '@playwright/test';
test('opens a selected ticket through the path contract', async ({ page }) => { await page.goto('/tickets/TCK-102'); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Payment gateway timeout' })).toBeVisible(); });
