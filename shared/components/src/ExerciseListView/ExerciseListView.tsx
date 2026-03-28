/**
 * ExerciseListView — main container with virtualised scrolling, sort, text search,
 * and recently opened (#129).
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

/** Row height estimate for virtualiser. */
const ROW_HEIGHT = 80;

/** Maximum number of autocomplete suggestions to show. */
const MAX_SUGGESTIONS = 8;

export const ExerciseListView: React.FC<ExerciseListViewProps> = ({
  items,
  recentItems = [],
  onItemSelect,
  initialSort,
  onRequestTrackData,
  trackData,
  className,
  height,
}) => {
  const [sort, setSort] = useState<SortConfiguration>(initialSort ?? DEFAULT_SORT);
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track which items have had their GeoJSON requested
  const requestedRef = useRef(new Set<string>());

  // Text filter: case-insensitive substring match on title and id
  const searchLower = searchText.toLowerCase();
  const filteredItems = useMemo(() => {
    if (!searchLower) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower),
    );
  }, [items, searchLower]);

  // Autocomplete suggestions: unique titles matching the search text
  const suggestions = useMemo(() => {
    if (!searchLower || searchLower.length < 1) return [];
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower),
      )
      .map((item) => item.title)
      .filter((title, i, arr) => arr.indexOf(title) === i) // deduplicate
      .slice(0, MAX_SUGGESTIONS);
  }, [items, searchLower]);

  // Sort items
  const sortedItems = useMemo(() => {
    const arr = [...filteredItems];
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
  }, [filteredItems, sort]);

  // Virtualiser
  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: 5,
  });

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
    setSort((prev) => {
      if (prev.dimension === dimension) {
        return { dimension, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { dimension, direction: DEFAULT_DIRECTIONS[dimension] };
    });
  }, []);

  // Search handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  }, []);

  const handleSuggestionSelect = useCallback((title: string) => {
    setSearchText(title);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === 'Escape') {
          setSearchText('');
          setShowSuggestions(false);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault();
        handleSuggestionSelect(suggestions[activeSuggestion]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    },
    [showSuggestions, suggestions, activeSuggestion, handleSuggestionSelect],
  );

  const handleSearchBlur = useCallback(() => {
    // Delay to allow click on suggestion to register
    setTimeout(() => setShowSuggestions(false), 150);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    searchRef.current?.focus();
  }, []);

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
      {/* Sort Bar */}
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

      {/* Search Bar */}
      <div className="exercise-list-view__search-bar" data-testid="search-bar">
        <div className="exercise-list-view__search-wrapper">
          <span className="exercise-list-view__search-icon" aria-hidden="true">&#x1F50D;</span>
          <input
            ref={searchRef}
            type="text"
            className="exercise-list-view__search-input"
            data-testid="search-input"
            placeholder="Filter by name..."
            value={searchText}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => searchText && setShowSuggestions(true)}
            onBlur={handleSearchBlur}
            aria-label="Filter exercises by name"
            aria-autocomplete="list"
            aria-controls={showSuggestions && suggestions.length > 0 ? 'search-suggestions' : undefined}
            aria-activedescendant={activeSuggestion >= 0 ? `suggestion-${activeSuggestion}` : undefined}
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
          />
          {searchText && (
            <button
              className="exercise-list-view__search-clear"
              data-testid="search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              &#x2715;
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              id="search-suggestions"
              className="exercise-list-view__suggestions"
              data-testid="search-suggestions"
              role="listbox"
            >
              {suggestions.map((title, i) => (
                <li
                  key={title}
                  id={`suggestion-${i}`}
                  className={`exercise-list-view__suggestion${i === activeSuggestion ? ' exercise-list-view__suggestion--active' : ''}`}
                  data-testid="search-suggestion"
                  role="option"
                  aria-selected={i === activeSuggestion}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionSelect(title)}
                >
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>
        {searchText && (
          <span className="exercise-list-view__search-count" data-testid="search-count">
            {filteredItems.length} of {items.length}
          </span>
        )}
      </div>

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
        {sortedItems.length === 0 && searchText ? (
          <div className="exercise-list-view__empty">
            <div className="exercise-list-view__empty-message">
              No matches for &ldquo;{searchText}&rdquo;
            </div>
            <div className="exercise-list-view__empty-hint">
              Try a different search term.
            </div>
          </div>
        ) : (
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
