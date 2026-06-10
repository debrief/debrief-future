/**
 * CatalogPage - Page Object Model for the welcome/catalog view.
 *
 * This page displays the STAC catalog overview where users can browse
 * and select plots to analyze.
 *
 * Extended in spec 281 with:
 *  - Thumbnail size toggle accessors (S/M/L)
 *  - Bottom-row collapse / restore control accessors
 *  - Exercise-list height / row-height helper
 */

import type { Page, Locator } from '@playwright/test';
import { AnalysisPage } from './AnalysisPage';

export type ThumbnailSizeLabel = 'small' | 'medium' | 'large';

/**
 * Page object for the Catalog (welcome) view.
 *
 * The catalog view shows:
 * - Header with title "Debrief Web Shell"
 * - StacBrowser component with timeline of available plots
 */
export class CatalogPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to the catalog page (root URL).
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
  }

  /**
   * Wait for the catalog page to fully load.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('.web-shell--welcome', { state: 'visible' });
    await this.page.waitForSelector('.stac-browser', { state: 'visible' });
    // Wait for stacService.init() to complete and exercise rows to render
    await this.page.waitForSelector('[data-testid="exercise-list-item-row"]', {
      state: 'visible',
      timeout: 15000,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * The main container for the welcome view.
   */
  get container(): Locator {
    return this.page.locator('.web-shell--welcome');
  }

  /**
   * The page header.
   */
  get header(): Locator {
    return this.page.locator('.web-shell__header');
  }

  /**
   * The main title ("Debrief Web Shell").
   */
  get title(): Locator {
    return this.page.locator('.web-shell__title');
  }

  /**
   * The subtitle ("STAC Catalog Browser").
   */
  get subtitle(): Locator {
    return this.page.locator('.web-shell__subtitle');
  }

  /**
   * The stac browser component.
   */
  get catalogOverview(): Locator {
    return this.page.locator('.stac-browser');
  }

  /**
   * All exercise list item rows.
   */
  get exerciseItems(): Locator {
    return this.page.locator('[data-testid="exercise-list-item-row"]');
  }

  // ─── Thumbnail size toggle (spec 281 / US6) ──────────────────────────────────

  /**
   * The thumbnail size toggle group (radiogroup).
   */
  get thumbnailSizeToggle(): Locator {
    return this.page.locator('[data-testid="thumbnail-size-toggle"]');
  }

  /**
   * Individual thumbnail size button by size label.
   */
  thumbnailSizeButton(size: ThumbnailSizeLabel): Locator {
    return this.page.locator(`[data-testid="thumbnail-size-${size}"]`);
  }

  // ─── Bottom-row collapse / restore (spec 281 / US5) ─────────────────────────

  /**
   * Collapse button for the Timeline panel (injected into its GL header).
   */
  get collapseTimeline(): Locator {
    return this.page.locator('[data-testid="catalog-collapse-timeline"]');
  }

  /**
   * Collapse button for the Map panel (injected into its GL header).
   */
  get collapseMap(): Locator {
    return this.page.locator('[data-testid="catalog-collapse-map"]');
  }

  /**
   * Restore button for the Timeline panel (shown in filter bar when hidden).
   */
  get restoreTimeline(): Locator {
    return this.page.locator('[data-testid="restore-timeline"]');
  }

  /**
   * Restore button for the Map panel (shown in filter bar when hidden).
   */
  get restoreMap(): Locator {
    return this.page.locator('[data-testid="restore-map"]');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the page title text.
   */
  async getTitleText(): Promise<string> {
    return await this.title.textContent() ?? '';
  }

  /**
   * Get the page subtitle text.
   */
  async getSubtitleText(): Promise<string> {
    return await this.subtitle.textContent() ?? '';
  }

  /**
   * Get the number of items in the catalog.
   */
  async getItemCount(): Promise<number> {
    return await this.exerciseItems.count();
  }

  /**
   * Find a catalog item by its title.
   *
   * @param title - The title to search for (partial match)
   */
  getItemByTitle(title: string): Locator {
    return this.page.locator(`[data-testid="exercise-list-item-row"][aria-label*="${title}"]`);
  }

  /**
   * Get an item by index.
   */
  getItemByIndex(index: number): Locator {
    return this.exerciseItems.nth(index);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Click on an exercise item (single click to highlight/preview).
   */
  async clickItem(item: Locator): Promise<void> {
    await item.click();
  }

  /**
   * Open an exercise item by double-clicking it.
   * Returns an AnalysisPage for the opened plot.
   */
  async openItem(item: Locator): Promise<AnalysisPage> {
    await item.dblclick();
    const analysisPage = new AnalysisPage(this.page);
    await analysisPage.waitForLoad();
    return analysisPage;
  }

  /**
   * Open a plot by its title.
   * Returns an AnalysisPage for the opened plot.
   */
  async openItemByTitle(title: string): Promise<AnalysisPage> {
    const item = this.getItemByTitle(title);
    return await this.openItem(item.first());
  }

  /**
   * Open the first item in the catalog.
   */
  async openFirstItem(): Promise<AnalysisPage> {
    const firstItem = this.exerciseItems.first();
    return await this.openItem(firstItem);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if the catalog page is currently visible.
   */
  async isVisible(): Promise<boolean> {
    return await this.container.isVisible();
  }

  /**
   * Check if the catalog has loaded items.
   */
  async hasItems(): Promise<boolean> {
    return (await this.getItemCount()) > 0;
  }

  // ─── Height helpers (spec 281) ────────────────────────────────────────────────

  /**
   * Read the bounding-box height of the exercise list scroll container.
   * Useful for asserting that it grows when the preview row is collapsed.
   */
  async getExerciseListHeight(): Promise<number> {
    const el = this.page.locator('[data-testid="exercise-list-scroll"]');
    const box = await el.boundingBox();
    return box?.height ?? 0;
  }

  /**
   * Read the height in pixels of the first visible exercise-list row.
   * Useful for asserting that S/M/L thumbnail size produces distinct heights.
   */
  async getFirstRowHeight(): Promise<number> {
    const first = this.exerciseItems.first();
    const box = await first.boundingBox();
    return box?.height ?? 0;
  }

  // ─── Actions (spec 281) ───────────────────────────────────────────────────────

  /**
   * Click the collapse-timeline button in the GoldenLayout header.
   */
  async collapseTimelinePanel(): Promise<void> {
    await this.collapseTimeline.click();
  }

  /**
   * Click the collapse-map button in the GoldenLayout header.
   */
  async collapseMapPanel(): Promise<void> {
    await this.collapseMap.click();
  }

  /**
   * Click the restore-timeline button in the filter bar.
   */
  async restoreTimelinePanel(): Promise<void> {
    await this.restoreTimeline.click();
  }

  /**
   * Click the restore-map button in the filter bar.
   */
  async restoreMapPanel(): Promise<void> {
    await this.restoreMap.click();
  }

  /**
   * Select a thumbnail size via the S/M/L toggle.
   */
  async selectThumbnailSize(size: ThumbnailSizeLabel): Promise<void> {
    await this.thumbnailSizeButton(size).click();
  }
}
