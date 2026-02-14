/**
 * Chart Panel wrapper — renders ChartRenderer in a GoldenLayout panel.
 */

import type { PanelProps } from '../PanelWorkspace/panelRegistry';
import { usePanelContext } from './PanelContext';

export function ChartPanelWrapper(_props: PanelProps) {
  const ctx = usePanelContext();

  if (!ctx.chartProps) {
    return (
      <div style={{ padding: 16, color: '#969696', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} data-testid="panel-chart">
        No chart data. Open a .dataset.json file from the Navigation panel.
      </div>
    );
  }

  const { chartSpec, chartTabs, activeChartTabId, onChartTabSelect, onChartTabClose } = ctx.chartProps;
  const { ChartRenderer } = ctx.components;

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
        {chartSpec && <ChartRenderer spec={chartSpec} className="web-shell__chart" />}
        {!chartSpec && chartTabs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-errorForeground, #d32f2f)' }}>
            Unable to render chart
          </div>
        )}
      </div>
    </div>
  );
}
