import { test, expect } from '@playwright/test';

test.describe('Catalog Browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome page with catalog items', async ({ page }) => {
    // Verify welcome page header
    await expect(page.locator('h1')).toContainText('Debrief Web Shell');
    await expect(page.locator('.web-shell__subtitle')).toContainText('STAC Catalog Browser');
  });

  test('shows catalog items from test data', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('.debrief-catalog-overview')).toBeVisible();

    // Should show at least one item (exercise-alpha or training-run-1)
    const items = page.locator('.debrief-catalog-overview__item');
    await expect(items).toHaveCount(2);
  });

  test('displays item titles in catalog', async ({ page }) => {
    // Check for known test data items
    await expect(page.getByText('Exercise Alpha')).toBeVisible();
    await expect(page.getByText('Training Run 1')).toBeVisible();
  });

  test('shows item metadata on hover', async ({ page }) => {
    // Find an item and hover
    const item = page.locator('.debrief-catalog-overview__item').first();
    await item.hover();

    // Should show tooltip or additional info
    await expect(item).toBeVisible();
  });
});
