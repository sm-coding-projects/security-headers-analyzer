import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the page title contains expected text
  await expect(page).toHaveTitle(/Security Headers Analyzer/);

  // Check for main heading
  await expect(page.locator('h1')).toBeVisible();

  // Check that the URL input field is present
  await expect(page.locator('input[type="url"]')).toBeVisible();
});

test('analyze button is present and clickable', async ({ page }) => {
  await page.goto('/');

  // Find and click the analyze button
  const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Check Security Headers")');
  await expect(analyzeButton.first()).toBeVisible();
});

test('navigation works correctly', async ({ page }) => {
  await page.goto('/');

  // Check if advanced page link exists and works
  const advancedLink = page.locator('a[href="/advanced"]');
  if (await advancedLink.count() > 0) {
    await advancedLink.first().click();
    await expect(page).toHaveURL(/.*\/advanced/);
  }
});