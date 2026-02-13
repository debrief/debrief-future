import { DebriefFeature } from '../utils/types';

/**
 * Extracted temporal data from a track feature.
 */
export interface TemporalTrackData {
    trackId: string;
    coordinates: [number, number][];
    timestamps: number[];
    timeExtent: [number, number];
}
/**
 * Find the index of the coordinate nearest to the target time.
 * Uses binary search for O(log n) performance.
 *
 * @param timestamps Sorted array of timestamps (epoch ms)
 * @param targetTime Target time to find (epoch ms)
 * @returns Index of nearest timestamp, or -1 if array is empty
 */
export declare function findNearestPointIndex(timestamps: number[], targetTime: number): number;
/**
 * Slice track coordinates from start up to the point nearest to target time (inclusive).
 * Used for snail-trail mode rendering.
 *
 * @param coordinates Array of [lon, lat] coordinates
 * @param timestamps Array of timestamps (epoch ms), parallel to coordinates
 * @param targetTime Target time to slice at (epoch ms)
 * @returns Sliced coordinate array, or empty array if no valid data
 */
export declare function sliceTrackToTime(coordinates: [number, number][], timestamps: number[], targetTime: number): [number, number][];
/**
 * Extract temporal data from a GeoJSON feature.
 *
 * @param feature A GeoJSON feature (may or may not have temporal data)
 * @returns TemporalTrackData if the feature has valid temporal data, null otherwise
 */
export declare function extractTemporalData(feature: DebriefFeature): TemporalTrackData | null;
//# sourceMappingURL=temporal-utils.d.ts.map