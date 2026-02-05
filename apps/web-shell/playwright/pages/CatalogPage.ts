/**
 * CatalogPage - Page Object Model for the welcome/catalog view.
 *
 * This page displays the STAC catalog overview where users can browse
 * and select plots to analyze.
 */

import type { Page, Locator } from '@playwright/test';
import { AnalysisPage } from './AnalysisPage';

/**
 * Represents a catalog item in the timeline.
 */
export interface CatalogItem {
  title: string;
  element: Locator;
}

/**
 * Page object for the Catalog (welcome) view.
 *
 * The catalog view shows:
 * - Header with title "Debrief Web Shell"
 * - CatalogOverview component with timeline of available plots
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
    await this.page.waitForSelector('.catalog-overview', { state: 'visible' });
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
   * The catalog overview component.
   */
  get catalogOverview(): Locator {
    return this.page.locator('.catalog-overview');
  }

  /**
   * The timeline within the catalog overview.
   */
  get timeline(): Locator {
    return this.page.locator('.catalog-overview__timeline');
  }

  /**
   * All timeline items (bars or points).
   */
  get timelineItems(): Locator {
    return this.page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point');
  }

  /**
   * The tooltip shown on hover.
   */
  get tooltip(): Locator {
    return this.page.locator('.catalog-overview__tooltip');
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
    return await this.timelineItems.count();
  }

  /**
   * Find a catalog item by its title.
   *
   * @param title - The title to search for (partial match)
   */
  getItemByTitle(title: string): Locator {
    // Items have data-title attribute or we can find by aria-label
    return this.page.locator(
      `.catalog-overview__timeline-bar[data-title*="${title}"], ` +
      `.catalog-overview__timeline-point[data-title*="${title}"], ` +
      `.catalog-overview [aria-label*="${title}"]`
    );
  }

  /**
   * Get an item by index.
   */
  getItemByIndex(index: number): Locator {
    return this.timelineItems.nth(index);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Hover over a timeline item to show its tooltip.
   */
  async hoverItem(item: Locator): Promise<void> {
    await item.hover();
    await this.tooltip.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Click on a timeline item (single click - may select).
   */
  async clickItem(item: Locator): Promise<void> {
    await item.click();
  }

  /**
   * Double-click on a timeline item to open it.
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
    // First try to find by data-title
    let item = this.getItemByTitle(title);
    if (await item.count() === 0) {
      // Fall back to finding the text in the labels area
      const label = this.page.getByText(title, { exact: false });
      // The label might be next to the bar, so we click the bar in the same row
      // For now, let's find the item by hovering over bars until we find the right title
      const items = this.timelineItems;
      const count = await items.count();
      for (let i = 0; i < count; i++) {
        const candidate = items.nth(i);
        await candidate.hover();
        // Wait briefly for tooltip
        await this.page.waitForTimeout(100);
        const tooltipText = await this.tooltip.textContent();
        if (tooltipText?.includes(title)) {
          item = candidate;
          break;
        }
      }
    }
    return await this.openItem(item.first());
  }

  /**
   * Open the first item in the catalog.
   */
  async openFirstItem(): Promise<AnalysisPage> {
    const firstItem = this.timelineItems.first();
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
