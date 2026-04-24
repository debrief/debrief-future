/**
 * LogPanel root component — layout, state coordination, empty states.
 *
 * Renders:
 * - Action bar with view/mode toggles and action buttons
 * - Collapsible filter row
 * - Timeline or By-Feature view
 * - Empty states for no plot / no entries
 *
 * Feature: 072-log-panel
 * Updated: 113-prov-card-flip (flip-card edit state, schema cache)
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import type {
  LogPanelProps,
  TimelineEntry,
  ActionType,
  ParameterSchemaEntry,
} from './types';
import { DEFAULT_FILTER_STATE } from './types';
import { LogTimeline } from './LogTimeline';
import { LogByFeature } from './LogByFeature';
import { LogFilterRow } from './LogFilterRow';
import { LogActionBar } from './LogActionBar';
import { ReplayProgress } from './ReplayProgress';
import { filterEntries, getAvailableToolTypes, getSelectableFeatureIds } from './utils';
import { LOG_PANEL_STRINGS } from './strings';
import './LogPanel.css';

export function LogPanel({
  entries,
  featureNames,
  viewMode,
  selectedEntryId,
  filterState = DEFAULT_FILTER_STATE,
  hasActiveSession = false,
  actionResultMessage = null,
  replayProgress,
  toolCategories,
  onMessage,
  onViewModeChange,
  onFilterStateChange,
  onSelectedEntryChange,
  onTuneRequest,
  onRestoreRequest,
  onReplayCancel,
  onSchemaRequest,
  onDisableToggle,
  onRationaleUpdate,
  className,
}: LogPanelProps): React.ReactElement {
  // Feature 113: Flip-card edit state
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Feature 113: Schema cache (plain Map via useRef, review decision 3A)
  const schemaCacheRef = useRef(new Map<string, ReadonlyArray<ParameterSchemaEntry>>());

  // Ref for rationale auto-focus from action bar
  const rationaleRef = useRef<HTMLTextAreaElement>(null);

  // Feature 113: Request schema and handle async resolution if Promise is returned.
  const requestSchema = useCallback(
    (toolId: string) => {
      setSchemaLoading(true);
      const result = onSchemaRequest?.(toolId);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<ReadonlyArray<ParameterSchemaEntry>>).then(
          (schema) => {
            schemaCacheRef.current.set(toolId, schema);
            setSchemaLoading(false);
            setSchemaError(null);
          },
          (err: unknown) => {
            setSchemaLoading(false);
            setSchemaError(err instanceof Error ? err.message : 'Schema load failed');
          }
        );
      }
    },
    [onSchemaRequest]
  );

  // Apply filters to entries
  const filteredEntries = useMemo(
    () => filterEntries(entries, filterState, featureNames),
    [entries, filterState, featureNames]
  );

  // Get unique tool names for filter dropdown
  const availableToolTypes = useMemo(
    () => getAvailableToolTypes(entries),
    [entries]
  );

  // Handle entry click — toggle selection
  const handleEntryClick = useCallback(
    (entry: TimelineEntry) => {
      if (selectedEntryId === entry.activity_id) {
        // Deselect
        onSelectedEntryChange?.(null);
        onMessage?.({ type: 'entry:deselect' });
      } else {
        // Select
        onSelectedEntryChange?.(entry.activity_id);
        const featureIds = getSelectableFeatureIds(entry, featureNames);
        onMessage?.({
          type: 'entry:select',
          payload: { activity_id: entry.activity_id, featureIds },
        });
      }
    },
    [selectedEntryId, featureNames, onSelectedEntryChange, onMessage]
  );

  // Handle action button clicks
  const handleActionInvoke = useCallback(
    (actionType: ActionType, activityId: string) => {
      // Feature 113: Rationale action bar shortcut flips the card and focuses rationale
      if (actionType === 'rationale') {
        const entry = entries.find((e) => e.activity_id === activityId);
        if (entry) {
          setEditingActivityId(activityId);
          // Request schema if not cached
          const cached = schemaCacheRef.current.get(entry.toolName);
          if (!cached) {
            requestSchema(entry.toolName);
          }
          // Focus rationale after render
          setTimeout(() => rationaleRef.current?.focus(), 100);
        }
        return;
      }

      onMessage?.({
        type: 'action:invoke',
        payload: { actionType, activity_id: activityId },
      });
    },
    [onMessage, entries, requestSchema]
  );

  // Phase 6: Wrap onTuneRequest for LogEntry's onTuneClick signature
  const handleTuneClick = useCallback(
    (entry: TimelineEntry, parameterName: string) => {
      if (onTuneRequest) {
        // Pass current value for inline editing; caller provides new value
        const paramVal = entry.parameters[parameterName];
        onTuneRequest(entry.activity_id, parameterName, paramVal?.value);
      }
    },
    [onTuneRequest]
  );

  // Phase 6: Wrap onRestoreRequest for LogEntry's onRestoreClick signature
  const handleRestoreClick = useCallback(
    (entry: TimelineEntry) => {
      onRestoreRequest?.(entry.activity_id);
    },
    [onRestoreRequest]
  );

  // Feature 113: Handle edit icon click — flip card to edit face
  const handleEditClick = useCallback(
    (entry: TimelineEntry) => {
      // Single-card constraint: auto-close any currently editing card
      setEditingActivityId(entry.activity_id);
      setSchemaError(null);

      // Check schema cache
      const cached = schemaCacheRef.current.get(entry.toolName);
      if (!cached) {
        requestSchema(entry.toolName);
      } else {
        setSchemaLoading(false);
      }
    },
    [requestSchema]
  );

  // Feature 113: Handle Done click — flip card back to read-only
  const handleDoneClick = useCallback(
    () => {
      setEditingActivityId(null);
    },
    []
  );

  // Feature 113: Handle parameter change — debounced live replay via tune:request
  const handleParameterChange = useCallback(
    (activityId: string, parameterName: string, newValue: unknown) => {
      onTuneRequest?.(activityId, parameterName, newValue);
    },
    [onTuneRequest]
  );

  // Feature 113: Handle delete — soft delete via revert-this
  const handleDeleteClick = useCallback(
    (activityId: string) => {
      setEditingActivityId(null);
      onMessage?.({
        type: 'action:invoke',
        payload: { actionType: 'revertThis', activity_id: activityId },
      });
    },
    [onMessage]
  );

  // Feature 113: Handle rationale change
  const handleRationaleChange = useCallback(
    (activityId: string, rationale: string) => {
      onRationaleUpdate?.(activityId, rationale);
    },
    [onRationaleUpdate]
  );

  // Feature 113: Handle retry schema load
  const handleRetrySchema = useCallback(
    (toolId: string) => {
      setSchemaError(null);
      requestSchema(toolId);
    },
    [requestSchema]
  );

  // Feature 113: Handle disable toggle
  const handleDisableToggle = useCallback(
    (activityId: string, disabled: boolean) => {
      onDisableToggle?.(activityId, disabled);
    },
    [onDisableToggle]
  );

  // Feature 113: Get cached schema for currently editing entry
  const editingEntry = editingActivityId
    ? entries.find((e) => e.activity_id === editingActivityId)
    : null;
  const editingSchema = editingEntry
    ? schemaCacheRef.current.get(editingEntry.toolName) ?? null
    : null;

  // Empty state: no plot open
  if (!hasActiveSession) {
    return (
      <div className={`log-panel ${className ?? ''}`} data-testid="log-panel">
        <div className="log-panel__empty" data-testid="log-panel-empty-no-plot">
          {LOG_PANEL_STRINGS.emptyNoPlot}
        </div>
      </div>
    );
  }

  // Empty state: no entries
  if (entries.length === 0) {
    return (
      <div className={`log-panel ${className ?? ''}`} data-testid="log-panel">
        <div className="log-panel__empty" data-testid="log-panel-empty-no-entries">
          {LOG_PANEL_STRINGS.emptyNoEntries}
        </div>
      </div>
    );
  }

  // Common LogEntry props for flip-card interaction
  const flipCardProps = onSchemaRequest ? {
    onEditClick: handleEditClick,
    onDoneClick: handleDoneClick,
    onParameterChange: handleParameterChange,
    onDisableToggle: handleDisableToggle,
    onDeleteClick: handleDeleteClick,
    onRationaleChange: handleRationaleChange,
    onRetrySchema: handleRetrySchema,
  } : {};

  return (
    <div className={`log-panel ${className ?? ''}`} data-testid="log-panel">
      {/* Action bar with toggles and action buttons */}
      <LogActionBar
        selectedEntryId={selectedEntryId}
        viewMode={viewMode}
        onActionInvoke={handleActionInvoke}
        onViewModeChange={onViewModeChange}
      />

      {/* Filter row */}
      <LogFilterRow
        filterState={filterState}
        availableToolTypes={availableToolTypes}
        onFilterChange={onFilterStateChange!}
      />

      {/* Filter count indicator */}
      {(filterState.searchText || filterState.toolType || filterState.operationCategory) && (
        <div className="log-panel__filter-count" style={{ padding: '2px 8px' }}>
          {LOG_PANEL_STRINGS.filterCount(filteredEntries.length, entries.length)}
        </div>
      )}

      {/* Action result notification */}
      {actionResultMessage && (
        <div className="log-panel__notification" data-testid="log-panel-notification">
          {actionResultMessage}
        </div>
      )}

      {/* Replay progress indicator (Phase 6) */}
      {replayProgress && onReplayCancel && (
        <ReplayProgress
          current={replayProgress.current}
          total={replayProgress.total}
          currentToolId={replayProgress.currentToolId}
          phase={replayProgress.phase as 'loading-snapshot' | 'replaying' | 'finalising'}
          onCancel={onReplayCancel}
        />
      )}

      {/* Timeline or By-Feature view */}
      {/* Render timeline or by-feature based on layout mode */}
      {(viewMode === 'by-feature') ? (
        <LogByFeature
          entries={filteredEntries}
          featureNames={featureNames}
          viewMode={viewMode}
          selectedEntryId={selectedEntryId}
          toolCategories={toolCategories}
          onEntryClick={handleEntryClick}
          onTuneClick={onTuneRequest ? handleTuneClick : undefined}
          onRestoreClick={onRestoreRequest ? handleRestoreClick : undefined}
          editingActivityId={editingActivityId}
          editingSchema={editingSchema}
          schemaLoading={schemaLoading}
          schemaError={schemaError}
          rationaleRef={rationaleRef}
          {...flipCardProps}
        />
      ) : (
        <LogTimeline
          entries={filteredEntries}
          featureNames={featureNames}
          viewMode={viewMode}
          selectedEntryId={selectedEntryId}
          toolCategories={toolCategories}
          onEntryClick={handleEntryClick}
          onTuneClick={onTuneRequest ? handleTuneClick : undefined}
          onRestoreClick={onRestoreRequest ? handleRestoreClick : undefined}
          editingActivityId={editingActivityId}
          editingSchema={editingSchema}
          schemaLoading={schemaLoading}
          schemaError={schemaError}
          rationaleRef={rationaleRef}
          {...flipCardProps}
        />
      )}
    </div>
  );
}
