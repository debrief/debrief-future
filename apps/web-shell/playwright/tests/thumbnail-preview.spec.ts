import { test, expect } from '@playwright/test';

/**
 * Thumbnail preview E2E tests (#174).
 *
 * Verifies the inline preview renders within the exercises panel
 * when an item is clicked, and that double-click opens the plot.
 */
test.describe('Thumbnail Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for StacBrowser and exercise list to load
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="exercise-list-item-row"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('no preview shown initially', async ({ page }) => {
    // Preview should not be visible until an item is selected
    await expect(page.locator('[data-testid="stac-browser-preview"]')).not.toBeVisible();
  });

  test('shows inline preview when item is clicked', async ({ page }) => {
    // Click on the first exercise item (single-click = highlight for preview)
    const firstItem = page.locator('[data-testid="exercise-list-item-row"]').first();
    await firstItem.click();

    // Preview should now appear inline within the exercises panel
    await expect(page.locator('[data-testid="stac-browser-preview"]')).toBeVisible();

    // Either a thumbnail image or a fallback should be visible
    const hasImage = await page.locator('[data-testid="thumbnail-preview-image"]').isVisible().catch(() => false);
    const hasFallback = await page.locator('[data-testid="thumbnail-preview-fallback"]').isVisible().catch(() => false);
    expect(hasImage || hasFallback).toBe(true);
  });

  test('double-click opens the plot', async ({ page }) => {
    // Double-click the first item
    const firstItem = page.locator('[data-testid="exercise-list-item-row"]').first();
    await firstItem.dblclick();

    // Should navigate to analysis view
    await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 15000 });
  });
});
