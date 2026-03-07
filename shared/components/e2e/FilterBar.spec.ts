/**
 * Playwright e2e tests for FilterBar (#127).
 *
 * Tests filter bar rendering and interaction across theme variants.
 * Captures screenshots for documentation evidence.
 *
 * Run: pnpm --filter @debrief/components test:e2e FilterBar
 * Claude Code: CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e FilterBar
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/127-filter-bar-lozenge-ui/evidence/screenshots';

// Storybook story URLs
const EMPTY_URL = '/iframe.html?id=filterbar--empty';
const INTERACTIVE_URL = '/iframe.html?id=filterbar--interactive';

// Theme variant parameter
const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

test.describe('FilterBar — Empty State', () => {
  test('renders empty state with hint text in light theme', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-testid="filter-bar-hint"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-add-button"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-light.png`,
      fullPage: true,
    });
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'dark'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-dark.png`,
      fullPage: true,
    });
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'vscode'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-vscode.png`,
      fullPage: true,
    });
  });
});

test.describe('FilterBar — Interactive', () => {
  test('add filter flow', async ({ page }) => {
    await page.goto(theme(INTERACTIVE_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Click (+) button to open filter type dropdown
    await page.click('[data-testid="filter-add-button"]');
    await expect(page.locator('[data-testid="filter-type-dropdown"]')).toBeVisible();

    // Select Nationality
    await page.click('[data-testid="filter-type-nationality"]');

    // Select French from value dropdown
    await page.click('[data-testid="value-option-French"]');

    // Verify lozenge appears
    await expect(page.locator('text=Nationality')).toBeVisible();
    await expect(page.locator('text=French')).toBeVisible();

    // Verify hint is gone
    await expect(page.locator('[data-testid="filter-bar-hint"]')).not.toBeVisible();
  });

  test('remove filter flow', async ({ page }) => {
    await page.goto(theme(INTERACTIVE_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Add a filter first
    await page.click('[data-testid="filter-add-button"]');
    await page.click('[data-testid="filter-type-nationality"]');
    await page.click('[data-testid="value-option-French"]');
    await expect(page.locator('text=French')).toBeVisible();

    // Click remove button
    await page.click('[title="Remove filter"]');

    // Verify hint reappears
    await expect(page.locator('[data-testid="filter-bar-hint"]')).toBeVisible();
  });

  test('create OR group', async ({ page }) => {
    await page.goto(theme(INTERACTIVE_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    // Click (+) and select OR group
    await page.click('[data-testid="filter-add-button"]');
    await page.click('[data-testid="filter-type-or-group"]');

    // OR container should appear
    await expect(page.locator('text=OR')).toBeVisible();
  });
});
