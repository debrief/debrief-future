/**
 * HTML harness for the Results Panel webview bundle.
 *
 * Feature: 178-vscode-tabular-results
 *
 * Loads `apps/vscode/dist/webview/resultsPanel.js` into a self-contained
 * HTML page with a mocked `acquireVsCodeApi` and a tiny message bridge
 * that tests use to drive the React app via `window.postMessage`.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUNDLE_PATH = join(
  __dirname,
  '../../../apps/vscode/dist/webview/resultsPanel.js',
);

/** Absolute path to the evidence screenshots directory for this feature. */
export const SCREENSHOT_DIR = join(
  __dirname,
  '../evidence/screenshots',
);

/** Read the Results panel webview bundle from disk. */
export function getResultsPanelBundle(): string {
  if (!existsSync(BUNDLE_PATH)) {
    throw new Error(
      `Results panel bundle not found at ${BUNDLE_PATH}.\n` +
        'Run `pnpm --filter debrief-vscode run compile:webview` first.',
    );
  }
  return readFileSync(BUNDLE_PATH, 'utf-8');
}

/**
 * Build a self-contained HTML page that hosts the Results panel React app.
 *
 * VS Code API is mocked so that:
 * - `acquireVsCodeApi()` returns a shim
 * - posted messages are captured in `window.__postedMessages` for assertions
 * - tests can send `results:*` messages via `window.postMessage(...)`
 */
export function buildHarnessHtml(): string {
  const bundle = getResultsPanelBundle();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Results Panel — E2E Harness</title>
  <style>
    :root {
      --vscode-sideBar-background: #252526;
      --vscode-panel-background: #1e1e1e;
      --vscode-editor-background: #1e1e1e;
      --vscode-foreground: #cccccc;
      --vscode-descriptionForeground: #969696;
      --vscode-panel-border: #454545;
      --vscode-focusBorder: #007fd4;
      --vscode-tab-activeBackground: #1e1e1e;
      --vscode-tab-activeForeground: #ffffff;
      --vscode-tab-inactiveForeground: #969696;
      --vscode-editorGroupHeader-tabsBackground: #252526;
      --vscode-editorWarning-foreground: #cca700;
      --vscode-errorForeground: #f48771;
      --vscode-icon-foreground: #c5c5c5;
      --vscode-button-background: #0e639c;
      --vscode-button-foreground: #ffffff;
      --vscode-input-background: #3c3c3c;
      --vscode-input-foreground: #cccccc;
      --vscode-input-border: #3c3c3c;
      --vscode-disabledForeground: #5a5a5a;
      --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --vscode-font-size: 13px;
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-panel-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Capture messages sent from the webview → host so tests can assert them.
    window.__postedMessages = [];

    // Mock VS Code API.  The bundle calls acquireVsCodeApi() at module load
    // time, so this must be defined BEFORE the bundle script executes.
    window.acquireVsCodeApi = function() {
      var _state = null;
      return {
        postMessage: function(msg) {
          window.__postedMessages.push(msg);
        },
        getState: function() { return _state; },
        setState: function(s) { _state = s; return s; },
      };
    };

    // Test helper: send a fake "extension → webview" message.
    // Invokes the window 'message' event listener installed by the React app.
    window.__sendHostMessage = function(msg) {
      window.dispatchEvent(new MessageEvent('message', { data: msg }));
    };
  </script>
  <script>
${bundle}
  </script>
</body>
</html>`;
}

/**
 * Load the harness into a Playwright page and wait for the React app to
 * signal `results:webviewReady`.
 */
export async function loadHarness(page: Page): Promise<void> {
  const html = buildHarnessHtml();
  await page.setContent(html, { waitUntil: 'load' });

  // The React app calls `vscode.postMessage({ type: 'results:webviewReady' })`
  // on mount.  Wait until that message lands in __postedMessages.
  await page.waitForFunction(() => {
    const posted = (window as unknown as { __postedMessages?: unknown[] })
      .__postedMessages;
    return Array.isArray(posted) &&
      posted.some(
        (m) =>
          typeof m === 'object' &&
          m !== null &&
          (m as { type?: string }).type === 'results:webviewReady',
      );
  }, { timeout: 5_000 });
}

/** Send a fake extension → webview message through the harness bridge. */
export async function sendHostMessage(
  page: Page,
  message: Record<string, unknown>,
): Promise<void> {
  await page.evaluate((msg) => {
    (
      window as unknown as {
        __sendHostMessage: (m: Record<string, unknown>) => void;
      }
    ).__sendHostMessage(msg);
  }, message);
}

/** Retrieve the list of messages the webview has posted back to the host. */
export async function getPostedMessages(
  page: Page,
): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => {
    return (window as unknown as { __postedMessages: Array<Record<string, unknown>> })
      .__postedMessages;
  });
}

/** Clear the posted-messages buffer (use between assertions). */
export async function clearPostedMessages(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __postedMessages: Array<Record<string, unknown>> })
      .__postedMessages.length = 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample tab snapshots that mirror what ResultsPanelService would produce
// ─────────────────────────────────────────────────────────────────────────────

export const TRACK_STATS_TAB = {
  id: 'tab-track-stats-1',
  title: 'Track Alpha — Stats',
  toolId: 'track-stats',
  displayHint: 'table' as const,
  tableData: [
    { metric: 'total distance nm', value: 12.5 },
    { metric: 'average speed kn', value: 8.3 },
    { metric: 'point count', value: 1247 },
    { metric: 'duration seconds', value: 18360 },
  ],
  isSaved: false,
};

// NOTE: The dataset `type` MUST be `range_bearing_series` — that's the
// transformer name registered in
// `shared/components/src/ChartRenderer/transformer/mappings/index.ts`.
// It expects `series: [{ name, data: [{ time, value }] }]` — the exact
// shape the real Python `range_bearing.py` tool emits.  Do NOT invent
// synthetic type names here; the webview's `transformDataset` call will
// return `{ ok: false, error: 'no transformer' }` and the chart tab
// will render empty.

export const RANGE_BEARING_RANGE_TAB = {
  id: 'tab-range-1',
  title: 'Range: track-1 → track-2',
  toolId: 'range-bearing',
  displayHint: 'chart' as const,
  datasetEnvelope: {
    type: 'range_bearing_series',
    title: 'Range: track-1 → track-2',
    displayHint: 'chart',
    metadata: {
      xAxis: { label: 'Time', type: 'temporal' },
      yAxis: { label: 'Range', type: 'quantitative', units: 'nm' },
    },
    series: [
      {
        name: 'track-1 → track-2',
        data: [
          { time: '2024-06-15T10:00:00Z', value: 12.3 },
          { time: '2024-06-15T10:05:00Z', value: 11.8 },
          { time: '2024-06-15T10:10:00Z', value: 10.9 },
          { time: '2024-06-15T10:15:00Z', value: 9.7 },
          { time: '2024-06-15T10:20:00Z', value: 8.5 },
          { time: '2024-06-15T10:25:00Z', value: 7.2 },
        ],
      },
    ],
  },
  isSaved: false,
};

export const RANGE_BEARING_BEARING_TAB = {
  id: 'tab-bearing-1',
  title: 'Bearing: track-1 → track-2',
  toolId: 'range-bearing',
  displayHint: 'chart' as const,
  datasetEnvelope: {
    type: 'range_bearing_series',
    title: 'Bearing: track-1 → track-2',
    displayHint: 'chart',
    metadata: {
      xAxis: { label: 'Time', type: 'temporal' },
      yAxis: { label: 'Bearing', type: 'quantitative', units: '°' },
    },
    series: [
      {
        name: 'track-1 → track-2',
        data: [
          { time: '2024-06-15T10:00:00Z', value: 45 },
          { time: '2024-06-15T10:05:00Z', value: 52 },
          { time: '2024-06-15T10:10:00Z', value: 61 },
          { time: '2024-06-15T10:15:00Z', value: 68 },
          { time: '2024-06-15T10:20:00Z', value: 74 },
          { time: '2024-06-15T10:25:00Z', value: 79 },
        ],
      },
    ],
  },
  isSaved: false,
};

export const ERROR_TAB = {
  id: 'tab-error-1',
  title: 'range-bearing — error',
  toolId: 'range-bearing',
  displayHint: 'table' as const,
  tableData: [],
  isSaved: false,
  errorMessage: 'Selection must contain at least two tracks',
};

export const SAVED_TAB = {
  ...TRACK_STATS_TAB,
  id: 'tab-saved-1',
  title: 'track-stats--2026-04-07.csv',
  isSaved: true,
};
