/**
 * LogTimeline component — flat chronological list of LogEntry items.
 * Entries are expected to be pre-sorted most-recent-first.
 *
 * Feature: 072-log-panel
 * Updated: 113-prov-card-flip (flip-card pass-through)
 */

import React from 'react';
import type { LogTimelineProps } from './types';
import { LogEntry } from './LogEntry';

export function LogTimeline({
  entries,
  featureNames,
  presentationMode,
  selectedEntryId,
  onEntryClick,
  onTuneClick,
  onRestoreClick,
  editingActivityId,
  editingSchema,
  schemaLoading,
  schemaError,
  rationaleRef,
  onEditClick,
  onDoneClick,
  onParameterChange,
  onDisableToggle,
  onDeleteClick,
  onRationaleChange,
  onRetrySchema,
  className,
}: LogTimelineProps): React.ReactElement {
  return (
    <div
      className={`log-panel__timeline ${className ?? ''}`}
      data-testid="log-timeline"
      role="list"
    >
      {entries.map((entry, idx) => (
        <LogEntry
          key={entry.activityId}
          entry={entry}
          stepIndex={idx + 1}
          featureNames={featureNames}
          presentationMode={presentationMode}
          isSelected={entry.activityId === selectedEntryId}
          onClick={onEntryClick}
          onTuneClick={onTuneClick}
          onRestoreClick={onRestoreClick}
          isEditing={editingActivityId === entry.activityId}
          schema={editingActivityId === entry.activityId ? editingSchema : undefined}
          schemaLoading={editingActivityId === entry.activityId ? schemaLoading : false}
          schemaError={editingActivityId === entry.activityId ? schemaError : null}
          rationaleRef={editingActivityId === entry.activityId ? rationaleRef : undefined}
          onEditClick={onEditClick}
          onDoneClick={onDoneClick}
          onParameterChange={onParameterChange}
          onDisableToggle={onDisableToggle}
          onDeleteClick={onDeleteClick}
          onRationaleChange={onRationaleChange}
          onRetrySchema={onRetrySchema}
        />
      ))}
    </div>
  );
}
