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
  await page.goto('http://localhost:5173');
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

  const aside = page.locator('aside[aria-label="Properties Panel demo"]');
  await expect(aside).toBeVisible();

  // Add a tag via the ArrayWidget add-input, then blur.
  const tagInput = aside.locator('input[type="text"]').first();
  await tagInput.click();
  await tagInput.type('atlantic-coast');
  await tagInput.press('Enter');
  await page.waitForTimeout(400);

  await aside.screenshot({
    path: join(EVIDENCE_DIR, 'properties-form-after-commit.png'),
  });
});
