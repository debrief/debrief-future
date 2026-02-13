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
 */

import React, { useCallback, useMemo } from 'react';
import type {
  LogPanelProps,
  TimelineEntry,
  ActionType,
} from './types';
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
  presentationMode,
  viewMode,
  selectedEntryId,
  filterState,
  hasActiveSession,
  actionResultMessage,
  replayProgress,
  onMessage,
  onPresentationModeChange,
  onViewModeChange,
  onFilterStateChange,
  onSelectedEntryChange,
  onTuneRequest,
  onRestoreRequest,
  onReplayCancel,
  className,
}: LogPanelProps): React.ReactElement {
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
      if (selectedEntryId === entry.activityId) {
        // Deselect
        onSelectedEntryChange?.(null);
        onMessage?.({ type: 'entry:deselect' });
      } else {
        // Select
        onSelectedEntryChange?.(entry.activityId);
        const featureIds = getSelectableFeatureIds(entry, featureNames);
        onMessage?.({
          type: 'entry:select',
          payload: { activityId: entry.activityId, featureIds },
        });
      }
    },
    [selectedEntryId, featureNames, onSelectedEntryChange, onMessage]
  );

  // Handle action button clicks
  const handleActionInvoke = useCallback(
    (actionType: ActionType, activityId: string) => {
      onMessage?.({
        type: 'action:invoke',
        payload: { actionType, activityId },
      });
    },
    [onMessage]
  );

  // Phase 6: Wrap onTuneRequest for LogEntry's onTuneClick signature
  const handleTuneClick = useCallback(
    (entry: TimelineEntry, parameterName: string) => {
      if (onTuneRequest) {
        // Pass current value for inline editing; caller provides new value
        const paramVal = entry.parameters[parameterName];
        onTuneRequest(entry.activityId, parameterName, paramVal?.value);
      }
    },
    [onTuneRequest]
  );

  // Phase 6: Wrap onRestoreRequest for LogEntry's onRestoreClick signature
  const handleRestoreClick = useCallback(
    (entry: TimelineEntry) => {
      onRestoreRequest?.(entry.activityId);
    },
    [onRestoreRequest]
  );

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

  return (
    <div className={`log-panel ${className ?? ''}`} data-testid="log-panel">
      {/* Action bar with toggles and action buttons */}
      <LogActionBar
        selectedEntryId={selectedEntryId}
        viewMode={viewMode}
        presentationMode={presentationMode}
        onActionInvoke={handleActionInvoke}
        onViewModeChange={onViewModeChange}
        onPresentationModeChange={onPresentationModeChange}
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
      {viewMode === 'timeline' ? (
        <LogTimeline
          entries={filteredEntries}
          featureNames={featureNames}
          presentationMode={presentationMode}
          selectedEntryId={selectedEntryId}
          onEntryClick={handleEntryClick}
          onTuneClick={onTuneRequest ? handleTuneClick : undefined}
          onRestoreClick={onRestoreRequest ? handleRestoreClick : undefined}
        />
      ) : (
        <LogByFeature
          entries={filteredEntries}
          featureNames={featureNames}
          presentationMode={presentationMode}
          selectedEntryId={selectedEntryId}
          onEntryClick={handleEntryClick}
          onTuneClick={onTuneRequest ? handleTuneClick : undefined}
          onRestoreClick={onRestoreRequest ? handleRestoreClick : undefined}
        />
      )}
    </div>
  );
}
