/**
 * DebriefWebview — Page Object for Debrief webview component interactions.
 *
 * Operates within the nested iframe context (inside VS Code's webview).
 * All selectors target Debrief-controlled components (map, catalog, tool UI)
 * whose DOM structure is owned and stabilised by this project.
 *
 * @see contracts/webview-selectors.md for the full selector contract
 */
import type { FrameLocator, Locator } from '@playwright/test';

export class DebriefWebview {
  readonly frame: FrameLocator;

  constructor(frame: FrameLocator) {
    this.frame = frame;
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
   */
  async waitForMapReady(): Promise<void> {
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
