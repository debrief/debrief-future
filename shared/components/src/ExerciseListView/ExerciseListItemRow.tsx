/**
 * ExerciseListItemRow — single exercise row with metadata, date, and thumbnail (#129).
 */

import React, { useCallback } from 'react';
import type { ExerciseListItemRowProps } from './types';
import { SpatialThumbnail } from './SpatialThumbnail';
import { formatDuration, computeDuration, formatDateRange, truncateArray } from './utils';

/** Maximum number of tags/vessel classes to show before overflow indicator. */
const MAX_VISIBLE_TAGS = 3;

export const ExerciseListItemRow: React.FC<ExerciseListItemRowProps> = ({
  item,
  trackData,
  trackDataLoading,
  onSelect,
}) => {
  const handleClick = useCallback(() => {
    onSelect?.(item.itemPath);
  }, [item.itemPath, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(item.itemPath);
      }
    },
    [item.itemPath, onSelect],
  );

  const duration = computeDuration(item);
  const durationLabel = formatDuration(duration);
  const dateLabel = formatDateRange(item.startDatetime, item.endDatetime, item.datetime);

  const vesselInfo = truncateArray(item.vesselClasses, MAX_VISIBLE_TAGS);
  const tagInfo = truncateArray(item.tags, MAX_VISIBLE_TAGS);

  return (
    <div
      className="exercise-list-item-row"
      data-testid="exercise-list-item-row"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={item.title}
    >
      <div className="exercise-list-item-row__thumbnail">
        <SpatialThumbnail
          bbox={item.bbox}
          trackData={trackData}
          loading={trackDataLoading}
        />
      </div>

      <div className="exercise-list-item-row__info">
        <div
          className="exercise-list-item-row__title"
          title={item.title}
          data-testid="exercise-item-title"
        >
          {item.title}
        </div>

        <div className="exercise-list-item-row__date" data-testid="exercise-item-date">
          {dateLabel}
          {durationLabel && ` \u00B7 ${durationLabel}`}
        </div>

        <div className="exercise-list-item-row__meta" data-testid="exercise-item-meta">
          {vesselInfo.visible.map((vc) => (
            <span key={vc} className="exercise-list-item-row__tag">{vc}</span>
          ))}
          {vesselInfo.overflow > 0 && (
            <span className="exercise-list-item-row__overflow">
              +{vesselInfo.overflow} more
            </span>
          )}

          {tagInfo.visible.map((tag) => (
            <span key={tag} className="exercise-list-item-row__tag">{tag}</span>
          ))}
          {tagInfo.overflow > 0 && (
            <span className="exercise-list-item-row__overflow">
              +{tagInfo.overflow} more
            </span>
          )}

          {item.author && (
            <span className="exercise-list-item-row__author">{item.author}</span>
          )}
        </div>
      </div>
    </div>
  );
};
