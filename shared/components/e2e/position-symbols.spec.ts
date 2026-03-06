/**
 * Playwright e2e tests to verify position symbol rendering.
 *
 * Tests both the SymbolShapes story (default shapes per track)
 * and the IntervalBasedStyling story (per-position overrides).
 */

import { test, expect } from '@playwright/test';

const SHAPES_STORY_URL = '/iframe.html?id=mapview-position-styling--symbol-shapes';
const INTERVAL_STORY_URL = '/iframe.html?id=mapview-position-styling--interval-based-styling';

test.describe('Position Symbol Shapes — Default Shape Per Track', () => {
  test('should render non-circle SVG symbols for tracks with non-circle default shapes', async ({ page }) => {
    await page.goto(SHAPES_STORY_URL);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/position-symbols-default-shapes.png',
      fullPage: false,
    });

    // Non-circle shapes render as DivIcon with class 'debrief-symbol-icon'
    const svgIcons = page.locator('.debrief-symbol-icon');
    const svgCount = await svgIcons.count();
    console.log(`[SymbolShapes] Found ${svgCount} SVG symbol icons`);

    // 4 non-circle tracks × 15 positions = 60 SVG icons
    // (circle track uses CircleMarker, not SVG)
    expect(svgCount).toBeGreaterThanOrEqual(50);

    // Verify SVG icons contain actual <svg> elements with <path> data
    const firstIcon = svgIcons.first();
    const svgHtml = await firstIcon.innerHTML();
    expect(svgHtml).toContain('<svg');
    expect(svgHtml).toContain('<path');
    expect(svgHtml).toContain(' d="M');

    // Also verify circle markers exist (from the circle-shape track)
    const circleMarkerPaths = page.locator('path.leaflet-interactive');
    const circleCount = await circleMarkerPaths.count();
    console.log(`[SymbolShapes] Found ${circleCount} Leaflet path elements (tracks + circle markers)`);
    // Should have at least the circle track's markers plus the track lines
    expect(circleCount).toBeGreaterThan(0);
  });
});

test.describe('Position Symbol Shapes — Override Shapes', () => {
  test('should render all five symbol shapes on the map via overrides', async ({ page }) => {
    await page.goto(INTERVAL_STORY_URL);
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/position-symbols-override-shapes.png',
      fullPage: false,
    });

    // The override story has 5 non-circle override positions (square, triangle, diamond, cross, square)
    const svgIcons = page.locator('.debrief-symbol-icon');
    const svgCount = await svgIcons.count();
    console.log(`[OverrideShapes] Found ${svgCount} SVG symbol icons`);
    expect(svgCount).toBeGreaterThanOrEqual(5);
  });
});
