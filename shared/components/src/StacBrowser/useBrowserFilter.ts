/**
 * useBrowserFilter — composition hook for three-axis filtering (#132).
 *
 * Computes the intersection of metadata, spatial, and temporal filter axes.
 * Uses reference-equality memoization (Review Decision 9A) to prevent
 * unnecessary child re-renders.
 */

import { useMemo, useCallback, useRef } from 'react';
import type { StacBrowserItem } from '../filter-engine/types';
import type { BrowserFilterResult } from './types';
import { bboxOverlapsViewport, viewportToBounds } from '../utils/bounds';
import { itemOverlapsFilter } from '../utils/timeline-helpers';
import type { Bounds } from '../utils/types';
import type { TemporalFilter } from '../TimelineView/types';

export interface UseBrowserFilterOptions {
  /** Full unfiltered item list. */
  readonly items: readonly StacBrowserItem[];

  /** Set of item IDs passing the metadata filter. null = all pass. */
  readonly metadataFilteredIds: ReadonlySet<string> | null;

  /** Whether spatial filtering is active. */
  readonly spatialFilterActive: boolean;

  /** Current viewport as 4-corner polygon coordinates. null = no viewport. */
  readonly viewportCoordinates: [[number, number], [number, number], [number, number], [number, number]] | null;

  /** Whether temporal filtering is active. */
  readonly temporalFilterActive: boolean;

  /** Current time filter range. null = no time filter. */
  readonly timeFilter: { start: number; end: number } | null;

  /** Callback to clear all filters. */
  readonly clearAllFilters: () => void;
}

/**
 * Compute filtered items from all three filter axes.
 *
 * Filter logic per item:
 *   metadataPass = (metadataFilteredIds === null) || metadataFilteredIds.has(item.id)
 *   spatialPass  = !spatialFilterActive || item.bbox === null || bboxOverlaps(item.bbox, viewportBounds)
 *   temporalPass = !temporalFilterActive || temporalOverlaps(item, timeFilter)
 *   result = metadataPass AND spatialPass AND temporalPass
 */
export function useBrowserFilter(options: UseBrowserFilterOptions): BrowserFilterResult {
  const {
    items,
    metadataFilteredIds,
    spatialFilterActive,
    viewportCoordinates,
    temporalFilterActive,
    timeFilter,
    clearAllFilters,
  } = options;

  // Convert viewport coordinates to bounds (memoized)
  const viewportBounds = useMemo<Bounds | null>(() => {
    if (!viewportCoordinates) return null;
    return viewportToBounds(viewportCoordinates);
  }, [viewportCoordinates]);

  // Convert time filter to TemporalFilter format (for itemOverlapsFilter)
  const temporalFilter = useMemo<TemporalFilter | null>(() => {
    if (!timeFilter) return null;
    return { start: timeFilter.start, end: timeFilter.end };
  }, [timeFilter]);

  // Count active filter axes
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (metadataFilteredIds !== null) count++;
    if (spatialFilterActive && viewportBounds !== null) count++;
    if (temporalFilterActive && temporalFilter !== null) count++;
    return count;
  }, [metadataFilteredIds, spatialFilterActive, viewportBounds, temporalFilterActive, temporalFilter]);

  // Reference-equality memoization (Review Decision 9A):
  // Keep previous result if the filtered array has the same items.
  const prevResultRef = useRef<readonly StacBrowserItem[]>(items);

  const filteredItems = useMemo(() => {
    // Fast path: no filters active
    if (activeFilterCount === 0) {
      prevResultRef.current = items;
      return items;
    }

    const result = items.filter(item => {
      // Metadata axis
      if (metadataFilteredIds !== null && !metadataFilteredIds.has(item.id)) {
        return false;
      }

      // Spatial axis (Review Decision 7D: items with no bbox pass spatial filter)
      if (spatialFilterActive && viewportBounds !== null && item.bbox !== null) {
        if (!bboxOverlapsViewport(item.bbox, viewportBounds)) {
          return false;
        }
      }

      // Temporal axis
      if (temporalFilterActive && temporalFilter !== null) {
        if (!itemOverlapsFilter(item, temporalFilter)) {
          return false;
        }
      }

      return true;
    });

    // Reference-equality check: if same length and same IDs, reuse previous
    const prev = prevResultRef.current;
    if (
      result.length === prev.length &&
      result.every((item, i) => item === prev[i])
    ) {
      return prev;
    }

    prevResultRef.current = result;
    return result;
  }, [items, metadataFilteredIds, spatialFilterActive, viewportBounds, temporalFilterActive, temporalFilter, activeFilterCount]);

  const hasNoResults = filteredItems.length === 0 && items.length > 0 && activeFilterCount > 0;

  const stableClearAll = useCallback(() => {
    clearAllFilters();
  }, [clearAllFilters]);

  return useMemo(() => ({
    filteredItems,
    activeFilterCount,
    hasNoResults,
    clearAllFilters: stableClearAll,
  }), [filteredItems, activeFilterCount, hasNoResults, stableClearAll]);
}
