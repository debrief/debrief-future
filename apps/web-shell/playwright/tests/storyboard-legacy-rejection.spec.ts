/**
 * E2E test for #259 — pre-#259 plot hard-fail (FR-010).
 *
 * Drives `validatePlot` against a synthesized legacy plot via the
 * `window.__triggerPlotValidation` test hook in `App.tsx`. The hook is
 * the same code path that `handlePlotSelect` runs on a real load — the
 * Playwright route-intercept approach can't get a fresh fetch through
 * because the web-shell's `stacService` pre-caches the bundled fixtures.
 *
 * Writes the error-state screenshot directly into the spec's evidence dir.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_PATH = resolve(
  __dirname,
  '../../../../specs/259-relax-scene-time/evidence/screenshots/missing-creation-order-error.png',
);

const LEGACY_PLOT = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: '01JBXYZABC0000000000000900',
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-5.0, 50.0],
            [-4.9, 50.0],
            [-4.9, 50.1],
            [-5.0, 50.1],
            [-5.0, 50.0],
          ],
        ],
      },
      properties: {
        kind: 'STORYBOARD',
        id: '01JBXYZABC0000000000000900',
        name: 'Pre-#259 Storyboard',
        schema_version: 1, // pre-#259 — triggers FC-V1 first
        tags: [],
        provenance: [],
      },
    },
    {
      type: 'Feature' as const,
      id: '01JBXYZABC0000000000000901',
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-5.0, 50.0],
            [-4.9, 50.0],
            [-4.9, 50.1],
            [-5.0, 50.1],
            [-5.0, 50.0],
          ],
        ],
      },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: '01JBXYZABC0000000000000901',
        storyboard_id: '01JBXYZABC0000000000000900',
        title: 'Legacy Scene without creation_order',
        viewport: { center: [-4.95, 50.05], zoom: 10, bearing: 0 },
        timestamp: '2026-04-20T10:00:00Z',
        time_range: null,
        visible_feature_ids: [],
        feature_set_hash:
          '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
        thumbnail_asset_ref: 'thumbnails/legacy-a.png',
        transition_duration_ms: 500,
        // creation_order intentionally absent — pre-#259 shape.
        tags: [],
        provenance: [],
      },
    },
  ],
};

test.describe('Storyboard — pre-#259 plot hard-fail (#259 / FR-010)', () => {
  test.setTimeout(60_000);

  test('validatePlot surfaces UnsupportedSchemaVersionError on a schema_version=1 plot', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.web-shell--welcome')).toBeVisible({
      timeout: 10_000,
    });
    // Wait for the App component to mount the test hook.
    await page.waitForFunction(
      () => typeof window.__triggerPlotValidation === 'function',
      { timeout: 10_000 },
    );

    // Drive validatePlot against the legacy fixture via the test hook —
    // same code path handlePlotSelect runs on a real load failure.
    await page.evaluate((fc) => {
      window.__triggerPlotValidation!(fc);
    }, LEGACY_PLOT);

    // FC-V1 fires first on this fixture (schema_version=1).
    const banner = page.locator('[data-testid="plot-load-error-banner"]');
    await expect(banner).toBeVisible({ timeout: 5_000 });
    const code = await banner.getAttribute('data-error-code');
    expect(code).toBe('UnsupportedSchemaVersion');
    await expect(banner).toContainText('schema_version=1');

    // Capture the explicit error UI for blog/PR evidence.
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
  });
});

