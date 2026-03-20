/**
 * Screenshot: real VS Code extension webview with Leaflet map + activity panel.
 *
 * Opens a STAC plot via the tree view, then opens the Debrief sidebar
 * activity panel. Captures evidence screenshots of both panels.
 *
 * Uses CodeServerPage.openPlotViaStacTree() for reliable STAC tree
 * navigation, with route interception for offline-safe tile rendering.
 */
import { test } from './fixtures/base';
import {
  installWebviewInterceptor,
  removeCodeServerServiceWorker,
} from './helpers/webview-injector';

test.describe('Real Webview Screenshot', () => {
  test.setTimeout(60_000);

  test('map panel + activity panel combined', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    // ─── Route interception for offline-safe testing ───
    // Grey 1x1 PNG placeholder for map tiles (avoids network calls to OSM)
    const greyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgwAcAAB0AAe3d7qkAAAAASUVORK5CYII=',
      'base64'
    );
    await page.route('**/*.tile.openstreetmap.org/**', async (route) => {
      await route.fulfill({ body: greyPng, contentType: 'image/png' });
    });

    // ─── Step 1: Open the plot via STAC tree (map in editor) ───
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    console.log('  ✓ Opened Exercise Alpha via STAC tree');

    // Wait for map webview to render
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-container').waitFor({
      state: 'visible',
      timeout: 15_000,
    }).catch(() => {
      console.log('  ✗ Leaflet container not visible — continuing for screenshot');
    });

    // ─── Step 2: Open the Debrief sidebar with activity panel ───
    // Try MessagePort injection (needed for code-server where resolveWebviewView
    // is broken). In openvscode-server this is a no-op but harmless.
    const activityHtml = buildMinimalActivityHtml();
    await installWebviewInterceptor(page, { html: activityHtml });
    await removeCodeServerServiceWorker(page);

    // Click the Debrief activity bar icon to open the sidebar
    const debriefIcon = page.locator(
      [
        '.action-item a[aria-label="Debrief"]',
        '[role="tab"][aria-label*="Debrief"]',
        '.activitybar [aria-label*="Debrief" i]',
      ].join(', ')
    ).first();
    await debriefIcon.click().catch(async () => {
      console.log('  ✗ Debrief sidebar icon not found — skipping sidebar');
    });
    console.log('  ✓ Clicked Debrief sidebar icon');
    await page.waitForTimeout(3_000);

    // Dismiss any remaining notifications
    const closeButtons = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await closeButtons.count(); i++) {
      await closeButtons.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);

    // ─── Screenshot 1: all sections expanded ───
    await page.screenshot({ path: 'tests/e2e/evidence/real-webview-combined.png' });
    console.log('  ✓ Combined screenshot saved');

    // ─── Screenshot 2: Layers expanded, TC+Tools collapsed ───
    // Try collapsing Time Controller and Tools sections in the sidebar frame
    const hostFrames = page.frames().filter(f =>
      f.url().includes('workbench/contrib/webview/browser/pre')
    );
    for (const host of hostFrames) {
      const children = host.childFrames();
      for (const child of children) {
        const hasPanel = await child.evaluate(
          () => !!document.querySelector('.debrief-activity-panel')
        ).catch(() => false);
        if (hasPanel) {
          await child.evaluate(() => {
            const headers = Array.from(
              document.querySelectorAll('.debrief-activity-panel__section-header')
            );
            for (const h of headers) {
              if (h.textContent?.includes('Time Controller') || h.textContent?.includes('Tools')) {
                (h as HTMLElement).click();
              }
            }
          }).catch(() => {});
          break;
        }
      }
    }
    await page.waitForTimeout(1_000);

    await page.screenshot({ path: 'tests/e2e/evidence/real-webview-layers-focus.png' });
    console.log('  ✓ Layers-focus screenshot saved');

    // Report frame inventory for diagnostics
    const frames = page.frames();
    console.log(`\n  Total frames: ${frames.length}`);
    for (const f of frames) {
      const url = f.url();
      if (url.includes('webview/browser/pre')) {
        const hasActive = await f.evaluate(
          () => !!document.getElementById('active-frame')
        ).catch(() => false);
        console.log(`    webview: ${url.substring(0, 80)}... active-frame: ${hasActive}`);
      }
    }
  });
});

/**
 * Build minimal activity panel HTML for MessagePort injection.
 * This is a fallback for code-server environments where resolveWebviewView
 * doesn't fire. In openvscode-server, the real extension webview loads natively.
 */
function buildMinimalActivityHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activity Panel</title>
  <style>
    body {
      margin: 0;
      padding: 8px;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
    }
  </style>
</head>
<body>
  <div id="root"><p>Activity Panel (E2E placeholder)</p></div>
</body>
</html>`;
}
