/**
 * generate-thumbnails.ts — Batch thumbnail backfill via Playwright (#174).
 *
 * Loads the web-shell once, then iterates through all plots by calling
 * the exposed window.__openPlot() function. For each plot, captures a
 * screenshot, resizes with sharp, and writes thumbnails to disk.
 *
 * Usage:
 *   # Start dev server pointing at the full catalog:
 *   STAC_STORE_PATH=/path/to/local-store pnpm --filter @debrief/web-shell dev
 *
 *   # Run backfill (same STAC_STORE_PATH so script knows where to write):
 *   STAC_STORE_PATH=/path/to/local-store node --experimental-strip-types \
 *     apps/web-shell/scripts/generate-thumbnails.ts
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const sharpModule = await import('sharp');
const sharp = sharpModule.default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const LARGE_WIDTH = 800;
const LARGE_HEIGHT = 600;
const SMALL_WIDTH = 200;
const SMALL_HEIGHT = 150;

function findStoreRoot(): string {
  if (process.env.STAC_STORE_PATH) {
    const p = path.resolve(process.env.STAC_STORE_PATH);
    if (fs.existsSync(path.join(p, 'catalog.json'))) return p;
    throw new Error(`STAC_STORE_PATH set but no catalog.json found at ${p}`);
  }
  const testDataPath = path.resolve(__dirname, '../../../apps/vscode/test-data/local-store');
  if (fs.existsSync(path.join(testDataPath, 'catalog.json'))) return testDataPath;
  throw new Error('No STAC store found. Set STAC_STORE_PATH env var.');
}

/** Fetch item paths from the running dev server's STAC store endpoint. */
async function fetchItemPaths(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/stac-store/catalog.json`);
  if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.status}`);
  const catalog = await res.json() as { links: Array<{ rel: string; href: string }> };
  return catalog.links
    .filter((link) => link.rel === 'item')
    .map((link) => link.href);
}

function updateItemJson(itemJsonPath: string): void {
  const item = JSON.parse(fs.readFileSync(itemJsonPath, 'utf-8')) as {
    assets: Record<string, unknown>;
  };
  item.assets = item.assets ?? {};
  item.assets['thumbnail'] = {
    href: './thumbnail.png', type: 'image/png',
    title: 'Plot thumbnail', roles: ['thumbnail'],
  };
  item.assets['thumbnail-sm'] = {
    href: './thumbnail-sm.png', type: 'image/png',
    title: 'Plot thumbnail (small)', roles: ['thumbnail'],
  };
  fs.writeFileSync(itemJsonPath, JSON.stringify(item, null, 2));
}

async function getChromiumPath(): Promise<string | undefined> {
  try {
    const sparticuz = (await import('@sparticuz/chromium')).default;
    const p = await sparticuz.executablePath();
    // Only use sparticuz on Linux — it ships a Linux ELF binary that won't run on Windows/macOS
    if (process.platform === 'linux' && fs.existsSync(p)) {
      console.log(`Using @sparticuz/chromium: ${p}`);
      return p;
    }
    console.log(`Skipping @sparticuz/chromium (platform: ${process.platform}), using Playwright chromium`);
    return undefined;
  } catch {
    return undefined;
  }
}

async function generateThumbnails(): Promise<void> {
  const storeRoot = findStoreRoot();

  console.log('Fetching catalog from dev server...');
  const itemPaths = await fetchItemPaths();
  console.log(`Found ${itemPaths.length} plots in ${storeRoot}\n`);

  if (itemPaths.length === 0) return;

  const executablePath = await getChromiumPath();
  let browser: Browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: executablePath ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    });
  } catch (err) {
    console.error('Failed to launch browser:', err);
    process.exit(1);
  }

  const page: Page = await browser.newPage({
    viewport: { width: LARGE_WIDTH, height: LARGE_HEIGHT },
  });

  // Load the web-shell once and wait for catalog init
  console.log('Loading web-shell...');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for __openPlot to be exposed (signals the app is ready)
  await page.waitForFunction(() => typeof window.__openPlot === 'function', { timeout: 60000 });
  console.log('Web-shell ready.\n');

  let successCount = 0;
  let failCount = 0;

  for (const itemPath of itemPaths) {
    const plotId = path.dirname(itemPath).replace(/^\.\//, '');
    const plotDir = path.join(storeRoot, plotId);
    const itemJsonPath = path.join(plotDir, 'item.json');

    if (!fs.existsSync(itemJsonPath)) {
      console.warn(`  [${plotId}] Skip: no item.json`);
      failCount++;
      continue;
    }

    try {
      // Open the plot via the exposed function (no page reload!)
      await page.evaluate((p) => window.__openPlot?.(p), itemPath);

      // Wait for the analysis view with a visible map and rendered features
      await page.waitForSelector('.web-shell--analysis', { state: 'visible', timeout: 15000 });
      await page.waitForSelector('.leaflet-container', { state: 'visible', timeout: 10000 });

      // Wait for at least one Leaflet interactive feature to appear (tracks, points, etc.)
      try {
        await page.waitForSelector('.leaflet-interactive', { state: 'attached', timeout: 5000 });
      } catch {
        // Some plots may have no features — that's OK, capture the empty map
      }
      await page.waitForTimeout(500);

      // Fit to window
      const fitButton = page.locator('[data-testid="fit-to-window"]');
      if (await fitButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await fitButton.click();
        await page.waitForTimeout(500);
      }

      // Wait for map tiles to load (locally we have network access for OSM tiles)
      await page.waitForFunction(() => {
        const tiles = document.querySelectorAll('.leaflet-tile-container img');
        if (tiles.length === 0) return true; // no tiles expected
        return Array.from(tiles).every(
          (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
        );
      }, { timeout: 10000 }).catch(() => { /* proceed even if tiles timeout */ });
      await page.waitForTimeout(500);

      // Capture
      const mapContainer = page.locator('.leaflet-container').first();
      const largePng = await mapContainer.screenshot({ type: 'png' });
      const smallPng = await sharp(largePng)
        .resize(SMALL_WIDTH, SMALL_HEIGHT, { fit: 'fill' })
        .png()
        .toBuffer();

      // Write
      fs.writeFileSync(path.join(plotDir, 'thumbnail.png'), largePng);
      fs.writeFileSync(path.join(plotDir, 'thumbnail-sm.png'), smallPng);
      updateItemJson(itemJsonPath);

      console.log(`  [${plotId}] ✓ ${largePng.length} + ${smallPng.length} bytes`);
      successCount++;

      // Navigate back to catalog (stays in same SPA — no reload)
      await page.evaluate(() => window.__backToCatalog?.());
      await page.waitForTimeout(200);
    } catch (err) {
      console.error(`  [${plotId}] ✗ ${err}`);
      failCount++;
      // Try to recover
      try {
        await page.evaluate(() => window.__backToCatalog?.());
        await page.waitForTimeout(500);
      } catch { /* continue */ }
    }
  }

  await browser.close();
  console.log(`\nDone: ${successCount} succeeded, ${failCount} failed out of ${itemPaths.length} plots.`);
}

generateThumbnails().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
