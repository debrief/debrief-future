import { DebriefFeature, DebriefFeatureCollection, Bounds } from './types';
import { ViewportPolygon } from '../../../schemas/src/generated/typescript/index.ts';

/**
 * Calculate the bounding box for a collection of features.
 * Returns [minLon, minLat, maxLon, maxLat] or null if no valid coordinates.
 *
 * Handles all GeoJSON geometry types: Point, LineString, Polygon,
 * MultiPoint, MultiLineString, MultiPolygon.
 *
 * @param features - FeatureCollection or array of features
 * @returns Bounds tuple or null if no valid coordinates found
 */
export declare function calculateBounds(features: DebriefFeatureCollection | DebriefFeature[]): Bounds | null;
/**
 * Expand bounds by a percentage padding.
 *
 * @param bounds - Original bounds
 * @param paddingPercent - Padding percentage (0.1 = 10%)
 * @returns Expanded bounds
 */
export declare function expandBounds(bounds: Bounds, paddingPercent?: number): Bounds;
/**
 * Check if a point is within bounds.
 */
export declare function isPointInBounds(lon: number, lat: number, bounds: Bounds): boolean;
/**
 * Check whether two axis-aligned bounding boxes overlap.
 * Handles antimeridian crossing: when west > east the bbox is split
 * into two halves for testing. west === east is treated as a zero-width
 * bbox (degenerate point), NOT as an antimeridian crossing.
 *
 * @param itemBbox  - Item bounding box [west, south, east, north]
 * @param viewportBbox - Viewport bounding box [west, south, east, north]
 * @returns true if the two boxes overlap (including edge-touching)
 */
export declare function bboxOverlapsViewport(itemBbox: Bounds, viewportBbox: Bounds): boolean;
/**
 * Convert a ViewportPolygon (4-corner [NW, NE, SE, SW]) to an axis-aligned Bounds.
 * For non-rotated views, this extracts [minLon, minLat, maxLon, maxLat].
 * For rotated views, this computes the enclosing AABB.
 *
 * Returns null for degenerate polygons (zero area).
 * Feature: 132-three-view-sync, updated: 203 (object-form Coordinate).
 *
 * @remarks
 * This function is specific to 4-corner ViewportPolygon inputs. It uses
 * `Math.min(...lons)` / `Math.max(...lons)` which collapse to spread arguments —
 * V8 rejects spreads with more than ~100k arguments, so do NOT reuse this on
 * large coordinate arrays (FR-022). For large arrays, replace the spread with
 * a for-loop accumulator.
 *
 * @param viewport - 4-corner polygon [NW, NE, SE, SW] with `{ longitude, latitude }` corners.
 * @returns Bounds tuple [minLon, minLat, maxLon, maxLat] or null if degenerate
 */
export declare function viewportToBounds(viewport: ViewportPolygon): Bounds | null;
/**
 * Filter items to those whose bbox overlaps the given viewport.
 * Items without a bbox are excluded.
 *
 * @param items - Array of items with an optional bbox property
 * @param viewportBbox - Current viewport bounds
 * @returns Filtered array of items whose bbox overlaps the viewport
 */
export declare function filterBySpatialExtent<T extends {
    bbox: Bounds | null;
}>(items: readonly T[], viewportBbox: Bounds): T[];
//# sourceMappingURL=bounds.d.ts.map