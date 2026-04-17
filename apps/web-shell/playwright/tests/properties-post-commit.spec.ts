/**
 * Post-commit still — shows the chip list after an edit. Complements the idle
 * screenshots captured by properties-screenshots.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/193-properties-panel/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

test('properties-form post-commit still — dark', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1100 });
  await page.goto('http://localhost:5173');
  await page.waitForSelector('[data-testid="stac-browser-list"]', {
    timeout: 15_000,
  });
  // Click-hover a row so the properties slot populates.
  const firstTitle = page
    .locator('[data-testid="stac-browser-list"]')
    .locator('text=/Saxon Warrior/')
    .first();
  await firstTitle.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  await firstTitle.hover({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await page.waitForSelector('[data-testid="properties-form"]', {
    timeout: 15_000,
  });
  await page.addStyleTag({
    content: `:root {
      color-scheme: dark;
      --vscode-editor-background: #1e1e1e;
      --vscode-editor-foreground: #d4d4d4;
      --vscode-panel-border: #424242;
      --vscode-descriptionForeground: #9d9d9d;
      --vscode-foreground: #d4d4d4;
      --vscode-input-background: #3c3c3c;
      --vscode-input-foreground: #cccccc;
      --vscode-input-border: #3c3c3c;
      background: #1e1e1e; color: #d4d4d4;
    }
    body { background: #1e1e1e; color: #d4d4d4; }`,
  });

  const slot = page.locator('[data-testid="stac-browser-properties-slot"]');
  await expect(slot).toBeVisible();

  // Type an invalid ISO-8601 value into the datetime input, then Tab to blur
  // — this triggers the inline validation error.
  const dtInput = slot.locator('input').nth(1);
  await dtInput.click();
  await dtInput.fill('not-a-date');
  await dtInput.press('Tab');
  await page.waitForTimeout(400);

  await slot.screenshot({
    path: join(EVIDENCE_DIR, 'properties-form-validation-error.png'),
  });
});
