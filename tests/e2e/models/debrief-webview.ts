/**
 * DebriefWebview — Page Object for Debrief webview component interactions.
 *
 * Operates within the nested iframe context (inside VS Code's webview).
 * All selectors target Debrief-controlled components (map, catalog, tool UI)
 * whose DOM structure is owned and stabilised by this project.
 *
 * Readiness model (post-#142):
 *   The frame is resolved lazily — call waitForMapReady() or getFrame() after
 *   opening a plot via CodeServerPage.openPlotViaStacTree(). With patch-webview.sh
 *   Patch 3 applied, resolveWebviewView() fires unconditionally so the real
 *   extension HTML is in place; selectors here assume real content (no skip
 *   guard required at the page-object layer). Per-test fixme markers remain
 *   only for genuinely unimplemented upstream features (calc, drawing).
 *
 * @see contracts/webview-selectors.md for the full selector contract
 * @see specs/142-vscode-e2e-webview-reliability/evidence/root-cause-analysis.md
 */
import type { FrameLocator, Locator } from '@playwright/test';
import type { CodeServerPage } from './code-server-page';

export class DebriefWebview {
  private readonly codeServerPage: CodeServerPage;
  private _frame: FrameLocator | null = null;

  constructor(codeServerPage: CodeServerPage) {
    this.codeServerPage = codeServerPage;
  }

  /** Resolve the webview frame (lazy — waits for iframe to appear). */
  get frame(): FrameLocator {
    if (!this._frame) {
      throw new Error(
        'Webview frame not resolved yet. Call waitForMapReady() or getFrame() first.'
      );
    }
    return this._frame;
  }

  /** Resolve the webview frame explicitly. */
  async getFrame(): Promise<FrameLocator> {
    if (!this._frame) {
      this._frame = await this.codeServerPage.getWebviewFrame();
    }
    return this._frame;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Map Panel
  // ─────────────────────────────────────────────────────────────────────────────

  /** The Leaflet map container. */
  get mapContainer(): Locator {
    return this.frame.locator('.leaflet-container');
  }

  /** All interactive map features (track polylines, markers). */
  get mapFeatures(): Locator {
    return this.frame.locator('.leaflet-interactive');
  }

  /** The currently selected track. */
  get selectedTrack(): Locator {
    return this.frame.locator('.track--selected');
  }

  /** Fit-to-window button. */
  get fitWindowButton(): Locator {
    return this.frame.locator('[data-testid="fit-window"]');
  }

  /**
   * Wait for the Leaflet map to initialise inside the webview.
   * Also resolves the webview frame if not already done.
   */
  async waitForMapReady(): Promise<void> {
    await this.getFrame();
    await this.mapContainer.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Count visible track features on the map.
   */
  async getTrackCount(): Promise<number> {
    // Wait briefly for features to render
    await this.mapFeatures.first().waitFor({ state: 'visible', timeout: 10_000 });
    return await this.mapFeatures.count();
  }

  /**
   * Click a track feature on the map by index.
   * @param index - Zero-based index of the track feature
   */
  async selectTrackByIndex(index: number): Promise<void> {
    await this.mapFeatures.nth(index).click({ force: true });
  }

  /**
   * Click a track feature by its vessel name (if labelled).
   * Falls back to clicking the first feature if name not found.
   * @param name - The vessel/track name to select
   */
  async selectTrack(name: string): Promise<void> {
    // Try to find by aria-label or data attribute
    const labeled = this.frame.locator(
      `.leaflet-interactive[aria-label*="${name}"], [data-track-name="${name}"]`
    );
    if ((await labeled.count()) > 0) {
      await labeled.first().click({ force: true });
    } else {
      // Fall back to clicking by index
      await this.mapFeatures.first().click({ force: true });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Catalog Panel
  // ─────────────────────────────────────────────────────────────────────────────

  /** The catalog overview container. */
  get catalogOverview(): Locator {
    return this.frame.locator('.catalog-overview');
  }

  /** All plot items in the catalog. */
  get catalogPlotItems(): Locator {
    return this.frame.locator('.catalog-plot-item');
  }

  /** Feature count display for a plot. */
  get featureCountDisplay(): Locator {
    return this.frame.locator('.catalog-feature-count');
  }

  /** Provenance source links. */
  get provenanceLinks(): Locator {
    return this.frame.locator('.provenance-source');
  }

  /**
   * Get all entries in the STAC catalog panel.
   * @returns Array of catalog entry text contents
   */
  async getCatalogEntries(): Promise<string[]> {
    const items = this.catalogPlotItems;
    const count = await items.count();
    const entries: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) entries.push(text.trim());
    }
    return entries;
  }

  /**
   * Get the feature count for a specific plot.
   * @param plotIndex - Zero-based index of the plot in the catalog
   */
  async getFeatureCount(plotIndex = 0): Promise<number> {
    const countText = await this.featureCountDisplay.nth(plotIndex).textContent();
    return parseInt(countText ?? '0', 10);
  }

  /**
   * Verify provenance chain exists for a feature.
   * @param featureIndex - Zero-based index of the feature
   * @returns Whether provenance information is present
   */
  async verifyProvenance(featureIndex = 0): Promise<boolean> {
    const link = this.provenanceLinks.nth(featureIndex);
    return await link.isVisible();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Panel (Feature 072/076)
  // ─────────────────────────────────────────────────────────────────────────────

  /** The log panel root container. */
  get logPanel(): Locator {
    return this.frame.locator('[data-testid="log-panel"]');
  }

  /** All log timeline entries. */
  get logEntries(): Locator {
    return this.frame.locator('.log-panel__entry');
  }

  /** Empty state: no log entries yet. */
  get logEmptyNoEntries(): Locator {
    return this.frame.locator('[data-testid="log-panel-empty-no-entries"]');
  }

  /** Log panel notification banner. */
  get logNotification(): Locator {
    return this.frame.locator('[data-testid="log-panel-notification"]');
  }

  /** Tunable parameter values (clickable to tune). */
  get tunableParams(): Locator {
    return this.frame.locator('.log-panel__entry-param-value--tunable');
  }

  /** Get a specific tunable parameter value by parameter name. */
  getTunableParam(paramName: string): Locator {
    return this.frame.locator(`[data-testid="tune-param-${paramName}"]`);
  }

  /** Tuned badge on a log entry. */
  get tunedBadge(): Locator {
    return this.frame.locator('[data-testid="badge-tuned"]');
  }

  /** Replay progress indicator. */
  get replayProgress(): Locator {
    return this.frame.locator('[data-testid="replay-progress"]');
  }

  /**
   * Count visible log entries.
   */
  async getLogEntryCount(): Promise<number> {
    return await this.logEntries.count();
  }

  /**
   * Click a log entry by index to select it.
   */
  async selectLogEntry(index: number): Promise<void> {
    await this.logEntries.nth(index).click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection Sync (T201)
  // ─────────────────────────────────────────────────────────────────────────────

  /** The feature list container. */
  get featureList(): Locator {
    return this.frame.locator('.debrief-feature-list');
  }

  /** All feature rows in the list. */
  get featureRows(): Locator {
    return this.frame.locator('.debrief-feature-row');
  }

  /** Selected feature row. */
  get selectedFeatureRow(): Locator {
    return this.frame.locator('.debrief-feature-row--selected');
  }

  /**
   * Get the count of feature rows in the list.
   */
  async getFeatureRowCount(): Promise<number> {
    return await this.featureRows.count();
  }

  /**
   * Click a feature row by index to select it.
   */
  async selectFeatureRow(index: number): Promise<void> {
    await this.featureRows.nth(index).click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Time Controller (T202)
  // ─────────────────────────────────────────────────────────────────────────────

  /** The time controller root container. */
  get timeController(): Locator {
    return this.frame.locator('.debrief-time-controller');
  }

  /** The time scrubber. */
  get timeScrubber(): Locator {
    return this.frame.locator('.debrief-time-scrubber');
  }

  /** The play/pause button. */
  get playPauseButton(): Locator {
    return this.frame.locator('[data-testid="play-pause"]');
  }

  /** The display mode toggle (full/trail). */
  get displayModeToggle(): Locator {
    return this.frame.locator('.debrief-display-mode-toggle');
  }

  /**
   * Check if the time controller is visible and ready.
   */
  async isTimeControllerReady(): Promise<boolean> {
    return await this.timeController.isVisible();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drawing Tools (T203)
  // ─────────────────────────────────────────────────────────────────────────────

  /** The drawing trigger button. */
  get drawTrigger(): Locator {
    return this.frame.locator('[data-testid="draw-trigger"]');
  }

  /** The shape palette (opens on draw trigger click). */
  get shapePalette(): Locator {
    return this.frame.locator('[data-testid="shape-palette"]');
  }

  /** Rectangle draw button in shape palette. */
  get shapeRectangle(): Locator {
    return this.frame.locator('[data-testid="shape-rectangle"]');
  }

  /** Point draw button in shape palette. */
  get shapePoint(): Locator {
    return this.frame.locator('[data-testid="shape-point"]');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tools Panel (extends existing tool UI)
  // ─────────────────────────────────────────────────────────────────────────────

  /** All tool items in the tools panel. */
  get toolItems(): Locator {
    return this.frame.locator('.debrief-tools-panel__item');
  }

  /** Active (enabled) tools. */
  get activeTools(): Locator {
    return this.frame.locator('.debrief-tools-panel__item--active');
  }

  /** Inactive (disabled) tools. */
  get inactiveTools(): Locator {
    return this.frame.locator('.debrief-tools-panel__item--inactive');
  }

  /** The tool result toast message. */
  get toolMessage(): Locator {
    return this.frame.locator('.web-shell__tool-message');
  }

  /** Context menu (parameter collector). */
  get contextMenu(): Locator {
    return this.frame.locator('.debrief-context-menu');
  }

  /**
   * Get count of active tools.
   */
  async getActiveToolCount(): Promise<number> {
    return await this.activeTools.count();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Edit Face / Flip Card (log editing)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Edit icon button on log entries. */
  get editIcons(): Locator {
    return this.frame.locator('[data-testid^="edit-icon-"]');
  }

  /** The edit face (back of flip card). */
  get editFace(): Locator {
    return this.frame.locator('[data-testid="edit-face"]');
  }

  /** Edit face parameters panel. */
  get editFaceParams(): Locator {
    return this.frame.locator('[data-testid="edit-face-params"]');
  }

  /** Edit face done button. */
  get editFaceDone(): Locator {
    return this.frame.locator('[data-testid="edit-face-done"]');
  }

  /** Skeleton loader (loading state). */
  get skeletonLoader(): Locator {
    return this.frame.locator('[data-testid="skeleton-loader"]');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GoldenLayout Tabs (Activity / Log panel switching)
  // ─────────────────────────────────────────────────────────────────────────────

  /** The activity panel container. */
  get activityPanel(): Locator {
    return this.frame.locator('.debrief-activity-panel');
  }

  /**
   * Switch to a GoldenLayout tab by label text.
   */
  async switchToTab(label: string): Promise<void> {
    await this.frame.locator(`.lm_tab:has-text("${label}")`).click();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tool UI
  // ─────────────────────────────────────────────────────────────────────────────

  /** The analysis results container. */
  get analysisResults(): Locator {
    return this.frame.locator('.web-shell--analysis');
  }

  /** Individual tool result entries. */
  get toolResultItems(): Locator {
    return this.frame.locator('.tool-result-item');
  }

  /** Error notification display. */
  get errorNotification(): Locator {
    return this.frame.locator('.error-notification');
  }

  /**
   * Get tool result entry texts.
   */
  async getToolResults(): Promise<string[]> {
    const items = this.toolResultItems;
    const count = await items.count();
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) results.push(text.trim());
    }
    return results;
  }

  /**
   * Check if an error notification is displayed.
   */
  async hasError(): Promise<boolean> {
    return await this.errorNotification.isVisible();
  }

  /**
   * Get error notification text.
   */
  async getErrorText(): Promise<string> {
    return (await this.errorNotification.textContent()) ?? '';
  }
}
