/**
 * useBrowserFilter — composition hook for three-axis filtering.
 * Feature: 132-three-view-sync
 *
 * Combines metadata, spatial, and temporal filter axes with AND logic.
 * Uses reference-equality memoization (Review Decision 9A) to prevent
 * unnecessary child re-renders.
 */

import { useMemo, useRef } from 'react';
import type { StacBrowserItem } from '../filter-engine/types';
import type { ViewportPolygon, TimeFilter } from '../utils/spatial-types';
import { viewportToBounds, bboxOverlapsViewport } from '../utils/bounds';
import { itemOverlapsFilter } from '../utils/timeline-helpers';
import type { TemporalFilter } from '../TimelineView/types';
import type { BrowserFilterResult } from './types';

interface UseBrowserFilterArgs {
  /** Full unfiltered item list. */
  readonly items: readonly StacBrowserItem[];
  /** Set of item IDs passing metadata filter. null = all pass. */
  readonly metadataFilteredIds: ReadonlySet<string> | null;
  /** Current map viewport polygon. null = no viewport set. */
  readonly viewport: ViewportPolygon | null;
  /** Whether spatial filtering is active. */
  readonly spatialFilterActive: boolean;
  /** Current time filter range. null = no time filter set. */
  readonly timeFilter: TimeFilter | null;
  /** Whether temporal filtering is active. */
  readonly temporalFilterActive: boolean;
  /** Clear all filters callback. */
  readonly clearAllFilters: () => void;
}

/**
 * Compute the filtered item set by applying all three filter axes.
 *
 * Filter logic per item:
 *   metadataPass = (metadataFilteredIds === null) || metadataFilteredIds.has(item.id)
 *   spatialPass  = !spatialFilterActive || item.bbox === null || bboxOverlaps(item.bbox, viewport)
 *   temporalPass = !temporalFilterActive || !hasTime(item) || temporalOverlaps(item, timeFilter)
 *   result = metadataPass AND spatialPass AND temporalPass
 */
export function useBrowserFilter({
  items,
  metadataFilteredIds,
  viewport,
  spatialFilterActive,
  timeFilter,
  temporalFilterActive,
  clearAllFilters,
}: UseBrowserFilterArgs): BrowserFilterResult {
  // Reference-equality memoization (Review Decision 9A):
  // Only recompute filteredItems when inputs actually change.
  const prevRef = useRef<{
    items: readonly StacBrowserItem[];
    metadataFilteredIds: ReadonlySet<string> | null;
    viewport: ViewportPolygon | null;
    spatialFilterActive: boolean;
    timeFilter: TimeFilter | null;
    temporalFilterActive: boolean;
    result: readonly StacBrowserItem[];
  } | null>(null);

  const filteredItems = useMemo(() => {
    // Check reference equality for early return
    const prev = prevRef.current;
    if (
      prev &&
      prev.items === items &&
      prev.metadataFilteredIds === metadataFilteredIds &&
      prev.viewport === viewport &&
      prev.spatialFilterActive === spatialFilterActive &&
      prev.timeFilter === timeFilter &&
      prev.temporalFilterActive === temporalFilterActive
    ) {
      return prev.result;
    }

    // Convert viewport to bounds for spatial filtering
    const viewportBounds = spatialFilterActive && viewport
      ? viewportToBounds(viewport)
      : null;

    // Defensive guard: degenerate viewport → treat as no spatial filter (Review Decision 7D)
    const effectiveSpatialActive = spatialFilterActive && viewportBounds !== null;

    // Defensive guard: inverted timeFilter (start > end) → treat as no temporal filter (Review Decision 7D)
    const effectiveTemporalActive = temporalFilterActive && timeFilter !== null &&
      timeFilter.start !== null && timeFilter.end !== null &&
      timeFilter.start <= timeFilter.end;

    // Build the temporal filter in TemporalFilter shape for itemOverlapsFilter
    const temporalFilterForHelper: TemporalFilter | null =
      effectiveTemporalActive && timeFilter?.start !== null && timeFilter?.end !== null
        ? { start: timeFilter.start, end: timeFilter.end }
        : null;

    const result = items.filter((item) => {
      // Metadata axis
      if (metadataFilteredIds !== null && !metadataFilteredIds.has(item.id)) {
        return false;
      }

      // Spatial axis: items without bbox always pass spatial filter
      if (effectiveSpatialActive && viewportBounds !== null && item.bbox !== null) {
        if (!bboxOverlapsViewport(item.bbox, viewportBounds)) {
          return false;
        }
      }

      // Temporal axis: items without temporal data always pass temporal filter
      if (effectiveTemporalActive && temporalFilterForHelper !== null) {
        // itemOverlapsFilter returns false for items with no temporal data
        // We want those items to PASS (per FR-010), so only filter if item has time data
        const hasTimeData = item.startDatetime !== null || item.endDatetime !== null || item.datetime !== null;
        if (hasTimeData && !itemOverlapsFilter(item, temporalFilterForHelper)) {
          return false;
        }
      }

      return true;
    });

    // Cache for reference equality
    prevRef.current = {
      items,
      metadataFilteredIds,
      viewport,
      spatialFilterActive,
      timeFilter,
      temporalFilterActive,
      result,
    };

    return result;
  }, [items, metadataFilteredIds, viewport, spatialFilterActive, timeFilter, temporalFilterActive]);

  // Items filtered by metadata + spatial only (no temporal).
  // Used by TimelineView to avoid circular dependency on its own temporal zoom.
  // Preserves reference identity when content is unchanged to prevent cascading re-renders.
  const prevSpatialRef = useRef<readonly StacBrowserItem[] | null>(null);
  const spatialFilteredItems = useMemo(() => {
    const isTemporalActive = temporalFilterActive && timeFilter !== null &&
      timeFilter.start !== null && timeFilter.end !== null &&
      timeFilter.start <= timeFilter.end;
    if (!isTemporalActive) return filteredItems; // no temporal filter → same set

    // Re-filter without the temporal axis
    const viewportBounds = spatialFilterActive && viewport
      ? viewportToBounds(viewport)
      : null;
    const effectiveSpatial = spatialFilterActive && viewportBounds !== null;

    const result = items.filter((item) => {
      if (metadataFilteredIds !== null && !metadataFilteredIds.has(item.id)) return false;
      if (effectiveSpatial && viewportBounds !== null && item.bbox !== null) {
        if (!bboxOverlapsViewport(item.bbox, viewportBounds)) return false;
      }
      return true;
    });

    // Preserve reference identity if content is unchanged
    const prev = prevSpatialRef.current;
    if (prev && prev.length === result.length && result.every((item, i) => item === prev[i])) {
      return prev;
    }
    prevSpatialRef.current = result;
    return result;
  }, [items, metadataFilteredIds, viewport, spatialFilterActive, temporalFilterActive, timeFilter, filteredItems]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (metadataFilteredIds !== null) count++;
    // Spatial filter is implicit (map viewport) — don't count it as a user-applied filter
    if (temporalFilterActive) count++;
    return count;
  }, [metadataFilteredIds, temporalFilterActive]);

  const hasNoResults = filteredItems.length === 0 && activeFilterCount > 0;

  return useMemo(() => ({
    filteredItems,
    spatialFilteredItems,
    activeFilterCount,
    hasNoResults,
    clearAllFilters,
  }), [filteredItems, spatialFilteredItems, activeFilterCount, hasNoResults, clearAllFilters]);
}
