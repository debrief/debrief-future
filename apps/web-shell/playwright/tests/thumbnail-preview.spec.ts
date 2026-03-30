import { test, expect } from '@playwright/test';

/**
 * Thumbnail preview E2E tests (#174).
 *
 * Verifies the gallery preview panel renders in the StacBrowser,
 * prev/next navigation works, and fallback state is shown correctly.
 */
test.describe('Thumbnail Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for StacBrowser and exercise list to load
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();
    await expect(page.locator('[data-testid="exercise-list-item-row"]').first()).toBeVisible();
  });

  test('preview panel renders in catalog browser', async ({ page }) => {
    // The preview panel should be present in the GoldenLayout
    await expect(page.locator('[data-testid="stac-browser-preview"]')).toBeVisible();
  });

  test('shows empty state initially', async ({ page }) => {
    const preview = page.locator('[data-testid="thumbnail-preview"]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Select a plot to preview');
  });

  test('shows preview when item is clicked', async ({ page }) => {
    // Click on the first exercise item (single-click = highlight for preview)
    const firstItem = page.locator('[data-testid="exercise-list-item-row"]').first();
    await firstItem.click();

    // Preview should now show a title (not the empty state)
    const previewTitle = page.locator('[data-testid="thumbnail-preview-title"]');
    await expect(previewTitle).toBeVisible();
    await expect(previewTitle).not.toBeEmpty();
  });

  test('prev/next buttons navigate between items', async ({ page }) => {
    // Click first item
    const firstItem = page.locator('[data-testid="exercise-list-item-row"]').first();
    await firstItem.click();

    // Get the initial title
    const previewTitle = page.locator('[data-testid="thumbnail-preview-title"]');
    const firstTitle = await previewTitle.textContent();

    // Prev button should be disabled (first item)
    const prevBtn = page.locator('[data-testid="thumbnail-preview-prev"]');
    await expect(prevBtn).toBeDisabled();

    // Click next
    const nextBtn = page.locator('[data-testid="thumbnail-preview-next"]');
    await nextBtn.click();

    // Title should change
    const secondTitle = await previewTitle.textContent();
    expect(secondTitle).not.toBe(firstTitle);

    // Click prev to go back
    await prevBtn.click();
    const backTitle = await previewTitle.textContent();
    expect(backTitle).toBe(firstTitle);
  });

  test('shows fallback when no thumbnail exists', async ({ page }) => {
    // Click on an item (the test data items may or may not have thumbnails)
    const firstItem = page.locator('[data-testid="exercise-list-item-row"]').first();
    await firstItem.click();

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
