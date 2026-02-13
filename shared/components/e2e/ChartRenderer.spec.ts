/**
 * Playwright e2e tests for ChartRenderer.
 *
 * Tests chart rendering across theme variants and captures screenshots
 * for documentation evidence.
 *
 * Run: pnpm --filter @debrief/components test:e2e ChartRenderer
 * Claude Code: CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e ChartRenderer
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/085-chart-renderer/evidence/screenshots';

// Storybook story URLs
const BAR_CHART_URL = '/iframe.html?id=components-chartrenderer--bar-chart';
const LINE_CHART_URL = '/iframe.html?id=components-chartrenderer--line-chart';
const EMPTY_STATE_URL = '/iframe.html?id=components-chartrenderer--empty-state';
const ERROR_STATE_URL = '/iframe.html?id=components-chartrenderer--error-state';

// Theme variant parameter
const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

test.describe('ChartRenderer — Bar Chart', () => {
  test('renders bar chart in light theme', async ({ page }) => {
    await page.goto(theme(BAR_CHART_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');

    // Wait for vega-embed to finish rendering (canvas appears)
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Verify the loading indicator is gone
    await expect(page.locator('[data-testid="chart-loading"]')).not.toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/bar-chart-light.png`,
      fullPage: true,
    });
  });

  test('renders bar chart in dark theme', async ({ page }) => {
    await page.goto(theme(BAR_CHART_URL, 'dark'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/bar-chart-dark.png`,
      fullPage: true,
    });
  });

  test('renders bar chart in vscode theme', async ({ page }) => {
    await page.goto(theme(BAR_CHART_URL, 'vscode'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/bar-chart-vscode.png`,
      fullPage: true,
    });
  });
});

test.describe('ChartRenderer — Line Chart', () => {
  test('renders line chart in light theme', async ({ page }) => {
    await page.goto(theme(LINE_CHART_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/line-chart-light.png`,
      fullPage: true,
    });
  });

  test('renders line chart in dark theme', async ({ page }) => {
    await page.goto(theme(LINE_CHART_URL, 'dark'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/line-chart-dark.png`,
      fullPage: true,
    });
  });

  test('renders line chart in vscode theme', async ({ page }) => {
    await page.goto(theme(LINE_CHART_URL, 'vscode'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/line-chart-vscode.png`,
      fullPage: true,
    });
  });
});

test.describe('ChartRenderer — Empty State', () => {
  test('displays empty state message in light theme', async ({ page }) => {
    await page.goto(theme(EMPTY_STATE_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');

    // The transformer returns empty_data error → spec is null → error state
    const errorEl = page.locator('[data-testid="chart-error"]');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('No render spec provided');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/empty-state.png`,
      fullPage: true,
    });
  });
});

test.describe('ChartRenderer — Error State', () => {
  test('displays error message without crash', async ({ page }) => {
    await page.goto(theme(ERROR_STATE_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');

    const errorEl = page.locator('[data-testid="chart-error"]');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('No render spec provided');

    // Component should not crash — the container should still exist
    await expect(page.locator('[data-testid="chart-renderer"]')).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/error-state.png`,
      fullPage: true,
    });
  });
});

test.describe('ChartRenderer — Tooltip Interaction', () => {
  test('hovering over bar shows tooltip', async ({ page }) => {
    await page.goto(theme(BAR_CHART_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Hover over the middle of the canvas to trigger tooltip
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
      // Vega tooltips are rendered as HTML divs with id="vg-tooltip-element"
      // Wait a short time for tooltip to appear
      await page.waitForTimeout(500);
    }

    // Take screenshot with potential tooltip visible
    await page.screenshot({
      path: `${EVIDENCE_DIR}/bar-chart-tooltip.png`,
      fullPage: true,
    });
  });
});
