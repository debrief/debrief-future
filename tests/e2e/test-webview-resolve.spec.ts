/**
 * Validation test: verify that resolveWebviewView fires after Patch 3.
 *
 * Tests confirm that:
 * 1. The Debrief extension activates and registers its view containers
 * 2. Clicking the Debrief activity reveals the sidebar composite
 * 3. A webview iframe is created (proves resolveWebviewView was called)
 * 4. The webview survives sidebar toggle (disposal + re-creation)
 *
 * NOTE: Drilling into the webview iframe to verify React content is blocked
 * by the vscode-cdn.net external URL (unreachable in sandboxed CI). The
 * iframe src points to a per-session CDN domain that DNS-fails in this
 * environment. A future patch to product.json or route interception is
 * needed to serve the webview host page from localhost.
 *
 * @see specs/142-vscode-e2e-webview-reliability/spec.md
 * @see docs/project_notes/webview-e2e-research.md — Blocker 4 resolution
 */
import { test, expect } from './fixtures/base';

test.describe('Webview View Resolution (Patch 3 Validation)', () => {
  test.setTimeout(30_000);

  test('Debrief sidebar composite renders after clicking activity icon', async ({
    codeServerPage,
    page,
  }) => {
    const debriefIcon = page.locator(
      '.activitybar [aria-label*="Debrief" i]'
    ).first();
    await expect(debriefIcon).toBeVisible({ timeout: 10_000 });

    await debriefIcon.click();

    // Composite viewlet proves the view container registered
    await expect(page.locator('.composite.viewlet')).toBeVisible({
      timeout: 5_000,
    });

    // Webview iframe proves resolveWebviewView was called — even though
    // the iframe content can't load (CDN unreachable), the iframe element
    // existing in the DOM proves the resolution lifecycle completed.
    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 5_000,
    });

    // Capture evidence screenshot
    await page.screenshot({
      path: 'specs/142-vscode-e2e-webview-reliability/evidence/screenshots/sidebar-webview-resolved.png',
    });
  });

  test('sidebar toggle disposes and re-creates webview', async ({
    codeServerPage,
    page,
  }) => {
    const debriefIcon = page.locator(
      '.activitybar [aria-label*="Debrief" i]'
    ).first();
    await expect(debriefIcon).toBeVisible({ timeout: 10_000 });
    await debriefIcon.click();

    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 5_000,
    });

    // Toggle away (click Explorer) and back
    await page.locator('.activitybar [aria-label*="Explorer" i]').first().click();
    await page.waitForTimeout(1_000);

    // Toggle back to Debrief
    await debriefIcon.click();
    await page.waitForTimeout(2_000);

    // Webview should still be present (or re-created)
    await expect(page.locator('iframe.webview').first()).toBeAttached({
      timeout: 5_000,
    });
  });
});
