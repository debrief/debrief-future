/**
 * Capture the Storyboard panel rendered inside VS Code with a plot
 * loaded (Feature 234, US2 — FR-015 supplement).
 *
 * The analyst's workflow needs the Storyboard panel AND the map view
 * visible at the same time — that's how they choose the zoom viewport
 * for new scenes and verify the viewport for existing scenes. So the
 * canonical evidence shot is the workbench layout with both panes
 * populated.
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.CODE_SERVER_URL ?? 'http://localhost:8080';
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../specs/218-storyboarding-edit/evidence/screenshots',
);

test.setTimeout(180_000);

test('captures sidebar (no plot) + storyboard+map (with Exercise Alpha loaded)', async ({
  page,
}) => {
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  // ── Boot ────────────────────────────────────────────────────────────
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const trustButton = page.getByRole('button', {
    name: 'Yes, I trust the authors',
  });
  if (await trustButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await trustButton.click();
    await page.waitForTimeout(800);
  }
  await page
    .locator('.monaco-workbench')
    .waitFor({ state: 'visible', timeout: 60_000 });
  await page.waitForTimeout(2_000);

  const debriefTab = page
    .getByRole('tab', { name: 'Debrief', exact: true })
    .first();
  await debriefTab.waitFor({ state: 'visible', timeout: 60_000 });

  // ── Snapshot A: Debrief sidebar with no plot loaded ─────────────────
  await debriefTab.click();
  await page.waitForTimeout(2_000);
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'vscode-debrief-sidebar.png'),
    fullPage: false,
  });

  // ── Open the Explorer + STAC Stores tree to load Exercise Alpha ─────
  // STAC Stores view is in the Explorer container (not Debrief).
  await page.keyboard.press('Control+Shift+KeyE');
  await page.waitForTimeout(1_500);

  // Focus the STAC Stores view via its auto-generated focus command.
  await page.keyboard.press('Control+Shift+KeyP');
  const palette = page.locator('.quick-input-widget input');
  await palette.waitFor({ state: 'visible', timeout: 10_000 });
  await palette.fill('>Focus on STAC Stores');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2_000);

  // Expand "STAC: Test Maritime Data" if collapsed.
  const storeRow = page.locator('.monaco-list-row:has-text("STAC:")').first();
  if (await storeRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const twistie = storeRow.locator('.monaco-tl-twistie');
    const collapsed = await twistie
      .evaluate((el) => el.classList.contains('collapsed'))
      .catch(() => true);
    if (collapsed) {
      await twistie.click();
      await page.waitForTimeout(800);
    }
  }

  // Some catalogs nest plots under a "plots" group; expand if present.
  const plotsGroup = page.locator('.monaco-list-row:has-text("plots")').first();
  if (await plotsGroup.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const groupTwistie = plotsGroup.locator('.monaco-tl-twistie');
    const groupCollapsed = await groupTwistie
      .evaluate((el) => el.classList.contains('collapsed'))
      .catch(() => true);
    if (groupCollapsed) {
      await groupTwistie.click();
      await page.waitForTimeout(800);
    }
  }

  // Click Exercise Alpha to fire debrief.openPlot.
  // STAC tree expansion can be slow on a fresh boot — retry the lookup
  // a couple of times, re-expanding the parent if the plot doesn't appear.
  const plotNode = page
    .locator('.monaco-list-row:has-text("Exercise Alpha")')
    .first();
  let attempts = 0;
  while (
    attempts < 3 &&
    !(await plotNode.isVisible({ timeout: 5_000 }).catch(() => false))
  ) {
    attempts += 1;
    await page.waitForTimeout(2_000);
    // Re-toggle the parent node twistie in case the first expand missed.
    const reTwistie = page
      .locator('.monaco-list-row:has-text("STAC:")')
      .first()
      .locator('.monaco-tl-twistie');
    await reTwistie.click().catch(() => undefined);
    await page.waitForTimeout(800);
  }
  await plotNode.waitFor({ state: 'visible', timeout: 10_000 });
  await plotNode.click();
  await page.waitForTimeout(3_000);

  // Wait for the map view iframe to attach — signals plot loaded.
  await page
    .locator('iframe.webview')
    .first()
    .waitFor({ state: 'attached', timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(3_000);

  // Surface the Storyboard view using its auto-generated focus command
  // — robust against sidebar toggle state (clicking the tab toggles).
  await page.keyboard.press('Control+Shift+KeyP');
  await palette.waitFor({ state: 'visible', timeout: 10_000 });
  await palette.fill('>Focus on Storyboard View');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2_500);

  // Expand the Storyboard view header if collapsed.
  const storyboardHeader = page
    .getByRole('button', { name: /^Storyboard$/i })
    .first();
  if (await storyboardHeader.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const expanded = await storyboardHeader
      .getAttribute('aria-expanded')
      .catch(() => null);
    if (expanded === 'false') {
      await storyboardHeader.click();
      await page.waitForTimeout(1_500);
    }
  }

  // ── Snapshot B: storyboard view + map iframe in editor area ─────────
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'vscode-storyboard-panel.png'),
    fullPage: false,
  });

  // Sanity assertion — both panes should be visually present at this point.
  // Map iframe attached:
  expect(await page.locator('iframe.webview').count()).toBeGreaterThan(0);
});
