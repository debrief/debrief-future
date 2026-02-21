/**
 * E2E Smoke Test: code-server loads with Debrief extension
 *
 * Lightweight checks that validate the code-server environment is functional:
 *   1. code-server loads and shows the VS Code workbench
 *   2. The Debrief activity-bar icon is present (extension installed + activated)
 *   3. The test-workspace sample files are visible in the Explorer
 *
 * These tests are designed to run in Claude Code cloud sessions where
 * code-server is started directly (not via Docker) and Chromium comes
 * from @sparticuz/chromium.
 *
 * Prerequisites (handled by bin/cloud-e2e-setup.sh):
 *   - code-server installed and running on port 8080
 *   - Debrief VSIX installed in code-server
 *   - Workspace trust disabled in user settings
 *   - @sparticuz/chromium extracted to .chromium-path
 *
 * @see docs/project_notes/code-server-cloud-testing.md
 */
import { test, expect } from '@playwright/test';

const CODE_SERVER_URL =
  process.env.CODE_SERVER_URL ?? 'http://localhost:8080';

// Longer timeouts for code-server cold-start in cloud
test.setTimeout(90_000);

test.describe('Smoke: code-server with Debrief extension', () => {
  test('S01: workbench loads successfully', async ({ page }) => {
    await page.goto(CODE_SERVER_URL, { waitUntil: 'domcontentloaded' });

    // Dismiss trust dialog if it appears (belt-and-suspenders — settings should prevent it)
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1000);
    }

    // Wait for the VS Code workbench to appear
    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });
    expect(await workbench.isVisible()).toBe(true);
  });

  test('S02: Debrief activity-bar icon is present', async ({ page }) => {
    await page.goto(CODE_SERVER_URL, { waitUntil: 'domcontentloaded' });

    // Dismiss trust dialog if it appears
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });

    // The Debrief extension registers activity bar containers with title "Debrief"
    // and "Debrief Log". These show up as action items in the activity bar.
    // VS Code ≥1.93 moved activity-bar items into the sidebar header, so we
    // cast a wide net across class names and use role="tab" as a fallback.
    const debriefActivity = page.locator(
      [
        '.activitybar [id*="debrief" i]',
        '.activitybar [aria-label*="Debrief" i]',
        // code-server may use different class names for the composite bar
        '.composite.bar [id*="debrief" i]',
        '.composite.bar [aria-label*="Debrief" i]',
        // VS Code ≥1.93 sidebar-integrated activity bar
        '.action-item[id*="debrief" i]',
        // Broadest: any tab with Debrief label (works across all layouts)
        '[role="tab"][aria-label*="Debrief"]',
      ].join(', ')
    );

    // Allow time for extension activation
    await debriefActivity.first().waitFor({ state: 'visible', timeout: 30_000 });
    expect(await debriefActivity.count()).toBeGreaterThan(0);
  });

  test('S03: sample workspace files are visible', async ({ page }) => {
    await page.goto(CODE_SERVER_URL, { waitUntil: 'domcontentloaded' });

    // Dismiss trust dialog if it appears
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });

    // Open Explorer if not already open (Ctrl+Shift+E)
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(1000);

    // The "samples" folder should be visible in the explorer tree
    const samplesFolder = page.locator('.monaco-workbench').getByText('samples');
    await samplesFolder.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Click to expand the samples folder
    await samplesFolder.first().click();
    await page.waitForTimeout(1000);

    // Now look for boat1.rep inside the expanded tree
    const repFile = page.locator('.monaco-workbench').getByText('boat1.rep');
    await repFile.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await repFile.count()).toBeGreaterThan(0);
  });

  test('S04: capture evidence screenshot', async ({ page }) => {
    await page.goto(CODE_SERVER_URL, { waitUntil: 'domcontentloaded' });

    // Dismiss trust dialog if it appears
    const trustButton = page.getByRole('button', {
      name: 'Yes, I trust the authors',
    });
    if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await trustButton.click();
      await page.waitForTimeout(1000);
    }

    const workbench = page.locator('.monaco-workbench');
    await workbench.waitFor({ state: 'visible', timeout: 60_000 });

    // Wait for things to settle
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/e2e/evidence/smoke-code-server.png',
      fullPage: false,
    });
  });
});
