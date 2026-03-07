/**
 * Playwright E2E tests for Saved Filter Configurations (#128).
 *
 * Tests save/restore/delete flows and theme variants against Storybook stories.
 *
 * Run: pnpm --filter @debrief/components test:e2e SavedFilters
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/128-saved-filter-configurations/evidence/screenshots';

// Storybook story URLs
const STORIES = {
  empty: '/iframe.html?id=filterbar-saved-filters--empty',
  withSaved: '/iframe.html?id=filterbar-saved-filters--with-saved',
  saveFlow: '/iframe.html?id=filterbar-saved-filters--save-flow',
};

const withTheme = (url: string, theme: 'light' | 'dark' | 'vscode') =>
  `${url}&globals=theme:${theme}`;

// --- Theme Variant Tests (T017) ---

test.describe('Saved Filters — Theme Variants', () => {
  test('renders in light theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.saveFlow, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-testid="save-filter-trigger"]')).toBeVisible();
    await expect(page.locator('[data-testid="saved-filters-trigger"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-light.png`,
      fullPage: true,
    });
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.saveFlow, 'dark'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-testid="save-filter-trigger"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-dark.png`,
      fullPage: true,
    });
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.saveFlow, 'vscode'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-testid="save-filter-trigger"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-vscode.png`,
      fullPage: true,
    });
  });
});

// --- Empty State Tests ---

test.describe('Saved Filters — Empty State', () => {
  test('shows "No saved filters" when dropdown opened', async ({ page }) => {
    await page.goto(withTheme(STORIES.empty, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="saved-filters-trigger"]');
    await expect(page.locator('[data-testid="saved-filters-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="saved-filters-empty"]')).toHaveText('No saved filters');
  });

  test('save button is disabled when no active filters', async ({ page }) => {
    await page.goto(withTheme(STORIES.empty, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-testid="save-filter-trigger"]')).toBeDisabled();
  });
});

// --- Interaction Tests (T018) ---

test.describe('Saved Filters — Save Flow', () => {
  test('can save a filter configuration', async ({ page }) => {
    await page.goto(withTheme(STORIES.saveFlow, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Click Save button
    await page.click('[data-testid="save-filter-trigger"]');
    await expect(page.locator('[data-testid="save-filter-popover"]')).toBeVisible();

    // Type a name
    await page.fill('[data-testid="save-filter-name-input"]', 'My Test Filter');

    // Click confirm
    await page.click('[data-testid="save-filter-confirm"]');

    // Popover should close
    await expect(page.locator('[data-testid="save-filter-popover"]')).not.toBeVisible();

    // Verify it appears in the dropdown
    await page.click('[data-testid="saved-filters-trigger"]');
    await expect(page.locator('text=My Test Filter')).toBeVisible();
  });
});

test.describe('Saved Filters — Restore Flow', () => {
  test('can restore a saved configuration', async ({ page }) => {
    await page.goto(withTheme(STORIES.withSaved, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Open dropdown
    await page.click('[data-testid="saved-filters-trigger"]');
    await expect(page.locator('[data-testid="saved-filters-dropdown"]')).toBeVisible();

    // Verify saved configs are listed
    await expect(page.locator('text=French Exercises')).toBeVisible();
    await expect(page.locator('text=ASW Convoy')).toBeVisible();

    // Click to restore
    await page.click('[data-testid="saved-filter-restore-saved-1"]');

    // Dropdown should close
    await expect(page.locator('[data-testid="saved-filters-dropdown"]')).not.toBeVisible();
  });
});

test.describe('Saved Filters — Delete Flow', () => {
  test('can delete a saved configuration', async ({ page }) => {
    await page.goto(withTheme(STORIES.withSaved, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Open dropdown
    await page.click('[data-testid="saved-filters-trigger"]');
    await expect(page.locator('text=French Exercises')).toBeVisible();

    // Delete an entry
    await page.click('[data-testid="saved-filter-delete-saved-1"]');

    // Verify entry removed
    await expect(page.locator('text=French Exercises')).not.toBeVisible();
    // Other entry still present
    await expect(page.locator('text=ASW Convoy')).toBeVisible();
  });
});

// --- Screenshot Capture ---

test.describe('Saved Filters — Screenshots', () => {
  test('capture with-saved state', async ({ page }) => {
    await page.goto(withTheme(STORIES.withSaved, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Open dropdown for screenshot
    await page.click('[data-testid="saved-filters-trigger"]');
    await expect(page.locator('[data-testid="saved-filters-dropdown"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/with-saved-dropdown.png`,
      fullPage: true,
    });
  });

  test('capture save popover', async ({ page }) => {
    await page.goto(withTheme(STORIES.saveFlow, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="save-filter-trigger"]');
    await expect(page.locator('[data-testid="save-filter-popover"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/save-popover.png`,
      fullPage: true,
    });
  });
});
