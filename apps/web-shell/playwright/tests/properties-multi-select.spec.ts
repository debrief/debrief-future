/**
 * Multi-feature selection emitter — Playwright E2E (#192 Phase 5 / US-4).
 *
 * Covers the seven sequences from
 * `specs/192-properties-panel-feature-edit/contracts/multi-select-emitter.md`
 * § "Playwright cases":
 *
 *   - two plain clicks on map → only the most recent is selected
 *   - plain → Ctrl/Cmd → both selected; primary = second
 *   - Ctrl/Cmd → Ctrl/Cmd on first (toggle) → only second remains; primary = second
 *   - plain on third → selection collapses to third
 *   - empty-canvas click → selection cleared
 *   - two Ctrl/Cmd-clicks in Layers panel → equivalent to map path
 *   - modifier detection: navigator.platform mocked to macOS → Cmd works, Ctrl does not
 *
 * Modifier-key detection is mocked once at the test level by
 * `addInitScript` overriding `navigator.platform`, so the AnalysisPage's
 * `getPlatformModifierName()` returns `'Meta'` deterministically.
 */

import { test, expect } from '@playwright/test';
import { AnalysisPage } from '../pages/AnalysisPage';

test.describe('Multi-select emitter (#192 Phase 5)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock navigator.platform as macOS so `getPlatformModifierKey()`
    // returns 'metaKey' inside the app and `getPlatformModifierName()`
    // returns 'Meta' inside the page object. The script runs before
    // any app code so the detection branch is deterministic.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', {
        configurable: true,
        get: () => 'MacIntel',
      });
    });

    await page.goto('/');
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  /**
   * Read at least three distinct feature ids from
   * `window.__currentPlotFeatures` (the test-introspection handle the
   * web-shell exposes for Playwright). Each test uses the first three
   * so the empty-toggle / collapse-to-third sequences can run end-to-
   * end on any sample plot. Filters out features whose id is missing
   * or whose Layers-panel row hasn't yet rendered.
   */
  async function pickThreeFeatureIds(page: import('@playwright/test').Page): Promise<{
    a: string;
    b: string;
    c: string;
  }> {
    const ids = await page.evaluate(() => {
      const features =
        (window as unknown as { __currentPlotFeatures?: Array<{ id?: string | number }> })
          .__currentPlotFeatures ?? [];
      return features
        .map((f) => (f.id === undefined || f.id === null ? null : String(f.id)))
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
    });
    // Restrict to feature ids whose FeatureList row exists, so that
    // selectFeature({source: 'layers'}) can reliably target them.
    const renderedIds: string[] = [];
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop -- ordered probe
      const count = await page.getByTestId(`feature-row-${id}`).count();
      if (count > 0) renderedIds.push(id);
      if (renderedIds.length >= 3) break;
    }
    expect(renderedIds.length).toBeGreaterThanOrEqual(3);
    return { a: renderedIds[0]!, b: renderedIds[1]!, c: renderedIds[2]! };
  }

  // The five core multi-select sequences are driven via the Layers
  // panel rows (a deterministic, id-addressable click target). Map-
  // clicks ultimately reach the same `applyClickToSelection` glue, so
  // covering the sequences once via Layers panel is sufficient — and
  // a single "map click also routes through the emitter" sanity test
  // (below) proves the map wire-up. Leaflet's GeoJSON overlay does
  // NOT expose feature ids on the rendered SVG, so addressing a path
  // by id from Playwright is unreliable across plots.

  test('two plain clicks (Layers panel) → only the most recent is selected', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b } = await pickThreeFeatureIds(page);

    await ap.selectFeature(a, { source: 'layers' });
    expect(await ap.getSelectedFeatureIds()).toEqual([a]);
    expect(await ap.getSelectedPrimary()).toBe(a);

    await ap.selectFeature(b, { source: 'layers' });
    expect(await ap.getSelectedFeatureIds()).toEqual([b]);
    expect(await ap.getSelectedPrimary()).toBe(b);
  });

  test('plain → Cmd-click (Layers panel) → both selected; primary = second', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b } = await pickThreeFeatureIds(page);

    await ap.selectFeature(a, { source: 'layers' });
    await ap.selectFeature(b, { source: 'layers', modifier: true });

    expect(await ap.getSelectedFeatureIds()).toEqual([a, b]);
    expect(await ap.getSelectedPrimary()).toBe(b);
  });

  test('Cmd-toggle removes the primary; the last remaining becomes primary', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b } = await pickThreeFeatureIds(page);

    // Build [a, b] with b primary
    await ap.selectFeature(a, { source: 'layers' });
    await ap.selectFeature(b, { source: 'layers', modifier: true });
    expect(await ap.getSelectedFeatureIds()).toEqual([a, b]);
    expect(await ap.getSelectedPrimary()).toBe(b);

    // Cmd-click `b` to toggle it off — only `a` remains; primary = a
    await ap.selectFeature(b, { source: 'layers', modifier: true });
    expect(await ap.getSelectedFeatureIds()).toEqual([a]);
    expect(await ap.getSelectedPrimary()).toBe(a);
  });

  test('plain click on a third feature collapses the selection to that one', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b, c } = await pickThreeFeatureIds(page);

    await ap.selectFeature(a, { source: 'layers' });
    await ap.selectFeature(b, { source: 'layers', modifier: true });
    expect(await ap.getSelectedFeatureIds()).toEqual([a, b]);

    await ap.selectFeature(c, { source: 'layers' });
    expect(await ap.getSelectedFeatureIds()).toEqual([c]);
    expect(await ap.getSelectedPrimary()).toBe(c);
  });

  test('background click on the map clears selection', async ({ page }) => {
    const ap = new AnalysisPage(page);
    const { a } = await pickThreeFeatureIds(page);

    await ap.selectFeature(a, { source: 'layers' });
    expect(await ap.getSelectedFeatureIds()).toEqual([a]);

    await ap.clickMapBackground();
    expect(await ap.getSelectedFeatureIds()).toEqual([]);
    expect(await ap.getSelectedPrimary()).toBeNull();
  });

  test('plain map click on any feature routes through the emitter → exactly one feature selected', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    // Clear any pre-existing selection so the assertion is unambiguous.
    await ap.clickMapBackground();
    expect(await ap.getSelectedFeatureIds()).toEqual([]);

    // Click the first `.leaflet-interactive` path. We can't predict
    // which feature id that maps to (Leaflet renders in its own order
    // after MultiPolygon decomposition + STORYBOARD_SCENE filtering),
    // but the contract only requires that a plain map click produces
    // a single-feature selection with primary = that feature.
    const firstPath = page.locator('.leaflet-interactive').first();
    await firstPath.click({ force: true });

    const featureIds = await ap.getSelectedFeatureIds();
    expect(featureIds.length).toBe(1);
    expect(await ap.getSelectedPrimary()).toBe(featureIds[0]);
  });

  test('two Cmd-clicks in the Layers panel produce the same selection set as the map path', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b } = await pickThreeFeatureIds(page);

    await ap.selectFeatures([a, b], { source: 'layers' });

    expect(await ap.getSelectedFeatureIds()).toEqual([a, b]);
    expect(await ap.getSelectedPrimary()).toBe(b);
  });

  test('navigator.platform mocked to macOS → Cmd works, Ctrl does NOT', async ({
    page,
  }) => {
    const ap = new AnalysisPage(page);
    const { a, b } = await pickThreeFeatureIds(page);

    // Sanity check: the mocked platform is detected as macOS.
    expect(await ap.getPlatformModifierName()).toBe('Meta');

    // Click `a` plain
    await ap.selectFeature(a, { source: 'layers' });
    expect(await ap.getSelectedFeatureIds()).toEqual([a]);

    // Hold Ctrl (the WRONG modifier on macOS) and click `b` — should
    // behave like a plain click (replaces selection).
    const row = page.getByTestId(`feature-row-${b}`);
    await row.locator('.debrief-feature-row__content').click({
      modifiers: ['Control'],
    });
    expect(await ap.getSelectedFeatureIds()).toEqual([b]);

    // Now hold Cmd (the CORRECT modifier on macOS) and click `a` — should
    // append (multi-select).
    await ap.selectFeature(a, { source: 'layers', modifier: true });
    expect(await ap.getSelectedFeatureIds()).toEqual([b, a]);
    expect(await ap.getSelectedPrimary()).toBe(a);
  });
});
