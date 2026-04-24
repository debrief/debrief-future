import { test, expect } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EVIDENCE_DIR = resolve(__dirname, '../../../specs/189-stakeholder-demo-ui/evidence/screenshots');

test.describe('Evidence capture', () => {
  test('capture state-unfiltered.png', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('results-count')).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/state-unfiltered.png`, fullPage: true });
  });

  test('capture state-filtered.png', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('results-count')).toBeVisible();
    await page.getByTestId('query-input').fill('uk submarines');
    await page.getByTestId('query-input').press('Enter');
    await expect(page.getByTestId('chip-bar')).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/state-filtered.png`, fullPage: true });
  });

  test('capture state-zero-match.png (klingon warbirds)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('results-count')).toBeVisible();
    // "Klingon warbirds" is in the corpus but produces zero matches against
    // the real catalog (designed as a zero-hit test phrase).
    await page.getByTestId('query-input').fill('klingon warbirds');
    await page.getByTestId('query-input').press('Enter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${EVIDENCE_DIR}/state-zero-match.png`, fullPage: true });
  });

  test('capture state-off-corpus.png', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('results-count')).toBeVisible();
    await page.getByTestId('query-input').fill('purple elephants');
    await page.getByTestId('query-input').press('Enter');
    await expect(page.getByTestId('off-corpus-banner')).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/state-off-corpus.png`, fullPage: true });
  });

  test('capture interaction frames (chip removal sequence)', async ({ page }) => {
    // Capture 6 frames showing the chip-removal flow. A separate post-test
    // script converts these to an animated GIF (interaction.gif).
    const FRAMES_DIR = `${EVIDENCE_DIR}/frames`;
    await page.goto('/');
    await expect(page.getByTestId('results-count')).toBeVisible();

    await page.screenshot({ path: `${FRAMES_DIR}/01-empty.png`, fullPage: false });

    await page.getByTestId('query-input').fill('uk submarines');
    await page.screenshot({ path: `${FRAMES_DIR}/02-typing.png`, fullPage: false });

    await page.getByTestId('query-input').press('Enter');
    await expect(page.getByTestId('chip-bar')).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${FRAMES_DIR}/03-filtered.png`, fullPage: false });
    await page.screenshot({ path: `${FRAMES_DIR}/04-filtered.png`, fullPage: false });

    const nationalityChip = page.getByTestId('chip-nationality-GB');
    await nationalityChip.locator('button.chip__remove').click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${FRAMES_DIR}/05-broadened.png`, fullPage: false });
    await page.screenshot({ path: `${FRAMES_DIR}/06-broadened.png`, fullPage: false });
  });
});
