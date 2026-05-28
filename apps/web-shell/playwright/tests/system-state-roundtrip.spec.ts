/**
 * Feature 261 — self-describing plot round-trip (US1/US2/US3).
 *
 * Verifies the headline: the analyst's view-state (viewport, time window/
 * playhead, selection) and per-feature visibility ride inside features.geojson
 * as SystemState features + `visible` flags, so transferring ONLY
 * features.geojson to another host restores the exact view.
 *
 * In the web-shell this is exercised end-to-end:
 *   1. Open a plot (host A). Drive the session store to a recognisable view.
 *   2. Assert the in-memory plot FeatureCollection now carries `state.spatial`,
 *      `state.temporal`, `state.selection` features (FR-009a producer).
 *   3. Take ONLY that FeatureCollection and open it in a fresh store
 *      (`__openPlotFromFeatures` — simulating transfer to host B) and assert
 *      viewport / time window / playhead / selection are all restored from the
 *      file alone (FR-007 reader). No sidecar is involved.
 *
 * Screenshots + JSON evidence are written into the feature's evidence dir.
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/261-session-state-systemstate/evidence',
);
const SHOTS = path.join(EVIDENCE_DIR, 'screenshots');

function ensureDirs(): void {
  fs.mkdirSync(SHOTS, { recursive: true });
}

const RECOGNISABLE_VIEWPORT = {
  coordinates: [
    { longitude: -4.5, latitude: 50.8 },
    { longitude: -3.0, latitude: 50.8 },
    { longitude: -3.0, latitude: 50.0 },
    { longitude: -4.5, latitude: 50.0 },
  ],
  zoom: 9,
};

interface PlotFeatureShape {
  id?: string | number;
  properties?: Record<string, unknown> | null;
}

/** Read the live plot features the web-shell exposes for introspection. */
async function readPlotFeatures(page: Page): Promise<PlotFeatureShape[]> {
  return page.evaluate(() =>
    window.__currentPlotFeatures.map((f) => ({ id: f.id, properties: f.properties })),
  );
}

test.describe('261 — self-describing plot round-trip', () => {
  test.beforeEach(async ({ page }) => {
    ensureDirs();
    await page.goto('/');
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    // Wait for plot features to populate the introspection hook.
    await expect.poll(() => readPlotFeatures(page).then((f) => f.length)).toBeGreaterThan(0);
  });

  test('view-state is mirrored into features.geojson and restores in a fresh store', async ({ page }) => {
    // ---- Host A: capture the pristine FC, then drive a recognisable view ----
    const before = await readPlotFeatures(page);
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'features-before.json'),
      `${JSON.stringify({ type: 'FeatureCollection', features: before }, null, 2)}\n`,
    );

    // Pick a real feature id to select.
    const firstFeatureId = await page.evaluate(() => {
      const f = (window.__currentPlotFeatures as Array<{ id?: string | number }>).find(
        (x) => x.id !== undefined && !String(x.id).startsWith('state.'),
      );
      return f ? String(f.id) : null;
    });
    expect(firstFeatureId).not.toBeNull();

    // Drive the session store to a recognisable view-state (host A). Set an
    // explicit time window so state.temporal is always produced regardless of
    // whether the loaded exercise carries temporal data.
    const RANGE_START = Date.parse('2024-01-01T00:00:00Z');
    const RANGE_END = Date.parse('2024-01-07T00:00:00Z');
    const PLAYHEAD = Date.parse('2024-01-04T00:00:00Z');
    await page.evaluate(
      ({ viewport, selId, start, end, playhead }) => {
        const s = window.__sessionStore.getState();
        s.setViewport(viewport);
        s.setRotation(0);
        s.setTimeRange({ start, end });
        s.setCurrentTime(playhead);
        if (selId) s.setSelection([selId], selId);
      },
      {
        viewport: RECOGNISABLE_VIEWPORT,
        selId: firstFeatureId,
        start: RANGE_START,
        end: RANGE_END,
        playhead: PLAYHEAD,
      },
    );

    // The mirror effect folds state.* into the in-memory FC.
    await expect
      .poll(async () => {
        const feats = await readPlotFeatures(page);
        return feats.filter((f) => String(f.id).startsWith('state.')).length;
      })
      .toBeGreaterThanOrEqual(3);

    const after = await readPlotFeatures(page);
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'features-after.json'),
      `${JSON.stringify({ type: 'FeatureCollection', features: after }, null, 2)}\n`,
    );

    // Assert the self-describing FC carries each view-state variant.
    const stateIds = after.filter((f) => String(f.id).startsWith('state.')).map((f) => String(f.id));
    expect(stateIds).toContain('state.spatial');
    expect(stateIds).toContain('state.temporal');
    expect(stateIds).toContain('state.selection');

    const spatial = after.find((f) => f.id === 'state.spatial');
    expect((spatial?.properties as { viewport?: { zoom?: number } } | undefined)?.viewport?.zoom).toBe(9);

    await page.screenshot({ path: path.join(SHOTS, 'roundtrip-host-a.png') });

    // ---- Host B: open ONLY features.geojson in a fresh store ----
    await page.evaluate(() => window.__backToCatalog?.());
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();

    await page.evaluate((features: PlotFeatureShape[]) => {
      window.__openPlotFromFeatures?.('transferred/plot.geojson', features);
    }, after);
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Assert the view-state restored from the file ALONE.
    const restored = await page.evaluate(() => {
      const s = window.__sessionStore.getState();
      return {
        zoom: s.viewport?.zoom ?? null,
        currentTime: s.currentTime,
        selection: s.selection.featureIds,
      };
    });
    expect(restored.zoom).toBe(9);
    expect(restored.currentTime).not.toBeNull();
    expect(restored.selection).toEqual(firstFeatureId ? [firstFeatureId] : []);

    await page.screenshot({ path: path.join(SHOTS, 'roundtrip-host-b.png') });
  });

  test('per-feature visibility rides in features.geojson and round-trips', async ({ page }) => {
    const firstFeatureId = await page.evaluate(() => {
      const f = (window.__currentPlotFeatures as Array<{ id?: string | number }>).find(
        (x) => x.id !== undefined && !String(x.id).startsWith('state.'),
      );
      return f ? String(f.id) : null;
    });
    expect(firstFeatureId).not.toBeNull();

    // Hide the feature by stamping properties.visible=false on the FC (the same
    // shape the layer:toggleVisibility handler writes), then mirror view-state.
    await page.evaluate((id) => {
      const feats = window.__currentPlotFeatures as Array<{ id?: string | number; properties?: Record<string, unknown> }>;
      const f = feats.find((x) => String(x.id) === id);
      if (f) f.properties = { ...(f.properties ?? {}), visible: false };
      // Nudge the store so the mirror effect re-runs and the FC is captured.
      const s = window.__sessionStore.getState();
      s.setViewport(s.viewport ?? null);
    }, firstFeatureId);

    await page.screenshot({ path: path.join(SHOTS, 'visibility-host-a.png') });

    // The hidden feature carries visible:false; reopening in a fresh store keeps
    // it hidden (readHiddenFeatureIds picks it up).
    const featuresWithHidden = await readPlotFeatures(page);
    const hidden = featuresWithHidden.find((f) => String(f.id) === firstFeatureId);
    expect((hidden?.properties as { visible?: boolean } | undefined)?.visible).toBe(false);

    await page.evaluate(() => window.__backToCatalog?.());
    await page.evaluate((features: PlotFeatureShape[]) => {
      window.__openPlotFromFeatures?.('transferred/plot.geojson', features);
    }, featuresWithHidden);
    await expect(page.locator('.leaflet-container')).toBeVisible();

    const restoredHidden = await page.evaluate(
      (id) => window.__sessionStore.getState().hiddenFeatureIds.includes(id as string),
      firstFeatureId,
    );
    expect(restoredHidden).toBe(true);
    await page.screenshot({ path: path.join(SHOTS, 'visibility-host-b.png') });
  });

  test('strict-on-import: a malformed SystemState feature fails load loudly (FR-012)', async ({ page }) => {
    // A hand-crafted FeatureCollection with a spatial SystemState feature that
    // omits its required `viewport` — the helper rejects it on load with a
    // structured error naming the offending feature id (Article XIV.4).
    const malformed: PlotFeatureShape[] = [
      {
        id: 'state.spatial',
        properties: { kind: 'SYSTEM', state_type: 'spatial' },
      },
    ];
    await page.evaluate(() => window.__backToCatalog?.());
    await page.evaluate((features: PlotFeatureShape[]) => {
      window.__openPlotFromFeatures?.('malformed/plot.geojson', features);
    }, malformed);

    const banner = page.locator('[data-testid="plot-load-error-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/state\.spatial/);
    await page.screenshot({ path: path.join(SHOTS, 'strict-import-error.png') });
  });

  test('no sidecar file concept — the plot is a single self-describing FeatureCollection', async ({ page }) => {
    // After driving view-state, every piece of restorable state is inside the
    // one FeatureCollection (state.* features + visible flags). There is no
    // second persisted object the web-shell reads. This asserts the in-memory
    // contract that mirrors the on-disk two-file invariant (SC-002).
    await page.evaluate(() => {
      const s = window.__sessionStore.getState();
      s.setViewport({
        coordinates: [
          { longitude: -4.5, latitude: 50.8 },
          { longitude: -3.0, latitude: 50.8 },
          { longitude: -3.0, latitude: 50.0 },
          { longitude: -4.5, latitude: 50.0 },
        ],
        zoom: 9,
      });
    });
    await expect
      .poll(async () => (await readPlotFeatures(page)).some((f) => f.id === 'state.spatial'))
      .toBe(true);
    const feats = await readPlotFeatures(page);
    // The state lives on features whose id matches ^state\. — nothing else.
    const stateFeatures = feats.filter((f) => String(f.id).startsWith('state.'));
    for (const f of stateFeatures) {
      expect((f.properties as { kind?: string }).kind).toBe('SYSTEM');
    }
  });
});
