/**
 * Playwright e2e — Storybook screenshot capture for spec #192 PropertiesPanel
 * modes. Produces the 7 PNGs referenced from `tasks.md` Evidence Requirements.
 *
 * Stories live in `src/PropertiesPanel/PropertiesForm.stories.tsx`. The
 * wrapper at `shared/components/run-playwright.mjs` builds Storybook into
 * `storybook-static/` and serves it on :6006.
 */

import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_BASE = '/iframe.html?id=propertiespanel-propertiesform';
const EVIDENCE_DIR = resolve(
  HERE,
  '../../../specs/192-properties-panel-feature-edit/evidence/screenshots',
);

const storyUrl = (variant: string, theme: 'light' | 'dark' | 'vscode' = 'vscode') =>
  `${STORY_BASE}--${variant}&globals=theme:${theme}`;

test.beforeAll(async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
});

async function captureStory(
  page: import('@playwright/test').Page,
  variant: string,
  theme: 'light' | 'dark' | 'vscode',
  filename: string,
) {
  await page.goto(storyUrl(variant, theme));
  // Storybook renders the story inside #storybook-root; wait for it.
  await page.waitForSelector('#storybook-root', { timeout: 15_000 });
  // One animation frame for layout settle.
  await page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => r())),
  );
  const root = page.locator('#storybook-root');
  await expect(root).toBeVisible();
  await root.screenshot({ path: resolve(EVIDENCE_DIR, filename) });
}

test.describe('PropertiesPanel — Spec #192 Storybook screenshots', () => {
  test('feature mode — light', async ({ page }) => {
    await captureStory(page, 'feature-mode', 'light', 'properties-feature-light.png');
  });
  test('feature mode — dark', async ({ page }) => {
    await captureStory(page, 'feature-mode', 'dark', 'properties-feature-dark.png');
  });
  test('feature mode — vscode', async ({ page }) => {
    await captureStory(page, 'feature-mode', 'vscode', 'properties-feature-vscode.png');
  });
  test('sub-feature mode — track point — vscode', async ({ page }) => {
    await captureStory(
      page,
      'sub-feature-track',
      'vscode',
      'properties-subfeature-track-vscode.png',
    );
  });
  test('sub-feature mode — polygon vertex — vscode (cross-geometry hero)', async ({ page }) => {
    await captureStory(
      page,
      'sub-feature-polygon',
      'vscode',
      'properties-subfeature-polygon-vscode.png',
    );
  });
  test('multi-select summary — vscode', async ({ page }) => {
    await captureStory(
      page,
      'multi-select-summary',
      'vscode',
      'properties-multiselect-vscode.png',
    );
  });
  test('read-only banner + disabled inputs — vscode', async ({ page }) => {
    await captureStory(page, 'read-only', 'vscode', 'properties-readonly-vscode.png');
  });
});
