/**
 * E2E: Tabular Results Panel — US1 (display)
 *
 * Feature: 178-vscode-tabular-results
 *
 * Drives the real `apps/vscode/dist/webview/resultsPanel.js` bundle in a
 * minimal HTML harness via the Hybrid-A+D postMessage pattern.
 *
 * The bundle renders `@debrief/components` `<ChartPanelWrapper />` inside
 * a `<PanelContextProvider>` — so the selectors used here are the
 * SHARED-COMPONENT selectors (aria-labels + `data-testid` values set by
 * ChartPanelWrapper / TableRenderer / ChartRenderer), NOT custom ones
 * invented for this webview.  That guarantees the web-shell and the
 * VS Code panel test the same surface (FR-025 / SC-006).
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
    // On load the panel should show the empty placeholder —
    // the webview is mounted but has no tabs and is marked invisible.
    await expect(
      page.getByTestId('results-panel-empty'),
    ).toBeVisible();
    // ChartPanelWrapper is NOT rendered until we have tabs.
    await expect(page.getByTestId('panel-chart')).toHaveCount(0);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '01-empty-state.png'),
      fullPage: false,
    });
  });

  test('single table tab renders via TableRenderer (FR-001, FR-002, FR-003)', async ({
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

    // ChartPanelWrapper's root element is visible.
    await expect(page.getByTestId('panel-chart')).toBeVisible();

    // Tab header is present (rendered by ChartPanelWrapper's tab bar)
    // — find by accessible close-button aria-label which encodes the title.
    await expect(
      page.getByRole('button', { name: 'Close Track Alpha — Stats' }),
    ).toBeVisible();

    // Unsaved-dot indicator — ChartPanelWrapper renders a span with
    // `aria-label="Unsaved result"` and `title="Unsaved result"`.
    await expect(
      page.getByLabel('Unsaved result').first(),
    ).toBeVisible();

    // Table content actually rendered by the shared TableRenderer —
    // assert the metric names and values that the host fed in.
    const panelChart = page.getByTestId('panel-chart');
    await expect(panelChart).toContainText('total distance nm');
    await expect(panelChart).toContainText('12.5');
    await expect(panelChart).toContainText('average speed kn');
    await expect(panelChart).toContainText('point count');

    // Save / Save As buttons visible and enabled on an unsaved tab.
    await expect(
      page.getByRole('button', { name: 'Save result', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Save result as' }),
    ).toBeEnabled();

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '02-single-table-tab.png'),
      fullPage: false,
    });
  });

  test('chart tab actually renders a Vega-Lite chart (FR-002, FR-025, user-reported bug)', async ({
    page,
  }) => {
    // This is the test that SHOULD have caught the original "no range
    // graph" bug.  We open a chart tab, then assert that the shared
    // ChartRenderer's <canvas> element is actually present — which
    // only happens if `transformDataset` succeeded AND vega-embed
    // mounted the spec.
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [RANGE_BEARING_RANGE_TAB, RANGE_BEARING_BEARING_TAB],
        activeTabId: RANGE_BEARING_RANGE_TAB.id,
      },
    });

    // Panel visible with the right number of tabs.
    await expect(page.getByTestId('panel-chart')).toBeVisible();

    // Tab bar shows both tabs (via close-button aria-labels).
    await expect(
      page.getByRole('button', {
        name: `Close ${RANGE_BEARING_RANGE_TAB.title}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: `Close ${RANGE_BEARING_BEARING_TAB.title}`,
      }),
    ).toBeVisible();

    // Both are unsaved.
    await expect(page.getByLabel('Unsaved result')).toHaveCount(2);

    // ── THE KEY ASSERTION ──
    // ChartRenderer mounts a canvas element via vega-embed when the
    // spec is valid and the dataset type has a registered transformer.
    // `range_bearing_series` IS registered (see
    // shared/components/src/ChartRenderer/transformer/mappings/index.ts).
    //
    // If transformDataset returned the wrong shape (the original bug),
    // chartSpec would be null, ChartRenderer would show its error state,
    // and no <canvas> would render.
    const chartRenderer = page.getByTestId('chart-renderer').first();
    await expect(chartRenderer).toBeVisible();

    // Wait for vega-embed to finish rendering.  The loading overlay
    // disappears once the chart is mounted.
    await expect(page.getByTestId('chart-loading')).toHaveCount(0, {
      timeout: 5_000,
    });

    // No error state.
    await expect(page.getByTestId('chart-error')).toHaveCount(0);

    // A real <canvas> element exists inside the chart renderer —
    // this is vega-embed's rendering target.
    await expect(chartRenderer.locator('canvas')).toBeAttached();

    // Capture the screenshot — this is the one that will show the
    // actual chart for the user.
    await page.screenshot({
      path: join(SCREENSHOT_DIR, '03-two-chart-tabs.png'),
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

    // Click the close button on the Range tab.
    await page
      .getByRole('button', { name: `Close ${RANGE_BEARING_RANGE_TAB.title}` })
      .click();

    // Webview should have dispatched a results:closeTab message.
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

  test('switching tabs updates the active tab via local state', async ({
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

    // ChartPanelWrapper renders each tab header as a clickable <div>
    // whose only reliable selector is the Close button it contains —
    // click the parent of the "Close Range" button to activate the
    // Range tab.
    const rangeCloseButton = page.getByRole('button', {
      name: `Close ${RANGE_BEARING_RANGE_TAB.title}`,
    });
    await rangeCloseButton.locator('..').click();

    // The panel chart content area is still visible; the chartSpec
    // switches to the newly active tab's envelope.
    await expect(page.getByTestId('panel-chart')).toBeVisible();
    // The Range tab is now active — the chart renderer mounts a new
    // canvas for its spec.
    await expect(page.getByTestId('chart-renderer')).toBeVisible();
    await expect(
      page.getByTestId('chart-renderer').locator('canvas'),
    ).toBeAttached();
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
