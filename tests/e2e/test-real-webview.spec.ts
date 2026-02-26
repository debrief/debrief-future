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

    // Helper: focus the STAC Stores view via command palette.
    // This ensures the view is scrolled into view and has sufficient render height,
    // which is critical in CI where the Explorer sidebar may allocate minimal
    // space to the STAC STORES pane by default.
    const focusStacView = async (): Promise<void> => {
      await page.keyboard.press('Control+Shift+P');
      await page.waitForTimeout(500);
      await page.keyboard.type('View: Focus on STAC Stores View', { delay: 20 });
      await page.waitForTimeout(1_000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2_000);
    };

    // Helper: wait for extension activation by polling for context indicators.
    // Returns true if stores are ready, false if still loading after timeout.
    const waitForExtensionReady = async (timeoutMs: number): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const loadingVisible = await page.getByText('Loading stores').isVisible().catch(() => false);
        if (!loadingVisible) {
          // Extension has activated (either has stores or shows "No STAC stores configured")
          return true;
        }
        console.log('  Extension still loading stores, waiting...');
        await page.waitForTimeout(2_000);
      }
      return false;
    };

    // Helper: ensure the STAC STORES pane is expanded (not collapsed).
    // Clicking the pane header TOGGLES expand/collapse, so we must check
    // the aria-expanded attribute first to avoid collapsing an already-open pane.
    const stacHeader = page.locator('.pane-header:has-text("STAC STORES")');
    const ensureStacPaneExpanded = async (): Promise<void> => {
      await stacHeader.waitFor({ state: 'visible', timeout: 30_000 }).catch(async () => {
        const paneHeaders = await page.locator('.pane-header').allTextContents();
        console.log(`  ✗ STAC STORES pane not found. Visible panes: ${JSON.stringify(paneHeaders)}`);
        await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-pane.png' });
        throw new Error('STAC STORES pane header not visible after 30s');
      });

      // Check expansion state — only click if collapsed
      const expanded = await stacHeader.getAttribute('aria-expanded');
      console.log(`  STAC STORES pane aria-expanded: ${expanded}`);
      if (expanded === 'false') {
        console.log('  Clicking to expand STAC STORES pane');
        await stacHeader.click();
        await page.waitForTimeout(1_500);
      } else if (expanded === null) {
        // aria-expanded not present — pane may use different DOM; try scrolling into view
        console.log('  No aria-expanded attribute; clicking header to toggle');
        await stacHeader.click();
        await page.waitForTimeout(1_500);
        // Verify we didn't collapse it — check if any list rows appeared
        const hasRows = await page.locator('.monaco-list-row').count();
        if (hasRows === 0) {
          // We collapsed it; click again to re-expand
          console.log('  No rows visible after click — re-clicking to expand');
          await stacHeader.click();
          await page.waitForTimeout(1_500);
        }
      }
    };

    // Helper: capture diagnostic info about the STAC pane state
    const captureStacDiagnostics = async (label: string): Promise<void> => {
      const listRows = await page.locator('.monaco-list-row').allTextContents();
      console.log(`  [${label}] Tree rows: ${JSON.stringify(listRows.slice(0, 10))}`);
      // Check for welcome view text (indicates config is empty vs pane collapsed)
      const noStoresWelcome = await page.getByText('No STAC stores configured').isVisible().catch(() => false);
      const loadingWelcome = await page.getByText('Loading stores').isVisible().catch(() => false);
      if (noStoresWelcome) console.log(`  [${label}] Welcome view: "No STAC stores configured" — config is empty`);
      if (loadingWelcome) console.log(`  [${label}] Welcome view: "Loading stores…" — extension still initializing`);
      if (!noStoresWelcome && !loadingWelcome && listRows.length === 0) {
        console.log(`  [${label}] No tree rows and no welcome view — pane may be collapsed or not rendered`);
      }
    };

    // Focus the STAC Stores view directly — this gives it screen space and scrolls
    // it into view, avoiding issues where the pane has zero height in the Explorer.
    await focusStacView();

    // Wait for the extension to finish activating (Loading stores... disappears)
    const extensionReady = await waitForExtensionReady(20_000);
    console.log(`  Extension ready: ${extensionReady}`);

    // Ensure the STAC STORES pane is expanded
    await ensureStacPaneExpanded();

    // Wait for the tree to populate with a store row.
    // If the tree is empty (config missing), seed config via terminal + reload.
    const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
    let storeRowVisible = await storeRow.waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!storeRowVisible) {
      await captureStacDiagnostics('initial');
      await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-row.png' });

      console.log('  ✗ STAC tree empty — seeding config via terminal + reloading');

      // Write config via terminal (ConfigService only watches existing files,
      // so we must reload the window for the extension to pick it up)
      await page.keyboard.press('Control+Backquote');
      await page.waitForTimeout(2_000);
      const configCmd =
        'mkdir -p ~/.config/debrief && ' +
        'echo \'{"stores":[{"id":"local-store","path":"/workspace/test-workspace/local-store",' +
        '"displayName":"Test Maritime Data","status":"available"}],"preferences":{}}\' ' +
        '> ~/.config/debrief/config.json';
      await page.keyboard.type(configCmd, { delay: 5 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2_000);
      await page.keyboard.press('Control+Backquote'); // close terminal

      // Reload window so ConfigService re-reads config from disk
      await page.keyboard.press('Control+Shift+P');
      await page.waitForTimeout(500);
      await page.keyboard.type('Developer: Reload Window', { delay: 20 });
      await page.waitForTimeout(1_000);
      await page.keyboard.press('Enter');

      // Wait for reload — poll for the page to stabilize rather than fixed timeout.
      // After reload, the workbench re-renders from scratch.
      await page.waitForTimeout(5_000);
      // Wait for the workbench shell to be ready (sidebar visible)
      await page.locator('.monaco-workbench').waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(3_000);

      // Re-setup route interception (lost after reload)
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
      await page.route('**/*.tile.openstreetmap.org/**', async (route) => {
        await route.fulfill({ body: greyPng, contentType: 'image/png' });
      });

      // Focus STAC view directly (gives it screen space) and wait for activation
      await focusStacView();
      const readyAfterReload = await waitForExtensionReady(20_000);
      console.log(`  Extension ready after reload: ${readyAfterReload}`);
      await ensureStacPaneExpanded();

      storeRowVisible = await storeRow.waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (!storeRowVisible) {
        await captureStacDiagnostics('after-reload');
        await page.screenshot({ path: 'tests/e2e/evidence/debug-no-stac-row-after-fix.png' });
        throw new Error('STAC store tree row not visible even after seeding config + reload');
      }
      console.log('  ✓ STAC tree populated after config seed + reload');
    }

    // Expand the store row if it isn't already expanded.
    // VS Code may auto-expand single-root tree nodes, so blindly clicking
    // could COLLAPSE the store. Check the twistie state first.
    const storeTwistie = storeRow.locator('.monaco-tl-twistie');
    const storeCollapsed = await storeTwistie.evaluate(
      (el) => el.classList.contains('collapsed')
    ).catch(() => true);
    if (storeCollapsed) {
      await storeTwistie.click();
    }
    await page.waitForTimeout(2_000);

    // Wait for tree children to appear.  Two possible layouts after expansion:
    //   A) Store → Catalog ("2 plots") → [collapsed]  — need to expand catalog
    //   B) Store → Catalog → Exercise Alpha            — VS Code auto-expanded catalog
    // Race for whichever appears first.
    const catalogNode = page.locator('.monaco-list-row:has-text("2 plots")').first();
    const plotNode = page.locator('.monaco-list-row:has-text("Exercise Alpha")').first();

    const firstVisible = await Promise.race([
      catalogNode.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'catalog' as const),
      plotNode.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'plot' as const),
    ]).catch(async () => {
      const allRows = await page.locator('.monaco-list-row').allTextContents();
      console.log(`  ✗ Neither catalog nor plot rows found. Tree rows: ${JSON.stringify(allRows.slice(0, 15))}`);
      await page.screenshot({ path: 'tests/e2e/evidence/debug-no-catalog-row.png' });
      throw new Error('Neither catalog ("2 plots") nor plot ("Exercise Alpha") visible after expanding store');
    });

    console.log(`  ✓ Found ${firstVisible} row after expanding store`);

    if (firstVisible === 'catalog') {
      // Expand the catalog to show individual plot items
      const catalogTwistie = catalogNode.locator('.monaco-tl-twistie');
      const catalogCollapsed = await catalogTwistie.evaluate(
        (el) => el.classList.contains('collapsed')
      ).catch(() => true);
      if (catalogCollapsed) {
        await catalogTwistie.click();
      }
      await page.waitForTimeout(2_000);
    }

    await plotNode.waitFor({ state: 'visible', timeout: 10_000 });
    await plotNode.click();
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
