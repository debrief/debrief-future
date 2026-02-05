/**
 * Playwright E2E Test Template for Storybook Stories
 *
 * Usage:
 * 1. Copy this file to shared/components/e2e/{ComponentName}.spec.ts
 * 2. Replace [COMPONENT] placeholders with actual component name
 * 3. Update STORIES object with actual story IDs from Storybook
 * 4. Add component-specific interaction tests
 * 5. Run: pnpm --filter @debrief/components test:e2e {ComponentName}
 *
 * Story ID Format: category-componentname--story-variant
 * Example: mapview-mapview--default becomes /iframe.html?id=mapview-mapview--default
 *
 * Theme variants use the globals parameter:
 * - Light: &globals=theme:light
 * - Dark: &globals=theme:dark
 * - VS Code: &globals=theme:vscode
 */

import { test, expect } from '@playwright/test';

// =============================================================================
// CONFIGURATION - Update these for your component
// =============================================================================

const COMPONENT_NAME = '[COMPONENT]';
const COMPONENT_TESTID = '[component-root]'; // data-testid attribute

// Story URLs - update with actual Storybook story IDs
const STORIES = {
  // Base stories
  default: '/iframe.html?id=category-[component]--default',
  // Add more story variants as needed:
  // withData: '/iframe.html?id=category-[component]--with-data',
  // loading: '/iframe.html?id=category-[component]--loading',
  // error: '/iframe.html?id=category-[component]--error',
};

// Theme variant URLs (append to any story URL)
const withTheme = (storyUrl: string, theme: 'light' | 'dark' | 'vscode') =>
  `${storyUrl}&globals=theme:${theme}`;

// =============================================================================
// RENDERING TESTS
// =============================================================================

test.describe(`${COMPONENT_NAME} - Rendering`, () => {
  test('renders default state', async ({ page }) => {
    await page.goto(STORIES.default);
    await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);

    const root = page.locator(`[data-testid="${COMPONENT_TESTID}"]`);
    await expect(root).toBeVisible();
  });

  // Add more rendering tests for different story variants
  // test('renders with data', async ({ page }) => {
  //   await page.goto(STORIES.withData);
  //   await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
  //   // ... assertions
  // });
});

// =============================================================================
// THEME VARIANT TESTS
// =============================================================================

test.describe(`${COMPONENT_NAME} - Theme Variants`, () => {
  test('renders correctly in light theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.default, 'light'));
    await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);

    const root = page.locator(`[data-testid="${COMPONENT_TESTID}"]`);
    await expect(root).toBeVisible();
  });

  test('renders correctly in dark theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.default, 'dark'));
    await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);

    const root = page.locator(`[data-testid="${COMPONENT_TESTID}"]`);
    await expect(root).toBeVisible();
  });

  test('renders correctly in vscode theme', async ({ page }) => {
    await page.goto(withTheme(STORIES.default, 'vscode'));
    await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);

    const root = page.locator(`[data-testid="${COMPONENT_TESTID}"]`);
    await expect(root).toBeVisible();
  });
});

// =============================================================================
// INTERACTION TESTS
// =============================================================================

test.describe(`${COMPONENT_NAME} - Interactions`, () => {
  // Example: Click interaction
  // test('responds to click', async ({ page }) => {
  //   await page.goto(STORIES.default);
  //   await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
  //
  //   await page.click('[data-testid="button"]');
  //
  //   await expect(page.locator('[data-testid="result"]')).toHaveText('Clicked');
  // });

  // Example: Form interaction
  // test('handles form input', async ({ page }) => {
  //   await page.goto(STORIES.default);
  //   await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
  //
  //   await page.fill('[data-testid="input"]', 'test value');
  //
  //   await expect(page.locator('[data-testid="input"]')).toHaveValue('test value');
  // });

  // Example: Selection interaction
  // test('handles selection', async ({ page }) => {
  //   await page.goto(STORIES.default);
  //   await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
  //
  //   await page.click('[data-testid="item-1"]');
  //
  //   await expect(page.locator('[data-testid="item-1"]')).toHaveAttribute('data-selected', 'true');
  // });

  test.skip('placeholder - add component-specific interaction tests', async () => {
    // Remove this test and add real interaction tests
  });
});

// =============================================================================
// SCREENSHOT CAPTURE (for evidence)
// =============================================================================

test.describe(`${COMPONENT_NAME} - Screenshot Capture`, () => {
  // Default screenshot directory (relative to playwright.config.ts)
  // For evidence, update path to: specs/[feature]/evidence/screenshots/

  test('capture default state', async ({ page }) => {
    await page.goto(STORIES.default);
    await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
    await page.waitForTimeout(300); // Allow animations to settle

    await page.screenshot({
      path: `screenshots/${COMPONENT_NAME.toLowerCase()}-default.png`,
      fullPage: false,
    });
  });

  test('capture theme variants', async ({ page }) => {
    const themes = ['light', 'dark', 'vscode'] as const;

    for (const theme of themes) {
      await page.goto(withTheme(STORIES.default, theme));
      await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `screenshots/${COMPONENT_NAME.toLowerCase()}-${theme}.png`,
        fullPage: false,
      });
    }
  });
});

// =============================================================================
// ACCESSIBILITY TESTS (optional but recommended)
// =============================================================================

// Uncomment to enable accessibility testing with axe-core
// Note: Requires @axe-core/playwright package
//
// import AxeBuilder from '@axe-core/playwright';
//
// test.describe(`${COMPONENT_NAME} - Accessibility`, () => {
//   test('should not have accessibility violations', async ({ page }) => {
//     await page.goto(STORIES.default);
//     await page.waitForSelector(`[data-testid="${COMPONENT_TESTID}"]`);
//
//     const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
//
//     expect(accessibilityScanResults.violations).toEqual([]);
//   });
// });
