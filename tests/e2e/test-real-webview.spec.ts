/**
 * Screenshot: real VS Code extension webview with Leaflet map.
 *
 * Opens a STAC plot via the tree view, intercepts vscode-resource URLs
 * (which fail in sandboxed envs), and captures the real Leaflet map
 * rendering tracks from Exercise Alpha.
 *
 * Two workarounds needed:
 * 1. vscode-resource.vscode-cdn.net URLs → serve files from local filesystem
 * 2. OSM tile URLs → serve placeholder tiles (no internet in sandbox)
 */
import { test, expect } from './fixtures/base';
import { readFileSync, existsSync } from 'fs';

test.describe('Real Webview Screenshot', () => {
  test.setTimeout(120_000);

  test('open plot via STAC tree and capture Leaflet map', async ({ codeServerPage }) => {
    const page = codeServerPage.page;

    // ─── Set up route interception BEFORE opening the plot ───
    // Intercept vscode-resource URLs and serve from local filesystem
    await page.route('**/*.vscode-resource.vscode-cdn.net/**', async (route) => {
      const url = route.request().url();
      const pathMatch = url.match(/vscode-cdn\.net(\/.*)/);
      const filePath = pathMatch ? decodeURIComponent(pathMatch[1]) : null;
      if (filePath && existsSync(filePath)) {
        const body = readFileSync(filePath);
        const ext = filePath.split('.').pop() || '';
        const contentType: Record<string, string> = {
          js: 'application/javascript',
          css: 'text/css',
          png: 'image/png',
          svg: 'image/svg+xml',
          json: 'application/json',
        };
        await route.fulfill({
          body,
          contentType: contentType[ext] || 'application/octet-stream',
        });
      } else {
        await route.continue();
      }
    });

    // Intercept OSM tile requests → serve a light grey tile
    // Creates a 1x1 pixel PNG as placeholder (no internet in sandbox)
    const greyPixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgwAcAAB0AAe3d7qkAAAAASUVORK5CYII=',
      'base64'
    );
    await page.route('**/*.tile.openstreetmap.org/**', async (route) => {
      await route.fulfill({ body: greyPixelPng, contentType: 'image/png' });
    });

    // Wait for extension
    await page.waitForTimeout(8_000);

    // Dismiss notifications
    const closeButtons = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await closeButtons.count(); i++) {
      await closeButtons.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);

    // ─── Navigate STAC tree: Store → Catalog → Plot ───
    const stacHeader = page.locator('.pane-header:has-text("STAC STORES")');
    await stacHeader.click();
    await page.waitForTimeout(2_000);

    // Expand store
    await page.locator('.monaco-list-row:has-text("STAC:")').first().click();
    await page.waitForTimeout(1_000);

    // Expand catalog
    const catalogNode = page.locator('.monaco-list-row:has-text("2 plots")').first();
    const twistie = catalogNode.locator('.monaco-tl-twistie');
    if (await twistie.isVisible().catch(() => false)) {
      await twistie.click();
    } else {
      await catalogNode.click();
    }
    await page.waitForTimeout(2_000);

    // Click Exercise Alpha
    await page.locator('.monaco-list-row:has-text("Exercise Alpha")').first().click();
    console.log('  ✓ Clicked Exercise Alpha');

    // Wait for webview
    await page.locator('iframe.webview').first().waitFor({ state: 'attached', timeout: 30_000 });
    console.log('  ✓ Webview attached');

    // Wait for #active-frame and Leaflet
    let hasLeaflet = false;
    for (let i = 0; i < 20; i++) {
      const hostFrame = page.frames().find(f =>
        f.url().includes('webview/browser/pre/index.html')
      );
      if (hostFrame) {
        const hasActive = await hostFrame.evaluate(
          () => !!document.getElementById('active-frame')
        ).catch(() => false);
        if (hasActive && hostFrame.childFrames().length > 0) {
          const inner = hostFrame.childFrames()[0];
          hasLeaflet = await inner.evaluate(
            () => !!document.querySelector('.leaflet-container')
          ).catch(() => false);
          if (hasLeaflet) {
            console.log(`  ✓ Leaflet map rendered after ~${i}s`);
            break;
          }
        }
      }
      await page.waitForTimeout(1_000);
    }

    if (!hasLeaflet) {
      console.log('  ✗ Leaflet did not render');
    }

    // Wait for tracks to render
    await page.waitForTimeout(3_000);

    // Dismiss the "Session changes were discarded" warning if present
    const warnClose = page.locator('.notification-toast-container .codicon-close');
    for (let i = 0; i < await warnClose.count(); i++) {
      await warnClose.nth(i).click().catch(() => {});
    }
    await page.waitForTimeout(500);

    // Screenshot
    await page.screenshot({ path: 'tests/e2e/evidence/real-webview-map.png' });
    console.log('  ✓ Screenshot saved: real-webview-map.png');

    // Verify map content from Playwright
    const hostFrame = page.frames().find(f =>
      f.url().includes('webview/browser/pre/index.html')
    );
    if (hostFrame && hostFrame.childFrames().length > 0) {
      const inner = hostFrame.childFrames()[0];
      const mapStats = await inner.evaluate(() => {
        const container = document.querySelector('.leaflet-container');
        const paths = document.querySelectorAll('.leaflet-overlay-pane path');
        const markers = document.querySelectorAll('.leaflet-marker-pane *');
        const tiles = document.querySelectorAll('.leaflet-tile');
        return {
          containerSize: container ? `${container.clientWidth}x${container.clientHeight}` : 'none',
          pathCount: paths.length,
          markerCount: markers.length,
          tileCount: tiles.length,
        };
      }).catch(() => null);
      console.log(`  Map stats: ${JSON.stringify(mapStats)}`);
    }
  });
});
