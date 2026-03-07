/**
 * Contract: Filter utility functions for spatial and temporal intersection.
 * Feature: 132-three-view-sync
 *
 * These pure functions compute whether an exercise passes a given
 * spatial or temporal filter. They are used by useBrowserFilter.
 */

import type { Bounds } from '../../../shared/components/src/utils/types';
import type { ViewportPolygon } from '../../../services/session-state/src/types/spatial';
import type { TimeFilter, TimeInstant } from '../../../services/session-state/src/types/temporal';

/**
 * Convert a ViewportPolygon to an axis-aligned bounding box (Bounds).
 * For non-rotated views, this extracts [minLon, minLat, maxLon, maxLat].
 * For rotated views, this computes the enclosing AABB.
 */
export declare function viewportToBounds(viewport: ViewportPolygon): Bounds;

/**
 * Test whether an exercise's bbox overlaps a viewport bounds.
 *
 * @param exerciseBbox - The exercise bounding box [west, south, east, north]
 * @param viewportBounds - The viewport bounds [minLon, minLat, maxLon, maxLat]
 * @returns true if the bboxes overlap
 *
 * Uses AABB intersection: overlap iff no separating axis.
 * Two bboxes do NOT overlap if:
 *   exercise.east < viewport.west  OR
 *   exercise.west > viewport.east  OR
 *   exercise.north < viewport.south OR
 *   exercise.south > viewport.north
 */
export declare function bboxOverlaps(
  exerciseBbox: [number, number, number, number],
  viewportBounds: Bounds,
): boolean;

/**
 * Test whether an exercise's temporal extent overlaps a time filter range.
 *
 * @param startDatetime - Exercise start datetime (ISO 8601) or null
 * @param endDatetime - Exercise end datetime (ISO 8601) or null
 * @param datetime - Exercise single datetime (ISO 8601) fallback or null
 * @param timeFilter - The time filter with start/end TimeInstant
 * @returns true if the exercise overlaps the time filter range
 *
 * Overlap test: start_a <= end_b AND start_b <= end_a
 * Single datetime items are treated as zero-length ranges.
 * Items with no temporal data always pass (return true).
 */
export declare function temporalOverlaps(
  startDatetime: string | null,
  endDatetime: string | null,
  datetime: string | null,
  timeFilter: TimeFilter,
): boolean;

/**
 * Parse an ISO 8601 datetime string to epoch milliseconds.
 * Returns null if the string is null or unparseable.
 */
export declare function parseEpoch(iso: string | null): number | null;

/**
 * Compute the filtered item set by applying all three filter axes.
 *
 * @param items - Full item list
 * @param metadataFilteredIds - Set of IDs passing metadata filter (null = all pass)
 * @param viewport - Current map viewport (null = no spatial filter)
 * @param spatialFilterActive - Whether spatial filtering is enabled
 * @param timeFilter - Current time filter range (null = no temporal filter)
 * @param temporalFilterActive - Whether temporal filtering is enabled
 * @returns Items passing all active filters
 *
 * Filter logic per item:
 *   metadataPass = (metadataFilteredIds === null) || metadataFilteredIds.has(item.id)
 *   spatialPass  = !spatialFilterActive || item.bbox === null || bboxOverlaps(item.bbox, viewport)
 *   temporalPass = !temporalFilterActive || !hasTime(item) || temporalOverlaps(item, timeFilter)
 *   result = metadataPass AND spatialPass AND temporalPass
 */
export declare function computeFilteredItems<T extends {
  readonly id: string;
  readonly bbox: [number, number, number, number] | null;
  readonly datetime: string | null;
  readonly startDatetime: string | null;
  readonly endDatetime: string | null;
}>(
  items: readonly T[],
  metadataFilteredIds: ReadonlySet<string> | null,
  viewport: ViewportPolygon | null,
  spatialFilterActive: boolean,
  timeFilter: TimeFilter | null,
  temporalFilterActive: boolean,
): T[];
