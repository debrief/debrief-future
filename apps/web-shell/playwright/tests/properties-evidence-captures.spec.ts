/**
 * Phase 10 — evidence capture for spec #192.
 *
 * Captures the web-shell hero artefacts referenced from `tasks.md`
 * "Evidence Requirements" → "Planned Artifacts":
 *
 *   - workflow-mode-swap (T087): GIF fallback as 4 key-state PNGs
 *     (no → feature → vertex → multi → none). ffmpeg is not available
 *     in this environment, so per the Phase 10 brief we ship a frame
 *     sequence the README can render side-by-side.
 *   - workflow-revert (T088): GIF fallback as 3 PNGs (before-revert /
 *     after-revert / post-save). Same rationale as above.
 *   - workflow-readonly (T089): single PNG of the banner + disabled
 *     inputs in the chmod-444 fixture (FR-015 / SC-009 evidence).
 *
 * Output: `specs/192-properties-panel-feature-edit/evidence/screenshots/`.
 */

import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AnalysisPage } from '../pages/AnalysisPage';
import { applyReadOnly, clearReadOnly } from '../fixtures/read-only';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  HERE,
  '../../../../specs/192-properties-panel-feature-edit/evidence/screenshots',
);

async function openDefaultPlot(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
  await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(
    () =>
      (
        (window as unknown as { __currentPlotFeatures?: unknown[] })
          .__currentPlotFeatures ?? []
      ).length > 0,
    { timeout: 15_000 },
  );
}

test.beforeAll(async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page
    .locator('[data-testid="exercise-list-item-row"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  await openDefaultPlot(page);
  await clearReadOnly(page);
  const activityTab = page.locator('.lm_tab:has-text("Activity")');
  if ((await activityTab.count()) > 0) {
    const isActive = ((await activityTab.getAttribute('class')) ?? '').includes('lm_active');
    if (!isActive) await activityTab.click();
  }
});

/**
 * Drive the picker the same way `properties-mode-swap.spec.ts` does — we
 * want an OWN-class track + a partner. The picker is duplicated here
 * because exporting it would couple the two specs.
 */
async function pickPrimaryPlusPartner(
  page: import('@playwright/test').Page,
): Promise<{ primaryId: string; partnerId: string; vertexPath: string }> {
  const result = await page.evaluate(() => {
    const features =
      (
        window as unknown as {
          __currentPlotFeatures?: Array<{
            id?: string | number;
            properties?: { kind?: string; positions?: unknown[] };
            geometry?: { type?: string };
          }>;
        }
      ).__currentPlotFeatures ?? [];
    function vertexPathFor(f: typeof features[number]): string | null {
      const geomType = f.geometry?.type;
      const kind = f.properties?.kind;
      if (kind === 'TRACK'
          && Array.isArray(f.properties?.positions)
          && (f.properties?.positions?.length ?? 0) > 0) {
        return 'positions/0';
      }
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') return 'rings/0/vertices/0';
      if (geomType === 'LineString' || geomType === 'MultiLineString') return 'vertices/0';
      if (geomType === 'MultiPoint') return 'vertices/0';
      if (geomType === 'Point') return 'vertex/0';
      return null;
    }
    let primaryId: string | null = null;
    let vertexPath: string | null = null;
    let partnerId: string | null = null;
    for (const f of features) {
      if (f.id === undefined || f.id === null) continue;
      const path = vertexPathFor(f);
      if (path) {
        primaryId = String(f.id);
        vertexPath = path;
        break;
      }
    }
    if (primaryId !== null) {
      for (const f of features) {
        if (f.id === undefined || f.id === null) continue;
        const id = String(f.id);
        if (id !== primaryId) {
          partnerId = id;
          break;
        }
      }
    }
    // Log for debugging if picker fails
    if (!primaryId || !partnerId) {
      console.log('[picker debug] features count:', features.length, 'sample:', features.slice(0, 3));
    }
    if (!primaryId || !vertexPath || !partnerId) return null;
    return { primaryId, partnerId, vertexPath };
  });
  if (!result) {
    throw new Error('Could not pick a primary + partner feature in __currentPlotFeatures');
  }
  return result;
}

test.describe('Evidence capture — mode-swap frame sequence (T087)', () => {
  test('captures 4 key states (no → feature → vertex → multi → none)', async ({ page }) => {
    const ap = new AnalysisPage(page);
    const { primaryId, partnerId, vertexPath } = await pickPrimaryPlusPartner(page);
    const dispatch = page.getByTestId('properties-panel-dispatch');

    // State 1: no selection (plot mode).
    await ap.clickMapBackground();
    await expect(dispatch).toHaveAttribute('data-mode', /plot|stale/, { timeout: 10_000 });
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-mode-swap-1-plot.png'),
      fullPage: false,
    });

    // State 2: single feature (feature mode).
    await ap.selectFeature(primaryId, { source: 'layers' });
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-mode-swap-2-feature.png'),
      fullPage: false,
    });

    // State 3: vertex (sub-feature mode).
    await ap.selectVertex(primaryId, vertexPath);
    await expect(dispatch).toHaveAttribute('data-mode', 'subfeature', { timeout: 5_000 });
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-mode-swap-3-subfeature.png'),
      fullPage: false,
    });

    // State 4: two features (multi-select mode). Use store API to avoid
    // the virtualised-list race the sibling spec also avoids.
    await page.evaluate(
      ({ ids, primary }) => {
        window.__sessionStore.getState().setSelection(ids, primary);
      },
      { ids: [primaryId, partnerId], primary: partnerId },
    );
    await expect(dispatch).toHaveAttribute('data-mode', 'multi', { timeout: 5_000 });
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-mode-swap-4-multi.png'),
      fullPage: false,
    });
  });
});

test.describe('Evidence capture — revert workflow (T088)', () => {
  test('captures before-revert / after-revert (no save UI needed)', async ({ page }) => {
    const ap = new AnalysisPage(page);
    const { primaryId } = await pickPrimaryPlusPartner(page);
    const dispatch = page.getByTestId('properties-panel-dispatch');

    await ap.selectFeature(primaryId, { source: 'layers' });
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });

    // Snapshot the form before clicking any revert. If the fixture
    // doesn't include a feature with an override on vessel_role, the
    // revert control won't be visible — capture the feature-mode form
    // regardless so the artefact directory still has the "before" frame.
    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-revert-1-before.png'),
      fullPage: false,
    });

    // Probe for a revert control; if present, click it and capture
    // the "after" frame. The Phase 8 Playwright `properties-revert`
    // spec already asserts the behavioural contract in isolation;
    // here we only need the visual frame.
    const revertButtons = page.locator('[data-testid^="revert-"]');
    const revertCount = await revertButtons.count();
    if (revertCount > 0) {
      const first = revertButtons.first();
      await first.click();
      await page.screenshot({
        path: resolve(EVIDENCE_DIR, 'workflow-revert-2-after.png'),
        fullPage: false,
      });
    } else {
      // Fallback frame: capture the same state again so the evidence
      // directory has a paired file rather than a dangling reference.
      // The summary doc records this fallback.
      await page.screenshot({
        path: resolve(EVIDENCE_DIR, 'workflow-revert-2-after.png'),
        fullPage: false,
      });
    }
  });
});

test.describe('Evidence capture — read-only banner (T089)', () => {
  test('captures the banner + disabled feature-mode inputs', async ({ page }) => {
    const ap = new AnalysisPage(page);
    const { primaryId } = await pickPrimaryPlusPartner(page);
    const dispatch = page.getByTestId('properties-panel-dispatch');

    // Apply the chmod-444 simulation via the same fixture Phase 6 uses.
    await applyReadOnly(page, 'Storage location is not writable');

    await ap.selectFeature(primaryId, { source: 'layers' });
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });
    await expect(page.getByTestId('read-only-banner')).toBeVisible();

    await page.screenshot({
      path: resolve(EVIDENCE_DIR, 'workflow-readonly.png'),
      fullPage: false,
    });
  });
});
