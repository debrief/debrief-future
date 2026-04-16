/**
 * Playwright E2E tests for the platform chip (#186).
 *
 * Covers E1–E7 from specs/186-filter-chips/contracts/test-list.md.
 * Run:
 *   pnpm --filter @debrief/components test:e2e FilterBar.platform
 * In Claude Code cloud sessions, use:
 *   node apps/web-shell/run-playwright.mjs
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/186-filter-chips/evidence/screenshots';

const PLATFORM_STORY = '/iframe.html?id=filterbar--with-platform-chip';
const EMPTY_URL = '/iframe.html?id=filterbar--empty';
const INTERACTIVE_URL = '/iframe.html?id=filterbar--interactive';
const OR_STORY = '/iframe.html?id=filterbar--platform-chips-in-an-or-group';

const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

test.describe('Platform chip — theme variants (E7)', () => {
  test('renders in light theme', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');
    // The chip id is seeded from the story data
    await expect(page.getByTestId('lozenge-story-p1')).toBeVisible();
    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-light.png`,
      fullPage: true,
    });
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'dark'));
    await page.waitForSelector('[data-testid="filter-bar"]');
    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-dark.png`,
      fullPage: true,
    });
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'vscode'));
    await page.waitForSelector('[data-testid="filter-bar"]');
    await page.screenshot({
      path: `${EVIDENCE_DIR}/component-vscode.png`,
      fullPage: true,
    });
  });
});

test.describe('Platform chip — user flows (E1–E5)', () => {
  // E1: add platform chip via UI
  test('E1: add a platform chip via the UI', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="filter-add-button"]');
    await expect(page.getByTestId('filter-type-platform')).toBeVisible();
    await page.click('[data-testid="filter-type-platform"]');
    await expect(page.getByTestId('platform-value-editor')).toBeVisible();

    // At least one picker should be present.
    await expect(page.getByTestId('platform-editor-row-nationality')).toBeVisible();

    // Pick whatever nationality is available first (story-dependent).
    const natSelect = page.getByTestId('platform-editor-select-nationality');
    const natCount = await natSelect.locator('option').count();
    test.skip(natCount < 2, 'No catalog nationalities to pick from');
    await natSelect.selectOption({ index: 1 });

    const confirmBtn = page.getByTestId('platform-editor-confirm');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // A platform chip should appear — any lozenge with data-shape="platform".
    await expect(page.locator('[data-shape="platform"]').first()).toBeVisible();
  });

  // E4: editor blocks confirm with zero attributes
  test('E4: confirm button disabled until an attribute is selected', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="filter-add-button"]');
    await page.click('[data-testid="filter-type-platform"]');
    await expect(page.getByTestId('platform-editor-confirm')).toBeDisabled();
  });

  // E3: negate platform chip
  test('E3: toggle negate on a platform chip', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    const negateBtn = page.getByTestId('lozenge-negate-story-p1');
    await negateBtn.click();
    await expect(page.locator('text=NOT').first()).toBeVisible();
  });

  // E5: remove platform chip
  test('E5: remove a platform chip', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.getByTestId('lozenge-story-p1')).toBeVisible();
    await page.getByTestId('lozenge-remove-story-p1').click();
    await expect(page.getByTestId('lozenge-story-p1')).toHaveCount(0);
  });
});

test.describe('Platform chip — OR composition (E6)', () => {
  test('E6: two platform chips appear inside an OR container', async ({ page }) => {
    await page.goto(theme(OR_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-shape="platform"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="or-container-"]')).toBeVisible();
  });
});

test.describe('Platform chip — edit flow (E2)', () => {
  test('E2: edit a platform chip opens the compound editor', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.getByTestId('lozenge-body-story-p1').click();
    await expect(page.getByTestId('platform-value-editor')).toBeVisible();
  });
});
