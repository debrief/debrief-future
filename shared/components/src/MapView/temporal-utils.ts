/**
 * Temporal track utility functions.
 *
 * Core algorithms for temporal track rendering:
 * - Binary search for nearest point to a given time
 * - Track slicing for snail-trail mode
 * - Temporal data extraction from GeoJSON features
 */

import type { DebriefFeature } from '../utils/types';

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
export function findNearestPointIndex(
  timestamps: number[],
  targetTime: number
): number {
  if (timestamps.length === 0) return -1;
  if (timestamps.length === 1) return 0;

  // Before first timestamp
  if (targetTime <= timestamps[0]!) return 0;
  // After last timestamp
  if (targetTime >= timestamps[timestamps.length - 1]!) return timestamps.length - 1;

  // Binary search
  let low = 0;
  let high = timestamps.length - 1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midVal = timestamps[mid]!;
    if (midVal === targetTime) return mid;
    if (midVal < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // low is now the insertion point; compare low and low-1
  if (low >= timestamps.length) return timestamps.length - 1;
  if (low === 0) return 0;

  const diffLow = Math.abs(timestamps[low]! - targetTime);
  const diffHigh = Math.abs(timestamps[low - 1]! - targetTime);
  return diffLow <= diffHigh ? low : low - 1;
}

/**
 * Slice track coordinates from start up to the point nearest to target time (inclusive).
 * Used for snail-trail mode rendering.
 *
 * @param coordinates Array of [lon, lat] coordinates
 * @param timestamps Array of timestamps (epoch ms), parallel to coordinates
 * @param targetTime Target time to slice at (epoch ms)
 * @returns Sliced coordinate array, or empty array if no valid data
 */
export function sliceTrackToTime(
  coordinates: [number, number][],
  timestamps: number[],
  targetTime: number
): [number, number][] {
  if (coordinates.length === 0 || timestamps.length === 0) return [];

  const nearestIndex = findNearestPointIndex(timestamps, targetTime);
  if (nearestIndex < 0) return [];

  // If target time is before the track start, return empty (nothing to show yet)
  if (targetTime < timestamps[0]!) return [];

  return coordinates.slice(0, nearestIndex + 1);
}

/**
 * Extract temporal data from a GeoJSON feature.
 *
 * @param feature A GeoJSON feature (may or may not have temporal data)
 * @returns TemporalTrackData if the feature has valid temporal data, null otherwise
 */
export function extractTemporalData(
  feature: DebriefFeature
): TemporalTrackData | null {
  if (!feature || !feature.geometry || !feature.properties) return null;

  // Must be a LineString
  if (feature.geometry.type !== 'LineString') return null;

  // eslint-disable-next-line no-restricted-syntax
  const coordinates = feature.geometry.coordinates as unknown as [number, number][];
  // eslint-disable-next-line no-restricted-syntax
  const times = (feature.properties as unknown as Record<string, unknown>).times as unknown[] | undefined;

  if (!times || !Array.isArray(times) || times.length === 0) return null;

  // times must be epoch ms numbers — fail fast on wrong format (Constitution XIV.4)
  if (typeof times[0] !== 'number') {
    throw new Error(
      `[temporal-utils] Feature "${String(feature.id)}" has non-numeric times ` +
      `(got ${typeof times[0]}). times[] must contain epoch ms numbers. ` +
      `Fix the data source, do not add format conversion here.`
    );
  }
  const timestamps = times as number[];

  if (coordinates.length === 0) return null;
  // times and coordinates must match in length
  if (timestamps.length !== coordinates.length) {
    throw new Error(
      `[temporal-utils] Feature "${String(feature.id)}" has mismatched arrays: ` +
      `${timestamps.length} times vs ${coordinates.length} coordinates. These must be parallel arrays.`
    );
  }

  const first = timestamps[0]!;
  const last = timestamps[timestamps.length - 1]!;

  return {
    trackId: String(feature.id ?? ''),
    coordinates,
    timestamps,
    timeExtent: [first, last],
  };
}
