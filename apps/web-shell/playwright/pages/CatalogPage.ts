/**
 * CatalogPage - Page Object Model for the welcome/catalog view.
 *
 * This page displays the STAC catalog overview where users can browse
 * and select plots to analyze.
 */

import type { Page, Locator } from '@playwright/test';
import { AnalysisPage } from './AnalysisPage';

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
}
