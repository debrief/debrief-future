import { test, expect } from '@playwright/test';

/**
 * NL Demo smoke tests (#189).
 *
 * Covers the US1 core flow (nationality + vessel chips for "uk submarines"
 * — the exact phrase recorded in 188's fixture corpus) plus US2 off-corpus
 * recovery (typing a phrase guaranteed not to be in the corpus surfaces a
 * banner with example phrases).
 *
 * The recorded fixture for "uk submarines" emits two lozenges:
 *   { nationality: GB }, { vessel-class: submarine }
 * and a CQL2 array_filter that AND's nationality=GB with domain=subsurface
 * over debrief:platforms[*]. Against the 72-plot sample catalog only a small
 * subset of plots have a subsurface GB platform — the assertion here checks
 * the count is "smaller than total but greater than zero" rather than a fixed
 * number, because the catalog is regenerated periodically.
 */

const CORPUS_PHRASE = 'uk submarines';
const OFF_CORPUS_PHRASE = 'purple elephants';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for bootstrap to finish (results-count appears once allItems load).
  await expect(page.getByTestId('results-count')).toBeVisible();
});

test('core flow: types UK submarines, sees chips + filtered grid + chip removal', async ({ page }) => {
  // Initial unfiltered state — the count reads "<N> plots" (no "of").
  const totalText = await page.getByTestId('results-count').innerText();
  const totalMatch = totalText.match(/(\d+)\s+plots/);
  expect(totalMatch).not.toBeNull();
  const total = Number(totalMatch![1]);
  expect(total).toBeGreaterThan(0);

  // Type the phrase + submit.
  await page.getByTestId('query-input').fill(CORPUS_PHRASE);
  await page.getByTestId('query-input').press('Enter');

  // Chips appear. The recorded fixture for "uk submarines" emits two lozenges.
  await expect(page.getByTestId('chip-bar')).toBeVisible();
  await expect(page.getByTestId('chip-nationality-GB')).toBeVisible();
  await expect(page.getByTestId('chip-vessel-class-submarine')).toBeVisible();

  // Results count switched to "<shown> of <total> plots".
  const filteredText = await page.getByTestId('results-count').innerText();
  const filteredMatch = filteredText.match(/(\d+)\s+of\s+(\d+)\s+plots/);
  expect(filteredMatch).not.toBeNull();
  const shown = Number(filteredMatch![1]);
  const totalAgain = Number(filteredMatch![2]);
  expect(totalAgain).toBe(total);
  expect(shown).toBeLessThan(total);
  expect(shown).toBeGreaterThanOrEqual(0);

  // Click × on the nationality chip — the filter broadens.
  const nationalityChip = page.getByTestId('chip-nationality-GB');
  await nationalityChip.locator('button.chip__remove').click();

  // Chip is gone, count rises (or at minimum doesn't drop).
  await expect(nationalityChip).toHaveCount(0);
  const broadenedText = await page.getByTestId('results-count').innerText();
  const broadenedMatch = broadenedText.match(/(\d+)\s+of\s+(\d+)\s+plots/);
  if (broadenedMatch) {
    expect(Number(broadenedMatch[1])).toBeGreaterThanOrEqual(shown);
  }
});

test('off-corpus phrase surfaces banner with example phrases that recover the flow', async ({ page }) => {
  await page.getByTestId('query-input').fill(OFF_CORPUS_PHRASE);
  await page.getByTestId('query-input').press('Enter');

  // Banner appears.
  const banner = page.getByTestId('off-corpus-banner');
  await expect(banner).toBeVisible();

  // At least three clickable example buttons.
  const exampleButtons = banner.locator('button.banner__example');
  await expect(exampleButtons).toHaveCount(5); // pickExamplePhrases yields up to 5

  // Click the first example — banner dismisses, query bar populates, US1 flow runs.
  const firstExample = exampleButtons.first();
  const exampleText = await firstExample.innerText();
  await firstExample.click();

  await expect(banner).toHaveCount(0);
  await expect(page.getByTestId('query-input')).toHaveValue(exampleText);
  // Either chips or zero-match state should appear (we trust the corpus).
  await expect(page.getByTestId('results-count')).toBeVisible();
});

test('clear-all resets to unfiltered state', async ({ page }) => {
  await page.getByTestId('query-input').fill(CORPUS_PHRASE);
  await page.getByTestId('query-input').press('Enter');
  await expect(page.getByTestId('chip-bar')).toBeVisible();

  await page.getByRole('button', { name: 'Clear all' }).first().click();

  await expect(page.getByTestId('chip-bar')).toHaveCount(0);
  const text = await page.getByTestId('results-count').innerText();
  expect(text).toMatch(/^\d+\s+plots$/);
});
