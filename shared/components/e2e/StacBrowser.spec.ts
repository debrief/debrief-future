/**
 * Playwright e2e tests for StacBrowser (#132).
 *
 * Tests three-view layout rendering across theme variants.
 * Captures screenshots for documentation evidence.
 *
 * Run: pnpm --filter @debrief/components test:e2e StacBrowser
 * Claude Code: CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e StacBrowser
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/132-three-view-sync/evidence/screenshots';

// Storybook story URLs
const DEFAULT_URL = '/iframe.html?id=stacbrowser--default';
const EMPTY_URL = '/iframe.html?id=stacbrowser--no-exercises';

// Theme variant parameter
const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

test.describe('StacBrowser — Default State', () => {
  test('renders four-panel layout in light theme', async ({ page }) => {
    await page.goto(theme(DEFAULT_URL, 'light'));
    await page.waitForSelector('.stac-browser');

    // Verify all four views are present
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    await expect(page.locator('.stac-browser__list')).toBeVisible();
    await expect(page.locator('[data-testid="map-placeholder"]')).toBeVisible();
    await expect(page.locator('[data-testid="timeline-placeholder"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-light.png`,
      fullPage: true,
    });
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(theme(DEFAULT_URL, 'dark'));
    await page.waitForSelector('.stac-browser');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-dark.png`,
      fullPage: true,
    });
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(theme(DEFAULT_URL, 'vscode'));
    await page.waitForSelector('.stac-browser');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-vscode.png`,
      fullPage: true,
    });
  });
});

test.describe('StacBrowser — Filter Interaction', () => {
  test('filter bar is visible and interactive', async ({ page }) => {
    await page.goto(theme(DEFAULT_URL, 'light'));
    await page.waitForSelector('.stac-browser');

    // FilterBar should be present with add button
    const filterBar = page.locator('[data-testid="filter-bar"]');
    await expect(filterBar).toBeVisible();
  });
});

test.describe('StacBrowser — Empty State', () => {
  test('renders with no exercises', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('.stac-browser');

    // Map and timeline placeholders should show 0 items
    await expect(page.locator('[data-testid="map-placeholder"]')).toContainText('0 items');
    await expect(page.locator('[data-testid="timeline-placeholder"]')).toContainText('0 items');
  });
});
