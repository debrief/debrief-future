/**
 * Capture Storybook screenshots for documentation/media.
 * Run with: npx tsx scripts/capture-screenshots.ts
 * Requires Storybook running on port 6006.
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORYBOOK_URL = 'http://localhost:6006';
const OUTPUT_DIR = join(__dirname, '../../../specs/004-loader-mini-app/evidence/screenshots');

interface Screenshot {
  name: string;
  storyId: string;
  description: string;
}

const screenshots: Screenshot[] = [
  // Full wizard flow
  { name: '01-store-selection', storyId: 'full-wizard-interactive-flow--full-flow', description: 'Step 1: Store Selection' },
  { name: '02-first-time-user', storyId: 'full-wizard-interactive-flow--first-time-user', description: 'First time user - no stores' },

  // Individual components
  { name: '03-store-selector-multiple', storyId: 'components-storeselector--multiple-stores', description: 'Store selector with multiple stores' },
  { name: '04-plot-config-create-new', storyId: 'components-plotconfig--create-new-tab', description: 'Plot config - Create New tab' },
  { name: '05-plot-config-add-existing', storyId: 'components-plotconfig--add-existing-tab', description: 'Plot config - Add to Existing tab' },
  { name: '06-progress-midway', storyId: 'components-progressview--midway', description: 'Processing progress' },
  { name: '07-success', storyId: 'components-successview--default', description: 'Success view' },
  { name: '08-error-parse', storyId: 'components-errorview--parse-error', description: 'Parse error' },
  { name: '09-error-retryable', storyId: 'components-errorview--retryable-error', description: 'Retryable error' },
];

async function captureScreenshots() {
  console.log('Creating output directory...');
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
  });
  const page = await context.newPage();

  console.log(`\nCapturing ${screenshots.length} screenshots...\n`);

  for (const shot of screenshots) {
    const url = `${STORYBOOK_URL}/iframe.html?id=${shot.storyId}&viewMode=story`;
    const outputPath = join(OUTPUT_DIR, `${shot.name}.png`);

    try {
      console.log(`  ${shot.name}: ${shot.description}`);
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait a bit for any animations to settle
      await page.waitForTimeout(500);

      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`    ✓ Saved to ${outputPath}`);
    } catch (error) {
      console.error(`    ✗ Failed: ${error}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

captureScreenshots().catch(console.error);
