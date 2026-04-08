/**
 * E2E: Tabular Results Panel — US1 (display)
 *
 * Feature: 178-vscode-tabular-results
 *
 * Drives the real `apps/vscode/dist/webview/resultsPanel.js` bundle in a
 * minimal HTML harness via the Hybrid-A+D postMessage pattern.  This tests
 * the webview renderer end-to-end (React, TableRenderer, ChartRenderer, tab
 * bar, unsaved-dot indicator, close handlers) **without** needing a
 * running code-server or the Debrief VS Code extension host.
 *
 * Covers acceptance scenarios 1–4 from US1 in spec.md.
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
  RANGE_BEARING_RANGE_TAB,
  RANGE_BEARING_BEARING_TAB,
} from './harness';

test.describe('Results Panel — US1: Display', () => {
  test.beforeEach(async ({ page }) => {
    await loadHarness(page);
  });

  test('empty state: panel is hidden until the first result (FR-004)', async ({
    page,
  }) => {
    // On load the panel should show the "no results" placeholder —
    // the webview itself is visible, but the "visible" flag is false.
    await expect(
      page.getByTestId('results-panel-empty'),
    ).toBeVisible();
    await expect(page.getByTestId('panel-chart')).toHaveCount(0);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "01-empty-state.png"),
      fullPage: false,
    });
  });

  test('single table tab appears after track-stats tool result (FR-001, FR-002, FR-003)', async ({
    page,
  }) => {
    // Host announces visibility + a single synthesised table tab.
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });

    // Panel is now visible with the tab rendered.
    await expect(page.getByTestId('panel-chart')).toBeVisible();

    // Tab header is present with the right title.
    const tabHeader = page.getByTestId(`results-tab-${TRACK_STATS_TAB.id}`);
    await expect(tabHeader).toBeVisible();
    await expect(tabHeader).toContainText('Track Alpha — Stats');

    // Unsaved dot is visible for an unsaved tab (FR-007).
    await expect(
      page.getByTestId('unsaved-dot'),
    ).toBeVisible();

    // Table content renders — TableRenderer shows the metric rows.
    // We assert by looking for the row values that buildCsvContent would write.
    await expect(page.getByTestId('panel-chart')).toContainText('total distance nm');
    await expect(page.getByTestId('panel-chart')).toContainText('12.5');
    await expect(page.getByTestId('panel-chart')).toContainText('average speed kn');

    // Save / Save As buttons are visible and enabled (unsaved tab).
    const saveButton = page.getByTestId('results-save-button');
    const saveAsButton = page.getByTestId('results-save-as-button');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await expect(saveAsButton).toBeVisible();
    await expect(saveAsButton).toBeEnabled();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "02-single-table-tab.png"),
      fullPage: false,
    });
  });

  test('two chart tabs appear after range-bearing tool result (FR-002)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [RANGE_BEARING_RANGE_TAB, RANGE_BEARING_BEARING_TAB],
        activeTabId: RANGE_BEARING_BEARING_TAB.id,
      },
    });

    // Both tab headers are present.
    const rangeTab = page.getByTestId(
      `results-tab-${RANGE_BEARING_RANGE_TAB.id}`,
    );
    const bearingTab = page.getByTestId(
      `results-tab-${RANGE_BEARING_BEARING_TAB.id}`,
    );

    await expect(rangeTab).toBeVisible();
    await expect(rangeTab).toContainText('Range');
    await expect(bearingTab).toBeVisible();
    await expect(bearingTab).toContainText('Bearing');

    // Both have the unsaved-dot indicator.
    const dots = page.getByTestId('unsaved-dot');
    await expect(dots).toHaveCount(2);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, "03-two-chart-tabs.png"),
      fullPage: false,
    });
  });

  test('clicking the × button on a tab posts results:closeTab (FR-006)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [RANGE_BEARING_RANGE_TAB, RANGE_BEARING_BEARING_TAB],
        activeTabId: RANGE_BEARING_BEARING_TAB.id,
      },
    });

    await clearPostedMessages(page);

    // Click the close button inside the Range tab header.
    // Default label from DEFAULT_RESULTS_PANEL_LABELS is `Close ${title}`.
    const rangeTab = page.getByTestId(
      `results-tab-${RANGE_BEARING_RANGE_TAB.id}`,
    );
    await rangeTab.getByRole('button', { name: 'Close Range' }).click();

    // The webview should have dispatched a results:closeTab message.
    const posted = await getPostedMessages(page);
    const closeMsg = posted.find(
      (m) => (m as { type?: string }).type === 'results:closeTab',
    );
    expect(closeMsg).toBeDefined();
    expect(closeMsg).toMatchObject({
      type: 'results:closeTab',
      payload: { tabId: RANGE_BEARING_RANGE_TAB.id },
    });
  });

  test('switching tabs updates the active tab highlight', async ({ page }) => {
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [RANGE_BEARING_RANGE_TAB, RANGE_BEARING_BEARING_TAB],
        activeTabId: RANGE_BEARING_BEARING_TAB.id,
      },
    });

    const rangeTab = page.getByTestId(
      `results-tab-${RANGE_BEARING_RANGE_TAB.id}`,
    );
    await rangeTab.click();

    // After clicking Range, the active-tab highlight (local state)
    // should move to the Range tab header.
    await expect(rangeTab).toHaveCSS(
      'border-bottom',
      /rgb\(0,\s*127,\s*212\)|#007fd4/i,
    );
  });

  test('setVisibility(false) collapses the panel to the empty placeholder (FR-006)', async ({
    page,
  }) => {
    // Show panel with one tab.
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });
    await expect(page.getByTestId('panel-chart')).toBeVisible();

    // Host announces visibility=false (equivalent to all tabs closed).
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: false },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: { tabs: [], activeTabId: null },
    });

    // Empty placeholder returns.
    await expect(
      page.getByTestId('results-panel-empty'),
    ).toBeVisible();
  });
});
