/**
 * Bounds Calculation Utility
 *
 * Calculates bounding boxes from GeoJSON features for auto-zoom after import.
 */

import type { GeoJSONFeature } from '../types/import';

/**
 * Bounds type: [minLon, minLat, maxLon, maxLat]
 */
export type Bounds = [number, number, number, number];

/**
 * Calculate bounds from an array of GeoJSON features.
 *
 * @param features Array of GeoJSON features
 * @returns Bounds [minLon, minLat, maxLon, maxLat] or null if no valid coordinates
 */
export function calculateBounds(features: GeoJSONFeature[]): Bounds | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    const coords = extractCoordinates(feature.geometry);
    for (const [lon, lat] of coords) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }

  if (minLon === Infinity) {
    return null;
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Merge two bounds into one that contains both.
 *
 * @param a First bounds
 * @param b Second bounds
 * @returns Merged bounds
 */
export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a) return b;
  if (!b) return a;

  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

/**
 * Convert bounds from [minLon, minLat, maxLon, maxLat] to Leaflet format.
 *
 * @param bounds Bounds in [minLon, minLat, maxLon, maxLat] format
 * @returns Bounds in [[south, west], [north, east]] format for Leaflet
 */
export function boundsToLeaflet(
  bounds: Bounds
): [[number, number], [number, number]] {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  return [
    [minLat, minLon],  // [south, west]
    [maxLat, maxLon],  // [north, east]
  ];
}

/**
 * Check if bounds are valid (non-empty and within valid coordinate ranges).
 *
 * @param bounds Bounds to validate
 * @returns True if bounds are valid
 */
export function isValidBounds(bounds: Bounds): boolean {
  const [minLon, minLat, maxLon, maxLat] = bounds;

  // Check coordinate ranges
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
    return false;
  }

  // Check that min <= max
  if (minLon > maxLon || minLat > maxLat) {
    return false;
  }

  return true;
}

/**
 * Extract all [lon, lat] coordinate pairs from a geometry.
 */
function extractCoordinates(geometry: {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}): [number, number][] {
  const coords: [number, number][] = [];

  switch (geometry.type) {
    case 'Point': {
      const point = geometry.coordinates as number[];
      if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
        coords.push([point[0], point[1]]);
      }
      break;
    }

    case 'LineString':
    case 'MultiPoint': {
      const line = geometry.coordinates as number[][];
      for (const point of line) {
        if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
          coords.push([point[0], point[1]]);
        }
      }
      break;
    }

    case 'Polygon':
    case 'MultiLineString': {
      const rings = geometry.coordinates as number[][][];
      for (const ring of rings) {
        for (const point of ring) {
          if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
            coords.push([point[0], point[1]]);
          }
        }
      }
      break;
    }

    case 'MultiPolygon': {
      const polygons = geometry.coordinates as unknown as number[][][][];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          for (const point of ring) {
            if (point.length >= 2 && typeof point[0] === 'number' && typeof point[1] === 'number') {
              coords.push([point[0], point[1]]);
            }
          }
        }
      }
      break;
    }
  }

  return coords;
}
