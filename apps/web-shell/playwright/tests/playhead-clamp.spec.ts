/**
 * spec 267 — tolerant import for an out-of-window saved playhead.
 *
 * Two end-to-end behaviours, both driven through the web-shell's
 * `__openPlotFromFeatures` transfer hook (the same fresh-store hydrate path a
 * real "open a plot" uses — see system-state-roundtrip.spec.ts):
 *
 *  - US1 (tolerant): a plot whose temporal `SystemState.current_time` is AFTER
 *    `end_time` opens successfully — the map renders, a non-blocking toast
 *    reports the clamp, and the in-memory playhead sits on the window edge.
 *  - US2 (guard rail): a plot whose window is incoherent (`start_time > end_time`)
 *    does NOT open — the structured error surface is shown (261 behaviour kept).
 *
 * Screenshots land directly in the feature's evidence dir (blog/PR source).
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalysisPage } from '../pages/AnalysisPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/267-tolerant-playhead-import/evidence',
);
const SHOTS = path.join(EVIDENCE_DIR, 'screenshots');

const WINDOW_START = '2024-01-01T00:00:00Z';
const WINDOW_END = '2024-01-07T00:00:00Z';

interface PlotFeatureShape {
  id?: string | number;
  type?: string;
  geometry?: unknown;
  properties?: Record<string, unknown> | null;
}

/** Read the live plot features the web-shell exposes for introspection. */
async function readPlotFeatures(page: Page): Promise<PlotFeatureShape[]> {
  return page.evaluate(() =>
    window.__currentPlotFeatures.map((f) => ({
      id: f.id,
      type: f.type,
      geometry: f.geometry,
      properties: f.properties as Record<string, unknown> | null,
    })),
  );
}

/** Build a temporal SystemState feature with the given current_time. */
function temporalState(currentTime: string, start = WINDOW_START, end = WINDOW_END): PlotFeatureShape {
  return {
    id: 'state.temporal',
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      kind: 'SYSTEM',
      state_type: 'temporal',
      start_time: start,
      end_time: end,
      current_time: currentTime,
    },
  };
}

/**
 * Take the real loaded exercise features, drop any existing state.temporal, and
 * append a hand-crafted one. Keeps the geographic features so the map renders.
 */
function withTemporalState(
  real: PlotFeatureShape[],
  temporal: PlotFeatureShape,
): PlotFeatureShape[] {
  return [...real.filter((f) => String(f.id) !== 'state.temporal'), temporal];
}

test.describe('267 — tolerant playhead import', () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.goto('/');
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect.poll(() => readPlotFeatures(page).then((f) => f.length)).toBeGreaterThan(0);
  });

  test('US1: an orphaned playhead opens, clamps to the window edge, and notifies', async ({
    page,
  }) => {
    const analysis = new AnalysisPage(page);

    // Build a transfer FC whose saved playhead is AFTER end_time.
    const real = await readPlotFeatures(page);
    const transfer = withTemporalState(real, temporalState('2024-02-01T00:00:00Z'));

    // Open ONLY that FeatureCollection in a fresh store (transfer to host B).
    await page.evaluate(() => window.__backToCatalog?.());
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();
    await page.evaluate((features: PlotFeatureShape[]) => {
      window.__openPlotFromFeatures?.('orphaned/plot.geojson', features);
    }, transfer);

    // The plot OPENS (analysis view) — no hard fail. The clamp is NOT silent:
    // an always-visible, non-blocking toast names the edge (no tab switch).
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('[data-testid="plot-load-error-banner"]')).toHaveCount(0);
    await expect(analysis.clampNotification).toBeVisible();
    await expect(analysis.clampNotification).toContainText(/time range/i);
    await expect(analysis.clampNotification).toContainText(/window end/i);

    // The in-memory playhead was clamped to the window END (epoch ms).
    await expect.poll(() => analysis.getCurrentTime()).toBe(Date.parse(WINDOW_END));

    // The map renders too (the plot is fully usable, not just partially loaded).
    await expect(page.locator('.leaflet-container')).toBeVisible();

    await page.screenshot({ path: path.join(SHOTS, 'playhead-clamp-toast.png') });
  });

  test('US2: an incoherent window (start>end) still fails to open (guard rail)', async ({
    page,
  }) => {
    // A hand-crafted FC with start_time AFTER end_time — a structural defect.
    const incoherent: PlotFeatureShape[] = [temporalState('2024-01-03T00:00:00Z', WINDOW_END, WINDOW_START)];

    await page.evaluate(() => window.__backToCatalog?.());
    await page.evaluate((features: PlotFeatureShape[]) => {
      window.__openPlotFromFeatures?.('incoherent/plot.geojson', features);
    }, incoherent);

    // The plot does NOT open — the structured error surface is shown instead.
    const banner = page.locator('[data-testid="plot-load-error-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('data-error-code', 'cross-field-invariant');
    await expect(banner).toContainText(/state\.temporal/);

    await page.screenshot({ path: path.join(SHOTS, 'incoherent-window-blocked.png') });
  });
});
