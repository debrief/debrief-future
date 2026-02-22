/**
 * Screenshot: real VS Code extension webview with Leaflet map + activity panel.
 *
 * Opens a STAC plot via the tree view, then opens the Debrief sidebar
 * activity panel. Uses two workarounds:
 *
 * 1. Route interception for vscode-resource.vscode-cdn.net URLs
 *    (DNS fails in sandboxed envs, serve from local filesystem)
 * 2. MessagePort injection for the sidebar webview
 *    (resolveWebviewView never sends content in code-server)
 *
 * The activity panel HTML is constructed to match what the extension
 * would generate, loading the real activityPanel.js bundle.
 */
import { test, expect } from './fixtures/base';
import { readFileSync, existsSync } from 'fs';
import {
  installWebviewInterceptor,
  removeCodeServerServiceWorker,
  waitForActiveFrame,
} from './helpers/webview-injector';

// The extension URI root in the code-server installation
const EXT_ROOT = '/root/.local/share/code-server/extensions/debrief.debrief-vscode-0.1.0';

/**
 * Build the activity panel HTML matching what _getHtmlContent() generates,
 * but with the script loaded via a file:// URL that our route interceptor
 * can serve. We strip the CSP to allow loading.
 */
function buildActivityPanelHtml(): string {
  // Read the real bundle and inline it (avoids cross-origin issues in blob iframe)
  const bundlePath = `${EXT_ROOT}/dist/webview/activityPanel.js`;
  const bundleJs = existsSync(bundlePath) ? readFileSync(bundlePath, 'utf-8') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activity Panel</title>
  <style>
    :root {
      --debrief-bg-primary: var(--vscode-sideBar-background);
      --debrief-bg-secondary: var(--vscode-input-background);
      --debrief-bg-tertiary: var(--vscode-list-hoverBackground);
      --debrief-text-primary: var(--vscode-foreground);
      --debrief-text-secondary: var(--vscode-descriptionForeground);
      --debrief-border-color: var(--vscode-panel-border);
      --debrief-border-color-focus: var(--vscode-focusBorder);
      --debrief-accent: var(--vscode-focusBorder);
      --debrief-accent-hover: var(--vscode-focusBorder);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
    .activity-panel-webview {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${bundleJs}</script>
</body>
</html>`;
}

test.describe('Real Webview Screenshot', () => {
  test.setTimeout(120_000);

  test('map panel + activity panel combined', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    // ─── Set up route interception for vscode-resource URLs ───
    await page.route('**/*.vscode-resource.vscode-cdn.net/**', async (route) => {
      const url = route.request().url();
      const pathMatch = url.match(/vscode-cdn\.net(\/.*)/);
      const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
      if (filePath && existsSync(filePath)) {
        const body = readFileSync(filePath);
        const ext = filePath.split('.').pop() || '';
        const ct: Record<string, string> = {
          js: 'application/javascript', css: 'text/css',
          png: 'image/png', svg: 'image/svg+xml',
        };
        await route.fulfill({ body, contentType: ct[ext] || 'application/octet-stream' });
      } else {
        await route.continue();
      }
    });

    // Placeholder for OSM tiles
    const greyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgwAcAAB0AAe3d7qkAAAAASUVORK5CYII=',
      'base64'
    );
    await page.route('**/*.tile.openstreetmap.org/**', async (route) => {
      await route.fulfill({ body: greyPng, contentType: 'image/png' });
    });

    // Wait for extension
    await page.waitForTimeout(8_000);

    // Dismiss notifications
    const closeButtons = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await closeButtons.count(); i++) {
      await closeButtons.nth(i).click().catch(() => {});
    }

    // ─── Step 1: Open the plot via STAC tree (map in editor) ───

    // Navigate to Explorer view first (ensure sidebar is showing the tree views)
    await page.keyboard.press('Control+Shift+E');
    await page.waitForTimeout(2_000);

    // Wait for the STAC STORES pane header to appear (extension must be activated)
    const stacHeader = page.locator('.pane-header:has-text("STAC STORES")');
    await stacHeader.waitFor({ state: 'visible', timeout: 30_000 }).catch(async () => {
      // Diagnostic: capture what's visible in the sidebar
      const paneHeaders = await page.locator('.pane-header').allTextContents();
      console.log(`  ✗ STAC STORES pane not found. Visible panes: ${JSON.stringify(paneHeaders)}`);
      await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-pane.png' });
      throw new Error('STAC STORES pane header not visible after 30s');
    });
    await stacHeader.click();
    await page.waitForTimeout(2_000);

    // Wait for the tree to populate with a store row
    const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
    await storeRow.waitFor({ state: 'visible', timeout: 15_000 }).catch(async () => {
      // Diagnostic: capture sidebar state
      const listRows = await page.locator('.monaco-list-row').allTextContents();
      console.log(`  ✗ No STAC store row found. Tree rows: ${JSON.stringify(listRows.slice(0, 10))}`);
      await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-row.png' });
      throw new Error('STAC store tree row not visible after 15s');
    });
    await storeRow.click();
    await page.waitForTimeout(1_000);

    const catalogNode = page.locator('.monaco-list-row:has-text("2 plots")').first();
    const twistie = catalogNode.locator('.monaco-tl-twistie');
    if (await twistie.isVisible().catch(() => false)) {
      await twistie.click();
    } else {
      await catalogNode.click();
    }
    await page.waitForTimeout(2_000);

    await page.locator('.monaco-list-row:has-text("Exercise Alpha")').first().click();
    console.log('  ✓ Opened Exercise Alpha (map panel)');

    // Wait for map webview to render
    await page.locator('iframe.webview').first().waitFor({ state: 'attached', timeout: 30_000 });

    // Poll for Leaflet
    for (let i = 0; i < 15; i++) {
      const hostFrame = page.frames().find(f =>
        f.url().includes('webview/browser/pre/index.html')
      );
      if (hostFrame) {
        const hasActive = await hostFrame.evaluate(
          () => !!document.getElementById('active-frame')
        ).catch(() => false);
        if (hasActive && hostFrame.childFrames().length > 0) {
          const hasLeaflet = await hostFrame.childFrames()[0].evaluate(
            () => !!document.querySelector('.leaflet-container')
          ).catch(() => false);
          if (hasLeaflet) {
            console.log(`  ✓ Leaflet map rendered`);
            break;
          }
        }
      }
      await page.waitForTimeout(1_000);
    }

    // ─── Step 2: Open the Debrief sidebar with activity panel ───

    // Build the real activity panel HTML with inlined JS bundle
    const activityHtml = buildActivityPanelHtml();
    console.log(`  Activity panel HTML size: ${activityHtml.length} bytes`);

    // Install the MessagePort interceptor before clicking the sidebar icon
    await installWebviewInterceptor(page, { html: activityHtml });
    await removeCodeServerServiceWorker(page);

    // Click the Debrief activity bar icon to open the sidebar
    const debriefIcon = page.locator('.action-item a[aria-label="Debrief"]').first();
    await debriefIcon.click();
    console.log('  ✓ Clicked Debrief sidebar icon');

    // Wait for the activity panel's #active-frame (second webview, not the map)
    await page.waitForTimeout(5_000); // Give sidebar webview time to create

    // Find the sidebar frame by looking for activity-panel content
    let sidebarFrame: import('@playwright/test').Frame | null = null;
    const hostFrames = page.frames().filter(f =>
      f.url().includes('workbench/contrib/webview/browser/pre')
    );
    console.log(`  Found ${hostFrames.length} webview host frames`);

    for (const host of hostFrames) {
      const hasActive = await host.evaluate(
        () => !!document.getElementById('active-frame')
      ).catch(() => false);
      if (hasActive && host.childFrames().length > 0) {
        const child = host.childFrames()[0];
        const hasActivityPanel = await child.evaluate(
          () => !!document.querySelector('.debrief-activity-panel')
        ).catch(() => false);
        if (hasActivityPanel) {
          sidebarFrame = child;
          console.log('  ✓ Found activity panel sidebar frame');
          break;
        }
      }
    }

    if (!sidebarFrame) {
      console.log('  ✗ Activity panel sidebar frame not found, trying last host frame...');
      // Fallback: use the last host frame with an active-frame
      for (const host of [...hostFrames].reverse()) {
        const hasActive = await host.evaluate(
          () => !!document.getElementById('active-frame')
        ).catch(() => false);
        if (hasActive && host.childFrames().length > 0) {
          sidebarFrame = host.childFrames()[0];
          const rootHTML = await sidebarFrame.evaluate(() => {
            const root = document.getElementById('root');
            return root ? root.innerHTML.substring(0, 200) : '(no root)';
          }).catch(() => '(error)');
          console.log(`  Fallback frame #root: ${rootHTML.substring(0, 120)}`);
          break;
        }
      }
    }

    // Wait for React to render
    await page.waitForTimeout(2_000);

    // Dismiss any remaining notifications
    const warnings = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await warnings.count(); i++) {
      await warnings.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);

    // ─── Screenshot 1: all sections expanded ───
    await page.screenshot({ path: 'tests/e2e/evidence/real-webview-combined.png' });
    console.log('  ✓ Combined screenshot saved (all expanded)');

    // ─── Step 3: Collapse Time Controller and Tools to show Layers ───
    if (sidebarFrame) {
      // Click the "Time Controller" section header to collapse it
      const collapsedTC = await sidebarFrame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.debrief-activity-panel__section-header'));
        const tcBtn = buttons.find(b => b.textContent?.includes('Time Controller'));
        if (tcBtn) { (tcBtn as HTMLElement).click(); return true; }
        return false;
      }).catch(() => false);
      console.log(`  ${collapsedTC ? '✓' : '✗'} Collapsed Time Controller`);

      await page.waitForTimeout(500);

      // Click the "Tools" section header to collapse it
      const collapsedTools = await sidebarFrame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('.debrief-activity-panel__section-header'));
        const toolsBtn = buttons.find(b => b.textContent?.includes('Tools'));
        if (toolsBtn) { (toolsBtn as HTMLElement).click(); return true; }
        return false;
      }).catch(() => false);
      console.log(`  ${collapsedTools ? '✓' : '✗'} Collapsed Tools`);

      await page.waitForTimeout(1_000);
    }

    // Dismiss any remaining notifications
    const toasts = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await toasts.count(); i++) {
      await toasts.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);

    // ─── Screenshot 2: Layers expanded, TC+Tools collapsed ───
    await page.screenshot({ path: 'tests/e2e/evidence/real-webview-layers-focus.png' });
    console.log('  ✓ Layers-focus screenshot saved (TC+Tools collapsed)');

    // Report frame inventory
    const frames = page.frames();
    console.log(`\n  Total frames: ${frames.length}`);
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('webview/browser/pre')) {
        const hasActive = await frame.evaluate(
          () => !!document.getElementById('active-frame')
        ).catch(() => false);
        console.log(`    webview: ${url.substring(0, 80)}... active-frame: ${hasActive}`);
      }
    }
  });
});
