/**
 * E2E: Tabular Results Panel — US2 (save)
 *
 * Feature: 178-vscode-tabular-results
 *
 * Drives the real webview bundle (ChartPanelWrapper inside
 * PanelContextProvider) via postMessage and asserts that:
 *   - Clicking Save posts `results:save { tabId }` to the host
 *   - Save As opens an inline form, re-posts `results:saveAs` with
 *     the sanitised base name + tag
 *   - After the host flips the tab to `isSaved: true`, the unsaved dot
 *     clears and both Save buttons become disabled
 *
 * All selectors are the SHARED-COMPONENT aria-labels (from the
 * `@debrief/components` ResultsPanelLabels), not custom test IDs.
 *
 * Covers acceptance scenarios 1, 2, and 4 from US2 in spec.md.
 */
import { test, expect } from '@playwright/test';
import { join } from 'path';
import {
  loadHarness,
  sendHostMessage,
  getPostedMessages,
  clearPostedMessages,
  SCREENSHOT_DIR,
  TRACK_STATS_TAB,
  SAVED_TAB,
} from './harness';

test.describe('Results Panel — US2: Save flow', () => {
  test.beforeEach(async ({ page }) => {
    await loadHarness(page);
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
  });

  test('clicking Save dispatches results:save for the active tab (FR-008)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });
    await clearPostedMessages(page);

    await page.getByRole('button', { name: 'Save result', exact: true }).click();

    const posted = await getPostedMessages(page);
    const saveMsg = posted.find(
      (m) => (m as { type?: string }).type === 'results:save',
    );
    expect(saveMsg).toBeDefined();
    expect(saveMsg).toMatchObject({
      type: 'results:save',
      payload: { tabId: TRACK_STATS_TAB.id },
    });
  });

  test('Save As opens an inline form with Name and Tag inputs (FR-010)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });

    await page.getByRole('button', { name: 'Save result as' }).click();

    const nameInput = page.getByLabel('Base filename');
    const tagInput = page.getByLabel('Optional tag');
    await expect(nameInput).toBeVisible();
    await expect(tagInput).toBeVisible();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '04-save-as-form.png'),
      fullPage: false,
    });
  });

  test('Save As form submission posts results:saveAs with base name and tag (FR-010)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });
    await clearPostedMessages(page);

    await page.getByRole('button', { name: 'Save result as' }).click();

    await page.getByLabel('Base filename').fill('my-stats');
    await page.getByLabel('Optional tag').fill('v2');
    await page.getByLabel('Confirm save').click();

    const posted = await getPostedMessages(page);
    const saveAsMsg = posted.find(
      (m) => (m as { type?: string }).type === 'results:saveAs',
    );
    expect(saveAsMsg).toBeDefined();
    expect(saveAsMsg).toMatchObject({
      type: 'results:saveAs',
      payload: {
        tabId: TRACK_STATS_TAB.id,
        baseName: 'my-stats',
        tag: 'v2',
      },
    });

    // The inline form closes after submission.
    await expect(page.getByLabel('Base filename')).not.toBeVisible();
  });

  test('Save As can be cancelled without posting a message', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });

    await page.getByRole('button', { name: 'Save result as' }).click();
    await page.getByLabel('Base filename').fill('my-stats');
    await clearPostedMessages(page);
    await page.getByLabel('Cancel save').click();

    const posted = await getPostedMessages(page);
    expect(
      posted.find((m) => (m as { type?: string }).type === 'results:saveAs'),
    ).toBeUndefined();

    await expect(page.getByLabel('Base filename')).not.toBeVisible();
  });

  test('saved tab has no unsaved dot and disabled Save buttons (FR-012)', async ({
    page,
  }) => {
    // Start with an unsaved tab so the unsaved-dot is visible.
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });
    // The unsaved-dot is a span with aria-label="Unsaved result".
    await expect(page.getByLabel('Unsaved result').first()).toBeVisible();

    // Host flips the tab to saved.
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [SAVED_TAB],
        activeTabId: SAVED_TAB.id,
      },
    });

    // Unsaved dot is gone.
    await expect(page.getByLabel('Unsaved result')).toHaveCount(0);

    // Save buttons are disabled.
    await expect(
      page.getByRole('button', { name: 'Save result', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Save result as' }),
    ).toBeDisabled();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '05-saved-state.png'),
      fullPage: false,
    });
  });
});
