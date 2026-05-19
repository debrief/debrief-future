/**
 * #235 — visual evidence for the Storyboard rail (T089-T091).
 *
 * Captures three theme variants (light, dark, vscode) for each of the
 * three rail states the spec calls out:
 *   1. Empty state with the primary Capture Scene button
 *   2. First-capture naming row open (map + time controller still
 *      visible — this is the spec's signature visual)
 *   3. Duplicate-timestamp collision banner anchored to a Scene row
 *
 * Outputs land under
 * specs/235-storyboard-capture-ux/evidence/screenshots/.
 *
 * Modelled on apps/web-shell/playwright/tests/properties-screenshots.spec.ts
 * — same theme-injection approach, same path-resolution pattern.
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/235-storyboard-capture-ux/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

type Theme = 'light' | 'dark' | 'vscode';

async function applyTheme(page: Page, theme: Theme): Promise<void> {
  await page.addStyleTag({
    content:
      theme === 'dark'
        ? `:root {
             color-scheme: dark;
             --vscode-editor-background: #1e1e1e;
             --vscode-editor-foreground: #d4d4d4;
             --vscode-sideBar-background: #252526;
             --vscode-panel-border: #424242;
             --vscode-descriptionForeground: #9d9d9d;
             --vscode-foreground: #d4d4d4;
             --vscode-input-background: #3c3c3c;
             --vscode-input-foreground: #cccccc;
             --vscode-input-border: #3c3c3c;
             --vscode-button-background: #0e639c;
             --vscode-button-foreground: #ffffff;
             --vscode-button-hoverBackground: #1177bb;
             --vscode-editorWarning-background: rgba(255, 197, 61, 0.15);
             --vscode-editorWarning-foreground: #cca700;
             background: #1e1e1e; color: #d4d4d4;
           }
           body { background: #1e1e1e; color: #d4d4d4; }`
        : theme === 'light'
          ? `:root {
               color-scheme: light;
               --vscode-editor-background: #ffffff;
               --vscode-editor-foreground: #333333;
               --vscode-sideBar-background: #f3f3f3;
               --vscode-panel-border: #e0e0e0;
               --vscode-descriptionForeground: #717171;
               --vscode-foreground: #333333;
               --vscode-input-background: #ffffff;
               --vscode-input-foreground: #333333;
               --vscode-input-border: #cecece;
               --vscode-button-background: #005fb8;
               --vscode-button-foreground: #ffffff;
               --vscode-button-hoverBackground: #0258a8;
               --vscode-editorWarning-background: rgba(255, 197, 61, 0.15);
               --vscode-editorWarning-foreground: #bf8803;
               background: #ffffff; color: #333333;
             }
             body { background: #ffffff; color: #333333; }`
          : `:root {
               color-scheme: dark;
               --vscode-editor-background: #252526;
               --vscode-editor-foreground: #cccccc;
               --vscode-sideBar-background: #1e1e1e;
               --vscode-panel-border: #3c3c3c;
               --vscode-descriptionForeground: #969696;
               --vscode-foreground: #cccccc;
               --vscode-input-background: #3c3c3c;
               --vscode-input-foreground: #cccccc;
               --vscode-input-border: #3c3c3c;
               --vscode-button-background: #0e639c;
               --vscode-button-foreground: #ffffff;
               --vscode-button-hoverBackground: #1177bb;
               --vscode-editorWarning-background: rgba(255, 197, 61, 0.15);
               --vscode-editorWarning-foreground: #cca700;
               background: #252526; color: #cccccc;
             }
             body { background: #252526; color: #cccccc; }`,
  });
}

async function loadAnalysisView(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?storyboardPanel=1');
  await expect(page.locator('.web-shell--welcome')).toBeVisible({
    timeout: 15000,
  });
  await page
    .locator('[data-testid="exercise-list-item-row"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page
    .locator('[data-testid="exercise-list-item-row"]')
    .first()
    .dblclick();
  await expect(page.locator('.web-shell--analysis')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.leaflet-container')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('[data-testid="time-controller"]')).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.locator('[data-testid="storyboard-panel-rail"]'),
  ).toBeVisible({ timeout: 10000 });
  // Force a Leaflet pan so the viewport propagates into session-state.
  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
    await page.mouse.up();
  }
  await page.waitForFunction(
    () =>
      window.__sessionStore?.getState().viewport !== null &&
      window.__sessionStore?.getState().currentTime !== null,
    { timeout: 60000 },
  );
}

test.describe('Storyboard rail — visual evidence (#235)', () => {
  test.setTimeout(300_000);

  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`empty-state screenshot — ${theme}`, async ({ page }) => {
      await loadAnalysisView(page);
      await applyTheme(page, theme);
      // Ensure the empty-state copy + Capture button render in the rail.
      await expect(
        page.locator('[data-testid="storyboard-empty-state"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="capture-scene-button"]'),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(
          EVIDENCE_DIR,
          `web-shell-empty-state-${theme}.png`,
        ),
        fullPage: false,
      });
    });

    test(`naming-row screenshot — ${theme}`, async ({ page }) => {
      await loadAnalysisView(page);
      await applyTheme(page, theme);
      await page.locator('[data-testid="capture-scene-button"]').click();
      await expect(
        page.locator('[data-testid="storyboard-naming-row"]'),
      ).toBeVisible({ timeout: 5000 });
      // Type a name so the row shows realistic content.
      const input = page.locator(
        '[data-testid="storyboard-naming-row-input"]',
      );
      await input.fill('Exercise Alpha');
      // Important visual proof: the map and time controller are still on
      // screen alongside the naming row (FR-VIS-022/023, the spec's
      // signature visual).
      await expect(page.locator('.leaflet-container')).toBeVisible();
      await expect(
        page.locator('[data-testid="time-controller"]'),
      ).toBeVisible();
      await page.screenshot({
        path: resolve(
          EVIDENCE_DIR,
          `web-shell-naming-row-${theme}.png`,
        ),
        fullPage: false,
      });
    });

    // #259 — the collision-banner screenshots (Replace / Offset / Cancel)
    // were retired here when the underlying constraint was relaxed. Multiple
    // Scenes may share a timestamp now; no banner ever surfaces. The post-
    // #259 visual equivalent is the headline tied-timestamps screenshot
    // captured by `storyboard-tied-timestamps.spec.ts`.
  }
});
