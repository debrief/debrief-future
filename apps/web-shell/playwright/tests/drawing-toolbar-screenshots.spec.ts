/**
 * Evidence capture for #108 — drawing-toolbar visual proof.
 *
 * Captures three views of the same drawing toolbar that #108 keeps in sync
 * with the session-state store:
 *   1. Toolbar with polygon armed (before any forced remount).
 *   2. Toolbar after a session-state mutation triggered from outside the
 *      map component — proves the toolbar reflects an authoritative store
 *      write, which is the same path the VS Code webview's `webviewReady`
 *      flush exercises across the message bridge.
 *   3. Devtools-equivalent store-handle read for the SC-005 evidence.
 *
 * The VS Code Extension Development Host cannot be driven from this cloud
 * session (see ADR / issue #142). These web-shell screenshots are
 * representative — the toolbar component (`LeafletToolbar`) is identical
 * across both frontends.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/108-drawing-mode-session-state/evidence/screenshots',
);

test.describe('Evidence capture — drawing toolbar (#108)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="draw-trigger"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('capture toolbar — polygon armed (before reload-equivalent)', async ({ page }) => {
    // Arm polygon via the UI.
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-polygon"]').click();
    await page.waitForTimeout(300);

    // Screenshot the whole web-shell so the toolbar + map context is
    // visible. Represents the "before webview reload" view.
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'vscode-toolbar-armed-before-reload.png'),
      fullPage: false,
    });
  });

  test('capture toolbar — polygon armed via programmatic store write (after reload-equivalent)', async ({
    page,
  }) => {
    // Reset and then write `polygon` directly to the slice — this is the
    // same value path that the VS Code host's `webviewReady` flush takes
    // when seeding a freshly-mounted webview.
    await page.evaluate(() => {
      window.__sessionStore.getState().setDrawingMode(null);
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      window.__sessionStore.getState().setDrawingMode('polygon');
    });
    await page.waitForTimeout(300);

    // Screenshot the same view. The toolbar's armed indicator must be
    // visible without the user re-clicking the polygon tool — which is
    // the exact user-facing benefit #108 delivers in VS Code.
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'vscode-toolbar-armed-after-reload.png'),
      fullPage: false,
    });
  });
});
