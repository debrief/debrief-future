/**
 * StacBrowser — top-level orchestrator for three-view synchronization (#132).
 *
 * Composes FilterBar, ExerciseListView, MapView, and TimelineView
 * with synchronized filter state via useBrowserFilter.
 */

import { useState, useCallback, useMemo } from 'react';
import type { StacBrowserProps } from './types';
import type { StacBrowserItem } from '../filter-engine/types';
import { useBrowserFilter } from './useBrowserFilter';
import { FilterBar } from '../FilterBar';
import { ExerciseListView } from '../ExerciseListView';
import type { ExerciseListItem } from '../ExerciseListView';
import './StacBrowser.css';

/**
 * StacBrowser component — four-panel layout with synchronized filter state.
 *
 * Layout:
 *   [FilterBar]                    (top, full width)
 *   [ExerciseListView] [MapView]   (left 300px, right flex)
 *                      [Timeline]  (right bottom)
 */
export function StacBrowser({
  items,
  taxonomy,
  onItemSelect,
  className,
  // colorMap will be wired to colour scheme engine in a future phase
}: StacBrowserProps): JSX.Element {
  // Metadata filter state (local — drives BrowserFilterSlice in real usage)
  const [metadataFilteredIds, setMetadataFilteredIds] = useState<ReadonlySet<string> | null>(null);

  const clearAllFilters = useCallback(() => {
    setMetadataFilteredIds(null);
  }, []);

  // Compute filtered items
  const { filteredItems, activeFilterCount, hasNoResults } = useBrowserFilter({
    items,
    metadataFilteredIds,
    spatialFilterActive: false,
    viewportCoordinates: null,
    temporalFilterActive: false,
    timeFilter: null,
    clearAllFilters,
  });

  // Handle FilterBar filtered items callback
  const handleFilteredItems = useCallback((filtered: StacBrowserItem[]) => {
    if (filtered.length === items.length) {
      // No filter active — clear metadata filter
      setMetadataFilteredIds(null);
    } else {
      setMetadataFilteredIds(new Set(filtered.map(item => item.id)));
    }
  }, [items.length]);

  // Convert StacBrowserItem to ExerciseListItem (they share the same fields)
  const listItems = useMemo<ExerciseListItem[]>(() => {
    return filteredItems.map(item => ({
      ...item,
      trackDataHref: null,
    })) as unknown as ExerciseListItem[];
  }, [filteredItems]);

  const rootClassName = ['stac-browser', className].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <div className="stac-browser__filter-bar">
        <FilterBar
          items={items}
          taxonomy={taxonomy}
          onFilteredItems={handleFilteredItems}
        />
      </div>

      <div className="stac-browser__content">
        <div className="stac-browser__list">
          <ExerciseListView
            items={listItems}
            onItemSelect={onItemSelect}
          />
        </div>

        <div className="stac-browser__views">
          <div className="stac-browser__map">
            {/* MapView will be wired in Phase 4 (spatial filtering) */}
            <div className="stac-browser__placeholder" data-testid="map-placeholder">
              Map View ({filteredItems.length} items)
            </div>
          </div>

          <div className="stac-browser__timeline">
            {/* TimelineView will be wired in Phase 5 (temporal filtering) */}
            <div className="stac-browser__placeholder" data-testid="timeline-placeholder">
              Timeline View ({filteredItems.length} items)
            </div>
          </div>
        </div>
      </div>

      {hasNoResults && (
        <div className="stac-browser__no-results" data-testid="no-results">
          <p>No exercises match the current filters ({activeFilterCount} active).</p>
          <button type="button" onClick={clearAllFilters}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
