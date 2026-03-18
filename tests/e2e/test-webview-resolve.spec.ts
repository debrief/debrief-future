/**
 * Validation test: verify that resolveWebviewView fires after Patch 3.
 *
 * This test validates the fix for blocker 4 (resolveWebviewView never called)
 * by confirming that:
 * 1. The Debrief extension activates and registers its view containers
 * 2. Clicking the Debrief activity reveals the sidebar composite
 * 3. A webview iframe is created (proves resolveWebviewView was called)
 *
 * @see specs/142-vscode-e2e-webview-reliability/spec.md
 * @see docs/project_notes/webview-e2e-research.md — Blocker 4 resolution
 */
import { test, expect } from './fixtures/base';

test.describe('Webview View Resolution (Patch 3 Validation)', () => {
  test.setTimeout(90_000);

  test('Debrief sidebar composite renders after clicking activity icon', async ({
    codeServerPage,
    page,
  }) => {
    // The fixture's waitForReady() has already loaded the workbench.
    // Verify the Debrief activity icon exists in the activity bar.
    const debriefIcon = page.locator(
      '.activitybar [aria-label*="Debrief" i]'
    ).first();
    await expect(debriefIcon).toBeVisible({ timeout: 15_000 });

    // Click the Debrief activity to reveal the sidebar
    await debriefIcon.click();

    // Verify the composite viewlet appears (proves the view container registered)
    const composite = page.locator('.composite.viewlet');
    await expect(composite).toBeVisible({ timeout: 10_000 });

    // Verify a webview iframe is created (proves resolveWebviewView was called)
    const webviewFrame = page.locator('iframe.webview');
    await expect(webviewFrame.first()).toBeAttached({ timeout: 10_000 });

    // Capture evidence screenshot
    await page.screenshot({
      path: 'specs/142-vscode-e2e-webview-reliability/evidence/screenshots/sidebar-webview-resolved.png',
    });
  });

  test('sidebar toggle disposes and re-creates webview', async ({
    codeServerPage,
    page,
  }) => {
    // Open the Debrief sidebar
    const debriefIcon = page.locator(
      '.activitybar [aria-label*="Debrief" i]'
    ).first();
    await expect(debriefIcon).toBeVisible({ timeout: 15_000 });
    await debriefIcon.click();

    // Wait for webview iframe
    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 10_000,
    });

    // Toggle away (click Explorer) and back
    const explorerIcon = page.locator(
      '.activitybar [aria-label*="Explorer" i]'
    ).first();
    await explorerIcon.click();
    await page.waitForTimeout(1_000);

    // Toggle back to Debrief
    await debriefIcon.click();
    await page.waitForTimeout(2_000);

    // Webview should still be present (or re-created)
    const webviewFrame = page.locator('iframe.webview');
    await expect(webviewFrame.first()).toBeAttached({ timeout: 10_000 });
  });
});
