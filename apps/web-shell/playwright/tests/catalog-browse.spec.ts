import { test, expect } from '@playwright/test';

// Catalog browse tests — verifies welcome view and StacBrowser.
test.describe('Catalog Browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome page with catalog items', async ({ page }) => {
    // Verify welcome page header
    await expect(page.locator('h1')).toContainText('Debrief Web Shell');
    await expect(page.locator('.web-shell__subtitle')).toContainText('STAC Catalog Browser');
  });

  test('shows StacBrowser component', async ({ page }) => {
    // Wait for StacBrowser to load
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();

    // Should show exercise list with items
    await expect(page.locator('[data-testid="exercise-list-view"]')).toBeVisible();
  });

  test('displays item titles in catalog', async ({ page }) => {
    // Wait for exercise list items to render inside GoldenLayout panel
    await expect(page.locator('[data-testid="exercise-list-item-row"]').first()).toBeVisible();

    // Check for known test data items via specific title testid
    await expect(page.locator('[data-testid="exercise-item-title"]', { hasText: 'Exercise Alpha' })).toBeVisible();
    await expect(page.locator('[data-testid="exercise-item-title"]', { hasText: 'Training Run 1' })).toBeVisible();
  });

  test('shows filter bar', async ({ page }) => {
    // Filter bar should be visible in StacBrowser
    await expect(page.locator('[data-testid="stac-browser-filter-bar"]')).toBeVisible();
  });
});
