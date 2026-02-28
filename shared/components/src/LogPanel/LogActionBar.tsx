/**
 * LogActionBar component — action buttons + view/mode toggles.
 *
 * Actions: Tune, Revert to Here, Revert This, Snapshot, Rationale
 * All actions return "not available" in Phase 2.
 * Buttons disabled when no entry is selected.
 *
 * Feature: 072-log-panel (US6)
 */

import React from 'react';
import type { LogActionBarProps, ActionType, ViewMode, PresentationMode } from './types';
import { LOG_PANEL_STRINGS } from './strings';

// Feature 113: Tune button removed — replaced by flip-card edit face.
const ACTION_BUTTONS: Array<{ type: ActionType; label: string }> = [
  { type: 'revertTo', label: LOG_PANEL_STRINGS.actionRevertTo },
  { type: 'revertThis', label: LOG_PANEL_STRINGS.actionRevertThis },
  { type: 'snapshot', label: LOG_PANEL_STRINGS.actionSnapshot },
  { type: 'rationale', label: LOG_PANEL_STRINGS.actionRationale },
];

const VIEW_MODES: Array<{ value: ViewMode; label: string }> = [
  { value: 'timeline', label: LOG_PANEL_STRINGS.viewTimeline },
  { value: 'by-feature', label: LOG_PANEL_STRINGS.viewByFeature },
];

const PRESENTATION_MODES: Array<{ value: PresentationMode; label: string }> = [
  { value: 'compact', label: LOG_PANEL_STRINGS.modeCompact },
  { value: 'normal', label: LOG_PANEL_STRINGS.modeNormal },
  { value: 'detailed', label: LOG_PANEL_STRINGS.modeDetailed },
];

export function LogActionBar({
  selectedEntryId,
  viewMode,
  presentationMode,
  onActionInvoke,
  onViewModeChange,
  onPresentationModeChange,
  className,
}: LogActionBarProps): React.ReactElement {
  const hasSelection = selectedEntryId !== null;

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

      {/* View mode + presentation mode toggles */}
      <div className="log-panel__action-bar-toggles">
        {/* View mode toggle */}
        <div className="log-panel__toggle-group" data-testid="log-view-mode-toggle">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`log-panel__toggle-btn ${viewMode === mode.value ? 'log-panel__toggle-btn--active' : ''}`}
              onClick={() => onViewModeChange?.(mode.value)}
              data-testid={`log-view-mode-${mode.value}`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Presentation mode toggle */}
        <div className="log-panel__toggle-group" data-testid="log-presentation-mode-toggle">
          {PRESENTATION_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`log-panel__toggle-btn ${presentationMode === mode.value ? 'log-panel__toggle-btn--active' : ''}`}
              onClick={() => onPresentationModeChange?.(mode.value)}
              data-testid={`log-presentation-mode-${mode.value}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
