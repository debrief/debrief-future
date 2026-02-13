/**
 * Playwright e2e tests for Drawing (Point & Rectangle).
 *
 * Tests the drawing toolbar integration with MapView, verifying that
 * point and rectangle shapes can be drawn and appear in the feature list.
 */

import { test, expect } from '@playwright/test';

const STORY_URL =
  '/iframe.html?id=components-mapview-drawing--point-and-rectangle';

const withTheme = (storyUrl: string, theme: 'light' | 'dark' | 'vscode') =>
  `${storyUrl}&globals=theme:${theme}`;

// Evidence screenshot directory
const EVIDENCE_DIR = 'specs/094-point-rectangle-drawing/evidence/screenshots';

test.describe('Drawing - Rendering', () => {
  test('renders map and empty feature list', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="drawn-features-list"]');

    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toBeVisible();
    await expect(featureList).toContainText('Drawn Features (0)');
  });

  test('map container is visible', async ({ page }) => {
    await page.goto(STORY_URL);
    // Leaflet map container
    await page.waitForSelector('.leaflet-container');
    const map = page.locator('.leaflet-container');
    await expect(map).toBeVisible();
  });

  test('toolbar is visible with draw trigger', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');
    // The custom toolbar should be present
    const toolbar = page.locator('.debrief-leaflet-toolbar');
    await expect(toolbar).toBeVisible();

    const drawTrigger = page.locator('[data-testid="draw-trigger"]');
    await expect(drawTrigger).toBeVisible();
  });
});

test.describe('Drawing - Theme Variants', () => {
  test('renders in light theme', async ({ page }) => {
    await page.goto(withTheme(STORY_URL, 'light'));
    await page.waitForSelector('[data-testid="drawn-features-list"]');

    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toBeVisible();
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(withTheme(STORY_URL, 'dark'));
    await page.waitForSelector('[data-testid="drawn-features-list"]');

    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toBeVisible();
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(withTheme(STORY_URL, 'vscode'));
    await page.waitForSelector('[data-testid="drawn-features-list"]');

    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toBeVisible();
  });
});

test.describe('Drawing - Point Interaction', () => {
  test('clicking draw trigger opens shape palette', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');

    // Click the draw trigger button (+)
    const drawTrigger = page.locator('[data-testid="draw-trigger"]');
    await expect(drawTrigger).toBeVisible();
    await drawTrigger.click();

    // Shape palette should appear
    const shapePalette = page.locator('[data-testid="shape-palette"]');
    await expect(shapePalette).toBeVisible();
  });

  test('selecting point mode activates drawing', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');

    // Open shape palette
    const drawTrigger = page.locator('[data-testid="draw-trigger"]');
    await drawTrigger.click();

    // Click point button
    const pointBtn = page.locator('[data-testid="shape-point"]');
    await expect(pointBtn).toBeVisible();
    await pointBtn.click();

    // Shape palette should close after selection
    const shapePalette = page.locator('[data-testid="shape-palette"]');
    await expect(shapePalette).not.toBeVisible();
  });

  test('clicking map in point mode creates a point feature', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');
    await page.waitForTimeout(500); // Wait for map tiles

    // Open shape palette and select point
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(200);

    // Click on the map to place a point
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(300);

    // Feature should appear in the list
    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toContainText('Drawn Features (1)');
    await expect(featureList).toContainText('POINT');
  });
});

test.describe('Drawing - Rectangle Interaction', () => {
  test('selecting rectangle mode activates drawing', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');

    // Open shape palette
    await page.locator('[data-testid="draw-trigger"]').click();

    // Click rectangle button
    const rectBtn = page.locator('[data-testid="shape-rectangle"]');
    await expect(rectBtn).toBeVisible();
    await rectBtn.click();

    // Shape palette should close
    const shapePalette = page.locator('[data-testid="shape-palette"]');
    await expect(shapePalette).not.toBeVisible();
  });

  test('click-drag on map in rectangle mode creates a rectangle feature', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('.leaflet-container');
    await page.waitForTimeout(500);

    // Open shape palette and select rectangle
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-rectangle"]').click();
    await page.waitForTimeout(200);

    // Geoman rectangle: click first corner, then click opposite corner
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      // Click first corner
      await page.mouse.click(
        box.x + box.width * 0.3,
        box.y + box.height * 0.3,
      );
      await page.waitForTimeout(200);

      // Click opposite corner to complete rectangle
      await page.mouse.click(
        box.x + box.width * 0.7,
        box.y + box.height * 0.7,
      );
    }
    await page.waitForTimeout(500);

    // Feature should appear in the list
    const featureList = page.locator('[data-testid="drawn-features-list"]');
    await expect(featureList).toContainText('Drawn Features (1)');
    await expect(featureList).toContainText('RECTANGLE');
  });
});

test.describe('Drawing - Screenshot Capture', () => {
  test('capture default state', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="drawn-features-list"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/drawing-default.png`,
      fullPage: false,
    });
  });

  test('capture theme variants', async ({ page }) => {
    const themes = ['light', 'dark', 'vscode'] as const;

    for (const theme of themes) {
      await page.goto(withTheme(STORY_URL, theme));
      await page.waitForSelector('[data-testid="drawn-features-list"]');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${EVIDENCE_DIR}/drawing-${theme}.png`,
        fullPage: false,
      });
    }
  });
});
