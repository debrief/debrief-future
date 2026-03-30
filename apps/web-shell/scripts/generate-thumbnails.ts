/**
 * generate-thumbnails.ts — Batch thumbnail backfill via Playwright (#174).
 *
 * Opens every plot in the web-shell catalog, fits to window, waits for tiles,
 * captures a screenshot, resizes with sharp, and writes both thumbnail sizes
 * alongside the STAC item.json.
 *
 * Usage:
 *   pnpm --filter @debrief/web-shell generate-thumbnails
 *
 * Requires:
 *   - Web-shell dev server running on http://localhost:5173
 *   - sharp (devDependency)
 *   - Playwright Chromium browser
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Dynamic import for sharp (ESM)
const sharpModule = await import('sharp');
const sharp = sharpModule.default;

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const LARGE_WIDTH = 800;
const LARGE_HEIGHT = 600;
const SMALL_WIDTH = 200;
const SMALL_HEIGHT = 150;

/** Find the STAC store root by walking up from catalog.json or test-data. */
function findStoreRoot(): string {
  // The web-shell uses test-data from the vscode app
  const testDataPath = path.resolve(__dirname, '../../../apps/vscode/test-data/local-store');
  if (fs.existsSync(path.join(testDataPath, 'catalog.json'))) {
    return testDataPath;
  }
  throw new Error(`Cannot find STAC store at ${testDataPath}`);
}

/** Read catalog.json and extract item directory names. */
function getPlotIds(storeRoot: string): string[] {
  const catalogPath = path.join(storeRoot, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  const itemLinks = (catalog.links ?? []).filter(
    (link: { rel: string }) => link.rel === 'item',
  );
  return itemLinks.map((link: { href: string }) => {
    // href is like "./exercise-alpha/item.json"
    const dir = path.dirname(link.href).replace(/^\.\//, '');
    return dir;
  });
}

/** Update item.json with thumbnail asset entries. */
function updateItemJson(itemJsonPath: string): void {
  const item = JSON.parse(fs.readFileSync(itemJsonPath, 'utf-8'));
  item.assets = item.assets ?? {};
  item.assets['thumbnail'] = {
    href: './thumbnail.png',
    type: 'image/png',
    title: 'Plot thumbnail',
    roles: ['thumbnail'],
  };
  item.assets['thumbnail-sm'] = {
    href: './thumbnail-sm.png',
    type: 'image/png',
    title: 'Plot thumbnail (small)',
    roles: ['thumbnail'],
  };
  fs.writeFileSync(itemJsonPath, JSON.stringify(item, null, 2));
}

async function generateThumbnails(): Promise<void> {
  const storeRoot = findStoreRoot();
  const plotIds = getPlotIds(storeRoot);

  console.log(`Found ${plotIds.length} plots in ${storeRoot}`);

  if (plotIds.length === 0) {
    console.log('No plots found. Exiting.');
    return;
  }

  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    console.error('Failed to launch browser. Make sure Playwright Chromium is installed.');
    process.exit(1);
  }

  const page: Page = await browser.newPage({
    viewport: { width: LARGE_WIDTH, height: LARGE_HEIGHT },
  });

  let successCount = 0;
  let failCount = 0;

  for (const plotId of plotIds) {
    try {
      console.log(`Processing: ${plotId}`);
      const plotDir = path.join(storeRoot, plotId);
      const itemJsonPath = path.join(plotDir, 'item.json');

      if (!fs.existsSync(itemJsonPath)) {
        console.warn(`  Skipping: no item.json found`);
        failCount++;
        continue;
      }

      // Navigate to the web-shell and open this plot
      // The web-shell uses item paths relative to the store root
      await page.goto(`${BASE_URL}/?item=./${plotId}/item.json`, { waitUntil: 'networkidle' });

      // Wait for the analysis view and map to load
      await page.waitForSelector('.leaflet-container', { state: 'visible', timeout: 15000 });

      // Click fit-to-window button if available
      const fitButton = page.locator('[data-testid="fit-to-window"]');
      if (await fitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fitButton.click();
        await page.waitForTimeout(500);
      }

      // Wait for tiles to settle
      await page.waitForTimeout(2000);

      // Capture screenshot of the map
      const mapContainer = page.locator('.leaflet-container');
      const largePng = await mapContainer.screenshot({ type: 'png' });

      // Resize to small thumbnail with sharp
      const smallPng = await sharp(largePng)
        .resize(SMALL_WIDTH, SMALL_HEIGHT, { fit: 'fill' })
        .png()
        .toBuffer();

      // Write files
      const largePath = path.join(plotDir, 'thumbnail.png');
      const smallPath = path.join(plotDir, 'thumbnail-sm.png');
      fs.writeFileSync(largePath, largePng);
      fs.writeFileSync(smallPath, smallPng);

      // Update item.json
      updateItemJson(itemJsonPath);

      console.log(`  ✓ Generated thumbnails (${largePng.length} bytes + ${smallPng.length} bytes)`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
      failCount++;
    }
  }

  await browser.close();

  console.log(`\nDone: ${successCount} succeeded, ${failCount} failed out of ${plotIds.length} plots.`);
}

generateThumbnails().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
