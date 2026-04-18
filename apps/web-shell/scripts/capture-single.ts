/**
 * capture-single.ts — One-off capture for plots the main script missed.
 *
 * The main generate-thumbnails script's first-plot-after-load path is flaky:
 * handlePlotSelect's setView('analysis') sometimes doesn't register on the
 * first invocation after a fresh page load, and the selector wait for
 * `.web-shell--analysis` times out. Workaround: retry the open-plot call in
 * a loop as a warmup, then open the target plot(s).
 *
 * Usage:
 *   STAC_STORE_PATH=/path/to/local-store npx tsx \
 *     apps/web-shell/scripts/capture-single.ts core--ambig-tracks2 [core--other ...]
 */
import { chromium, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const sharpModule = await import('sharp');
const sharp = sharpModule.default;

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const WARMUP_ITEM = './core--analysis1-areas/item.json';
const LARGE_W = 800, LARGE_H = 600, SMALL_W = 200, SMALL_H = 150;

function findStoreRoot(): string {
  if (process.env.STAC_STORE_PATH) {
    const p = path.resolve(process.env.STAC_STORE_PATH);
    if (fs.existsSync(path.join(p, 'catalog.json'))) return p;
    throw new Error(`STAC_STORE_PATH invalid: ${p}`);
  }
  throw new Error('STAC_STORE_PATH required');
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

async function captureOne(page: Page, storeRoot: string, plotId: string): Promise<boolean> {
  const plotDir = path.join(storeRoot, plotId);
  const itemJsonPath = path.join(plotDir, 'item.json');
  if (!fs.existsSync(itemJsonPath)) {
    console.warn(`  [${plotId}] no item.json`);
    return false;
  }
  const itemPath = `./${plotId}/item.json`;

  try {
    await page.evaluate((p) => window.__openPlot?.(p), itemPath);
    await page.waitForSelector('.web-shell--analysis', { state: 'visible', timeout: 30000 });
    await page.waitForSelector('.leaflet-container', { state: 'visible', timeout: 10000 });
    try {
      await page.waitForSelector('.leaflet-interactive', { state: 'attached', timeout: 5000 });
    } catch { /* empty map ok */ }
    await page.waitForTimeout(800);

    const fitBtn = page.locator('[data-testid="fit-to-window"]');
    if (await fitBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await fitBtn.click();
      await page.waitForTimeout(600);
    }

    await page.waitForFunction(() => {
      const tiles = document.querySelectorAll('.leaflet-tile-container img');
      if (tiles.length === 0) return true;
      return Array.from(tiles).every(
        (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
      );
    }, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);

    const mapContainer = page.locator('.leaflet-container').first();
    const largePng = await mapContainer.screenshot({ type: 'png' });
    const smallPng = await sharp(largePng)
      .resize(SMALL_W, SMALL_H, { fit: 'fill' }).png().toBuffer();

    fs.writeFileSync(path.join(plotDir, 'thumbnail.png'), largePng);
    fs.writeFileSync(path.join(plotDir, 'thumbnail-sm.png'), smallPng);
    updateItemJson(itemJsonPath);
    console.log(`  [${plotId}] ✓ ${largePng.length} + ${smallPng.length} bytes`);
    await page.evaluate(() => window.__backToCatalog?.());
    await page.waitForTimeout(300);
    return true;
  } catch (err) {
    console.error(`  [${plotId}] ✗ ${err}`);
    try {
      await page.evaluate(() => window.__backToCatalog?.());
      await page.waitForTimeout(500);
    } catch { /* swallow */ }
    return false;
  }
}

async function main(): Promise<void> {
  const storeRoot = findStoreRoot();
  const targets = process.argv.slice(2);
  if (targets.length === 0) throw new Error('Pass one or more plot IDs as arguments');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: LARGE_W, height: LARGE_H } });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__openPlot === 'function', { timeout: 60000 });
  await page.waitForSelector('[role="row"], .exercise-list__row, .stac-browser', {
    state: 'attached', timeout: 30000,
  }).catch(() => {});
  await page.waitForTimeout(1000);

  // Warmup — open a known-good plot, retry up to 5× because the first-after-load
  // call is flaky. Then back to catalog.
  console.log('Warmup: opening known-good plot (retrying first-plot flake)...');
  let warmed = false;
  for (let attempt = 1; attempt <= 5 && !warmed; attempt++) {
    await page.evaluate((p) => window.__openPlot?.(p), WARMUP_ITEM);
    try {
      await page.waitForSelector('.web-shell--analysis', { state: 'visible', timeout: 8000 });
      warmed = true;
    } catch {
      console.log(`  warmup attempt ${attempt} timed out, retrying...`);
      await page.waitForTimeout(1000);
    }
  }
  if (!warmed) throw new Error('Warmup failed after 5 attempts');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__backToCatalog?.());
  await page.waitForTimeout(500);
  console.log('Warmup done.\n');

  let ok = 0, fail = 0;
  for (const id of targets) {
    if (await captureOne(page, storeRoot, id)) ok++;
    else fail++;
  }

  await browser.close();
  console.log(`\nDone: ${ok} succeeded, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
