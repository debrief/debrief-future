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
  ViewMode,
  PresentationMode,
} from './types';
import { LogTimeline } from './LogTimeline';
import { LogByFeature } from './LogByFeature';
import { LogFilterRow } from './LogFilterRow';
import { LogActionBar } from './LogActionBar';
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
  plotName,
  actionResultMessage,
  onMessage,
  onPresentationModeChange,
  onViewModeChange,
  onFilterStateChange,
  onSelectedEntryChange,
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

      {/* Timeline or By-Feature view */}
      {viewMode === 'timeline' ? (
        <LogTimeline
          entries={filteredEntries}
          featureNames={featureNames}
          presentationMode={presentationMode}
          selectedEntryId={selectedEntryId}
          onEntryClick={handleEntryClick}
        />
      ) : (
        <LogByFeature
          entries={filteredEntries}
          featureNames={featureNames}
          presentationMode={presentationMode}
          selectedEntryId={selectedEntryId}
          onEntryClick={handleEntryClick}
        />
      )}
    </div>
  );
}
