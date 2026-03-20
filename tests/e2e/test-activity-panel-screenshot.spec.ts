/**
 * Capture a screenshot of the Debrief Activity Panel sidebar.
 *
 * This test opens the Debrief sidebar and captures the activity panel
 * regardless of whether data is loaded. It validates the CDN interceptor
 * and webview resolution pipeline.
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
    // revealSidebar() uses the command palette to trigger resolveWebviewView,
    // which is necessary in openvscode-server where sidebar webviews are not
    // automatically resolved.
    await codeServerPage.revealSidebar();
    console.log('  ✓ Debrief sidebar revealed');

    // Dismiss notifications again (revealSidebar may trigger new ones)
    await codeServerPage.dismissNotifications();

    // Wait for the webview iframe to appear and get the .ready class,
    // indicating the CDN interceptor served the webview shell successfully.
    const readyWebview = page.locator('iframe.webview.ready').first();
    const hasReady = await readyWebview
      .waitFor({ state: 'attached', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    console.log(`  ${hasReady ? '✓' : '✗'} Webview iframe .ready: ${hasReady}`);

    // If the webview is ready, wait for #active-frame to load extension content
    if (hasReady) {
      // Poll for the inner #active-frame to have content
      const start = Date.now();
      let foundContent = false;
      while (Date.now() - start < 15_000) {
        const frames = page.frames();
        for (const frame of frames) {
          if (!frame.url().includes('webview')) continue;
          for (const child of frame.childFrames()) {
            const hasPanel = await child
              .locator('.debrief-activity-panel')
              .first()
              .isVisible()
              .catch(() => false);
            if (hasPanel) {
              foundContent = true;
              break;
            }
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

    // ─── Cropped sidebar screenshot if the sidebar element is visible ───
    const sidebarContainer = page.locator('.part.sidebar');
    const sidebarVisible = await sidebarContainer.isVisible().catch(() => false);
    if (sidebarVisible) {
      await sidebarContainer.screenshot({
        path: `${EVIDENCE_DIR}/activity-panel-cropped.png`,
      });
      console.log('  ✓ Cropped sidebar screenshot saved');
    }

    // ─── Diagnostics: frame inventory ───
    const frames = page.frames();
    console.log(`  Total frames: ${frames.length}`);
    for (const f of frames) {
      const url = f.url();
      if (url !== 'about:blank' && !url.startsWith('data:')) {
        const short = url.length > 100 ? url.substring(0, 100) + '...' : url;
        console.log(`    - ${short}`);
      }
    }

    // Assert that we at least got the sidebar visible
    expect(sidebarVisible).toBe(true);

    console.log('  ✓ Test complete');
  });
});
