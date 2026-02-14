/**
 * ResultsPanel — container component with tab bar and content area.
 *
 * Manages display of multiple result tabs. Each tab shows a chart,
 * image, or fallback summary depending on artifact type.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { ResultsPanelProps } from './types';
import { ResultTabBar } from './ResultTabBar';
import { ResultTabContent } from './ResultTabContent';

export function ResultsPanel({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenExternal,
}: ResultsPanelProps): React.ReactElement {
  // Empty state
  if (tabs.length === 0) {
    return (
      <div
        data-testid="results-panel-empty"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--debrief-text-secondary, var(--vscode-descriptionForeground, #888))',
          fontStyle: 'italic',
          padding: '16px',
          textAlign: 'center',
        }}
      >
        No results to display. Run a tool to see results here.
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      data-testid="results-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <ResultTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        onCloseTab={onCloseTab}
      />
      <div
        data-testid="results-panel-content"
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {activeTab ? (
          <ResultTabContent
            content={activeTab.content}
            onOpenExternal={
              onOpenExternal ? () => onOpenExternal(activeTab.id) : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}
