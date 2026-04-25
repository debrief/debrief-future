/**
 * Results Panel Webview Entry Point
 *
 * Feature: 178-vscode-tabular-results (R5 — stateless webview)
 *
 * Renders `@debrief/components` `<ChartPanelWrapper />` inside a
 * `<PanelContextProvider>` — the exact same component the web-shell
 * uses.  This avoids forking any rendering logic (FR-025 / SC-006).
 *
 * The extension host (`ResultsPanelService`) is the single source of
 * truth.  This webview:
 *   1. Receives `results:setTabs` / `results:setVisibility` /
 *      `results:setLoading` messages from the host.
 *   2. Translates the snapshot list into `ChartTabData[]` + computes
 *      the Vega-Lite `chartSpec` for the active chart tab via
 *      `transformDataset`.
 *   3. Forwards user actions (`onChartTabSelect`, `onChartTabClose`,
 *      `onSave`, `onSaveAs`, `onRetry`) back to the host as the
 *      corresponding `results:*` messages.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ChartPanelWrapper,
  ChartRenderer,
  PanelContextProvider,
  transformDataset,
  type ChartContextProps,
  type ChartTabData,
  type PanelContextValue,
  type ChartRendererProps,
} from '@debrief/components';
import { Bootstrap } from './_bootstrap';

// ---------------------------------------------------------------------------
// VS Code API handle
// ---------------------------------------------------------------------------

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;
const vscode = acquireVsCodeApi();

// ---------------------------------------------------------------------------
// Host → webview message shapes (mirror apps/vscode/src/webview/messages.ts)
// ---------------------------------------------------------------------------

interface TabSnapshot {
  id: string;
  title: string;
  toolId: string;
  displayHint?: 'table' | 'chart';
  /** Flat table rows when displayHint === 'table'. */
  tableData?: Record<string, unknown>[];
  /** Full DatasetEnvelope when displayHint === 'chart'. */
  datasetEnvelope?: Record<string, unknown>;
  isSaved?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
}

interface SetTabsMessage {
  type: 'results:setTabs';
  payload: {
    tabs: TabSnapshot[];
    activeTabId: string | null;
  };
}

interface SetVisibilityMessage {
  type: 'results:setVisibility';
  payload: { visible: boolean };
}

interface SetLoadingMessage {
  type: 'results:setLoading';
  payload: { tabId: string; isLoading: boolean };
}

type IncomingMessage =
  | SetTabsMessage
  | SetVisibilityMessage
  | SetLoadingMessage;

// ---------------------------------------------------------------------------
// Stub components for the rest of PanelContext that ChartPanelWrapper
// does not touch (but the context type still requires).
// ---------------------------------------------------------------------------

const StubComponent: React.ComponentType<unknown> = () => null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a TabSnapshot to the `ChartTabData` shape the shared
 * `ChartPanelWrapper` consumes.  Both tables and charts live in this
 * list; the wrapper routes on `displayHint`.
 */
function snapshotToChartTabData(snapshot: TabSnapshot): ChartTabData {
  return {
    id: snapshot.id,
    title: snapshot.title,
    artifactType: 'dataset',
    displayHint: snapshot.displayHint,
    tableData: snapshot.tableData,
    isSaved: snapshot.isSaved,
    isLoading: snapshot.isLoading,
    errorMessage: snapshot.errorMessage,
  };
}

/**
 * Compute the Vega-Lite spec for the active tab.  Returns `null` for
 * non-chart tabs, for empty datasets, or when no registered
 * transformer handles the envelope's `type`.
 */
function computeChartSpec(
  snapshot: TabSnapshot | null,
): ChartRendererProps['spec'] | null {
  // Only skip if the tab is explicitly marked as a table — the default
  // (undefined displayHint) is treated as a chart, which matches the
  // Python tool convention: range-bearing and other dataset tools emit
  // DatasetEnvelopes WITHOUT a displayHint field and expect chart
  // rendering by default.  Previously this check was
  // `displayHint !== 'chart'` which rejected undefined and caused the
  // "Unable to render chart" error the user reported.
  if (!snapshot || snapshot.displayHint === 'table') return null;
  const envelope = snapshot.datasetEnvelope;
  if (!envelope) return null;
  try {
    const result = transformDataset(envelope as unknown as Parameters<typeof transformDataset>[0]);
    return result.ok ? result.spec : null;
  } catch (err) {
    console.error('[debrief/results] transformDataset threw:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main Results Panel app
// ---------------------------------------------------------------------------

function ResultsPanelApp(): React.ReactElement {
  const [tabs, setTabs] = useState<TabSnapshot[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Test instrumentation (Feature 178): record all incoming messages
    // on `window.__debriefResultsMessages` so E2E tests can verify that
    // the real host → webview messaging path is delivering data.  This
    // is the *only* place we check whether the panel is actually
    // getting the messages it needs — without it, a silent failure
    // looks identical to a working panel from the outside.
    interface TestWindow {
      __debriefResultsMessages?: unknown[];
      __debriefResultsReadySent?: boolean;
      __debriefResultsState?: {
        visible: boolean;
        tabCount: number;
        activeTabId: string | null;
      };
    }
    const testWin = window as unknown as TestWindow;
    if (!testWin.__debriefResultsMessages) {
      testWin.__debriefResultsMessages = [];
    }

    const onMessage = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      // Record every message the webview receives (including ones we
      // don't recognise), so diagnostics can tell the difference
      // between "message delivered but we ignored it" and "message
      // never arrived at all".
      testWin.__debriefResultsMessages!.push({
        type: (msg as { type?: unknown })?.type ?? '(no-type)',
        raw: msg,
      });
      switch (msg.type) {
        case 'results:setTabs':
          setTabs(msg.payload.tabs);
          setActiveTabId(msg.payload.activeTabId);
          testWin.__debriefResultsState = {
            visible: true,
            tabCount: msg.payload.tabs.length,
            activeTabId: msg.payload.activeTabId,
          };
          break;
        case 'results:setVisibility':
          setVisible(msg.payload.visible);
          break;
        case 'results:setLoading':
          setTabs((prev) =>
            prev.map((t) =>
              t.id === msg.payload.tabId
                ? { ...t, isLoading: msg.payload.isLoading }
                : t,
            ),
          );
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'results:webviewReady' });
    testWin.__debriefResultsReadySent = true;
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Track-local active tab id so clicking a tab updates the highlight
  // without round-tripping through the host.  The host is still the
  // source of truth for the tab LIST — this is pure UI state.
  const handleChartTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleChartTabClose = useCallback((tabId: string) => {
    vscode.postMessage({
      type: 'results:closeTab',
      payload: { tabId },
    });
  }, []);

  const handleSave = useCallback((tabId: string) => {
    vscode.postMessage({
      type: 'results:save',
      payload: { tabId },
    });
  }, []);

  const handleSaveAs = useCallback(
    (tabId: string, baseName: string, tag?: string) => {
      vscode.postMessage({
        type: 'results:saveAs',
        payload: { tabId, baseName, tag },
      });
    },
    [],
  );

  const handleRetry = useCallback((tabId: string) => {
    vscode.postMessage({
      type: 'results:retry',
      payload: { tabId },
    });
  }, []);

  const activeTabSnapshot = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const chartSpec = useMemo(
    () => computeChartSpec(activeTabSnapshot),
    [activeTabSnapshot],
  );

  const chartTabs: ChartTabData[] = useMemo(
    () => tabs.map(snapshotToChartTabData),
    [tabs],
  );

  // Build the PanelContext value.  ChartPanelWrapper only reads
  // `ctx.chartProps` and `ctx.components.ChartRenderer` — the other
  // component slots get no-op stubs to satisfy the required type.
  const panelContextValue: PanelContextValue = useMemo(() => {
    const chartProps: ChartContextProps = {
      chartSpec,
      chartTabs,
      activeChartTabId: activeTabId,
      onChartTabSelect: handleChartTabSelect,
      onChartTabClose: handleChartTabClose,
      onSave: handleSave,
      onSaveAs: handleSaveAs,
      onRetry: handleRetry,
    };
    return {
      components: {
        ActivityPanel: StubComponent as PanelContextValue['components']['ActivityPanel'],
        MapView: StubComponent as PanelContextValue['components']['MapView'],
        LogPanel: StubComponent as PanelContextValue['components']['LogPanel'],
        StacFileTree: StubComponent as PanelContextValue['components']['StacFileTree'],
        ChartRenderer,
      },
      activityPanelProps: null,
      mapViewProps: null,
      logPanelProps: null,
      stacFileTreeProps: null,
      chartProps,
    };
  }, [
    chartSpec,
    chartTabs,
    activeTabId,
    handleChartTabSelect,
    handleChartTabClose,
    handleSave,
    handleSaveAs,
    handleRetry,
  ]);

  // Empty placeholder when the host has not yet announced visibility
  // or no tabs exist.  Using the same `data-testid` the harness E2E
  // tests look for.
  if (!visible || tabs.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          color: 'var(--vscode-descriptionForeground, #969696)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          fontSize: 12,
        }}
        data-testid="results-panel-empty"
      >
        No results to display. Run a tool or open a file from the Navigation panel.
      </div>
    );
  }

  return (
    <PanelContextProvider value={panelContextValue}>
      <ChartPanelWrapper />
    </PanelContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <Bootstrap>
      <ResultsPanelApp />
    </Bootstrap>
  );
}
