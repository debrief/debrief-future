/**
 * LogActionBar component — action buttons + unified 4-tab view mode.
 *
 * Actions: Revert to Here, Revert This, Snapshot, Rationale
 * All actions return "not available" in Phase 2.
 * Buttons disabled when no entry is selected.
 *
 * Feature: 072-log-panel (US6)
 * Updated: 176-log-panel-ux (unified 4-tab ViewMode, ARIA tablist,
 *                            roving tabIndex + ←/→/Home/End keyboard nav)
 */

import React, { useRef } from 'react';
import type { LogActionBarProps, ActionType, ViewMode } from './types';
import { LOG_PANEL_STRINGS } from './strings';

const ACTION_BUTTONS: Array<{ type: ActionType; label: string }> = [
  { type: 'revertTo', label: LOG_PANEL_STRINGS.actionRevertTo },
  { type: 'revertThis', label: LOG_PANEL_STRINGS.actionRevertThis },
  { type: 'snapshot', label: LOG_PANEL_STRINGS.actionSnapshot },
  { type: 'rationale', label: LOG_PANEL_STRINGS.actionRationale },
];

const VIEW_MODES: Array<{ value: ViewMode; label: string }> = [
  { value: 'timeline', label: LOG_PANEL_STRINGS.viewTimeline },
  { value: 'by-feature', label: LOG_PANEL_STRINGS.viewByFeature },
  { value: 'compact', label: LOG_PANEL_STRINGS.viewCompact },
  { value: 'detailed', label: LOG_PANEL_STRINGS.viewDetailed },
];

export function LogActionBar({
  selectedEntryId,
  viewMode,
  onActionInvoke,
  onViewModeChange,
  className,
}: LogActionBarProps): React.ReactElement {
  const hasSelection = selectedEntryId !== null;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const btn = tabRefs.current[index];
    if (btn) {
      btn.focus();
      onViewModeChange?.(VIEW_MODES[index]!.value);
    }
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        const next = (index - 1 + VIEW_MODES.length) % VIEW_MODES.length;
        focusTab(next);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const next = (index + 1) % VIEW_MODES.length;
        focusTab(next);
        break;
      }
      case 'Home': {
        e.preventDefault();
        focusTab(0);
        break;
      }
      case 'End': {
        e.preventDefault();
        focusTab(VIEW_MODES.length - 1);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className={`log-panel__action-bar ${className ?? ''}`} data-testid="log-action-bar">
      {/* Action buttons */}
      <div className="log-panel__action-bar-actions">
        {ACTION_BUTTONS.map((btn) => (
          <button
            key={btn.type}
            className="log-panel__action-btn"
            disabled={!hasSelection}
            onClick={() => {
              if (hasSelection && selectedEntryId) {
                onActionInvoke?.(btn.type, selectedEntryId);
              }
            }}
            data-testid={`log-action-${btn.type}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Unified 4-tab view mode with ARIA tablist + roving tabIndex */}
      <div className="log-panel__action-bar-toggles">
        <div
          className="log-panel__toggle-group"
          role="tablist"
          aria-label="Log view mode"
          data-testid="log-view-mode-toggle"
        >
          {VIEW_MODES.map((mode, index) => {
            const isActive = viewMode === mode.value;
            return (
              <button
                key={mode.value}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                className={`log-panel__toggle-btn ${isActive ? 'log-panel__toggle-btn--active' : ''}`}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onViewModeChange?.(mode.value)}
                onKeyDown={handleKeyDown(index)}
                data-testid={`log-view-mode-${mode.value}`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
