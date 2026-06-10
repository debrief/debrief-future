/**
 * AnalysisPage - Page Object Model for the analysis view.
 *
 * This page displays the loaded plot with:
 * - Activity panel (TimeController, Tools, Layers)
 * - Map view with features
 */

import type { Page, Locator } from '@playwright/test';
import { TimeController } from '../components/TimeController';
import { clickVirtualisedRow } from '../helpers/clickVirtualisedRow';

/**
 * Page object for the Analysis view.
 *
 * The analysis view shows:
 * - Header with back button and plot title
 * - GoldenLayout panel workspace with Navigation, Activity/Log (tabbed), and Map panels
 */
export class AnalysisPage {
  readonly page: Page;
  readonly timeController: TimeController;

  constructor(page: Page) {
    this.page = page;
    // TimeController is within the activity panel
    this.timeController = new TimeController(page);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Wait for the analysis page to fully load.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('.web-shell--analysis', { state: 'visible' });
    // GoldenLayout initialises panels asynchronously; allow extra time for map mount
    await this.page.waitForSelector('.leaflet-container', { state: 'visible', timeout: 15000 });
  }

  /**
   * Navigate back to the catalog.
   */
  async backToCatalog(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForSelector('.web-shell--welcome', { state: 'visible' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The main container for the analysis view.
   */
  get container(): Locator {
    return this.page.locator('.web-shell--analysis');
  }

  /**
   * The page header.
   */
  get header(): Locator {
    return this.page.locator('.web-shell__header');
  }

  /**
   * The back button.
   */
  get backButton(): Locator {
    return this.page.locator('.web-shell__back-button[aria-label="Back to catalog"]');
  }

  /**
   * The plot title in the header.
   */
  get title(): Locator {
    return this.page.locator('.web-shell--analysis .web-shell__title');
  }

  /**
   * The panel workspace container (GoldenLayout).
   */
  get workspace(): Locator {
    return this.page.locator('[data-testid="panel-workspace"]');
  }

  /**
   * The activity panel component.
   */
  get activityPanel(): Locator {
    return this.page.locator('.debrief-activity-panel');
  }

  /**
   * The map container (GoldenLayout panel).
   */
  get mapContainer(): Locator {
    return this.page.locator('[data-testid="panel-map"]');
  }

  /**
   * The Leaflet map.
   */
  get map(): Locator {
    return this.page.locator('.leaflet-container');
  }

  /**
   * Interactive features on the map.
   */
  get mapFeatures(): Locator {
    return this.page.locator('.leaflet-interactive');
  }

  /**
   * Tool message display (shows results).
   */
  get toolMessage(): Locator {
    return this.page.locator('.web-shell__tool-message');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Activity Panel Sections
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all activity panel sections.
   */
  get sections(): Locator {
    return this.page.locator('.debrief-activity-panel__section');
  }

  /**
   * Get a section by its title.
   */
  getSectionByTitle(title: string): Locator {
    return this.page.locator(`.debrief-activity-panel__section:has(.debrief-activity-panel__section-title:text("${title}"))`);
  }

  /**
   * The Time Controller section.
   */
  get timeControllerSection(): Locator {
    return this.getSectionByTitle('TIME CONTROLLER');
  }

  /**
   * The Tools section.
   */
  get toolsSection(): Locator {
    return this.getSectionByTitle('TOOLS');
  }

  /**
   * The Layers section.
   */
  get layersSection(): Locator {
    return this.getSectionByTitle('LAYERS');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Layers Panel
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all layer rows in the layers panel.
   */
  get layerRows(): Locator {
    return this.page.locator('.debrief-feature-row');
  }

  /**
   * Get the number of layers displayed.
   */
  async getLayerCount(): Promise<number> {
    return await this.layerRows.count();
  }

  /**
   * Find a layer by its name.
   */
  getLayerByName(name: string): Locator {
    return this.page.locator(`.debrief-feature-row:has(.debrief-feature-row__name:text("${name}"))`);
  }

  /**
   * Get all layer names.
   */
  async getLayerNames(): Promise<string[]> {
    const names = await this.page.locator('.debrief-feature-row__name').allTextContents();
    return names;
  }

  /**
   * Click on a layer to select it.
   */
  async selectLayer(layer: Locator): Promise<void> {
    // Click the content area to avoid the expand button (which has stopPropagation).
    // The FeatureList is virtualised and lives in a scrollable ActivityPanel
    // column, so scroll the row into view first — otherwise a plain click()
    // can time out at short viewports (see selectFeature for the same pattern).
    const content = layer.locator('.debrief-feature-row__content');
    const target = (await content.count()) > 0 ? content : layer;
    await clickVirtualisedRow(this.page, target);
  }

  /**
   * Get the selected layers.
   */
  get selectedLayers(): Locator {
    return this.page.locator('.debrief-feature-row--selected');
  }

  /**
   * Get the count of selected layers.
   */
  async getSelectedLayerCount(): Promise<number> {
    return await this.selectedLayers.count();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tools Panel
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all tool items.
   */
  get toolItems(): Locator {
    return this.page.locator('.debrief-tools-panel__tool');
  }

  /**
   * Find a tool by its name.
   */
  getToolByName(name: string): Locator {
    return this.page.locator(`.debrief-tools-panel__tool:has-text("${name}")`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Map Interactions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the number of features rendered on the map.
   */
  async getMapFeatureCount(): Promise<number> {
    return await this.mapFeatures.count();
  }

  /**
   * Click on a map feature.
   */
  async clickMapFeature(index: number): Promise<void> {
    await this.mapFeatures.nth(index).click();
  }

  /**
   * Click on the map background (to clear selection).
   */
  async clickMapBackground(): Promise<void> {
    // Click on the map container, not on a feature
    await this.map.click({ position: { x: 10, y: 10 } });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Multi-feature selection helpers (#192 Phase 5)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Detect the platform modifier key from `navigator.platform` inside the
   * page. macOS → `Meta`, everything else → `Control`. Tests that mock
   * `navigator.platform` via `addInitScript` will see the mocked value.
   *
   * Returns the Playwright `KeyboardModifier` string accepted by `click`.
   */
  async getPlatformModifierName(): Promise<'Meta' | 'Control'> {
    const isMac = await this.page.evaluate(() => {
      const platform = navigator.platform ?? '';
      return /Mac|iP(hone|od|ad)/.test(platform);
    });
    return isMac ? 'Meta' : 'Control';
  }

  /**
   * Click a single feature, either on the map or in the Layers panel.
   *
   * - `source: 'layers'` clicks the FeatureList row whose
   *   `data-testid="feature-row-<id>"` matches.
   * - `source: 'map'` clicks the Leaflet SVG path/marker overlay. Leaflet
   *   does NOT expose feature ids on the rendered DOM, so the page-object
   *   looks the feature up by index via `__sessionStore.featureCollection`
   *   and clicks the matching `.leaflet-interactive` element by index.
   *
   * Both routes converge on the shared `applyClickToSelection` glue
   * (#192 Phase 5); the resulting `selection.featureIds` transition is
   * identical between sources.
   *
   * @param id  Feature ID
   * @param options.modifier  If true, hold the platform modifier (Cmd on
   *                          Mac / Ctrl elsewhere) during the click.
   * @param options.source    `'map'` or `'layers'` — defaults to `'map'`.
   */
  async selectFeature(
    id: string,
    options: { modifier?: boolean; source?: 'map' | 'layers' } = {},
  ): Promise<void> {
    const source = options.source ?? 'map';
    const modifiers = options.modifier
      ? ([await this.getPlatformModifierName()] as Array<'Meta' | 'Control'>)
      : ([] as Array<'Meta' | 'Control'>);
    const clickOpts = modifiers.length > 0 ? { modifiers } : {};

    if (source === 'map') {
      const featureIndex = await this.page.evaluate((target) => {
        // window.__currentPlotFeatures is exposed by the web-shell for
        // test introspection; the Leaflet GeoJSON overlay renders
        // `.leaflet-interactive` in the same array order.
        const features =
          (
            window as unknown as {
              __currentPlotFeatures?: Array<{ id?: string | number }>;
            }
          ).__currentPlotFeatures ?? [];
        return features.findIndex((f) => String(f.id) === target);
      }, id);
      if (featureIndex < 0) {
        throw new Error(`selectFeature: feature id "${id}" not in __currentPlotFeatures`);
      }
      // `force` is sometimes needed when an overlay sits on top of an SVG path.
      await this.mapFeatures.nth(featureIndex).click({ ...clickOpts, force: true });
      return;
    }

    // Layers-panel row. The FeatureList is virtualised via @tanstack/
    // react-virtual inside the scrollable, sticky-headed ActivityPanel
    // column, where Playwright's own click() fails (see clickVirtualisedRow).
    const row = this.page.getByTestId(`feature-row-${id}`);
    await clickVirtualisedRow(
      this.page,
      row.locator('.debrief-feature-row__content'),
      modifiers,
    );
  }

  /**
   * Select multiple features in click order. The first click is plain;
   * every subsequent click holds the platform modifier (so the resulting
   * `selection.featureIds` is `[id0, id1, ..., idN]`).
   *
   * @param ids       Feature IDs in click order.
   * @param options.source  `'map'` or `'layers'`.
   */
  async selectFeatures(
    ids: ReadonlyArray<string>,
    options: { source?: 'map' | 'layers' } = {},
  ): Promise<void> {
    const source = options.source ?? 'map';
    for (let i = 0; i < ids.length; i++) {
      // eslint-disable-next-line no-await-in-loop -- clicks must be sequential
      await this.selectFeature(ids[i]!, { modifier: i > 0, source });
    }
  }

  /**
   * Read `selection.featureIds` from the session-state store. Used by
   * Playwright specs to assert the post-click selection-set shape.
   */
  async getSelectedFeatureIds(): Promise<string[]> {
    return await this.page.evaluate(() => {
      // window.__sessionStore is exposed for test introspection.
      return window.__sessionStore.getState().selection.featureIds;
    });
  }

  /**
   * Read `selection.primary` from the session-state store.
   */
  async getSelectedPrimary(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return window.__sessionStore.getState().selection.primary ?? null;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 4 (US-2): sub-feature (vertex) selection helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Select a single vertex on a feature by writing through the
   * session-state store.
   *
   * Why store-driven and not a DOM click:
   *   Leaflet `CircleMarker` / `Marker` elements rendered by
   *   `PositionSymbolsLayer` are SVG `<circle>` / `<img>` nodes inside
   *   the Leaflet pane. They do NOT carry the position index on a
   *   queryable DOM attribute — the only stable per-position handle is
   *   the selection-state path string (`<featureId>/positions/<N>`)
   *   that `PositionSymbolsLayer` already uses for highlight rendering.
   *   The `window.__sessionStore` test-introspection handle exposes
   *   `setSelection(featureIds, primary)` directly, so the page object
   *   sets `featureIds = [fullPath]` and `primary = fullPath`. This
   *   matches the exact selection shape that a real per-position click
   *   would produce once that interaction is wired (Phase 9), and
   *   exercises the full resolver → dispatcher → SubFeatureEditorMode
   *   path under test.
   *
   * @param featureId The parent feature's id.
   * @param path      The vertex path relative to the feature (e.g.
   *                  `positions/4`). Concatenated with the feature id
   *                  to form the full selection-path primary key.
   */
  async selectVertex(featureId: string, path: string): Promise<void> {
    const fullPath = `${featureId}/${path}`;
    // We write both `featureIds` and `primary` as the full structured
    // path. The web-shell host currently passes only `selectedFeatureIds`
    // (not the full `selection` object) into `ActivityPanel`; the panel
    // then synthesises `primary` from `selectedFeatureIds[0]` when no
    // `selection` prop is present. By putting the structured path on
    // featureIds[0], the resolver receives a primary that mirrors the
    // structured path verbatim and the vertex-bearing branch fires.
    // The resolver tolerates this — it parses each featureId, takes the
    // root for feature-map lookups, and reduces multi-feature roots
    // independently.
    await this.page.evaluate(
      ({ ids, primary }) => {
        window.__sessionStore.getState().setSelection(ids, primary);
      },
      { ids: [fullPath], primary: fullPath },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 3 helpers (US-1) — feature-editor workflow (#192 T031)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Type a tag value into the FeatureEditorMode's `tags` ArrayWidget input
   * and press Enter to commit it. Commits go through
   * `useStagedEdits.setFeatureField` per Phase 3 wiring.
   *
   * Requires the FeatureEditorMode to be visible — call after
   * `selectFeature(id, { source: 'layers' })`.
   *
   * @param value  The tag string to add. Must be non-empty (the
   *               ArrayWidget rejects empty / duplicate / non-enum values
   *               at the widget level — those edge cases are not the
   *               concern of this Phase 3 helper).
   */
  async editTag(value: string): Promise<void> {
    const input = this.page.getByTestId('array-widget-input-tags');
    await input.fill(value);
    await input.press('Enter');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Panel Tabs (GoldenLayout)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The GoldenLayout tab header containing Activity and Log tabs.
   * Activity and Log share a tabbed stack in the default layout.
   */
  get tabBar(): Locator {
    return this.page.locator('.lm_header:has(.lm_tab:has-text("Activity"))');
  }

  /**
   * The Activity tab in the GoldenLayout tab bar.
   */
  get activityTab(): Locator {
    return this.page.locator('.lm_tab:has-text("Activity")');
  }

  /**
   * The Log tab in the GoldenLayout tab bar.
   */
  get logTab(): Locator {
    return this.page.locator('.lm_tab:has-text("Log")');
  }

  /**
   * Switch to the Activity tab in GoldenLayout.
   */
  async switchToActivityTab(): Promise<void> {
    await this.activityTab.click();
    // Wait for Activity panel to become visible
    await this.page.waitForTimeout(100);
  }

  /**
   * Switch to the Log tab in GoldenLayout.
   */
  async switchToLogTab(): Promise<void> {
    await this.logTab.click();
    // Wait for Log panel to become visible
    await this.page.waitForTimeout(100);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Panel
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The log panel component.
   */
  get logPanel(): Locator {
    return this.page.getByTestId('log-panel');
  }

  /**
   * Log timeline entries.
   */
  get logEntries(): Locator {
    return this.page.locator('.log-panel__entry');
  }

  /**
   * Log empty state (no entries).
   */
  get logEmptyNoEntries(): Locator {
    return this.page.getByTestId('log-panel-empty-no-entries');
  }

  /**
   * Get the count of log entries.
   */
  async getLogEntryCount(): Promise<number> {
    return await this.logEntries.count();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the plot title text.
   */
  async getTitleText(): Promise<string> {
    return await this.title.textContent() ?? '';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if the analysis page is currently visible.
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Check if the map has loaded features.
   */
  async hasMapFeatures(): Promise<boolean> {
    return (await this.getMapFeatureCount()) > 0;
  }

  /**
   * Check if the activity panel is visible.
   */
  async hasActivityPanel(): Promise<boolean> {
    return await this.activityPanel.isVisible();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Thumbnail capture helpers (#174)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Click the "Fit to visible features" button on the map toolbar.
   * Waits for the map to settle after fitting.
   */
  async fitToWindow(): Promise<void> {
    const fitButton = this.page.locator('[data-testid="fit-to-window"]');
    await fitButton.click();
    // Allow the map to animate to the new bounds
    await this.page.waitForTimeout(500);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drawing state introspection (#108)
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // Playhead-clamp notification (#267)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The non-blocking clamp notification surfaced when an orphaned saved playhead
   * is moved to the window edge on load (spec 267, FR-003). An always-visible,
   * auto-dismissing App-level toast (not tab-gated), distinct from the #259
   * error banner.
   */
  get clampNotification(): Locator {
    return this.page.getByTestId('playhead-clamp-toast');
  }

  /**
   * Read the session-state playhead (`currentTime`, epoch ms) via the
   * `window.__sessionStore` test-introspection handle. Used to assert the
   * playhead landed on the window edge after a tolerant clamp.
   */
  async getCurrentTime(): Promise<number | null> {
    return await this.page.evaluate(() => window.__sessionStore.getState().currentTime);
  }

  /**
   * Read the session-state time window (`timeRange`, epoch ms) so a test can
   * assert the clamped playhead equals the window's `start`/`end`.
   */
  async getTimeRange(): Promise<{ start: number; end: number } | null> {
    return await this.page.evaluate(() => window.__sessionStore.getState().timeRange);
  }

  /**
   * Read the current drawingMode from the session-state store via the
   * test-introspection handle exposed at `window.__sessionStore`. Used by
   * Playwright specs that need to assert the store value directly without
   * scraping toolbar DOM state.
   */
  async getDrawingMode(): Promise<string | null> {
    return await this.page.evaluate(
      () => window.__sessionStore.getState().drawingMode,
    );
  }

  /**
   * Read the current drawingPaletteIndex from the session-state store via
   * the same test-introspection handle.
   */
  async getDrawingPaletteIndex(): Promise<number> {
    return await this.page.evaluate(
      () => window.__sessionStore.getState().drawingPaletteIndex,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // US3 layout helpers (#281)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Measure the pixel width of the sidebar / activity-panel column.
   *
   * Uses the bounding box of the activity panel itself (which fills the sidebar
   * GoldenLayout column), so the measurement is independent of the exact
   * GoldenLayout DOM shape.
   */
  async getActivityRailWidthPx(): Promise<number> {
    const box = await this.activityPanel.boundingBox();
    return box?.width ?? 0;
  }

  /**
   * Return all tool-name label elements inside the ToolsPanel.
   * Used to check for ellipsis (scrollWidth > clientWidth).
   */
  get toolNameLabels(): import('@playwright/test').Locator {
    return this.page.locator('.debrief-tools-panel__tool-name');
  }

  /**
   * Count of tool-name labels whose text is ellipsised (scrollWidth > offsetWidth).
   *
   * Uses `evaluate` to run inside the page so DOM metrics are accurate.
   */
  async countEllipsisedToolLabels(): Promise<number> {
    return this.page.evaluate(() => {
      const labels = Array.from(
        document.querySelectorAll('.debrief-tools-panel__tool-name'),
      ) as HTMLElement[];
      return labels.filter((el) => el.scrollWidth > el.offsetWidth).length;
    });
  }

  /**
   * Returns true if any tool label text is truncated / ellipsised.
   */
  async hasEllipsisedToolLabel(): Promise<boolean> {
    return (await this.countEllipsisedToolLabels()) > 0;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // US4 Properties reachability helpers (#281)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The Properties form (plot mode) rendered inside ActivityPanel.
   * Matches both the loading state (data-loading=true) and the loaded state.
   */
  get propertiesForm(): import('@playwright/test').Locator {
    return this.page.locator('[data-testid="properties-form"]');
  }

  /**
   * The Properties panel dispatch container (encompasses all modes —
   * plot/feature/subfeature/multi-select).
   */
  get propertiesPanelDispatch(): import('@playwright/test').Locator {
    return this.page.locator('[data-testid="properties-panel-dispatch"]');
  }

  /**
   * Returns true when the Properties form or dispatch element is
   * present in the DOM and within the viewport (not scrolled out of view).
   *
   * Playwright `isIntersectingViewport` returns true if ANY part of the
   * element is visible — suitable for reachability assertions.
   */
  async isPropertiesReachable(): Promise<boolean> {
    // First try the dispatch container (broadest match)
    const dispatch = this.propertiesPanelDispatch;
    if (await dispatch.count() > 0) {
      return dispatch.isVisible();
    }
    // Fallback: form element
    const form = this.propertiesForm;
    if (await form.count() > 0) {
      return form.isVisible();
    }
    return false;
  }
}
