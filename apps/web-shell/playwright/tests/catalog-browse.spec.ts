import { test, expect } from '@playwright/test';

// Catalog browse tests — verifies welcome view and STAC catalog timeline.
test.describe('Catalog Browse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays welcome page with catalog items', async ({ page }) => {
    // Verify welcome page header
    await expect(page.locator('h1')).toContainText('Debrief Web Shell');
    await expect(page.locator('.web-shell__subtitle')).toContainText('STAC Catalog Browser');
  });

  test('shows catalog overview component', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('.catalog-overview')).toBeVisible();

    // Should show timeline with items (as SVG bars or points)
    await expect(page.locator('.catalog-overview__timeline')).toBeVisible();
  });

  test('displays item titles in catalog', async ({ page }) => {
    // Check for known test data items in timeline labels
    await expect(page.getByText('Exercise Alpha')).toBeVisible();
    await expect(page.getByText('Training Run 1')).toBeVisible();
  });

  test('shows item metadata on hover', async ({ page }) => {
    // Find a timeline bar/point and hover
    const timelineBar = page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first();
    await timelineBar.hover();

    // Should show tooltip
    await expect(page.locator('.catalog-overview__tooltip')).toBeVisible();
  });
});
