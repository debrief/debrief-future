/**
 * Time Controller integration tests.
 *
 * Verifies that the TimeController is properly initialized with time data
 * when a plot with temporal features is loaded.
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

// Time Controller integration tests — verifies playback, layer selection, and navigation.
test.describe('Time Controller', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test.describe('Catalog View (Welcome)', () => {
    test('displays catalog with items', async () => {
      // Verify welcome page loaded
      expect(await catalogPage.isVisible()).toBe(true);
      expect(await catalogPage.getTitleText()).toContain('Debrief Web Shell');
      expect(await catalogPage.getSubtitleText()).toContain('STAC Catalog Browser');

      // Verify catalog has items
      expect(await catalogPage.hasItems()).toBe(true);
    });

    test('shows Exercise Alpha in catalog', async ({ page }) => {
      // Wait for exercise list items to render inside GoldenLayout panel
      await expect(page.locator('[data-testid="exercise-list-item-row"]').first()).toBeVisible();
      // Exercise Alpha should be visible in the catalog
      await expect(page.locator('[data-testid="exercise-item-title"]', { hasText: 'Exercise Alpha' })).toBeVisible();
    });
  });

  test.describe('Opening Plot', () => {
    test('double-click opens analysis view', async () => {
      // Open the first item
      const analysisPage = await catalogPage.openFirstItem();
      await collapsePropertiesSection(analysisPage.page);

      // Verify analysis view is displayed
      expect(await analysisPage.isVisible()).toBe(true);
      expect(await analysisPage.hasActivityPanel()).toBe(true);
      expect(await analysisPage.hasMapFeatures()).toBe(true);
    });

    test('opening Exercise Alpha loads time data', async ({ page }) => {
      // Open the first exercise item (should be Exercise Alpha based on sort order)
      const analysisPage = await catalogPage.openFirstItem();
      await collapsePropertiesSection(analysisPage.page);

      // Verify the analysis page loaded
      expect(await analysisPage.isVisible()).toBe(true);

      // Get the TimeController
      const timeController = analysisPage.timeController;

      // Wait for it to be ready (not empty)
      await timeController.waitForReady({ timeout: 10000 });

      // Verify TimeController has time data loaded
      const state = await timeController.getState();
      expect(state).toBe('ready');

      // Verify time display shows a valid time
      const displayedTime = await timeController.getDisplayedTime();
      expect(displayedTime).not.toBe('');
      expect(displayedTime).not.toBe('No data loaded');

      // Time should contain a date/time format (e.g., "15/01/2024" or "09:30:00")
      // The actual format depends on locale, but it should have numbers
      expect(displayedTime).toMatch(/\d/);
    });
  });

  test.describe('Time Controller State', () => {
    let analysisPage: AnalysisPage;

    test.beforeEach(async () => {
      analysisPage = await catalogPage.openFirstItem();
      await collapsePropertiesSection(analysisPage.page);
    });

    test('TimeController is in ready state when plot has time data', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      expect(await timeController.hasTimeData()).toBe(true);
      expect(await timeController.isEmpty()).toBe(false);
    });

    test('TimeController shows playback controls', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      // Verify controls are visible
      await expect(timeController.controlsRow).toBeVisible();
      await expect(timeController.playPauseButton).toBeVisible();
      await expect(timeController.scrubber).toBeVisible();
      await expect(timeController.displayModeToggle).toBeVisible();
      await expect(timeController.speedSelector).toBeVisible();
    });

    test('TimeController scrubber is at start position', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      // Scrubber should be at or near 0%
      const position = await timeController.getScrubberPosition();
      expect(position).toBeLessThanOrEqual(5); // Allow small tolerance
    });

    test('TimeController default display mode is full', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      const mode = await timeController.getDisplayMode();
      expect(mode).toBe('full');
    });

    test('TimeController default speed is 1x', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      const speed = await timeController.getSpeed();
      expect(speed).toBe(1);
    });

    test('play button starts playback', async () => {
      const timeController = analysisPage.timeController;
      await timeController.waitForReady();

      // Should not be playing initially
      expect(await timeController.isPlaying()).toBe(false);

      // Click play
      await timeController.togglePlayback();

      // Should now be playing
      expect(await timeController.isPlaying()).toBe(true);

      // Click again to pause
      await timeController.togglePlayback();
      expect(await timeController.isPlaying()).toBe(false);
    });
  });

  test.describe('Layer Selection', () => {
    let analysisPage: AnalysisPage;

    test.beforeEach(async () => {
      analysisPage = await catalogPage.openFirstItem();
      await collapsePropertiesSection(analysisPage.page);
    });

    test('layers panel shows features with names', async () => {
      // Get layer names
      const names = await analysisPage.getLayerNames();

      // Should have multiple layers
      expect(names.length).toBeGreaterThan(0);

      // No layer should have an undefined/empty name
      for (const name of names) {
        expect(name).not.toBe('');
        expect(name).not.toBe('undefined');
        expect(name).not.toContain('undefined');
      }
    });

    test('clicking a layer selects only that layer', async () => {
      const layers = analysisPage.layerRows;
      const layerCount = await layers.count();

      if (layerCount > 1) {
        // Click first layer
        await analysisPage.selectLayer(layers.first());

        // Wait for selection (auto-retrying assertions)
        await expect(layers.first()).toHaveClass(/--selected/);
        await expect(analysisPage.selectedLayers).toHaveCount(1);

        // Second layer should not be selected
        await expect(layers.nth(1)).not.toHaveClass(/--selected/);
      }
    });

    test('clicking different layers changes selection', async () => {
      const layers = analysisPage.layerRows;
      const layerCount = await layers.count();

      if (layerCount > 1) {
        // Click first layer
        await analysisPage.selectLayer(layers.first());
        await expect(layers.first()).toHaveClass(/--selected/);
        await expect(analysisPage.selectedLayers).toHaveCount(1);

        // Click second layer
        await analysisPage.selectLayer(layers.nth(1));
        await expect(layers.nth(1)).toHaveClass(/--selected/);
        await expect(analysisPage.selectedLayers).toHaveCount(1);
        await expect(layers.first()).not.toHaveClass(/--selected/);
      }
    });
  });

  test.describe('Navigation', () => {
    test('back button returns to catalog', async () => {
      // Open analysis view
      const analysisPage = await catalogPage.openFirstItem();
      await collapsePropertiesSection(analysisPage.page);
      expect(await analysisPage.isVisible()).toBe(true);

      // Click back
      await analysisPage.backToCatalog();

      // Should be back at catalog
      expect(await catalogPage.isVisible()).toBe(true);
    });
  });
});
