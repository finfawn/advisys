import { test, expect } from '@playwright/test';

test('app shell loads and brand is visible', async ({ page }) => {
  await page.goto('/');
  // Expect the brand text from top navs to be present somewhere
  const brand = page.getByRole('button', { name: 'adviSys' });
  await expect(brand).toBeVisible();
});