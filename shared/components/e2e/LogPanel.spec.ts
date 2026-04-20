/**
 * Playwright component E2E tests for Feature 176 — LogPanel rich cards.
 *
 * Verifies card rendering, tab cycling, and card selection against the
 * Storybook `LogPanel` stories in `light` and `vscode` theme variants.
 *
 * Feature: 176-log-panel-ux (T017)
 */

import { test, expect } from '@playwright/test';

const STORY_BASE = '/iframe.html?id=logpanel';

const storyUrl = (variant: string) => `${STORY_BASE}--${variant}`;
const withTheme = (url: string, theme: 'light' | 'dark' | 'vscode') =>
  `${url}&globals=theme:${theme}`;

const EVIDENCE_DIR = 'specs/176-log-panel-ux/evidence/screenshots';

test.describe('LogPanel — rich card rendering', () => {
  test('timeline-default renders cards with the 3-row anatomy', async ({ page }) => {
    await page.goto(storyUrl('timeline-default'));
    await page.waitForSelector('.log-panel__entry');

    const firstCard = page.locator('.log-panel__entry').first();
    await expect(firstCard.locator('.log-panel__entry-header')).toBeVisible();
    await expect(firstCard.locator('.log-panel__entry-meta')).toBeVisible();
    await expect(firstCard.locator('.log-panel__entry-chips')).toBeVisible();
  });

  test('all-categories story renders one card per category', async ({ page }) => {
    await page.goto(storyUrl('all-categories'));
    await page.waitForSelector('.log-panel__entry');

    const categories = ['import', 'style', 'calc', 'filter', 'snapshot', 'unknown'];
    for (const cat of categories) {
      await expect(
        page.locator(`[data-testid="tool-category-icon-${cat}"]`).first()
      ).toBeVisible();
    }
  });

  test('edge-cases story shows placeholders and multi-track wrap', async ({ page }) => {
    await page.goto(storyUrl('edge-cases'));
    await page.waitForSelector('.log-panel__entry');

    await expect(
      page.locator('[data-testid="manual-checkpoint-placeholder"]')
    ).toHaveCount(1);
    await expect(page.locator('[data-testid="no-params-placeholder"]')).toHaveCount(1);
    // Multi-track card: at least 3 track badges on one card
    const badges = page.locator('[data-testid="log-entry-edge-multi-track"] [data-testid="track-badge"]');
    await expect(badges).toHaveCount(3);
  });
});

test.describe('LogPanel — tab cycling + selection', () => {
  test('clicking each of the 4 tabs updates aria-selected', async ({ page }) => {
    await page.goto(storyUrl('timeline-default'));
    await page.waitForSelector('[data-testid="log-view-mode-toggle"]');

    const modes = ['timeline', 'by-feature', 'compact', 'detailed'] as const;
    for (const mode of modes) {
      await page.locator(`[data-testid="log-view-mode-${mode}"]`).click();
      await expect(
        page.locator(`[data-testid="log-view-mode-${mode}"]`)
      ).toHaveAttribute('aria-selected', 'true');
      const others = modes.filter((m) => m !== mode);
      for (const o of others) {
        await expect(
          page.locator(`[data-testid="log-view-mode-${o}"]`)
        ).toHaveAttribute('aria-selected', 'false');
      }
    }
  });

  test('card selection toggles aria-selected + selected class', async ({ page }) => {
    await page.goto(storyUrl('timeline-default'));
    const firstCard = page.locator('.log-panel__entry').first();
    await firstCard.waitFor();

    await expect(firstCard).toHaveAttribute('aria-selected', 'false');
    await firstCard.click();
    await expect(firstCard).toHaveAttribute('aria-selected', 'true');
    await expect(firstCard).toHaveClass(/log-panel__entry--selected/);
  });
});

test.describe('LogPanel — theme variants (evidence)', () => {
  for (const theme of ['light', 'vscode'] as const) {
    test(`timeline-default renders in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('timeline-default'), theme));
      await page.waitForSelector('.log-panel__entry');
      await expect(page.locator('.log-panel__entry').first()).toBeVisible();
      // Screenshot the 320px panel container, not the full iframe body.
      const panel = page.locator('#storybook-root > div').first();
      await panel.screenshot({
        path: `${EVIDENCE_DIR}/component-${theme}.png`,
      });
    });
  }

  test('edge-cases story captures edge-cases.png', async ({ page }) => {
    await page.goto(withTheme(storyUrl('edge-cases'), 'light'));
    await page.waitForSelector('.log-panel__entry');
    const panel = page.locator('#storybook-root > div').first();
    await panel.screenshot({
      path: `${EVIDENCE_DIR}/edge-cases.png`,
    });
  });

  test('disabled-card story captures disabled-state.png', async ({ page }) => {
    await page.goto(withTheme(storyUrl('disabled-card'), 'light'));
    await page.waitForSelector('.log-panel__entry--disabled');
    const panel = page.locator('#storybook-root > div').first();
    await panel.screenshot({
      path: `${EVIDENCE_DIR}/disabled-state.png`,
    });
  });

  test('all-categories captures all-categories.png', async ({ page }) => {
    await page.goto(withTheme(storyUrl('all-categories'), 'light'));
    await page.waitForSelector('.log-panel__entry');
    const panel = page.locator('#storybook-root > div').first();
    await panel.screenshot({
      path: `${EVIDENCE_DIR}/all-categories.png`,
    });
  });
});
