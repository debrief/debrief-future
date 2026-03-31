/**
 * Playwright e2e tests for ChartRenderer auto-refresh stories.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Tests auto-refresh rendering across theme variants and interaction flows.
 *
 * Run: pnpm --filter @debrief/components test:e2e ChartAutoRefresh
 * Claude Code: CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e ChartAutoRefresh
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/001-result-auto-refresh/evidence/screenshots';

// Storybook story URLs
const AUTO_REFRESH_URL = '/iframe.html?id=components-chartrenderer--auto-refresh';
const PAUSE_RESUME_URL = '/iframe.html?id=components-chartrenderer--pause-resume';

// Theme variant parameter
const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

test.describe('Auto-Refresh — Data Update Simulation', () => {
  test('renders auto-refresh story in light theme', async ({ page }) => {
    await page.goto(theme(AUTO_REFRESH_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/auto-refresh-light.png`,
      fullPage: true,
    });
  });

  test('renders auto-refresh story in dark theme', async ({ page }) => {
    await page.goto(theme(AUTO_REFRESH_URL, 'dark'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/auto-refresh-dark.png`,
      fullPage: true,
    });
  });

  test('renders auto-refresh story in vscode theme', async ({ page }) => {
    await page.goto(theme(AUTO_REFRESH_URL, 'vscode'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/auto-refresh-vscode.png`,
      fullPage: true,
    });
  });

  test('clicking refresh button updates the chart', async ({ page }) => {
    await page.goto(theme(AUTO_REFRESH_URL, 'light'));
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Click the refresh button
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    await expect(refreshButton).toContainText('v1');
    await refreshButton.click();

    // Wait for re-render
    await page.waitForTimeout(500);
    await expect(refreshButton).toContainText('v2');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/auto-refresh-after-update.png`,
      fullPage: true,
    });
  });
});

test.describe('Auto-Refresh — Pause/Resume', () => {
  test('renders pause/resume story in light theme', async ({ page }) => {
    await page.goto(theme(PAUSE_RESUME_URL, 'light'));
    await page.waitForSelector('[data-testid="chart-renderer"]');
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/pause-resume-light.png`,
      fullPage: true,
    });
  });

  test('pause blocks updates, resume flushes pending', async ({ page }) => {
    await page.goto(theme(PAUSE_RESUME_URL, 'light'));
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Pause
    const pauseButton = page.locator('[data-testid="pause-resume-button"]');
    await expect(pauseButton).toContainText('Pause');
    await pauseButton.click();
    await expect(pauseButton).toContainText('Resume');

    // Trigger data change while paused
    await page.locator('[data-testid="data-change-button"]').click();

    // Verify pending badge appears
    const pendingBadge = page.locator('[data-testid="pending-badge"]');
    await expect(pendingBadge).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/pause-resume-pending.png`,
      fullPage: true,
    });

    // Resume — pending should flush
    await pauseButton.click();
    await expect(pauseButton).toContainText('Pause');
    await expect(pendingBadge).not.toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/pause-resume-resumed.png`,
      fullPage: true,
    });
  });
});
