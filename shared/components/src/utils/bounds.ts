import type { DebriefFeature, DebriefFeatureCollection, Bounds } from './types';
import type { ViewportPolygon } from './spatial-types';

/**
 * Recursively extract all coordinates from a GeoJSON geometry coordinates array.
 * Works for Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon.
 */
function extractAllCoordinates(coords: unknown): number[][] {
  if (!Array.isArray(coords) || coords.length === 0) {
    return [];
  }

  // Check if this is a coordinate pair [lon, lat]
  if (typeof coords[0] === 'number') {
    return [coords as number[]];
  }

  // Otherwise, recurse into nested arrays
  const result: number[][] = [];
  for (const item of coords) {
    result.push(...extractAllCoordinates(item));
  }
  return result;
}

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
    // Skip features with null geometry
    if (!feature.geometry) {
      continue;
    }

    // Check if feature already has a bbox (GeoJSON allows this)
    const featureWithBbox = feature as typeof feature & { bbox?: number[] };
    if (featureWithBbox.bbox && featureWithBbox.bbox.length >= 4) {
      const fMinLon = featureWithBbox.bbox[0] ?? 0;
      const fMinLat = featureWithBbox.bbox[1] ?? 0;
      const fMaxLon = featureWithBbox.bbox[2] ?? 0;
      const fMaxLat = featureWithBbox.bbox[3] ?? 0;
      minLon = Math.min(minLon, fMinLon);
      minLat = Math.min(minLat, fMinLat);
      maxLon = Math.max(maxLon, fMaxLon);
      maxLat = Math.max(maxLat, fMaxLat);
      continue;
    }

    // Extract all coordinates from geometry (handles all geometry types)
    const allCoords = extractAllCoordinates(feature.geometry.coordinates);
    for (const coord of allCoords) {
      if (coord.length >= 2) {
        const lon = coord[0];
        const lat = coord[1];
        if (typeof lon === 'number' && typeof lat === 'number' && !isNaN(lon) && !isNaN(lat)) {
          minLon = Math.min(minLon, lon);
          minLat = Math.min(minLat, lat);
          maxLon = Math.max(maxLon, lon);
          maxLat = Math.max(maxLat, lat);
        }
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
export function bboxOverlapsViewport(itemBbox: Bounds, viewportBbox: Bounds): boolean {
  const [iW, iS, iE, iN] = itemBbox;
  const [vW, vS, vE, vN] = viewportBbox;

  // Latitude check — independent of antimeridian
  if (iN < vS || iS > vN) return false;

  const itemCrosses = iW > iE;
  const vpCrosses = vW > vE;

  if (!itemCrosses && !vpCrosses) {
    // Standard AABB overlap on longitude
    return !(iE < vW || iW > vE);
  }

  if (itemCrosses && !vpCrosses) {
    // Item crosses antimeridian → split item into [iW, 180] and [-180, iE]
    return !(vE < iW && vW > iE);
  }

  if (!itemCrosses && vpCrosses) {
    // Viewport crosses antimeridian → split viewport
    return !(iE < vW && iW > vE);
  }

  // Both cross antimeridian — they always overlap longitudinally
  return true;
}

/**
 * Convert a ViewportPolygon (4-corner [NW, NE, SE, SW]) to an axis-aligned Bounds.
 * For non-rotated views, this extracts [minLon, minLat, maxLon, maxLat].
 * For rotated views, this computes the enclosing AABB.
 *
 * Returns null for degenerate polygons (zero area).
 * Feature: 132-three-view-sync
 *
 * @param viewport - 4-corner polygon [NW, NE, SE, SW]
 * @returns Bounds tuple [minLon, minLat, maxLon, maxLat] or null if degenerate
 */
export function viewportToBounds(viewport: ViewportPolygon): Bounds | null {
  const coords = viewport.coordinates;
  const lons = coords.map((c: [number, number]) => c[0]);
  const lats = coords.map((c: [number, number]) => c[1]);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Degenerate polygon — zero area (all corners at same point or on a line)
  if (minLon === maxLon || minLat === maxLat) {
    return null;
  }

  return [minLon, minLat, maxLon, maxLat];
}

/**
 * Filter items to those whose bbox overlaps the given viewport.
 * Items without a bbox are excluded.
 *
 * @param items - Array of items with an optional bbox property
 * @param viewportBbox - Current viewport bounds
 * @returns Filtered array of items whose bbox overlaps the viewport
 */
export function filterBySpatialExtent<T extends { bbox: Bounds | null }>(
  items: readonly T[],
  viewportBbox: Bounds,
): T[] {
  return items.filter(
    (item): item is T => item.bbox !== null && bboxOverlapsViewport(item.bbox, viewportBbox),
  );
}
