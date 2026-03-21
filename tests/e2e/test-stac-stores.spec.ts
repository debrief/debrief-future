/**
 * E2E Test: STAC Stores Tree View
 *
 * Validates that the STAC Stores tree view in the VS Code sidebar loads,
 * populates with store rows from config, and is navigable to plot nodes.
 * This test is independent of webview rendering — it only exercises the
 * tree view component.
 *
 * CREATED: 2026-03-20 — STAC stores cloud E2E validation
 */
import { test, expect } from './fixtures/base';

test.describe('STAC Stores Tree', () => {
  test.setTimeout(60_000);

  test('T050: STAC Stores pane is visible after focusing', async ({
    codeServerPage,
  }) => {
    // Focus the STAC Stores pane via command palette
    const page = codeServerPage.page;
    await page.keyboard.press('Control+Shift+KeyP');
    await page
      .locator('.quick-input-box input')
      .waitFor({ state: 'visible', timeout: 5_000 });
    await page.locator('.quick-input-box input').fill('Focus on STAC Stores');
    await page.keyboard.press('Enter');

    // Verify the pane header is visible
    const stacHeader = page.locator('.pane-header').filter({
      has: page.locator('h3', { hasText: /stac stores/i }),
    });
    await stacHeader.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await stacHeader.isVisible()).toBe(true);
  });

  test('T051: STAC store row appears in tree', async ({
    codeServerPage,
  }) => {
    const result = await codeServerPage.navigateStacTree('Exercise Alpha');
    expect(result.storeLabel).toContain('STAC:');
  });

  test('T052: plot node is navigable under store', async ({
    codeServerPage,
  }) => {
    const result = await codeServerPage.navigateStacTree('Exercise Alpha');
    expect(result.plotLabel).toContain('Exercise Alpha');
    expect(result.treeRowCount).toBeGreaterThan(1);
  });
});
