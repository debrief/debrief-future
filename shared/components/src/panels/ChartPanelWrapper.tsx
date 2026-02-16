/**
 * Chart Panel wrapper — renders result artifacts (charts, images, fallback)
 * in a GoldenLayout panel.
 *
 * Features: 096-add-goldenlayout-panels, 095-results-bottom-panel
 */

import { usePanelContext } from './PanelContext';
import type { ChartTabData } from './PanelContext';
import type { ChartRendererProps } from '../ChartRenderer';

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

export function ChartPanelWrapper() {
  const ctx = usePanelContext();

  if (!ctx.chartProps) {
    return (
      <div style={{ padding: 16, color: '#969696', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} data-testid="panel-chart">
        No results to display. Run a tool or open a file from the Navigation panel.
      </div>
    );
  }

  const { chartSpec, chartTabs, activeChartTabId, onChartTabSelect, onChartTabClose } = ctx.chartProps;
  const { ChartRenderer } = ctx.components;
  const activeTab = chartTabs.find(t => t.id === activeChartTabId);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-testid="panel-chart">
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
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>
        {activeTab ? (
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
