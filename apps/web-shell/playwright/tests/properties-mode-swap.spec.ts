/**
 * Selection-driven mode-swap workflow — Playwright E2E
 * (#192 Phase 7 / US-3, T057).
 *
 * Drives the full US-3 acceptance cycle against the web-shell:
 *
 *   1. No selection                       → plot mode
 *   2. One feature selected               → feature mode (stage a tag edit)
 *   3. Vertex on that feature selected    → sub-feature mode (stage a label)
 *   4. Two features selected              → multi-select mode
 *   5. No selection                       → plot mode
 *   6. Re-select feature                  → feature mode (form re-renders)
 *   7. Re-select vertex                   → sub-feature mode (form re-renders)
 *
 * At every transition the mode container's `data-testid` and `data-mode`
 * attribute are asserted, and the app doesn't crash. The staging buffer's
 * selection-independence invariant (US-3 AS-3 — "staged edits are not
 * dropped on selection change") is asserted at the unit level by
 * `useStagedEdits.test.ts` "selection-independence" case (T013/T058);
 * here we exercise the dispatcher + mode-shell render path under live
 * selection churn to prove the swap itself never drops or duplicates a
 * container, and that re-selecting an earlier target re-mounts the
 * matching mode shell cleanly.
 *
 * Form-state hydration from the staging buffer (re-display of staged
 * edits when re-selecting a feature/vertex) is host-level wiring on the
 * `ActivityPanel` → `PropertiesPanelDispatch` boundary; this Phase 7
 * task covers mode-swap behaviour. The buffer itself stays intact across
 * selection churn — verified by T058's reference to
 * `useStagedEdits.test.ts` line 290–320.
 *
 * Uses the existing AnalysisPage page-object helpers (Phases 3, 4, 5) —
 * `selectFeature`, `selectVertex`, plus the `__sessionStore`
 * test-introspection handle for multi-feature selections (the live
 * Layers panel can race the virtualiser when re-clicking parent rows
 * after vertex expansion; the store-driven path is the same one
 * `selectVertex` uses).
 */

import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../pages/AnalysisPage';
import { clearReadOnly } from '../fixtures/read-only';

/**
 * Open the first catalog row and wait for the analysis view + Leaflet to
 * be ready. The default sample plot has the TRACK + ≥ 2 features we need
 * for the full mode-swap cycle — empirically verified by the sibling
 * Phase 3 + Phase 5 specs that drive the same plot.
 */
async function openDefaultPlot(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
  await expect(page.locator('.web-shell--analysis')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForFunction(
    () =>
      (
        (window as unknown as { __currentPlotFeatures?: unknown[] })
          .__currentPlotFeatures ?? []
      ).length > 0,
    { timeout: 15_000 },
  );
}

/**
 * Pick a "primary" feature (for the feature-edit + vertex-edit half of
 * the cycle) and a distinct "partner" feature (for the multi-select
 * transition). Both must have rendered Layers-panel rows.
 *
 * Vertex strategy — geometry-aware:
 *   - TRACK              → `positions/0`
 *   - Polygon-shaped     → `rings/0/vertices/0` (RECTANGLE, POLY,
 *                          CIRCLE, MULTI_POLYGON — all Polygon geometries)
 *   - LineString-shaped  → `vertices/0` (LINE, VECTOR)
 *   - MultiPoint         → `vertices/0`
 *   - Point              → `vertex/0` (TEXT, REFERENCE_LOCATION)
 *
 * The default web-shell sample plot ships with three RECTANGLE features
 * (polygon geometry) so the polygon-vertex path is the workhorse here;
 * the helper handles every shape so the spec is fixture-agnostic.
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
            geometry?: { type?: string; coordinates?: unknown };
          }>;
        }
      ).__currentPlotFeatures ?? [];

    function vertexPathFor(f: typeof features[number]): string | null {
      const geomType = f.geometry?.type;
      const kind = f.properties?.kind;
      if (
        kind === 'TRACK' &&
        Array.isArray(f.properties?.positions) &&
        (f.properties?.positions?.length ?? 0) > 0
      ) {
        return 'positions/0';
      }
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        // Polygon coords are number[][][] (rings × vertices × xy); first
        // ring's first vertex is always reachable when the geometry is
        // present at all.
        return 'rings/0/vertices/0';
      }
      if (geomType === 'LineString' || geomType === 'MultiLineString') {
        return 'vertices/0';
      }
      if (geomType === 'MultiPoint') {
        return 'vertices/0';
      }
      if (geomType === 'Point') {
        return 'vertex/0';
      }
      return null;
    }

    let primaryId: string | null = null;
    let vertexPath: string | null = null;
    for (const f of features) {
      if (f.id === undefined || f.id === null) continue;
      const path = vertexPathFor(f);
      if (path) {
        primaryId = String(f.id);
        vertexPath = path;
        break;
      }
    }
    if (!primaryId || !vertexPath) return null;
    let partnerId: string | null = null;
    for (const f of features) {
      if (f.id === undefined || f.id === null) continue;
      const id = String(f.id);
      if (id !== primaryId) {
        partnerId = id;
        break;
      }
    }
    if (!partnerId) return null;
    return { primaryId, partnerId, vertexPath };
  });
  if (!result) {
    throw new Error('Could not pick a primary + partner feature in __currentPlotFeatures');
  }
  // Ensure both have rendered Layers-panel rows (deterministic click target).
  for (const id of [result.primaryId, result.partnerId]) {
    const count = await page.getByTestId(`feature-row-${id}`).count();
    if (count === 0) {
      throw new Error(`Feature row for id=${id} did not render in the Layers panel`);
    }
  }
  return result;
}

test.describe('Selection-driven mode swap (#192 Phase 7 / US-3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page
      .locator('[data-testid="exercise-list-item-row"]')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
    await openDefaultPlot(page);
    // Force writable so the feature/vertex editors render their inputs
    // (headless Chromium's `navigator.storage.persisted()` defaults to
    // false, which the IDB capability probe surfaces as read-only).
    await clearReadOnly(page);
    // The Activity tab hosts the Properties Panel; switch to it so the
    // mode containers are visible (GoldenLayout sometimes mounts the
    // Log tab in front by default).
    const activityTab = page.locator('.lm_tab:has-text("Activity")');
    if (await activityTab.count() > 0) {
      const isActive = (await activityTab.getAttribute('class') ?? '').includes(
        'lm_active',
      );
      if (!isActive) {
        await activityTab.click();
      }
    }
  });

  test('full cycle: no → feature → vertex → multi → no, preserving staged edits', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { primaryId, partnerId, vertexPath } = await pickPrimaryPlusPartner(page);
    const stagedTag = 'modeswap-tag';
    const stagedLabel = 'alpha';

    // ─── (1) No selection → plot mode ──────────────────────────────
    await ap.clickMapBackground();
    const dispatch = page.getByTestId('properties-panel-dispatch');
    // The dispatcher is mounted but may be inside an inactive Golden
    // Layout tab — we only assert presence via data attributes (the
    // sibling Phase 3/4 specs follow the same pattern).
    await expect(dispatch).toHaveAttribute('data-mode', /plot|stale/, {
      timeout: 10_000,
    });
    let mode = await dispatch.getAttribute('data-mode');
    expect(['plot', 'stale']).toContain(mode);

    // ─── (2) One feature selected → feature mode + stage a tag ─────
    await ap.selectFeature(primaryId, { source: 'layers' });
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();
    await expect(page.getByTestId('properties-mode-feature')).toHaveAttribute(
      'data-feature-id',
      primaryId,
    );

    // Stage a tag edit through the FeatureEditorMode's tags ArrayWidget.
    // After Enter the input clears (ArrayWidget contract) — the chip is
    // staged in the buffer, not visible in the input.
    const tagInput = page.getByTestId('array-widget-input-tags');
    await expect(tagInput).toBeVisible();
    await expect(tagInput).toBeEnabled({ timeout: 5_000 });
    await tagInput.fill(stagedTag);
    await tagInput.press('Enter');
    await expect(tagInput).toHaveValue('');

    // ─── (3) Vertex on that feature → sub-feature mode + stage label ─
    await ap.selectVertex(primaryId, vertexPath);
    await expect(dispatch).toHaveAttribute('data-mode', 'subfeature', { timeout: 5_000 });
    await expect(page.getByTestId('properties-mode-subfeature')).toBeVisible();
    await expect(page.getByTestId('properties-mode-subfeature')).toHaveAttribute(
      'data-path',
      vertexPath,
    );

    // Stage a vertex label edit.
    const labelInput = page.getByTestId('vertex-label-input');
    await expect(labelInput).toBeVisible();
    await expect(labelInput).toBeEnabled({ timeout: 5_000 });
    await labelInput.fill(stagedLabel);
    await expect(labelInput).toHaveValue(stagedLabel);

    // ─── (4) Two features selected → multi-select mode ─────────────
    // Use the store API directly because the FeatureList may have
    // scrolled the parent row out of view to reveal expanded child rows
    // after `selectVertex` — clicking the parent row then needs the
    // list to scroll, which is racy in the headless harness. The
    // multi-feature emitter (Phase 5) is exercised independently in
    // `properties-multi-select.spec.ts`; here we only need the mode swap.
    await page.evaluate(
      ({ ids, primary }) => {
        window.__sessionStore.getState().setSelection(ids, primary);
      },
      { ids: [primaryId, partnerId], primary: partnerId },
    );
    await expect(dispatch).toHaveAttribute('data-mode', 'multi', { timeout: 5_000 });
    await expect(page.getByTestId('properties-mode-multiselect')).toBeVisible();
    await expect(
      page.getByTestId('properties-mode-multiselect-header'),
    ).toContainText('2 features selected');

    // ─── (5) No selection → plot mode ──────────────────────────────
    await page.evaluate(() => {
      window.__sessionStore.getState().setSelection([], null);
    });
    await expect(dispatch).toHaveAttribute('data-mode', /plot|stale/, {
      timeout: 5_000,
    });
    mode = await dispatch.getAttribute('data-mode');
    expect(['plot', 'stale']).toContain(mode);
    // The earlier mode shells MUST NOT be visible.
    await expect(page.getByTestId('properties-mode-feature')).toBeHidden();
    await expect(page.getByTestId('properties-mode-subfeature')).toBeHidden();
    await expect(page.getByTestId('properties-mode-multiselect')).toBeHidden();

    // ─── (6) Re-select the feature → feature mode re-mounts cleanly ─
    // Store-driven for consistency with steps 4/5 (avoid virtualised-list
    // race when re-selecting the same row after expansion).
    await page.evaluate(
      ({ id }) => {
        window.__sessionStore.getState().setSelection([id], id);
      },
      { id: primaryId },
    );
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();
    await expect(page.getByTestId('properties-mode-feature')).toHaveAttribute(
      'data-feature-id',
      primaryId,
    );
    // The tags row must be present on re-render — proves the form
    // re-mounts cleanly with the editable schema after a multi-select
    // round-trip. (The visible re-display of the *staged* tag is host-
    // level hydration on the dispatcher, out of T057's scope — see the
    // file header for the buffer-invariant deferral to T058.)
    await expect(page.getByTestId('properties-field-tags')).toBeVisible({
      timeout: 5_000,
    });

    // ─── (7) Re-select the vertex → sub-feature mode re-mounts ─────
    await ap.selectVertex(primaryId, vertexPath);
    await expect(dispatch).toHaveAttribute('data-mode', 'subfeature', { timeout: 5_000 });
    await expect(page.getByTestId('properties-mode-subfeature')).toHaveAttribute(
      'data-path',
      vertexPath,
    );
    // US-3 AS-3 hydration: the vertex label input must show the staged
    // value from step (3), not "" (the saved entry is absent). The
    // dispatcher overlays `state.byVertex[id][path]` from useStagedEdits
    // on the resolved entry → input must hydrate to `stagedLabel`.
    const labelAgain = page.getByTestId('vertex-label-input');
    await expect(labelAgain).toBeVisible();
    await expect(labelAgain).toHaveValue(stagedLabel);
  });

  // ─── US-3 AS-3 — explicit feature-mode hydration test (Phase 10) ────
  test('US-3 AS-3: staged tag re-displays in the form on re-selection', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { primaryId } = await pickPrimaryPlusPartner(page);
    const stagedTag = 'as3-hydration-tag';
    const dispatch = page.getByTestId('properties-panel-dispatch');

    // Select the feature → enter feature mode.
    await ap.selectFeature(primaryId, { source: 'layers' });
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });

    // Stage a tag.
    const tagInput = page.getByTestId('array-widget-input-tags');
    await expect(tagInput).toBeEnabled({ timeout: 5_000 });
    await tagInput.fill(stagedTag);
    await tagInput.press('Enter');
    await expect(tagInput).toHaveValue('');
    // The staged tag chip must be visible (the ArrayWidget surfaces it
    // immediately after Enter).
    await expect(
      page.getByTestId(`array-widget-chip-tags-${stagedTag}`),
    ).toBeVisible();

    // Clear selection → plot mode.
    await page.evaluate(() => {
      window.__sessionStore.getState().setSelection([], null);
    });
    await expect(dispatch).toHaveAttribute('data-mode', /plot|stale/, {
      timeout: 5_000,
    });
    // The feature-mode chip must be gone from the DOM (mode unmounted).
    await expect(
      page.getByTestId(`array-widget-chip-tags-${stagedTag}`),
    ).toBeHidden();

    // Re-select the same feature → the staged tag must re-display.
    await page.evaluate(
      ({ id }) => {
        window.__sessionStore.getState().setSelection([id], id);
      },
      { id: primaryId },
    );
    await expect(dispatch).toHaveAttribute('data-mode', 'feature', { timeout: 5_000 });

    // The crucial AS-3 assertion: the form re-mounted, and the staged
    // tag is overlaid on top of the saved properties. The chip must be
    // visible inside the new feature-mode container.
    await expect(
      page.getByTestId(`array-widget-chip-tags-${stagedTag}`),
    ).toBeVisible({ timeout: 5_000 });
  });
});
