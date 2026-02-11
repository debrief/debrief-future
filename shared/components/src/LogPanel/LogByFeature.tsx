/**
 * LogByFeature component — entries grouped under feature headings.
 *
 * Multi-feature entries appear in multiple groups.
 * Within each group, entries are sorted most-recent-first.
 *
 * Feature: 072-log-panel (US5)
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
            />
          ))}
        </div>
      ))}
    </div>
  );
}
