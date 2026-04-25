/**
 * LogTimeline component — flat chronological list of LogEntry items.
 * Entries are expected to be pre-sorted most-recent-first.
 *
 * Feature: 072-log-panel
 * Updated: 113-prov-card-flip (flip-card pass-through)
 */

import React from 'react';
import type { LogPanelProps } from './types';
import { LogEntry } from './LogEntry';

export function LogTimeline({
  entries,
  featureNames,
  viewMode,
  selectedEntryId,
  toolCategories,
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
}: LogPanelProps): React.ReactElement {
  return (
    <div
      className={`log-panel__timeline ${className ?? ''}`}
      data-testid="log-timeline"
      role="list"
    >
      {entries.map((entry, idx) => (
        <LogEntry
          key={entry.activity_id}
          entry={entry}
          stepIndex={idx + 1}
          featureNames={featureNames}
          viewMode={viewMode}
          isSelected={entry.activity_id === selectedEntryId}
          toolCategories={toolCategories}
          onClick={onEntryClick}
          onTuneClick={onTuneClick}
          onRestoreClick={onRestoreClick}
          isEditing={editingActivityId === entry.activity_id}
          schema={editingActivityId === entry.activity_id ? editingSchema : undefined}
          schemaLoading={editingActivityId === entry.activity_id ? schemaLoading : false}
          schemaError={editingActivityId === entry.activity_id ? schemaError : null}
          rationaleRef={editingActivityId === entry.activity_id ? rationaleRef : undefined}
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
