import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the page title contains expected text
  await expect(page).toHaveTitle(/Security Headers Analyzer/);

  // Check for main heading with specific text
  await expect(page.getByRole('heading', { name: /Secure Your Website/i })).toBeVisible();

  // Check that the URL input field is present
  await expect(page.locator('input[placeholder*="example.com"]')).toBeVisible();
});

test('analyze button is present and clickable', async ({ page }) => {
  await page.goto('/');

  // Find the analyze button (should be disabled initially)
  const analyzeButton = page.getByRole('button', { name: /Analyze Security Headers/i });
  await expect(analyzeButton).toBeVisible();
  await expect(analyzeButton).toBeDisabled();

  // Fill in URL to enable the button
  const urlInput = page.locator('input[placeholder*="example.com"]');
  await urlInput.fill('https://example.com');

  // Now button should be enabled
  await expect(analyzeButton).toBeEnabled();
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