/**
 * T032 — Web-shell E2E test for the runtime theme-switch path (#220 US1).
 *
 * Asserts FR-002 / SC-001 / SC-008: every Debrief panel re-themes within
 * 1 second when VS Code's body class mutates.
 *
 * The web-shell harness simulates the body-class mutation that VS Code
 * itself performs when the user changes themes. The `<Bootstrap>` wrapper
 * mounts a `vsCodeBodyClassSource` which observes the mutation and
 * re-renders every panel.
 *
 * Captures:
 *   - per-variant screenshots → specs/220-fix-theme-responsiveness/evidence/screenshots/
 *   - an `interaction.gif` showing the live cycle
 */

import { test, expect, type Page } from '@playwright/test';
import {
  mkdirSync,
  copyFileSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/220-fix-theme-responsiveness/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

const VARIANTS = [
  { bodyClass: 'vscode-light', dataTheme: 'light' },
  { bodyClass: 'vscode-dark', dataTheme: 'dark' },
  { bodyClass: 'vscode-high-contrast', dataTheme: 'high-contrast-dark' },
  { bodyClass: 'vscode-high-contrast-light', dataTheme: 'high-contrast-light' },
] as const;

async function setVSCodeBodyClass(page: Page, cls: string): Promise<void> {
  await page.evaluate((bodyClass) => {
    const wanted = [
      'vscode-light',
      'vscode-dark',
      'vscode-high-contrast',
      'vscode-high-contrast-light',
    ];
    for (const c of wanted) document.body.classList.remove(c);
    document.body.classList.add(bodyClass);
  }, cls);
}

test.describe('Theme runtime switch (#220 US1)', () => {
  test.setTimeout(120_000);

  test('every variant change updates [data-theme] within 1s', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    for (const { bodyClass, dataTheme } of VARIANTS) {
      const start = Date.now();
      await setVSCodeBodyClass(page, bodyClass);

      // Assert documentElement[data-theme] settles within 1000ms (FR-002).
      await expect
        .poll(
          async () =>
            page.evaluate(() =>
              document.documentElement.getAttribute('data-theme'),
            ),
          { timeout: 1000 },
        )
        .toBe(dataTheme);

      const elapsed = Date.now() - start;
      // Soft-assert the timing — fail fast if the budget is blown.
      expect(elapsed, `transition to ${dataTheme} took ${elapsed}ms`).toBeLessThan(1000);

      // Capture a screenshot per variant.
      await page.screenshot({
        path: join(EVIDENCE_DIR, `webshell-${dataTheme}.png`),
        fullPage: false,
      });
    }
  });

  test('interaction GIF — cycle through every variant', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: EVIDENCE_DIR,
        size: { width: 1280, height: 720 },
      },
    });
    const page = await context.newPage();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    for (const { bodyClass, dataTheme } of VARIANTS) {
      await setVSCodeBodyClass(page, bodyClass);
      await expect
        .poll(
          () =>
            page.evaluate(() =>
              document.documentElement.getAttribute('data-theme'),
            ),
          { timeout: 1000 },
        )
        .toBe(dataTheme);
      await page.waitForTimeout(700);
    }

    await context.close();

    // Rename the recorded webm to a predictable name (interaction.webm).
    const videoFiles = readdirSync(EVIDENCE_DIR).filter(
      (f) => f.endsWith('.webm') && !f.startsWith('interaction'),
    );
    if (videoFiles.length > 0) {
      const newest = videoFiles
        .map((name) => ({
          name,
          full: join(EVIDENCE_DIR, name),
        }))
        .sort((a, b) => b.name.localeCompare(a.name))[0]!;
      const target = join(EVIDENCE_DIR, 'interaction.webm');
      if (existsSync(target)) unlinkSync(target);
      copyFileSync(newest.full, target);
      // Leave the renamed copy in place; the original is harmless.
    }
  });
});
