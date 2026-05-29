/**
 * Evidence capture: LogPanel states for spec 113-prov-card-flip.
 *
 * Captures screenshots of the log panel in various states:
 * 1. Empty log (no entries)
 * 2. Log with entries after tool execution
 * 3. Log entry with tunable parameters (close-up)
 * 4. Edit card (flip-card back face)
 * 5. Tuned entry with badge
 * 6. Full page showing map + log panel side by side
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = join(
  __dirname,
  '..', '..', '..', '..', 'specs', '113-prov-card-flip', 'evidence',
);

/** Select the annotation rectangle for move-shape tool. */
async function selectRectangle(page: import('@playwright/test').Page) {
  const featureRow = page.locator(
    '.debrief-feature-row:has-text("Weapons-Hold Zone Charlie")',
  );
  if ((await featureRow.count()) > 0) {
    await featureRow.click();
  } else {
    const fallback = page.locator(
      '.debrief-feature-row:has-text("rect-exercise-area")',
    );
    await fallback.click();
  }
  await page.waitForTimeout(200);
}

/** Select a track for styling tools. */
async function selectTrack(page: import('@playwright/test').Page) {
  const row = page.locator('.debrief-feature-row:has-text("HMS Defender")');
  const target =
    (await row.count()) > 0 ? row : page.locator('.debrief-feature-row').first();
  // Click the content area to avoid the expand button (stopPropagation)
  await target.locator('.debrief-feature-row__content').click();
  await page.waitForTimeout(200);
}

/** Run the move-shape tool (annotation must be selected). */
async function runMoveShape(page: import('@playwright/test').Page) {
  const moveTool = page.locator(
    '.debrief-tools-panel__item--active:has-text("Move Shape")',
  );
  await expect(moveTool).toBeVisible({ timeout: 5000 });
  await moveTool.locator('button').click();
}

test.describe('Evidence screenshots: LogPanel states', () => {
  let catalogPage: CatalogPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    analysisPage = new AnalysisPage(page);
    await catalogPage.goto();
    await catalogPage.waitForLoad();
    analysisPage = await catalogPage.openFirstItem();
    await analysisPage.waitForLoad();
    await collapsePropertiesSection(page);
  });

  // ── 1. Empty log ──────────────────────────────────────────────────────────
  test('capture: empty log panel', async ({ page }) => {
    await analysisPage.switchToLogTab();
    await expect(analysisPage.logEmptyNoEntries).toBeVisible();

    await page.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-empty.png'),
      fullPage: false,
    });
  });

  // ── 2. Log with entries (timeline view) ───────────────────────────────────
  test('capture: log with entries after tool execution', async ({ page }) => {
    // Run a couple of tools to populate the log
    await selectTrack(page);
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });

    // Run first tool
    await activeTools.first().locator('button').click();
    await page.waitForTimeout(300);

    // Dismiss toast if present
    const dismiss = page.locator('.web-shell__tool-message button');
    if (await dismiss.isVisible()) await dismiss.click();

    // Run second tool if available
    if ((await activeTools.count()) > 1) {
      await activeTools.nth(1).locator('button').click();
      await page.waitForTimeout(300);
    }

    // Switch to log and capture
    await analysisPage.switchToLogTab();
    await expect(analysisPage.logEntries.first()).toBeVisible();

    await page.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-entries.png'),
      fullPage: false,
    });
  });

  // ── 3. Log entry with tunable parameters ──────────────────────────────────
  // QUARANTINED #278: these four captures need a move-shape log entry, but the
  // Move-Shape Run button is disabled after #261 (sidecar retirement), so the
  // setup (runMoveShape) never produces an entry. Un-fixme each when #278
  // restores selection-driven tool enablement. (mirrors viewport-lock / #274)
  test.fixme('capture: tunable parameters on move-shape entry', async ({ page }) => {
    await selectRectangle(page);
    await runMoveShape(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    await expect(entry).toBeVisible();

    // Ensure parameter chips are visible (Feature 176: rich card)
    const chips = entry.locator('.log-panel__chip');
    await expect(chips.first()).toBeVisible();

    // Screenshot the log panel area
    const logPanel = analysisPage.logPanel;
    await logPanel.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-tunable-params.png'),
    });
  });

  // ── 4. Edit card (flip-card back face) ────────────────────────────────────
  // QUARANTINED #278 (Move-Shape Run disabled post-#261).
  test.fixme('capture: edit card (flip-card back face)', async ({ page }) => {
    await selectRectangle(page);
    await runMoveShape(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    await expect(entry).toBeVisible();

    // Hover to reveal edit icon, then click it
    await entry.hover();
    const editIcon = entry.locator('[data-testid^="edit-icon-"]');
    // If the entry itself is the click target for edit, try the pencil icon
    if ((await editIcon.count()) > 0) {
      await editIcon.click();
    } else {
      // Double-click entry to trigger flip
      await entry.dblclick();
    }

    // Wait for the flip animation to complete
    await page.waitForTimeout(600);

    // Verify edit face is visible
    const editFace = page.locator('[data-testid="edit-face"]');
    await expect(editFace).toBeVisible({ timeout: 3000 });

    // Screenshot the edit face
    const logPanel = analysisPage.logPanel;
    await logPanel.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-edit-card.png'),
    });
  });

  // ── 5. Tuned entry with badge ─────────────────────────────────────────────
  // QUARANTINED #278 (Move-Shape Run disabled post-#261).
  test.fixme('capture: tuned entry with badge', async ({ page }) => {
    await selectRectangle(page);
    await runMoveShape(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // Open edit face and tune distance_km: 5 → 10 via slider
    const editIcon = entry.locator('[data-testid^="edit-icon-"]');
    await editIcon.click();
    const params = page.getByTestId('edit-face-params');
    await expect(params).toBeVisible({ timeout: 3000 });

    const sliderInput = page.getByTestId('slider-input-distance_km');
    await sliderInput.fill('10');
    await page.waitForTimeout(500); // debounce

    // Close edit face
    await page.getByTestId('edit-face-done').click();
    await page.waitForTimeout(200);

    // Verify parameter chip value updated on display face
    const distanceChipValue = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceChipValue).toContainText('10');

    // Tuned badge should appear
    const tunedBadge = entry.locator('[data-testid="badge-tuned"]');
    await expect(tunedBadge).toBeVisible();

    // Notification area
    const notification = page.getByTestId('log-panel-notification');
    await expect(notification).toBeVisible({ timeout: 3000 });

    // Screenshot the log panel with tuned entry and notification
    const logPanel = analysisPage.logPanel;
    await logPanel.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-tuned-entry.png'),
    });
  });

  // ── 6. Full page: map + log panel side by side ────────────────────────────
  // QUARANTINED #278 (Move-Shape Run disabled post-#261).
  test.fixme('capture: full page with map and log panel', async ({ page }) => {
    // Run multiple tools to show a rich log
    await selectTrack(page);
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });

    // Run first tool
    await activeTools.first().locator('button').click();
    await page.waitForTimeout(300);
    const dismiss = page.locator('.web-shell__tool-message button');
    if (await dismiss.isVisible()) await dismiss.click();

    // Run second tool if available
    if ((await activeTools.count()) > 1) {
      await activeTools.nth(1).locator('button').click();
      await page.waitForTimeout(300);
    }

    // Now also run move-shape on an annotation
    // First go back to activity tab to select annotation
    await analysisPage.switchToActivityTab();
    await selectRectangle(page);
    await runMoveShape(page);
    await page.waitForTimeout(300);

    // Switch to log — shows entries from both track tools and move-shape
    await analysisPage.switchToLogTab();
    await expect(analysisPage.logEntries.first()).toBeVisible();

    // Full page screenshot showing map + log panel layout
    await page.screenshot({
      path: join(EVIDENCE_DIR, 'logpanel-full-page.png'),
      fullPage: false,
    });
  });
});
