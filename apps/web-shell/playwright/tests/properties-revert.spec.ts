/**
 * Properties Panel — override → auto-derived revert (Spec 192, Phase 8,
 * US-6 / T065 + T066).
 *
 * Drives the observable half of the US-6 acceptance scenarios against the
 * web-shell:
 *
 *   T065 — Feature with an override on `vessel_role`:
 *          (a) the revert control renders next to the slot,
 *          (b) tooltip mentions the auto-derived value resolved from the
 *              inline platform-registry mirror,
 *          (c) clicking revert flips the slot back to auto-derived
 *              (override chip disappears) and the button relabels to
 *              "Undo revert".
 *
 *   T066 — Feature whose `platform_id` is unknown to the platform-registry
 *          mirror: the revert control renders disabled with the
 *          "No auto-derived value available" tooltip (FR-024 edge case).
 *
 * Note: the panel-level Save action is not yet surfaced in the web-shell
 * (a later phase wires it). The vitest integration test in
 * `shared/components/src/PropertiesPanel/__tests__/saveSession-integration.test.ts`
 * already covers the save → reload → "slot absent from saved feature
 * properties" round-trip with `op: 'revert'` in provenance; this Playwright
 * spec asserts the UI/staging half — the half that the vitest suite cannot
 * exercise because the layout (`PropertiesPanelDispatch` + dispatcher props)
 * is host-wired.
 */

import { test, expect, type Page } from '@playwright/test';
import { AnalysisPage } from '../pages/AnalysisPage';
import { clearReadOnly } from '../fixtures/read-only';

test.describe('Properties Panel — override revert workflow (#192 Phase 8, US-6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page
      .locator('[data-testid="exercise-list-item-row"]')
      .first()
      .dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({
      timeout: 15_000,
    });
    // Headless Chromium does not grant `navigator.storage.persisted()`, so
    // the IDB capability probe defaults the plot to read-only. We flip the
    // plot slice back to writable so the panel's input + revert affordances
    // render in their interactive state. The save path is host-wired and
    // out of scope for the Playwright half — see the test docstring.
    await clearReadOnly(page);
  });

  /**
   * Locate the first feature exposed by `window.__currentPlotFeatures` that
   * has a corresponding Layers-panel row rendered. Returns its id —
   * `platform_id` and override slots are injected by the caller via
   * `injectOverride` so this works against the bundled exercise plot
   * (which does not ship per-platform overrides by design).
   */
  async function pickFirstRenderedFeature(page: Page): Promise<string> {
    const ids = await page.evaluate(() => {
      const features =
        (
          window as unknown as {
            __currentPlotFeatures?: Array<{ id?: string | number }>;
          }
        ).__currentPlotFeatures ?? [];
      return features
        .map((f) =>
          f.id === undefined || f.id === null ? null : String(f.id),
        )
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
    });
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop -- ordered probe
      const count = await page.getByTestId(`feature-row-${id}`).count();
      if (count > 0) return id;
    }
    throw new Error('no feature has a corresponding Layers-panel row');
  }

  /**
   * Mutate `feature.properties[slot] = value` in-place on the in-memory
   * feature exposed via `window.__currentPlotFeatures`. The web-shell's
   * `allFeatures` memo holds the same object references, so when the user
   * selects this feature the dispatcher reads the mutated property. This
   * mirrors what an analyst-set override would look like once the plot
   * round-trips through `useStagedEdits.applyEditsToFeatures` (Phase 2).
   */
  async function injectOverride(
    page: Page,
    featureId: string,
    slot: string,
    value: string,
  ): Promise<void> {
    await page.evaluate(
      ({ id, key, val }) => {
        const features =
          (
            window as unknown as {
              __currentPlotFeatures?: Array<{
                id?: string | number;
                properties?: Record<string, unknown>;
              }>;
            }
          ).__currentPlotFeatures ?? [];
        const f = features.find((x) => String(x.id) === id);
        if (!f) throw new Error(`injectOverride: feature ${id} not found`);
        // eslint-disable-next-line no-restricted-syntax -- test-only mutation
        (f.properties as Record<string, unknown>)[key] = val;
      },
      { id: featureId, key: slot, val: value },
    );
  }

  /**
   * Mutate `feature.properties.platform_id` to a value not present in the
   * inline registry mirror — drives the FR-024 disabled-revert branch.
   */
  async function setUnknownPlatformId(
    page: Page,
    featureId: string,
  ): Promise<void> {
    await page.evaluate((id) => {
      const features =
        (
          window as unknown as {
            __currentPlotFeatures?: Array<{
              id?: string | number;
              properties?: Record<string, unknown>;
            }>;
          }
        ).__currentPlotFeatures ?? [];
      const f = features.find((x) => String(x.id) === id);
      if (!f) throw new Error(`setUnknownPlatformId: feature ${id} not found`);
      // eslint-disable-next-line no-restricted-syntax -- test-only mutation
      (f.properties as Record<string, unknown>)['platform_id'] =
        'UNKNOWN-XYZ-NOT-IN-REGISTRY';
    }, featureId);
  }

  // The bundled exercise-alpha sample does not ship per-platform overrides
  // (deliberately — the schema-driven path validates absence too). We
  // inject `platform_id` AND the override slot before selecting so the
  // FeatureEditorMode renders against a feature shape that mirrors the
  // post-#181 production shape. "NELSON" is in the inline registry mirror
  // and resolves to vessel_role=frigate, nationality=GB, etc.
  const KNOWN_PLATFORM_ID = 'NELSON';

  // ─── T065 — revert button enabled + click flips state ──────────────
  test('feature with override on vessel_role exposes an enabled revert control (US-6 AS-1)', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const featureId = await pickFirstRenderedFeature(page);

    // Pre-set the platform_id + override before selecting (so the
    // dispatcher renders FeatureEditorMode with both populated).
    await injectOverride(page, featureId, 'platform_id', KNOWN_PLATFORM_ID);
    await injectOverride(page, featureId, 'vessel_role', 'destroyer');

    await ap.selectFeature(featureId, { source: 'layers' });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();

    // The revert button MUST render with the per-slot testid.
    const btn = page.getByTestId('revert-vessel_role');
    await expect(btn).toBeVisible();
    // Enabled — the inline platform-registry mirror resolves NELSON to
    // a non-null vessel_role ("frigate").
    await expect(btn).toBeEnabled();
    // Tooltip mentions the auto-derived value to restore.
    const title = (await btn.getAttribute('title')) ?? '';
    expect(title).toMatch(/restore the registry value/i);
    expect(title).toMatch(/frigate/);
  });

  test('clicking revert hides the override chip and relabels the button to "Undo revert" (US-6 AS-2)', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const featureId = await pickFirstRenderedFeature(page);
    await injectOverride(page, featureId, 'platform_id', KNOWN_PLATFORM_ID);
    await injectOverride(page, featureId, 'vessel_role', 'destroyer');

    await ap.selectFeature(featureId, { source: 'layers' });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();

    // Pre-click: the override chip is rendered inside the vessel_role row.
    const overrideRow = page.getByTestId('properties-field-vessel_role');
    await expect(
      overrideRow.locator('[data-testid="properties-chip-override"]'),
    ).toBeVisible();

    await page.getByTestId('revert-vessel_role').click();

    // Post-click: chip is gone (derivation flipped back per FR-024)
    await expect(
      overrideRow.locator('[data-testid="properties-chip-override"]'),
    ).toHaveCount(0);
    // And the button now reads "Undo revert"
    const relabelled =
      (await page.getByTestId('revert-vessel_role').textContent()) ?? '';
    expect(relabelled).toMatch(/undo/i);
  });

  test('clicking undo revert re-shows the override chip (US-6 AS-3)', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const featureId = await pickFirstRenderedFeature(page);
    await injectOverride(page, featureId, 'platform_id', KNOWN_PLATFORM_ID);
    await injectOverride(page, featureId, 'vessel_role', 'destroyer');

    await ap.selectFeature(featureId, { source: 'layers' });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();

    // Revert, then undo — round-trip.
    await page.getByTestId('revert-vessel_role').click();
    await expect(
      page.getByTestId('properties-field-vessel_role').locator(
        '[data-testid="properties-chip-override"]',
      ),
    ).toHaveCount(0);

    await page.getByTestId('revert-vessel_role').click();
    await expect(
      page.getByTestId('properties-field-vessel_role').locator(
        '[data-testid="properties-chip-override"]',
      ),
    ).toBeVisible();
  });

  // ─── T066 — unknown platform → disabled control + tooltip (FR-024) ─
  test('feature with unknown platform_id renders revert control disabled + tooltip (US-6 AS-4 / FR-024)', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const featureId = await pickFirstRenderedFeature(page);

    // Mutate the platform_id to one not present in the registry mirror,
    // then set a vessel_role override. The widget MUST render disabled
    // because the registry lookup returns null for the slot.
    await setUnknownPlatformId(page, featureId);
    await injectOverride(page, featureId, 'vessel_role', 'destroyer');

    await ap.selectFeature(featureId, { source: 'layers' });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();

    const btn = page.getByTestId('revert-vessel_role');
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
    const title = (await btn.getAttribute('title')) ?? '';
    expect(title).toMatch(/no auto-derived value available/i);
  });

  // ─── No override → no revert button ────────────────────────────────
  test('feature without a vessel_role override does NOT render the revert control', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const featureId = await pickFirstRenderedFeature(page);

    // Inject a platform_id but no override; the slot stays absent on the
    // source feature properties so the widget is hidden (Row 4 — hidden).
    await injectOverride(page, featureId, 'platform_id', KNOWN_PLATFORM_ID);
    await ap.selectFeature(featureId, { source: 'layers' });
    await expect(page.getByTestId('properties-mode-feature')).toBeVisible();
    await expect(page.getByTestId('revert-vessel_role')).toHaveCount(0);
  });
});
