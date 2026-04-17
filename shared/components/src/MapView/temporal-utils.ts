/**
 * Temporal track utility functions.
 *
 * Core algorithms for temporal track rendering:
 * - Binary search for nearest point to a given time
 * - Track slicing for snail-trail mode
 * - Temporal data extraction from GeoJSON features
 */

import { findNearestPointIndex, sliceTrackToTime } from '@debrief/utils';
import type { DebriefFeature } from '../utils/types';
import { isTrackFeature } from '../utils/types';

// Re-export the canonical implementations from @debrief/utils so existing
// imports of these helpers from './temporal-utils' keep working.
export { findNearestPointIndex, sliceTrackToTime };

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
 * Extract temporal data from a GeoJSON feature.
 *
 * @param feature A GeoJSON feature (may or may not have temporal data)
 * @returns TemporalTrackData if the feature has valid temporal data, null otherwise
 */
export function extractTemporalData(
  feature: DebriefFeature
): TemporalTrackData | null {
  if (!feature || !feature.geometry || !feature.properties) return null;
  if (!isTrackFeature(feature)) return null;

  // After narrowing, geometry and positions are typed
  // GeoJSON coordinates typed as number[] in schema but runtime is [number, number][]
  // eslint-disable-next-line no-restricted-syntax
  const coordinates = feature.geometry.coordinates as unknown as [number, number][];
  const positions = feature.properties.positions;

  if (positions.length === 0 || coordinates.length === 0) return null;

  if (positions.length !== coordinates.length) {
    throw new Error(
      `[temporal-utils] Feature "${String(feature.id)}" has mismatched arrays: ` +
      `${positions.length} positions vs ${coordinates.length} coordinates. These must be parallel arrays.`
    );
  }

  const timestamps = positions.map((p, i) => {
    const ms = Date.parse(p.time);
    if (isNaN(ms)) {
      throw new Error(
        `[temporal-utils] Feature "${String(feature.id)}" has invalid time at positions[${i}]: "${p.time}".`
      );
    }
    return ms;
  });

  return {
    trackId: String(feature.id ?? ''),
    coordinates,
    timestamps,
    timeExtent: [timestamps[0]!, timestamps[timestamps.length - 1]!],
  };
}
