/**
 * LogByFeature component — entries grouped under feature headings.
 *
 * Multi-feature entries appear in multiple groups.
 * Within each group, entries are sorted most-recent-first.
 *
 * Feature: 072-log-panel (US5)
 * Updated: 113-prov-card-flip (flip-card pass-through)
 */

import React, { useMemo } from 'react';
import type { LogByFeatureProps } from './types';
import { LogEntry } from './LogEntry';
import { groupEntriesByFeature } from './utils';

export function LogByFeature({
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
}: LogByFeatureProps): React.ReactElement {
  const groups = useMemo(
    () => groupEntriesByFeature(entries, featureNames),
    [entries, featureNames]
  );

  return (
    <div
      className={`log-panel__timeline ${className ?? ''}`}
      data-testid="log-by-feature"
      role="list"
    >
      {groups.map((group) => (
        <div key={group.featureId} className="log-panel__feature-group">
          <div className="log-panel__feature-heading" data-testid={`feature-group-${group.featureId}`}>
            {group.displayName}
          </div>
          {group.entries.map((entry) => (
            <LogEntry
              key={`${group.featureId}-${entry.activityId}`}
              entry={entry}
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
      ))}
    </div>
  );
}
