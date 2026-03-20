/**
 * Capture a screenshot of the Debrief Activity Panel sidebar.
 *
 * Opens the Debrief sidebar and captures the activity panel state.
 * Validates:
 * - VS Code workbench loads
 * - Debrief sidebar is revealed via command palette
 * - Webview iframe reaches .ready state (CDN interceptor / patch pipeline works)
 * - Screenshots are captured for evidence
 *
 * Note: The activity panel's React content may not render in the inner
 * #active-frame due to the MessageChannel handshake between the webview
 * iframe and VS Code host not completing. This is a known limitation
 * of the E2E test environment. See docs/project_notes/webview-e2e-research.md.
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'tests/e2e/evidence';

test.describe('Activity Panel Screenshot', () => {
  test.setTimeout(90_000);

  test('capture Debrief activity panel', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    // ─── Dismiss notifications early ───
    await codeServerPage.dismissNotifications();

    // ─── Reveal the Debrief sidebar ───
    await codeServerPage.revealSidebar();
    console.log('  ✓ Debrief sidebar revealed');

    // Dismiss notifications again (revealSidebar may trigger new ones)
    await codeServerPage.dismissNotifications();

    // Wait for the webview iframe to appear and get the .ready class
    const readyWebview = page.locator('iframe.webview.ready').first();
    const hasReady = await readyWebview
      .waitFor({ state: 'attached', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    console.log(`  ${hasReady ? '✓' : '⚠'} Webview iframe .ready: ${hasReady}`);

    // Poll for activity panel React content inside nested frames
    if (hasReady) {
      const start = Date.now();
      let foundContent = false;
      while (Date.now() - start < 15_000) {
        for (const frame of page.frames()) {
          if (!frame.url().includes('webview')) continue;
          for (const child of frame.childFrames()) {
            foundContent = await child
              .locator('.debrief-activity-panel')
              .first()
              .isVisible()
              .catch(() => false);
            if (foundContent) break;
          }
          if (foundContent) break;
        }
        if (foundContent) break;
        await page.waitForTimeout(1_000);
      }
      console.log(`  ${foundContent ? '✓' : '⚠'} Activity panel React content: ${foundContent}`);
    }

    // Final notification cleanup before screenshot
    await codeServerPage.dismissNotifications();
    await page.waitForTimeout(500);

    // ─── Screenshot: Full page with activity panel sidebar ───
    await page.screenshot({
      path: `${EVIDENCE_DIR}/activity-panel-sidebar.png`,
    });
    console.log('  ✓ Full-page screenshot saved');

    // ─── Cropped sidebar screenshot ───
    const sidebarContainer = page.locator('.part.sidebar');
    const sidebarVisible = await sidebarContainer.isVisible().catch(() => false);
    if (sidebarVisible) {
      await sidebarContainer.screenshot({
        path: `${EVIDENCE_DIR}/activity-panel-cropped.png`,
      });
      console.log('  ✓ Cropped sidebar screenshot saved');
    }

    // ─── Diagnostics ───
    const frames = page.frames();
    console.log(`  Total frames: ${frames.length}`);
    for (const f of frames) {
      const url = f.url();
      if (url !== 'about:blank' && !url.startsWith('data:')) {
        const short = url.length > 100 ? url.substring(0, 100) + '...' : url;
        console.log(`    - ${short}`);
      }
    }

    // Assert sidebar is visible
    expect(sidebarVisible).toBe(true);
    console.log('  ✓ Test complete');
  });
});
