/**
 * ExerciseListItemRow — single exercise row with metadata, date, and thumbnail (#129).
 *
 * Updated in #174: supports single-click highlight (preview) and double-click open.
 * When `onHighlight` is provided, single-click highlights the row and double-click opens.
 * When `onHighlight` is not provided, single-click opens (backwards compatible).
 */

import React, { useCallback } from 'react';
import type { ExerciseListItemRowProps } from './types';
import { SpatialThumbnail } from './SpatialThumbnail';
import { THUMBNAIL_SIZE_CONFIGS } from './constants';
import { formatDuration, computeDuration, formatDateRange, truncateArray } from './utils';

/** Maximum number of tags/vessel classes to show before overflow indicator. */
const MAX_VISIBLE_TAGS = 3;

export const ExerciseListItemRow: React.FC<ExerciseListItemRowProps> = ({
  item,
  trackData,
  trackDataLoading,
  onSelect,
  onHighlight,
  highlighted,
  thumbnailSize = 'small',
}) => {
  const sizeConfig = THUMBNAIL_SIZE_CONFIGS[thumbnailSize];
  const handleClick = useCallback(() => {
    if (onHighlight) {
      // When highlight is supported, single-click = highlight for preview
      onHighlight(item.id);
    } else {
      // Backwards compatible: single-click = open
      onSelect?.(item.itemPath);
    }
  }, [item.id, item.itemPath, onSelect, onHighlight]);

  const handleDoubleClick = useCallback(() => {
    // Double-click always opens
    onSelect?.(item.itemPath);
  }, [item.itemPath, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onHighlight) {
          onHighlight(item.id);
        } else {
          onSelect?.(item.itemPath);
        }
      }
    },
    [item.id, item.itemPath, onSelect, onHighlight],
  );

  const duration = computeDuration(item);
  const durationLabel = formatDuration(duration);
  const dateLabel = formatDateRange(item.startDatetime, item.endDatetime, item.datetime);
  const folderName = item.itemPath.replace(/^\.\//, '').replace(/\/item\.json$/, '');

  const vesselClasses = (item.platforms ?? [])
    .map((p) => p.vessel_class)
    .filter((v): v is string => v != null);
  const vesselInfo = truncateArray(vesselClasses, MAX_VISIBLE_TAGS);
  const tagInfo = truncateArray(item.tags, MAX_VISIBLE_TAGS);

  const rowClass = [
    'exercise-list-item-row',
    highlighted ? 'exercise-list-item-row--highlighted' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rowClass}
      data-testid="exercise-list-item-row"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      aria-label={item.title}
      aria-selected={highlighted}
    >
      <div className="exercise-list-item-row__thumbnail">
        {item.thumbnailHref ? (
          <img
            src={item.thumbnailHref}
            alt={`Thumbnail for ${item.title}`}
            className="exercise-list-item-row__raster-thumbnail"
            data-testid="raster-thumbnail"
            width={sizeConfig.rasterWidth}
            height={sizeConfig.rasterHeight}
            onError={(e) => {
              // Hide broken image, show fallback SpatialThumbnail
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = '';
            }}
          />
        ) : null}
        <div style={item.thumbnailHref ? { display: 'none' } : undefined}>
          <SpatialThumbnail
            bbox={item.bbox}
            trackData={trackData}
            loading={trackDataLoading}
            width={sizeConfig.spatialWidth}
            height={sizeConfig.spatialHeight}
          />
        </div>
      </div>

      <div className="exercise-list-item-row__info">
        <div
          className="exercise-list-item-row__title"
          title={item.title}
          data-testid="exercise-item-title"
        >
          {item.title}
        </div>

        <div className="exercise-list-item-row__folder" data-testid="exercise-item-folder" title={folderName}>
          {folderName}
        </div>

        <div className="exercise-list-item-row__date" data-testid="exercise-item-date">
          {dateLabel}
          {durationLabel && ` \u00B7 ${durationLabel}`}
        </div>

        <div className="exercise-list-item-row__meta" data-testid="exercise-item-meta">
          {vesselInfo.visible.map((vc, i) => (
            <span key={`${vc}-${i}`} className="exercise-list-item-row__tag">{vc}</span>
          ))}
          {vesselInfo.overflow > 0 && (
            <span className="exercise-list-item-row__overflow">
              +{vesselInfo.overflow} more
            </span>
          )}

          {tagInfo.visible.map((tag, i) => (
            <span key={`${tag}-${i}`} className="exercise-list-item-row__tag">{tag}</span>
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
