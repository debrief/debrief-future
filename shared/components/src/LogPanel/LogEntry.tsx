/**
 * LogEntry component — renders a single timeline entry as a rich card.
 *
 * Card anatomy (Feature 176):
 * - Row 1 (Header): step + category icon + tool name + rationale icon
 * - Row 2 (Meta): track badges + timestamp + duration
 * - Row 3 (Params): type-aware parameter chips (hidden in compact mode)
 *
 * Feature: 072-log-panel
 * Updated: 113-prov-card-flip (flip-card edit face)
 * Updated: 176-log-panel-ux (rich card anatomy, unified ViewMode)
 */

import React, { useCallback, useMemo } from 'react';
import type { LogEntryProps, ParamChipData } from './types';
import { resolveFeatureDisplay, getAffectedFeatureIds, formatDuration, formatTimestamp } from './utils';
import { inferParamType } from './paramTypeInference';
import { LOG_PANEL_STRINGS } from './strings';
import { ToolCategoryIcon } from './ToolCategoryIcon';
import { ParameterChip } from './ParameterChip';
import { TrackBadge } from './TrackBadge';
import { CardFlip } from './CardFlip';
import { EditFace } from './EditFace';
import './LogPanel.css';
import './ParameterEditor.css';
import './CardFlip.css';
import './EditFace.css';

export function LogEntry({
  entry,
  featureNames,
  viewMode,
  isSelected,
  onClick,
  // onTuneClick is kept in props for API compat but not used by rich card layout
  onRestoreClick,
  isEditing = false,
  onEditClick,
  onDoneClick,
  schema,
  schemaLoading = false,
  schemaError,
  onParameterChange,
  onDisableToggle,
  onDeleteClick,
  onRationaleChange,
  onRetrySchema,
  rationaleRef,
  replayStatus = 'idle',
  stepIndex,
  className,
}: LogEntryProps): React.ReactElement {
  const affectedIds = getAffectedFeatureIds(entry);
  const features = affectedIds.map((id) => resolveFeatureDisplay(id, featureNames));

  // Build parameter chips with inferred types
  const chips: ParamChipData[] = useMemo(() => {
    return Object.entries(entry.parameters)
      .filter(([, param]) => !param.default)
      .slice(0, 5)
      .map(([key, param]) => {
        // Find matching schema entry if available
        const schemaEntry = schema?.find((s) => s.name === key) ?? null;
        return {
          name: key,
          value: param.value,
          paramType: inferParamType(key, param.value, schemaEntry),
          isDefault: param.default === true,
          unit: null,
        };
      });
  }, [entry.parameters, schema]);

  const handleClick = () => {
    onClick?.(entry);
  };

  const handleEditIconClick = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (!entry.deleted) {
        onEditClick?.(entry);
      }
    },
    [entry, onEditClick]
  );

  const handleEditIconKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEditIconClick(e);
      }
    },
    [handleEditIconClick]
  );

  const entryClass = [
    'log-panel__entry',
    isSelected ? 'log-panel__entry--selected' : '',
    entry.deleted ? 'log-panel__entry--deleted' : '',
    entry.disabled ? 'log-panel__entry--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const showParams = viewMode !== 'compact';
  const showDetails = viewMode === 'detailed';

  // Front face — the read-only rich card
  const frontFace = (
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
      {/* Row 1: Header — step + icon + tool name + rationale + badges + edit icon */}
      <div className="log-panel__entry-header">
        {stepIndex != null && (
          <span className="log-panel__entry-step">{stepIndex}</span>
        )}
        <ToolCategoryIcon toolName={entry.toolName} size={18} />
        <span className="log-panel__entry-tool">{entry.toolName}</span>
        {entry.rationale && (
          <span
            className="log-panel__entry-rationale-icon"
            title={LOG_PANEL_STRINGS.rationaleTooltip(entry.rationale)}
            aria-label="Has rationale"
            data-testid="rationale-icon"
          >
            {'\uD83D\uDCAC'}
          </span>
        )}
        {entry.tuneAnnotation && (
          <span className="log-panel__entry-badge log-panel__entry-badge--tuned" data-testid="badge-tuned">
            {LOG_PANEL_STRINGS.tunedEntryBadge}
          </span>
        )}
        {entry.deleted && (
          <span className="log-panel__entry-badge log-panel__entry-badge--deleted" data-testid="badge-deleted">
            {LOG_PANEL_STRINGS.deletedEntryBadge}
          </span>
        )}
        {entry.disabled && !entry.deleted && (
          <span className="log-panel__entry-badge log-panel__entry-badge--disabled" data-testid="badge-disabled">
            {LOG_PANEL_STRINGS.disabledEntryBadge}
          </span>
        )}

        {/* Edit (pencil) icon — only on non-deleted entries */}
        {!entry.deleted && onEditClick && (
          <span
            className="log-panel__entry-edit-icon"
            role="button"
            tabIndex={0}
            onClick={handleEditIconClick}
            onKeyDown={handleEditIconKeyDown}
            data-testid={`edit-icon-${entry.activityId}`}
            title={LOG_PANEL_STRINGS.editIconTooltip}
            aria-label={LOG_PANEL_STRINGS.editIconTooltip}
          >
            &#x270E;
          </span>
        )}
      </div>

      {/* Row 2: Meta — track badges + timestamp + duration */}
      <div className="log-panel__entry-meta">
        <div className="log-panel__entry-badges">
          {features.map((f) => (
            <TrackBadge key={f.featureId} name={f.displayName} exists={f.exists} />
          ))}
        </div>
        <span className="log-panel__entry-timestamp">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className="log-panel__entry-duration">
          {formatDuration(entry.executionDuration)}
        </span>
      </div>

      {/* Row 3: Parameter chips (hidden in compact mode) */}
      {showParams && chips.length > 0 && (
        <div className="log-panel__entry-chips" data-testid="param-chips">
          {chips.map((chip) => (
            <ParameterChip key={chip.name} chip={chip} />
          ))}
        </div>
      )}

      {/* Detailed mode: extended feature lists */}
      {showDetails && (
        <div className="log-panel__entry-details">
          {entry.usedFeatureIds.length > 0 && (
            <div className="log-panel__entry-detail">
              <span className="log-panel__entry-detail-label">Used:</span>
              <span>{entry.usedFeatureIds.map((id) => featureNames[id] ?? id).join(', ')}</span>
            </div>
          )}
          {entry.generatedFeatureIds.length > 0 && (
            <div className="log-panel__entry-detail">
              <span className="log-panel__entry-detail-label">Generated:</span>
              <span>{entry.generatedFeatureIds.map((id) => featureNames[id] ?? id).join(', ')}</span>
            </div>
          )}
          {entry.generatedResultId && (
            <div className="log-panel__entry-detail">
              <span className="log-panel__entry-detail-label">Result:</span>
              <span>{entry.generatedResultId}</span>
            </div>
          )}
        </div>
      )}

      {/* Restore button for deleted entries */}
      {entry.deleted && onRestoreClick && (
        <div className="log-panel__entry-restore">
          <button
            className="log-panel__entry-restore-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRestoreClick(entry);
            }}
            data-testid={`restore-entry-${entry.activityId}`}
          >
            {LOG_PANEL_STRINGS.restoreLabel}
          </button>
        </div>
      )}
    </div>
  );

  // Back face — the edit face (only rendered when flip-card props are provided)
  const backFace = onEditClick ? (
    <EditFace
      entry={entry}
      schema={schema ?? null}
      schemaLoading={schemaLoading}
      schemaError={schemaError ?? null}
      replayStatus={replayStatus}
      onParameterChange={(paramName, newValue) =>
        onParameterChange?.(entry.activityId, paramName, newValue)
      }
      onDisableToggle={(disabled) =>
        onDisableToggle?.(entry.activityId, disabled)
      }
      onDeleteClick={() => onDeleteClick?.(entry.activityId)}
      onRationaleChange={(text) =>
        onRationaleChange?.(entry.activityId, text)
      }
      onDone={() => onDoneClick?.(entry)}
      onRetrySchema={() => onRetrySchema?.(entry.toolName)}
      rationaleRef={rationaleRef}
    />
  ) : (
    <div />
  );

  // If flip-card interaction is available, wrap in CardFlip
  if (onEditClick) {
    return (
      <CardFlip
        isFlipped={isEditing}
        front={frontFace}
        back={backFace}
        data-testid={`card-flip-${entry.activityId}`}
      />
    );
  }

  // Otherwise, just render the front face (backwards compatible)
  return frontFace;
}
