/**
 * E2E Test: Styling Tools — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/styling-tools.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Styling Tools', () => {
  test('tools panel lists available tools', async ({ codeServerPage }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const toolItems = frame.locator('.debrief-tools-panel__item');
    await toolItems.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await toolItems.count()).toBeGreaterThan(0);
  });

  test('styling tools are inactive without a selection', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const inactiveTools = frame.locator(
      '.debrief-tools-panel__item--inactive',
    );
    await inactiveTools.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await inactiveTools.count()).toBeGreaterThan(0);
  });

  test('selecting a track activates relevant styling tools', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Select a track on the map
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    // Verify at least one tool becomes active
    const activeTools = frame.locator('.debrief-tools-panel__item--active');
    await activeTools.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await activeTools.count()).toBeGreaterThan(0);
  });
});
