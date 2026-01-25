import { DebriefFeature, DebriefFeatureCollection, Bounds } from './types';

/**
 * Calculate the bounding box for a collection of features.
 * Returns [minLon, minLat, maxLon, maxLat] or null if no valid coordinates.
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
//# sourceMappingURL=bounds.d.ts.map