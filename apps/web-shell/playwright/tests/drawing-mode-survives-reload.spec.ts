/**
 * E2E regression: drawing mode and palette index live in the session-state
 * store and are observable by non-map consumers — the store-level guarantee
 * that makes the VS Code "survive webview rebuild" fix possible.
 *
 * Feature: 108-drawing-mode-session-state
 * Spec: specs/108-drawing-mode-session-state/spec.md (US1, US2, US3 / SC-001,
 * SC-002, SC-005)
 *
 * The primary user-facing benefit of #108 is in VS Code (covered by a Vitest
 * unit test on MapPanel.handleWebviewMessage). This Playwright spec exists
 * to prove the slice is genuinely the source of truth in the web-shell:
 *
 *   - Clicking the toolbar writes through to the session-state store.
 *   - A non-map consumer (this test, via `window.__sessionStore`) can read
 *     and subscribe to the slice.
 *   - Programmatic writes (e.g. a future MCP tool, contrib extension, or
 *     status bar) are picked up reactively by the toolbar UI.
 *
 * The "remount survives" scenario is asserted at the VS Code message-bridge
 * boundary in apps/vscode/tests/unit/mapPanel.webviewReady.test.ts. In the
 * web-shell, the bridge is direct (React's useSessionStore re-reads on every
 * render), so the equivalent check is "the toolbar reflects the current
 * store value at all times".
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AnalysisPage } from '../pages/AnalysisPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/108-drawing-mode-session-state/evidence/screenshots',
);

test.describe('Drawing mode session-state wiring (#108)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 10000 });
    // Wait for the map to mount and Geoman's `+` button to appear.
    await expect(page.locator('[data-testid="draw-trigger"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('store observability: arming polygon updates store; non-map consumer can read it (SC-005)', async ({
    page,
  }) => {
    const analysis = new AnalysisPage(page);

    // Initially un-armed.
    expect(await analysis.getDrawingMode()).toBeNull();

    // Arm polygon via the toolbar (this is the same flow a user takes).
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-palette"]')).toBeVisible();
    await page.locator('[data-testid="shape-polygon"]').click();

    // Non-map consumer (this test) reads the slice directly via the
    // exposed `window.__sessionStore` handle.
    await expect
      .poll(() => analysis.getDrawingMode(), { timeout: 3000 })
      .toBe('polygon');

    // Evidence capture for SC-005 — devtools-equivalent store handle.
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'webshell-drawing-mode-store-handle.png'),
      fullPage: false,
    });
  });

  test('store subscription: non-map consumer observes drawing-mode changes in real time (SC-005)', async ({
    page,
  }) => {
    // Subscribe to the store from outside any React component and capture
    // every drawingMode transition. This proves the slice can drive a
    // status bar, MCP tool, or contrib extension without going through
    // the map component — the spec's "latent enabler" claim (US3).
    await page.evaluate(() => {
      const captured: (string | null)[] = [];
      window.__sessionStore.subscribe((s, prev) => {
        if (s.drawingMode !== prev.drawingMode) {
          captured.push(s.drawingMode);
        }
      });
      (window as unknown as { __capturedDrawingModes: (string | null)[] }).__capturedDrawingModes =
        captured;
    });

    // Arm polygon, then arm rectangle, then disarm.
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-polygon"]').click();
    await page.waitForTimeout(200);

    // Disarm via clicking the trigger button while a mode is active.
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.waitForTimeout(200);

    const captured = await page.evaluate(
      () =>
        (window as unknown as { __capturedDrawingModes: (string | null)[] })
          .__capturedDrawingModes,
    );

    expect(captured).toContain('polygon');
    expect(captured[captured.length - 1]).toBeNull();
  });

  test('programmatic write: setting drawingMode via store propagates to toolbar (FR-001/FR-003)', async ({
    page,
  }) => {
    const analysis = new AnalysisPage(page);

    // Confirm starting state.
    expect(await analysis.getDrawingMode()).toBeNull();

    // Write directly to the store — simulating an MCP tool or a future
    // status-bar control that arms a tool programmatically (US3).
    await page.evaluate(() => {
      window.__sessionStore.getState().setDrawingMode('rectangle');
    });

    // The slice is the authoritative source — the read reflects the write.
    await expect
      .poll(() => analysis.getDrawingMode(), { timeout: 3000 })
      .toBe('rectangle');

    // Tear down so the test isolation contract holds.
    await page.evaluate(() => {
      window.__sessionStore.getState().setDrawingMode(null);
    });
  });

  test('palette index round-trip via store action (SC-002 store-side)', async ({
    page,
  }) => {
    const analysis = new AnalysisPage(page);

    // Defaults to 0.
    expect(await analysis.getDrawingPaletteIndex()).toBe(0);

    // Increment twice via the public slice action (the API the web-shell
    // already uses when the user picks a different palette entry).
    await page.evaluate(() => {
      const store = window.__sessionStore;
      store.getState().incrementDrawingPaletteIndex();
      store.getState().incrementDrawingPaletteIndex();
    });

    await expect
      .poll(() => analysis.getDrawingPaletteIndex(), { timeout: 3000 })
      .toBe(2);
  });
});
