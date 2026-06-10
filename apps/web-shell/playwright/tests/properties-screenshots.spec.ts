/**
 * T086 + T087 — capture PropertiesForm screenshots and an interaction GIF for
 * the Properties Panel feature (#193 / backlog #191).
 *
 * Captures three theme variants of the Properties demo aside, plus a video
 * recording of the edit flow (blur-commit). Outputs land under
 * specs/193-properties-panel/evidence/screenshots/.
 *
 * FR-006 / FR-007 — row-click is gated on actionability (visible +
 * scrollIntoViewIfNeeded) before clicking to avoid racing the virtualised
 * list re-render. The 15 s properties-form wait is unchanged so genuine
 * breakage still fails loudly (FR-007). retries: 0 is set at the describe
 * level (T010) so flakiness masks no real regression.
 */

import { test, expect, Page } from '@playwright/test';
import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(__dirname, '../../../../specs/193-properties-panel/evidence/screenshots');
mkdirSync(EVIDENCE_DIR, { recursive: true });

/**
 * Inject a CSS override to force one of the three themes.
 * The web-shell uses VS Code CSS variables. We set them on the root so the
 * Properties form renders like it would inside the real extension.
 */
async function applyTheme(page: Page, theme: 'light' | 'dark' | 'vscode'): Promise<void> {
  await page.addStyleTag({
    content:
      theme === 'dark'
        ? `:root {
             color-scheme: dark;
             --vscode-editor-background: #1e1e1e;
             --vscode-editor-foreground: #d4d4d4;
             --vscode-panel-border: #424242;
             --vscode-descriptionForeground: #9d9d9d;
             --vscode-foreground: #d4d4d4;
             --vscode-input-background: #3c3c3c;
             --vscode-input-foreground: #cccccc;
             --vscode-input-border: #3c3c3c;
             --vscode-button-background: #0e639c;
             --vscode-button-foreground: #ffffff;
             --vscode-button-hoverBackground: #1177bb;
             background: #1e1e1e; color: #d4d4d4;
           }
           body { background: #1e1e1e; color: #d4d4d4; }`
        : theme === 'light'
          ? `:root {
               color-scheme: light;
               --vscode-editor-background: #ffffff;
               --vscode-editor-foreground: #333333;
               --vscode-panel-border: #e0e0e0;
               --vscode-descriptionForeground: #717171;
               --vscode-foreground: #333333;
               --vscode-input-background: #ffffff;
               --vscode-input-foreground: #333333;
               --vscode-input-border: #cecece;
               --vscode-button-background: #005fb8;
               --vscode-button-foreground: #ffffff;
               --vscode-button-hoverBackground: #0258a8;
               background: #ffffff; color: #333333;
             }
             body { background: #ffffff; color: #333333; }`
          : `:root {
               color-scheme: dark;
               --vscode-editor-background: #252526;
               --vscode-editor-foreground: #cccccc;
               --vscode-panel-border: #3c3c3c;
               --vscode-descriptionForeground: #969696;
               --vscode-foreground: #cccccc;
               --vscode-input-background: #3c3c3c;
               --vscode-input-foreground: #cccccc;
               --vscode-input-border: #3c3c3c;
               --vscode-button-background: #0e639c;
               --vscode-button-foreground: #ffffff;
               --vscode-button-hoverBackground: #1177bb;
               background: #252526; color: #cccccc;
             }
             body { background: #252526; color: #cccccc; }`,
  });
}

test.describe('Properties Panel — visual evidence', () => {
  // T010 — retries: 0 so flakiness does not mask real regressions (Decision #8).
  // Per-describe override is the minimal approach — avoids touching playwright.config.ts.
  test.describe.configure({ retries: 0 });

  test.setTimeout(120_000);

  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`properties-form screenshot — ${theme}`, async ({ page }) => {
      // Tall viewport so the full Properties form fits in its right-pane slot.
      await page.setViewportSize({ width: 1400, height: 1100 });
      await page.goto('http://localhost:5173');
      await page.waitForSelector('[data-testid="stac-browser-list"]', {
        timeout: 15_000,
      });
      // Wait for the list to actually populate (CI races with /stac-store/
      // middleware; using a text-based row locator was crashing the browser
      // when the fetch hadn't resolved yet).
      await page.waitForSelector('[data-testid="exercise-list-item-row"]', {
        timeout: 15_000,
      });
      // FR-006: gate on actionability before clicking to avoid racing the
      // virtualised list re-render. scrollIntoViewIfNeeded ensures the row
      // is in the viewport before the click lands.
      const firstRow = page
        .locator('[data-testid="exercise-list-item-row"]')
        .first();
      await expect(firstRow).toBeVisible();
      await firstRow.scrollIntoViewIfNeeded();
      await firstRow.click();
      // FR-007: 15 s wait kept intact so genuine breakage still fails loudly.
      await page.waitForSelector('[data-testid="properties-form"]', {
        timeout: 15_000,
      });
      await applyTheme(page, theme);

      const slot = page.locator('[data-testid="stac-browser-properties-slot"]');
      await expect(slot).toBeVisible();

      await slot.screenshot({
        path: join(EVIDENCE_DIR, `properties-form-${theme}.png`),
        omitBackground: false,
      });
    });
  }

  test('interaction video — edit a tag and commit', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: EVIDENCE_DIR,
        size: { width: 1280, height: 720 },
      },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="stac-browser-list"]', {
      timeout: 15_000,
    });
    await page.waitForSelector('[data-testid="exercise-list-item-row"]', {
      timeout: 15_000,
    });
    const firstRow = page
      .locator('[data-testid="exercise-list-item-row"]')
      .first();
    // FR-006: gate on actionability before clicking to avoid racing the
    // virtualised list re-render. scrollIntoViewIfNeeded ensures the row
    // is in the viewport before the click lands.
    await expect(firstRow).toBeVisible();
    await firstRow.scrollIntoViewIfNeeded();
    await firstRow.click();
    // FR-007: 15 s wait kept intact so genuine breakage still fails loudly.
    await page.waitForSelector('[data-testid="properties-form"]', {
      timeout: 15_000,
    });
    await applyTheme(page, 'dark');

    // Scroll the properties slot into view
    await page
      .locator('[data-testid="stac-browser-properties-slot"]')
      .scrollIntoViewIfNeeded();

    // Small pause to let the first frame capture the idle state.
    await page.waitForTimeout(600);

    // Find an array-widget text input (ArrayWidget renders a textbox for adding chips).
    const tagInput = page
      .locator('[data-testid="stac-browser-properties-slot"]')
      .locator('input[type="text"]')
      .first();

    await tagInput.click();
    await tagInput.type('atlantic-coast');
    await page.waitForTimeout(500);
    await tagInput.press('Enter');
    await page.waitForTimeout(800);

    // Also demonstrate a datetime edit
    const datetimeInputs = page
      .locator('[data-testid="stac-browser-properties-slot"]')
      .locator('input');
    const dtInput = datetimeInputs.nth(1);
    await dtInput.click();
    await page.waitForTimeout(400);
    await dtInput.press('Tab');
    await page.waitForTimeout(600);

    await context.close();

    // Rename video file to something predictable; playwright writes a hashed name.
    const videoFiles = readdirSync(EVIDENCE_DIR).filter((f) => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
      const newest = videoFiles
        .map((name) => ({ name, full: join(EVIDENCE_DIR, name) }))
        .sort((a, b) => (a.full < b.full ? 1 : -1))[0];
      if (newest) {
        const target = join(EVIDENCE_DIR, 'interaction.webm');
        if (existsSync(target)) {
          // Keep the newest, drop any older duplicate.
        }
        copyFileSync(newest.full, target);
      }
    }
  });
});
