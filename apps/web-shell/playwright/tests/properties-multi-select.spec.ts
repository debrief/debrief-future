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
import { clearReadOnly } from '../fixtures/read-only';
import { clickVirtualisedRow } from '../helpers/clickVirtualisedRow';

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
    // Headless Chromium's `navigator.storage.persisted()` returns false,
    // which the IDB writer probe surfaces as a read-only plot. The Layers
    // row click target is unaffected, but inputs elsewhere in the panel
    // become `disabled`, and any spec that types into them — or any later
    // spec in the same Playwright run that inherits the same in-memory
    // store between cases — sees its clicks time out at 30 s. Reset the
    // signal explicitly per spec to keep the suite deterministic in CI.
    await clearReadOnly(page);
    // GoldenLayout sometimes mounts the Log tab in front by default —
    // when it does, the Activity panel's Layers list never mounts and
    // `feature-row-<id>` is absent from the DOM, so every Layers-panel
    // click in this spec times out at 30 s. Force the Activity tab to
    // the front (mirrors the mode-swap + evidence-captures pattern).
    const activityTab = page.locator('.lm_tab:has-text("Activity")');
    if ((await activityTab.count()) > 0) {
      const isActive = ((await activityTab.getAttribute('class')) ?? '').includes(
        'lm_active',
      );
      if (!isActive) await activityTab.click();
    }
  });

  /**
   * Some tests select multiple features in sequence via the Layers
   * panel. After the first selection, the FeatureEditorMode renders
   * 7+ field rows in the Properties section; with Properties expanded
   * the Layers section shrinks and `@tanstack/react-virtual`
   * virtualises every row out of the DOM, so the second click can't
   * find its target. The Layers-panel tests call this helper to give
   * the FeatureList enough vertical room to keep all 3+ rows mounted.
   * Tests that exercise the map directly skip this (collapsing the
   * Properties section resizes the map and shifts `.leaflet-interactive`
   * geometry, which would change which feature the first path resolves to).
   */
  async function collapsePropertiesSection(page: import('@playwright/test').Page): Promise<void> {
    const propertiesHeader = page.locator(
      'button.debrief-activity-panel__section-header:has-text("Properties")',
    );
    if ((await propertiesHeader.count()) > 0) {
      const expanded = await propertiesHeader.getAttribute('aria-expanded');
      if (expanded === 'true') await propertiesHeader.click();
    }
  }

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
    // Collapse the Properties section first — see collapsePropertiesSection
    // for the rationale. Every test that needs ≥ 2 Layers-panel rows to
    // remain mounted across selection events goes through this picker, so
    // routing the collapse here gets it in front of all those tests
    // without polluting the map-only tests that skip the picker.
    await collapsePropertiesSection(page);
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

    // Click `.leaflet-interactive` paths until one produces a selection.
    // We can't predict which feature id a given path maps to (Leaflet
    // renders in its own order after MultiPolygon decomposition +
    // STORYBOARD_SCENE filtering), and not every interactive path is a
    // selectable feature — STORYBOARD_SCENE rectangles render as
    // `.leaflet-interactive` but the resolver filters them out, so a
    // click there yields an empty selection. Iterating proves the
    // contract ("a plain map click on a feature routes through the
    // emitter → exactly one feature") without depending on the SVG
    // paint order, which the #264 storyboard work made less predictable.
    const paths = page.locator('.leaflet-interactive');
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(0);

    let selectedAfterClick: string[] = [];
    for (let i = 0; i < pathCount; i++) {
      // eslint-disable-next-line no-await-in-loop -- ordered probe
      await ap.clickMapBackground();
      // eslint-disable-next-line no-await-in-loop
      await paths.nth(i).click({ force: true });
      // eslint-disable-next-line no-await-in-loop
      selectedAfterClick = await ap.getSelectedFeatureIds();
      if (selectedAfterClick.length > 0) break;
    }

    // At least one interactive path must map to a selectable feature.
    expect(selectedAfterClick.length).toBe(1);
    expect(await ap.getSelectedPrimary()).toBe(selectedAfterClick[0]);
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
    await clickVirtualisedRow(
      page,
      row.locator('.debrief-feature-row__content'),
      ['Control'],
    );
    expect(await ap.getSelectedFeatureIds()).toEqual([b]);

    // Now hold Cmd (the CORRECT modifier on macOS) and click `a` — should
    // append (multi-select).
    await ap.selectFeature(a, { source: 'layers', modifier: true });
    expect(await ap.getSelectedFeatureIds()).toEqual([b, a]);
    expect(await ap.getSelectedPrimary()).toBe(a);
  });
});
