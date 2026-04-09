/**
 * E2E: Tabular Results Panel — US5 (error/retry) and loading state
 *
 * Feature: 178-vscode-tabular-results
 *
 * Drives the webview bundle (ChartPanelWrapper) to exercise the error
 * tab + Retry flow and the per-tab loading state.  US4 (file actions)
 * lives on the ActivityPanelViewProvider side, not the Results panel
 * webview, so it is covered by vitest unit tests against
 * `_handleFileAction` rather than this webview E2E spec.
 *
 * All selectors are the SHARED-COMPONENT aria-labels + `data-testid`
 * values set by ChartPanelWrapper — not custom ones.
 *
 * Covers acceptance scenarios 1 and 2 from US5 in spec.md.
 */
import { test, expect } from '@playwright/test';
import { join } from 'path';
import {
  loadHarness,
  sendHostMessage,
  getPostedMessages,
  clearPostedMessages,
  SCREENSHOT_DIR,
  ERROR_TAB,
  TRACK_STATS_TAB,
} from './harness';

test.describe('Results Panel — US5: Error and Retry', () => {
  test.beforeEach(async ({ page }) => {
    await loadHarness(page);
    await sendHostMessage(page, {
      type: 'results:setVisibility',
      payload: { visible: true },
    });
  });

  test('error tab shows the message and a Retry button (FR-019)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [ERROR_TAB],
        activeTabId: ERROR_TAB.id,
      },
    });

    // ChartPanelWrapper's error state is marked with
    // `data-testid="panel-chart-error"` and carries the title plus
    // the error message.
    const errorRegion = page.getByTestId('panel-chart-error');
    await expect(errorRegion).toBeVisible();
    await expect(errorRegion).toContainText('Tool execution failed');
    await expect(errorRegion).toContainText(
      'Selection must contain at least two tracks',
    );

    // Retry button with aria-label "Retry tool execution".
    const retryButton = page.getByRole('button', {
      name: 'Retry tool execution',
    });
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

    // Save / Save As should NOT be rendered on an error tab.
    await expect(
      page.getByRole('button', { name: 'Save result', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Save result as' }),
    ).toHaveCount(0);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, '06-error-retry.png'),
      fullPage: false,
    });
  });

  test('clicking Retry posts results:retry for the active tab (FR-020)', async ({
    page,
  }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [ERROR_TAB],
        activeTabId: ERROR_TAB.id,
      },
    });
    await clearPostedMessages(page);

    await page.getByRole('button', { name: 'Retry tool execution' }).click();

    const posted = await getPostedMessages(page);
    const retryMsg = posted.find(
      (m) => (m as { type?: string }).type === 'results:retry',
    );
    expect(retryMsg).toBeDefined();
    expect(retryMsg).toMatchObject({
      type: 'results:retry',
      payload: { tabId: ERROR_TAB.id },
    });
  });

  test('host can transition from error to loading to success', async ({
    page,
  }) => {
    // Start in error state.
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [ERROR_TAB],
        activeTabId: ERROR_TAB.id,
      },
    });
    await expect(page.getByTestId('panel-chart-error')).toBeVisible();

    // Host: retry fires — replace with a fresh unsaved-success tab.
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });

    // Error region gone, table content visible, unsaved-dot back.
    await expect(page.getByTestId('panel-chart-error')).toHaveCount(0);
    await expect(page.getByTestId('panel-chart')).toContainText(
      'total distance nm',
    );
    await expect(page.getByLabel('Unsaved result').first()).toBeVisible();
  });

  test('results:setLoading marks the tab as loading', async ({ page }) => {
    await sendHostMessage(page, {
      type: 'results:setTabs',
      payload: {
        tabs: [TRACK_STATS_TAB],
        activeTabId: TRACK_STATS_TAB.id,
      },
    });

    await sendHostMessage(page, {
      type: 'results:setLoading',
      payload: { tabId: TRACK_STATS_TAB.id, isLoading: true },
    });

    // ChartPanelWrapper's loading state uses role="status" with
    // aria-label from `labels.loadingResults` ("Computing results").
    await expect(page.getByRole('status')).toBeVisible();
  });
});
