/**
 * Chart Panel wrapper — renders result artifacts (charts, tables, images, fallback)
 * in a GoldenLayout panel.
 *
 * Features: 096-add-goldenlayout-panels, 095-results-bottom-panel, 177-tabular-results-panel
 */

import { useState } from 'react';
import { usePanelContext } from './PanelContext';
import type { ChartTabData } from './PanelContext';
import type { ChartRendererProps } from '../ChartRenderer';
import { TableRenderer } from '../TableRenderer';

/** Format bytes into a human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Render content for the active tab based on its artifact type */
function TabContent({
  tab,
  chartSpec,
  ChartRenderer,
}: {
  tab: ChartTabData;
  chartSpec: ChartRendererProps['spec'];
  ChartRenderer: React.ComponentType<ChartRendererProps>;
}) {
  // Error state (Feature: 177)
  if (tab.errorMessage) {
    return null; // Handled by the parent with error overlay
  }

  // Loading state (Feature: 177)
  if (tab.isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--vscode-descriptionForeground, #969696)',
          opacity: 0.6,
        }}
        role="status"
        aria-label="Loading results"
      >
        Computing results…
      </div>
    );
  }

  // Table rendering (Feature: 177)
  if (tab.displayHint === 'table' && tab.tableData) {
    return <TableRenderer data={tab.tableData} />;
  }

  const type = tab.artifactType ?? 'dataset';

  if (type === 'image' && tab.imageDataUri) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 8 }}>
        <img
          src={tab.imageDataUri}
          alt={tab.title}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  if (type === 'other' && tab.fileMeta) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 8,
        color: 'var(--vscode-foreground, #cccccc)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{tab.fileMeta.filename}</div>
        <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground, #969696)' }}>
          {tab.fileMeta.mimeType} &middot; {formatFileSize(tab.fileMeta.sizeBytes)}
        </div>
      </div>
    );
  }

  // Default: dataset (chart)
  if (chartSpec) {
    return <ChartRenderer spec={chartSpec} className="web-shell__chart" />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-errorForeground, #d32f2f)' }}>
      Unable to render chart
    </div>
  );
}

/** Save As inline form (Feature: 177) */
function SaveAsForm({ onSubmit, onCancel }: {
  onSubmit: (baseName: string, tag?: string) => void;
  onCancel: () => void;
}) {
  const [baseName, setBaseName] = useState('');
  const [tag, setTag] = useState('');

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
      aria-label="Save results as"
    >
      <label htmlFor="save-as-name" style={{ color: 'var(--vscode-foreground, #ccc)' }}>Name:</label>
      <input
        id="save-as-name"
        type="text"
        value={baseName}
        onChange={e => setBaseName(e.target.value)}
        maxLength={64}
        style={{
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          padding: '2px 4px',
          fontSize: 12,
          width: 120,
        }}
        aria-label="Base filename"
      />
      <label htmlFor="save-as-tag" style={{ color: 'var(--vscode-foreground, #ccc)' }}>Tag:</label>
      <input
        id="save-as-tag"
        type="text"
        value={tag}
        onChange={e => setTag(e.target.value)}
        maxLength={32}
        style={{
          background: 'var(--vscode-input-background, #3c3c3c)',
          color: 'var(--vscode-input-foreground, #ccc)',
          border: '1px solid var(--vscode-input-border, #3c3c3c)',
          padding: '2px 4px',
          fontSize: 12,
          width: 80,
        }}
        aria-label="Optional tag"
      />
      <button
        type="button"
        disabled={!baseName.trim()}
        onClick={() => onSubmit(baseName.trim(), tag.trim() || undefined)}
        style={{
          background: 'var(--vscode-button-background, #0e639c)',
          color: 'var(--vscode-button-foreground, #fff)',
          border: 'none',
          padding: '2px 8px',
          fontSize: 12,
          cursor: baseName.trim() ? 'pointer' : 'default',
          opacity: baseName.trim() ? 1 : 0.5,
        }}
        aria-label="Confirm save"
      >
        OK
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: 'transparent',
          color: 'var(--vscode-foreground, #ccc)',
          border: 'none',
          padding: '2px 8px',
          fontSize: 12,
          cursor: 'pointer',
        }}
        aria-label="Cancel save"
      >
        Cancel
      </button>
    </div>
  );
}

export function ChartPanelWrapper() {
  const ctx = usePanelContext();
  const [showSaveAs, setShowSaveAs] = useState(false);

  if (!ctx.chartProps) {
    return (
      <div style={{ padding: 16, color: '#969696', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} data-testid="panel-chart">
        No results to display. Run a tool or open a file from the Navigation panel.
      </div>
    );
  }

  const { chartSpec, chartTabs, activeChartTabId, onChartTabSelect, onChartTabClose, onSave, onSaveAs, onRetry } = ctx.chartProps;
  const { ChartRenderer } = ctx.components;
  const activeTab = chartTabs.find(t => t.id === activeChartTabId);

  const handleSaveAs = (baseName: string, tag?: string) => {
    if (activeChartTabId && onSaveAs) {
      onSaveAs(activeChartTabId, baseName, tag);
    }
    setShowSaveAs(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="panel-chart">
      {/* Tab bar */}
      {chartTabs.length > 0 && (
        <div style={{
          display: 'flex',
          flexShrink: 0,
          overflowX: 'auto',
          background: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
          borderBottom: '1px solid var(--vscode-panel-border, #454545)',
        }}>
          {chartTabs.map(tab => (
            <div
              key={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: tab.id === activeChartTabId
                  ? 'var(--vscode-tab-activeForeground, #ffffff)'
                  : 'var(--vscode-tab-inactiveForeground, #969696)',
                borderBottom: tab.id === activeChartTabId
                  ? '2px solid var(--vscode-focusBorder, #007fd4)'
                  : '2px solid transparent',
                background: tab.id === activeChartTabId
                  ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
                  : 'transparent',
              }}
              onClick={() => onChartTabSelect(tab.id)}
            >
              <span>{tab.title}</span>
              {/* Unsaved indicator (Feature: 177) */}
              {tab.isSaved === false && !tab.errorMessage && !tab.isLoading && (
                <span
                  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--vscode-editorWarning-foreground, #cca700)', flexShrink: 0 }}
                  title="Unsaved"
                  aria-label="Unsaved result"
                />
              )}
              <button
                type="button"
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
                onClick={(e) => { e.stopPropagation(); onChartTabClose(tab.id); }}
                aria-label={`Close ${tab.title}`}
              >
                &times;
              </button>
            </div>
          ))}

          {/* Save buttons (Feature: 177) — shown when active tab is saveable */}
          {activeTab && !activeTab.errorMessage && !activeTab.isLoading && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
              <button
                type="button"
                disabled={activeTab.isSaved === true}
                onClick={() => activeChartTabId && onSave?.(activeChartTabId)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeTab.isSaved ? 'var(--vscode-disabledForeground, #5a5a5a)' : 'var(--vscode-foreground, #ccc)',
                  fontSize: 12,
                  cursor: activeTab.isSaved ? 'default' : 'pointer',
                  padding: '2px 6px',
                }}
                aria-label="Save result"
              >
                Save
              </button>
              <button
                type="button"
                disabled={activeTab.isSaved === true}
                onClick={() => setShowSaveAs(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeTab.isSaved ? 'var(--vscode-disabledForeground, #5a5a5a)' : 'var(--vscode-foreground, #ccc)',
                  fontSize: 12,
                  cursor: activeTab.isSaved ? 'default' : 'pointer',
                  padding: '2px 6px',
                }}
                aria-label="Save result as"
              >
                Save As…
              </button>
            </div>
          )}

          {/* Retry button for error state (Feature: 177) */}
          {activeTab?.errorMessage && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
              <button
                type="button"
                onClick={() => activeChartTabId && onRetry?.(activeChartTabId)}
                style={{
                  background: 'var(--vscode-button-background, #0e639c)',
                  color: 'var(--vscode-button-foreground, #fff)',
                  border: 'none',
                  padding: '2px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                aria-label="Retry tool execution"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save As form (Feature: 177) */}
      {showSaveAs && (
        <SaveAsForm onSubmit={handleSaveAs} onCancel={() => setShowSaveAs(false)} />
      )}

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>
        {activeTab?.errorMessage ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--vscode-errorForeground, #d32f2f)',
              flexDirection: 'column',
              gap: 8,
            }}
            role="alert"
            data-testid="panel-chart-error"
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>Tool execution failed</div>
            <div style={{ fontSize: 12 }}>{activeTab.errorMessage}</div>
          </div>
        ) : activeTab ? (
          <TabContent tab={activeTab} chartSpec={chartSpec} ChartRenderer={ChartRenderer} />
        ) : chartTabs.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-errorForeground, #d32f2f)' }}>
            Unable to render chart
          </div>
        ) : null}
      </div>
    </div>
  );
}
