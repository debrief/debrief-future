/**
 * Results Panel Webview Entry Point
 *
 * Feature: 178-vscode-tabular-results (R5 — stateless webview)
 *
 * The extension host (`ResultsPanelService`) is the single source of
 * truth.  This webview receives `results:setTabs` messages, renders
 * the tab bar and the active tab's content via `TableRenderer` (for
 * `displayHint === 'table'`) or `ChartRenderer` (for charts), and
 * forwards user actions (save, retry, close) back to the host.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  TableRenderer,
  ChartRenderer,
  transformDataset,
  DEFAULT_RESULTS_PANEL_LABELS,
  type ChartRendererProps,
} from '@debrief/components';

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
// Message shapes (mirror apps/vscode/src/webview/messages.ts)
// ---------------------------------------------------------------------------

interface TabSnapshot {
  id: string;
  title: string;
  toolId: string;
  displayHint?: 'table' | 'chart';
  tableData?: Record<string, unknown>[];
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
// SaveAs inline form
// ---------------------------------------------------------------------------

function SaveAsForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (baseName: string, tag?: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [baseName, setBaseName] = useState('');
  const [tag, setTag] = useState('');
  const labels = DEFAULT_RESULTS_PANEL_LABELS;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        background: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
        borderBottom: '1px solid var(--vscode-panel-border, #454545)',
        fontSize: 12,
      }}
      role="form"
      aria-label={labels.saveResultAs}
    >
      <label htmlFor="save-as-name">{labels.nameLabel}</label>
      <input
        id="save-as-name"
        type="text"
        value={baseName}
        onChange={(e) => setBaseName(e.target.value)}
        maxLength={64}
        aria-label={labels.baseFilenameAriaLabel}
        style={{
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          padding: '2px 4px',
          width: 120,
        }}
      />
      <label htmlFor="save-as-tag">{labels.tagLabel}</label>
      <input
        id="save-as-tag"
        type="text"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        maxLength={32}
        aria-label={labels.optionalTagAriaLabel}
        style={{
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          padding: '2px 4px',
          width: 80,
        }}
      />
      <button
        type="button"
        disabled={!baseName.trim()}
        aria-label={labels.confirmSave}
        onClick={() => onSubmit(baseName.trim(), tag.trim() || undefined)}
      >
        {labels.ok}
      </button>
      <button
        type="button"
        aria-label={labels.cancelSave}
        onClick={onCancel}
      >
        {labels.cancel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Results Panel app
// ---------------------------------------------------------------------------

function ResultsPanelApp(): React.ReactElement {
  const [tabs, setTabs] = useState<TabSnapshot[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const labels = DEFAULT_RESULTS_PANEL_LABELS;

  useEffect(() => {
    const onMessage = (event: MessageEvent<IncomingMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'results:setTabs':
          setTabs(msg.payload.tabs);
          setActiveTabId(msg.payload.activeTabId);
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
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const chartSpec = useMemo<ChartRendererProps['spec'] | null>(() => {
    if (!activeTab || activeTab.displayHint !== 'chart') return null;
    const envelope = activeTab.datasetEnvelope;
    if (!envelope) return null;
    try {
      // `transformDataset` expects the DatasetEnvelope runtime shape.
      // We pass the raw envelope through as unknown — at runtime the
      // structure matches because the host sent it verbatim.
      return transformDataset(envelope as unknown as Parameters<typeof transformDataset>[0]);
    } catch {
      return null;
    }
  }, [activeTab]);

  const handleTabClick = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const handleTabClose = useCallback((id: string) => {
    vscode.postMessage({
      type: 'results:closeTab',
      payload: { tabId: id },
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!activeTabId) return;
    vscode.postMessage({
      type: 'results:save',
      payload: { tabId: activeTabId },
    });
  }, [activeTabId]);

  const handleSaveAsSubmit = useCallback(
    (baseName: string, tag?: string) => {
      if (!activeTabId) return;
      vscode.postMessage({
        type: 'results:saveAs',
        payload: { tabId: activeTabId, baseName, tag },
      });
      setShowSaveAs(false);
    },
    [activeTabId],
  );

  const handleRetry = useCallback(() => {
    if (!activeTabId) return;
    vscode.postMessage({
      type: 'results:retry',
      payload: { tabId: activeTabId },
    });
  }, [activeTabId]);

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
        }}
        data-testid="results-panel-empty"
      >
        {labels.noResults}
      </div>
    );
  }

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      data-testid="panel-chart"
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          flexShrink: 0,
          overflowX: 'auto',
          background: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
          borderBottom: '1px solid var(--vscode-panel-border, #454545)',
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-testid={`results-tab-${tab.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 12,
              color:
                tab.id === activeTabId
                  ? 'var(--vscode-tab-activeForeground, #ffffff)'
                  : 'var(--vscode-tab-inactiveForeground, #969696)',
              borderBottom:
                tab.id === activeTabId
                  ? '2px solid var(--vscode-focusBorder, #007fd4)'
                  : '2px solid transparent',
              background:
                tab.id === activeTabId
                  ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
                  : 'transparent',
            }}
            onClick={() => handleTabClick(tab.id)}
          >
            <span>{tab.title}</span>
            {tab.isSaved === false && !tab.errorMessage && !tab.isLoading && (
              <span
                data-testid="unsaved-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background:
                    'var(--vscode-editorWarning-foreground, #cca700)',
                  flexShrink: 0,
                }}
                title={labels.unsavedResult}
                aria-label={labels.unsavedResult}
              />
            )}
            <button
              type="button"
              aria-label={labels.closeTab(tab.title)}
              onClick={(e) => {
                e.stopPropagation();
                handleTabClose(tab.id);
              }}
              style={{
                padding: 0,
                width: 16,
                height: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--vscode-icon-foreground, #c5c5c5)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              &times;
            </button>
          </div>
        ))}

        {/* Save / Save As buttons */}
        {activeTab && !activeTab.errorMessage && !activeTab.isLoading && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 8px',
            }}
          >
            <button
              type="button"
              data-testid="results-save-button"
              disabled={activeTab.isSaved === true}
              onClick={handleSave}
              aria-label={labels.saveResult}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab.isSaved
                  ? 'var(--vscode-disabledForeground, #5a5a5a)'
                  : 'var(--vscode-foreground, #ccc)',
                cursor: activeTab.isSaved ? 'default' : 'pointer',
                padding: '2px 6px',
                fontSize: 12,
              }}
            >
              {labels.save}
            </button>
            <button
              type="button"
              data-testid="results-save-as-button"
              disabled={activeTab.isSaved === true}
              onClick={() => setShowSaveAs(true)}
              aria-label={labels.saveResultAs}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab.isSaved
                  ? 'var(--vscode-disabledForeground, #5a5a5a)'
                  : 'var(--vscode-foreground, #ccc)',
                cursor: activeTab.isSaved ? 'default' : 'pointer',
                padding: '2px 6px',
                fontSize: 12,
              }}
            >
              {labels.saveAs}
            </button>
          </div>
        )}

        {/* Retry button */}
        {activeTab?.errorMessage && (
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
            }}
          >
            <button
              type="button"
              data-testid="results-retry-button"
              onClick={handleRetry}
              aria-label={labels.retryToolExecution}
              style={{
                background: 'var(--vscode-button-background, #0e639c)',
                color: 'var(--vscode-button-foreground, #fff)',
                border: 'none',
                padding: '2px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {labels.retry}
            </button>
          </div>
        )}
      </div>

      {/* Save As inline form */}
      {showSaveAs && (
        <SaveAsForm
          onSubmit={handleSaveAsSubmit}
          onCancel={() => setShowSaveAs(false)}
        />
      )}

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>
        {activeTab?.errorMessage ? (
          <div
            role="alert"
            data-testid="results-error"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--vscode-errorForeground, #d32f2f)',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {labels.toolExecutionFailed}
            </div>
            <div style={{ fontSize: 12 }}>{activeTab.errorMessage}</div>
          </div>
        ) : activeTab?.isLoading ? (
          <div
            role="status"
            aria-label={labels.loadingResults}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--vscode-descriptionForeground, #969696)',
            }}
          >
            {labels.computingResults}
          </div>
        ) : activeTab && activeTab.displayHint === 'table' && activeTab.tableData ? (
          <TableRenderer data={activeTab.tableData} labels={labels} />
        ) : activeTab && chartSpec ? (
          <ChartRenderer spec={chartSpec} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--vscode-errorForeground, #d32f2f)',
            }}
          >
            {labels.unableToRender}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<ResultsPanelApp />);
}
