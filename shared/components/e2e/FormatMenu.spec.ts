/**
 * Playwright E2E tests for Feature 097 — Format Menu.
 *
 * Verifies:
 * 1. Format icon appears on feature rows
 * 2. Clicking format icon opens the cascading menu
 * 3. Selecting a colour updates the indicator bar
 */

import { test, expect } from '@playwright/test';

const STORY_URL = '/iframe.html?id=formatmenu-harness--default';

test.describe('FormatMenu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="format-menu-harness"]');
  });

  test('format icon is visible on selected row', async ({ page }) => {
    // track-alpha is pre-selected (--selected makes icon opacity: 1)
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await expect(formatIcon).toBeVisible();
  });

  test('format icon appears on hover for unselected row', async ({ page }) => {
    // track-bravo is NOT selected — icon has opacity: 0 until hover
    const row = page.locator('[data-testid="feature-row-track-bravo"]');
    const formatIcon = page.locator('[data-testid="format-icon-track-bravo"]');

    // Before hover the icon element exists but is transparent
    await expect(formatIcon).toBeAttached();

    // Hover the row to trigger opacity: 1
    await row.hover();

    // Now verify it becomes visible (opacity > 0)
    await expect(formatIcon).toBeVisible();
  });

  test('clicking format icon opens cascading menu', async ({ page }) => {
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    // The cascading menu should appear
    const menu = page.locator('[data-testid="cascading-menu"]');
    await expect(menu).toBeVisible();

    // Menu should contain Line Colour item (TRACK features expose line.color)
    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await expect(lineColourItem).toBeVisible();
    await expect(lineColourItem).toContainText('Line Colour');
  });

  test('menu contains expected items for TRACK feature', async ({ page }) => {
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    const menu = page.locator('[data-testid="cascading-menu"]');
    await expect(menu).toBeVisible();

    // TRACK should have: Line Colour, Line Weight, Line Opacity, Line DashArray,
    //                     Point Shape, Point FillColor, Point Radius
    await expect(page.locator('[data-testid="menu-item-line\\.color"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-line\\.weight"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-line\\.opacity"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-line\\.dash_array"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-point\\.shape"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-point\\.fill_color"]')).toBeVisible();
    await expect(page.locator('[data-testid="menu-item-point\\.radius"]')).toBeVisible();
  });

  test('hovering Line Colour opens colour submenu', async ({ page }) => {
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await lineColourItem.hover();

    // Wait for submenu (150ms hover delay in CascadingMenu)
    const submenu = page.locator('[data-testid="cascading-submenu"]');
    await expect(submenu).toBeVisible({ timeout: 2000 });

    // Submenu should contain colour swatches
    const redItem = page.locator('[data-testid="submenu-item-line\\.color\\:\\:red"]');
    await expect(redItem).toBeVisible();
    await expect(redItem).toContainText('Red');
  });

  test('selecting a colour updates the indicator bar', async ({ page }) => {
    // Capture original colour of track-alpha indicator bar
    const row = page.locator('[data-testid="feature-row-track-alpha"]');
    const indicator = row.locator('.debrief-feature-row__indicator');
    await expect(indicator).toBeVisible();

    const originalColour = await indicator.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // Open format menu
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    // Hover Line Colour to open submenu
    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await lineColourItem.hover();

    // Wait for submenu
    const submenu = page.locator('[data-testid="cascading-submenu"]');
    await expect(submenu).toBeVisible({ timeout: 2000 });

    // Click "Green" (#00CC00)
    const greenItem = page.locator('[data-testid="submenu-item-line\\.color\\:\\:green"]');
    await greenItem.click();

    // Menu should be dismissed
    await expect(page.locator('[data-testid="cascading-menu"]')).not.toBeVisible();

    // The indicator bar should now be green
    const newColour = await indicator.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(newColour).not.toBe(originalColour);

    // Verify the colour is correct (rgb(0, 204, 0) = #00CC00)
    expect(newColour).toBe('rgb(0, 204, 0)');
  });

  test('format change is recorded in hidden element', async ({ page }) => {
    // Open format menu on track-alpha
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    // Hover Line Colour
    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await lineColourItem.hover();
    await page.locator('[data-testid="cascading-submenu"]').waitFor({ state: 'visible' });

    // Click Red
    const redItem = page.locator('[data-testid="submenu-item-line\\.color\\:\\:red"]');
    await redItem.click();

    // Check the hidden element recorded the change
    const lastChange = page.locator('[data-testid="last-format-change"]');
    await expect(lastChange).toHaveText('track-alpha|line.color=#CC0000');
  });

  test('Escape dismisses the format menu', async ({ page }) => {
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    const menu = page.locator('[data-testid="cascading-menu"]');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });
});

test.describe('FormatMenu Screenshots', () => {
  test('capture format menu open state', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="format-menu-harness"]');

    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    await page.locator('[data-testid="cascading-menu"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'screenshots/format-menu-open.png',
      fullPage: false,
    });
  });

  test('capture colour submenu open', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="format-menu-harness"]');

    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await lineColourItem.hover();

    await page.locator('[data-testid="cascading-submenu"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'screenshots/format-menu-colour-submenu.png',
      fullPage: false,
    });
  });

  test('capture after colour change', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="format-menu-harness"]');

    // Apply green colour to track-alpha
    const formatIcon = page.locator('[data-testid="format-icon-track-alpha"]');
    await formatIcon.click();

    const lineColourItem = page.locator('[data-testid="menu-item-line\\.color"]');
    await lineColourItem.hover();
    await page.locator('[data-testid="cascading-submenu"]').waitFor({ state: 'visible' });

    await page.locator('[data-testid="submenu-item-line\\.color\\:\\:green"]').click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'screenshots/format-menu-after-colour-change.png',
      fullPage: false,
    });
  });
});
