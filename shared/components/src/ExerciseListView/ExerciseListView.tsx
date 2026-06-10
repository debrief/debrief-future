/**
 * ExerciseListView — main container with virtualised scrolling, sort, recently opened (#129).
 *
 * Review decisions: 4B (inline sort + recent), 3B (lazy GeoJSON), 11A (AbortController).
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  ExerciseListViewProps,
  SortConfiguration,
  SortDimension,
  SortDirection,
} from './types';
import { ExerciseListItemRow } from './ExerciseListItemRow';
import { THUMBNAIL_SIZE_CONFIGS } from './constants';
import { sortComparators, formatRelativeTime } from './utils';
import './ExerciseListView.css';

/** Default sort: recency descending. */
const DEFAULT_SORT: SortConfiguration = { dimension: 'recency', direction: 'desc' };

/** Sort dimension labels for the UI. */
const SORT_LABELS: Record<SortDimension, string> = {
  recency: 'Recency',
  title: 'Title',
  duration: 'Duration',
};

/** Default default-direction per dimension. */
const DEFAULT_DIRECTIONS: Record<SortDimension, SortDirection> = {
  recency: 'desc',
  title: 'asc',
  duration: 'desc',
};

export const ExerciseListView: React.FC<ExerciseListViewProps> = ({
  items,
  recentItems = [],
  onItemSelect,
  onItemHighlight,
  highlightedItemId,
  initialSort,
  sort: controlledSort,
  onSortChange,
  hideSortBar,
  onRequestTrackData,
  trackData,
  thumbnailSize = 'small',
  className,
  height,
}) => {
  const rowHeight = THUMBNAIL_SIZE_CONFIGS[thumbnailSize].rowHeight;
  const [internalSort, setInternalSort] = useState<SortConfiguration>(initialSort ?? DEFAULT_SORT);
  const sort = controlledSort ?? internalSort;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which items have had their GeoJSON requested
  const requestedRef = useRef(new Set<string>());

  // Sort items
  const sortedItems = useMemo(() => {
    const arr = [...items];
    const comparator = sortComparators[sort.dimension];
    arr.sort((a, b) => {
      const result = comparator(a, b);
      return sort.direction === 'asc' && sort.dimension !== 'title'
        ? -result
        : sort.dimension === 'title' && sort.direction === 'desc'
          ? -result
          : result;
    });
    return arr;
  }, [items, sort]);

  // Virtualiser
  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    overscan: 5,
  });

  // Re-flow the virtualised list when rowHeight changes (Decision #10, #12).
  // Called ONLY in this effect — never in the render path.
  useEffect(() => {
    virtualizer.measure();
  }, [rowHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy GeoJSON loading: request data for visible items
  const visibleItems = virtualizer.getVirtualItems();
  useEffect(() => {
    if (!onRequestTrackData) return;

    for (const vItem of visibleItems) {
      const item = sortedItems[vItem.index];
      if (!item?.trackDataHref) continue;
      if (requestedRef.current.has(item.id)) continue;
      if (trackData?.has(item.id)) continue;

      requestedRef.current.add(item.id);
      onRequestTrackData(item.id, item.trackDataHref);
    }
  }, [visibleItems, sortedItems, onRequestTrackData, trackData]);

  // Sort change handler
  const handleSortClick = useCallback((dimension: SortDimension) => {
    const next = sort.dimension === dimension
      ? { dimension, direction: (sort.direction === 'asc' ? 'desc' : 'asc') as SortDirection }
      : { dimension, direction: DEFAULT_DIRECTIONS[dimension] };
    if (onSortChange) {
      onSortChange(next);
    } else {
      setInternalSort(next);
    }
  }, [sort, onSortChange]);

  const containerClass = ['exercise-list-view', className].filter(Boolean).join(' ');
  const containerStyle = height != null ? { height: `${height}px` } : { height: '100%' };

  // Empty state
  if (items.length === 0) {
    return (
      <div className={containerClass} style={containerStyle} data-testid="exercise-list-view">
        <div className="exercise-list-view__empty">
          <div className="exercise-list-view__empty-icon" aria-hidden="true">&#x1F4CB;</div>
          <div className="exercise-list-view__empty-message">
            No exercises found
          </div>
          <div className="exercise-list-view__empty-hint">
            Adjust your filters or add exercises to the STAC store.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} style={containerStyle} data-testid="exercise-list-view">
      {/* Sort Bar — hidden when sort controls are rendered externally */}
      {!hideSortBar && (
        <div className="exercise-list-view__sort-bar" data-testid="sort-bar">
          <span className="exercise-list-view__sort-label">Sort by:</span>
          {(Object.keys(SORT_LABELS) as SortDimension[]).map((dim) => (
            <button
              key={dim}
              className={`exercise-list-view__sort-btn${sort.dimension === dim ? ' exercise-list-view__sort-btn--active' : ''}`}
              data-direction={sort.dimension === dim ? sort.direction : undefined}
              data-testid={`sort-btn-${dim}`}
              onClick={() => handleSortClick(dim)}
              aria-pressed={sort.dimension === dim}
              aria-label={`Sort by ${SORT_LABELS[dim]}${sort.dimension === dim ? `, ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
            >
              {SORT_LABELS[dim]}
            </button>
          ))}
        </div>
      )}

      {/* Recently Opened Section */}
      {recentItems.length > 0 && (
        <div className="exercise-list-view__recent" data-testid="recent-section">
          <div className="exercise-list-view__recent-header">
            <span className="exercise-list-view__recent-icon" aria-hidden="true">&#x1F552;</span>
            Recently Opened
          </div>
          <ul className="exercise-list-view__recent-list" role="list">
            {recentItems.map((entry) => (
              <li
                key={entry.plotId}
                className="exercise-list-view__recent-item"
                data-testid="recent-item"
                role="button"
                tabIndex={0}
                onClick={() => onItemSelect?.(entry.uri)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onItemSelect?.(entry.uri);
                  }
                }}
              >
                <span className="exercise-list-view__recent-title">{entry.title}</span>
                <span className="exercise-list-view__recent-time" data-testid="recent-time">
                  {formatRelativeTime(entry.lastOpened)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Virtualised Exercise List */}
      <div
        ref={scrollRef}
        className="exercise-list-view__scroll"
        data-testid="exercise-list-scroll"
      >
        <div
          className="exercise-list-view__content"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {visibleItems.map((virtualItem) => {
            const item = sortedItems[virtualItem.index];
            if (!item) return null;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ExerciseListItemRow
                  item={item}
                  trackData={trackData?.get(item.id) ?? null}
                  trackDataLoading={
                    requestedRef.current.has(item.id) && !trackData?.has(item.id)
                  }
                  onSelect={onItemSelect}
                  onHighlight={onItemHighlight}
                  highlighted={highlightedItemId === item.id}
                  thumbnailSize={thumbnailSize}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
