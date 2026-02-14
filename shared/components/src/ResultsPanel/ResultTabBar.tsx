/**
 * ResultTabBar — horizontal tab strip with tab titles, close buttons,
 * active indicator, and overflow scroll.
 *
 * Feature: 095-results-bottom-panel
 */

import React from 'react';
import type { ResultTabBarProps } from './types';

export function ResultTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: ResultTabBarProps): React.ReactElement {
  return (
    <div
      data-testid="results-tab-bar"
      role="tablist"
      style={{
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'auto',
        overflowY: 'hidden',
        borderBottom: '1px solid var(--debrief-border-color, var(--vscode-panel-border, #333))',
        minHeight: '28px',
        flexShrink: 0,
        scrollbarWidth: 'thin',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const displayTitle = tab.showPlotPrefix
          ? `${tab.title} — ${tab.plotTitle}`
          : tab.title;
        const fullTitle = tab.showPlotPrefix
          ? `${tab.title} — ${tab.plotTitle}`
          : tab.title;

        return (
          <div
            key={tab.id}
            data-testid={`results-tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            title={fullTitle}
            onClick={() => onSelectTab?.(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '12px',
              borderBottom: isActive
                ? '2px solid var(--debrief-accent, var(--vscode-focusBorder, #007acc))'
                : '2px solid transparent',
              background: isActive
                ? 'var(--debrief-bg-secondary, var(--vscode-input-background, #252526))'
                : 'transparent',
              color: isActive
                ? 'var(--debrief-text-primary, var(--vscode-foreground, #ccc))'
                : 'var(--debrief-text-secondary, var(--vscode-descriptionForeground, #888))',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayTitle}
            </span>
            <button
              data-testid={`results-tab-close-${tab.id}`}
              aria-label={`Close ${displayTitle}`}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab?.(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '14px',
                lineHeight: 1,
                opacity: 0.6,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.opacity = '0.6';
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
