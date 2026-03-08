/**
 * StacBrowser — top-level orchestrator for three-view synchronization (#132).
 *
 * Composes FilterBar (top) with a GoldenLayout workspace containing
 * ExerciseListView, MapView, and TimelineView as draggable/resizable panels.
 */

import { useState, useCallback, useMemo, type ReactElement } from 'react';
import type { StacBrowserProps } from './types';
import type { StacBrowserItem } from '../filter-engine/types';
import { useBrowserFilter } from './useBrowserFilter';
import { FilterBar } from '../FilterBar';
import type { ExerciseListItem } from '../ExerciseListView';
import { PanelWorkspace } from '../PanelWorkspace/PanelWorkspace';
import { BrowserPanelContext, type BrowserPanelContextValue } from './BrowserPanelContext';
import { createBrowserRegistry } from './createBrowserRegistry';
import './StacBrowser.css';

// Create registry once (static — panel definitions don't change)
const browserRegistry = createBrowserRegistry();

/**
 * StacBrowser component — FilterBar on top, GoldenLayout workspace below.
 *
 * Layout:
 *   [FilterBar]                          (top, full width — outside GL)
 *   [ExerciseList] | [Map]               (GL panels, draggable/resizable)
 *                  | [Timeline]
 */
export function StacBrowser({
  items,
  taxonomy,
  onItemSelect,
  className,
}: StacBrowserProps): JSX.Element {
  // Metadata filter state
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
      setMetadataFilteredIds(null);
    } else {
      setMetadataFilteredIds(new Set(filtered.map(item => item.id)));
    }
  }, [items.length]);

  // Convert to ExerciseListItem (adds trackDataHref)
  const listItems = useMemo<ExerciseListItem[]>(() => {
    return filteredItems.map(item => ({
      ...item,
      trackDataHref: null,
    }));
  }, [filteredItems]);

  // Context value for GL panels to consume
  const contextValue = useMemo<BrowserPanelContextValue>(() => ({
    filteredItems,
    listItems,
    onItemSelect,
  }), [filteredItems, listItems, onItemSelect]);

  // Context wrapper: wraps each GL panel in BrowserPanelContext provider
  const contextWrapper = useCallback(
    (element: ReactElement): ReactElement => (
      <BrowserPanelContext.Provider value={contextValue}>
        {element}
      </BrowserPanelContext.Provider>
    ),
    [contextValue],
  );

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

      <div className="stac-browser__workspace" data-testid="browser-workspace">
        <PanelWorkspace
          registry={browserRegistry}
          contextWrapper={contextWrapper}
          storageKey="debrief-browser-layout"
        />
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
