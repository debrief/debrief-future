/**
 * AnalysisPage - Page Object Model for the analysis view.
 *
 * This page displays the loaded plot with:
 * - Activity panel (TimeController, Tools, Layers)
 * - Map view with features
 */

import type { Page, Locator } from '@playwright/test';
import { TimeController } from '../components/TimeController';

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
    // Click the content area to avoid the expand button (which has stopPropagation)
    const content = layer.locator('.debrief-feature-row__content');
    if (await content.count() > 0) {
      await content.click();
    } else {
      await layer.click();
    }
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
}
