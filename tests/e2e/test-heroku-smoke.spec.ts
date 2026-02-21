/**
 * E2E Smoke Test: Heroku Review App with Debrief extension
 *
 * Tests the deployed Heroku review app (code-server + Debrief extension).
 * Designed to run against a remote HTTPS URL with generous timeouts
 * to handle Heroku dyno cold-starts.
 *
 * Usage:
 *   HEROKU_APP_URL=https://<app>.herokuapp.com \
 *     pnpm exec playwright test --config tests/e2e/playwright.config.ts \
 *     tests/e2e/test-heroku-smoke.spec.ts
 *
 * Prerequisites:
 *   - A deployed Heroku review app (via PR)
 *   - Playwright + Chromium installed locally
 */
import { test, expect } from '@playwright/test';

const HEROKU_URL =
  process.env.HEROKU_APP_URL ??
  process.env.CODE_SERVER_URL ??
  'http://localhost:8080';

// Heroku dynos can take 30s+ to wake from sleep
test.setTimeout(120_000);

test.describe('Heroku Review App: Debrief Extension', () => {
  test('H01: Heroku app responds with 200', async ({ request }) => {
    const response = await request.get(HEROKU_URL, { timeout: 60_000 });
    expect(response.status()).toBe(200);
  });

  test('H02: code-server workbench loads', async ({ page }) => {
    await page.goto(HEROKU_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Dismiss workspace trust dialog if it appears
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1_000);
    }

    // Wait for VS Code workbench
    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });
    expect(await workbench.isVisible()).toBe(true);
  });

  test('H03: Debrief activity-bar icon is present', async ({ page }) => {
    await page.goto(HEROKU_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Dismiss trust dialog
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1_000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });

    // Look for Debrief activity bar entry
    const debriefActivity = page.locator(
      [
        '.activitybar [id*="debrief" i]',
        '.activitybar [aria-label*="Debrief" i]',
        '.composite.bar [id*="debrief" i]',
        '.composite.bar [aria-label*="Debrief" i]',
      ].join(', ')
    );

    await debriefActivity.first().waitFor({ state: 'visible', timeout: 30_000 });
    expect(await debriefActivity.count()).toBeGreaterThan(0);
  });

  test('H04: sample files visible in Explorer', async ({ page }) => {
    await page.goto(HEROKU_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Dismiss trust dialog
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1_000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });

    // Open Explorer
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(1_000);

    // samples folder should be visible
    const samplesFolder = workbench.getByText('samples');
    await samplesFolder.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Expand and check for REP files
    await samplesFolder.first().click();
    await page.waitForTimeout(1_000);

    const repFile = workbench.getByText('boat1.rep');
    await repFile.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await repFile.count()).toBeGreaterThan(0);
  });

  test('H05: capture evidence screenshot', async ({ page }) => {
    await page.goto(HEROKU_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    // Dismiss trust dialog
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1_000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForTimeout(3_000);

    await page.screenshot({
      path: 'tests/e2e/evidence/heroku-review-app.png',
      fullPage: false,
    });
  });
});
