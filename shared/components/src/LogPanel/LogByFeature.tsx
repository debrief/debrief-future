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
import type { LogPanelProps } from './types';
import { LogEntry } from './LogEntry';
import { groupEntriesByFeature } from './utils';

export function LogByFeature({
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
  const groups = useMemo(
    () => groupEntriesByFeature(entries, featureNames),
    [entries, featureNames]
  );

  // Build a global chronological index map so entries within groups
  // still show their overall step number.
  const stepIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e, i) => { map.set(e.activity_id, i + 1); });
    return map;
  }, [entries]);

  return (
    <div
      className={`log-panel__timeline ${className ?? ''}`}
      data-testid="log-by-feature"
      role="list"
    >
      {groups.map((group) => (
        <div key={group.feature_id} className="log-panel__feature-group">
          <div className="log-panel__feature-heading" data-testid={`feature-group-${group.feature_id}`}>
            {group.displayName}
          </div>
          {group.entries.map((entry) => (
            <LogEntry
              key={`${group.feature_id}-${entry.activity_id}`}
              entry={entry}
              stepIndex={stepIndexMap.get(entry.activity_id)}
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
      ))}
    </div>
  );
}
