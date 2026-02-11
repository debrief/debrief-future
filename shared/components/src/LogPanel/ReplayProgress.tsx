/**
 * ReplayProgress component — shows replay operation progress.
 *
 * Displays phase label, progress bar, current tool name, and cancel button.
 * Supports three phases: loading-snapshot (indeterminate), replaying, finalising.
 *
 * Feature: 076-replay-tune (Phase 3)
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';
import './ReplayProgress.css';

export interface ReplayProgressProps {
  current: number;
  total: number;
  currentToolId: string;
  phase: 'loading-snapshot' | 'replaying' | 'finalising';
  onCancel: () => void;
}

export function ReplayProgress({
  current,
  total,
  currentToolId,
  phase,
  onCancel,
}: ReplayProgressProps): React.ReactElement {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isIndeterminate = phase === 'loading-snapshot';

  const phaseLabel = (() => {
    switch (phase) {
      case 'loading-snapshot':
        return LOG_PANEL_STRINGS.replayProgressLoading;
      case 'replaying':
        return LOG_PANEL_STRINGS.replayProgressReplaying(current, total);
      case 'finalising':
        return LOG_PANEL_STRINGS.replayProgressFinalising;
      default:
        return '';
    }
  })();

  return (
    <div className="log-panel__replay-progress" data-testid="replay-progress">
      <div className="log-panel__replay-progress-header">
        <span className="log-panel__replay-progress-phase">{phaseLabel}</span>
        <button
          className="log-panel__replay-progress-cancel"
          onClick={onCancel}
          data-testid="replay-progress-cancel"
          title={LOG_PANEL_STRINGS.replayCancel}
        >
          {LOG_PANEL_STRINGS.replayCancel}
        </button>
      </div>

      <div className="log-panel__replay-progress-bar-track">
        <div
          className={[
            'log-panel__replay-progress-bar-fill',
            isIndeterminate ? 'log-panel__replay-progress-bar-fill--indeterminate' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={isIndeterminate ? undefined : { width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {currentToolId && (
        <div className="log-panel__replay-progress-tool">
          {currentToolId}
        </div>
      )}
    </div>
  );
}
