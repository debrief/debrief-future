/**
 * LogEntry component — renders a single timeline entry.
 *
 * Supports three presentation modes:
 * - Compact: tool name + primary feature name
 * - Normal: + parameters, change summary
 * - Detailed: + timestamp, duration, attachment info
 *
 * Feature: 072-log-panel
 */

import React from 'react';
import type { LogEntryProps } from './types';
import { resolveFeatureDisplay, getAffectedFeatureIds, formatDuration, formatTimestamp } from './utils';
import { LOG_PANEL_STRINGS } from './strings';
import './LogPanel.css';

export function LogEntry({
  entry,
  featureNames,
  presentationMode,
  isSelected,
  onClick,
  className,
}: LogEntryProps): React.ReactElement {
  const affectedIds = getAffectedFeatureIds(entry);
  const features = affectedIds.map((id) => resolveFeatureDisplay(id, featureNames));
  const primaryFeature = features[0];

  const handleClick = () => {
    onClick?.(entry);
  };

  const entryClass = [
    'log-panel__entry',
    isSelected ? 'log-panel__entry--selected' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={entryClass}
      onClick={handleClick}
      data-testid={`log-entry-${entry.activityId}`}
      data-activity-id={entry.activityId}
      title={LOG_PANEL_STRINGS.toolVersionTooltip(entry.toolVersion)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header: tool name + primary feature (all modes) */}
      <div className="log-panel__entry-header">
        <span className="log-panel__entry-tool">{entry.toolName}</span>
        {primaryFeature && (
          <span
            className={`log-panel__entry-feature ${!primaryFeature.exists ? 'log-panel__entry-deleted' : ''}`}
          >
            {primaryFeature.displayName}
            {features.length > 1 && ` +${features.length - 1}`}
          </span>
        )}
      </div>

      {/* Normal mode: parameters */}
      {(presentationMode === 'normal' || presentationMode === 'detailed') &&
        Object.keys(entry.parameters).length > 0 && (
          <div className="log-panel__entry-params">
            {Object.entries(entry.parameters)
              .filter(([, param]) => !param.default)
              .slice(0, 3)
              .map(([key, param]) => (
                <div key={key} className="log-panel__entry-param">
                  <span className="log-panel__entry-param-key">{key}:</span>
                  <span className="log-panel__entry-param-value">
                    {String(param.value)}
                  </span>
                </div>
              ))}
          </div>
        )}

      {/* Detailed mode: timestamp, duration */}
      {presentationMode === 'detailed' && (
        <div className="log-panel__entry-details">
          <div className="log-panel__entry-detail">
            <span className="log-panel__entry-detail-label">
              {LOG_PANEL_STRINGS.timestampLabel}:
            </span>
            <span>{formatTimestamp(entry.timestamp)}</span>
          </div>
          <div className="log-panel__entry-detail">
            <span className="log-panel__entry-detail-label">
              {LOG_PANEL_STRINGS.durationLabel}:
            </span>
            <span>{formatDuration(entry.executionDuration)}</span>
          </div>
          {entry.generatedResultId && (
            <div className="log-panel__entry-detail">
              <span className="log-panel__entry-detail-label">Result:</span>
              <span>{entry.generatedResultId}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
