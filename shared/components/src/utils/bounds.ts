import type { DebriefFeature, DebriefFeatureCollection, Bounds } from './types';
import { isTrackFeature } from './types';

/**
 * Calculate the bounding box for a collection of features.
 * Returns [minLon, minLat, maxLon, maxLat] or null if no valid coordinates.
 *
 * @param features - FeatureCollection or array of features
 * @returns Bounds tuple or null if no valid coordinates found
 */
export function calculateBounds(
  features: DebriefFeatureCollection | DebriefFeature[]
): Bounds | null {
  const featureArray = Array.isArray(features) ? features : features.features;

  if (featureArray.length === 0) {
    return null;
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of featureArray) {
    // Check if feature already has a bbox
    if (feature.bbox && feature.bbox.length >= 4) {
      const [fMinLon, fMinLat, fMaxLon, fMaxLat] = feature.bbox;
      minLon = Math.min(minLon, fMinLon);
      minLat = Math.min(minLat, fMinLat);
      maxLon = Math.max(maxLon, fMaxLon);
      maxLat = Math.max(maxLat, fMaxLat);
      continue;
    }

    // Extract coordinates based on geometry type
    if (isTrackFeature(feature)) {
      // LineString geometry - coordinates is array of [lon, lat] pairs
      const coords = feature.geometry.coordinates as unknown as number[][];
      for (const coord of coords) {
        if (coord.length >= 2) {
          const [lon, lat] = coord;
          minLon = Math.min(minLon, lon);
          minLat = Math.min(minLat, lat);
          maxLon = Math.max(maxLon, lon);
          maxLat = Math.max(maxLat, lat);
        }
      }
    } else {
      // Point geometry - coordinates is [lon, lat]
      const coords = feature.geometry.coordinates as unknown as number[];
      if (coords.length >= 2) {
        const [lon, lat] = coords;
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }

  // Check if we found any valid coordinates
  if (minLon === Infinity || minLat === Infinity) {
    return null;
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Expand bounds by a percentage padding.
 *
 * @param bounds - Original bounds
 * @param paddingPercent - Padding percentage (0.1 = 10%)
 * @returns Expanded bounds
 */
export function expandBounds(bounds: Bounds, paddingPercent: number = 0.1): Bounds {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;
  const lonPad = lonRange * paddingPercent;
  const latPad = latRange * paddingPercent;

  return [
    minLon - lonPad,
    minLat - latPad,
    maxLon + lonPad,
    maxLat + latPad,
  ];
}

/**
 * Check if a point is within bounds.
 */
export function isPointInBounds(lon: number, lat: number, bounds: Bounds): boolean {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}
