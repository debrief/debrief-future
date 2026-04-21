/**
 * Bounds Calculation Utility
 *
 * Calculates bounding boxes from GeoJSON-like features for auto-zoom after
 * import and for "zoom to selection" on the VS Code map.
 */

import type { Bounds } from './types.js';

// Re-export Bounds type for convenience
export type { Bounds };

/**
 * Structural minimum shape `calculateBounds` reads from each input element.
 *
 * Private to this module — it is **not** exported from `@debrief/utils`. Keeping
 * it private avoids committing to a third public feature type alongside
 * `RawGeoJSONFeature` and `SafeFeature`. Every in-tree feature type
 * (`RawGeoJSONFeature`, `SafeFeature`, `DebriefFeature` and its variants) is
 * assignable to `ReadonlyArray<BoundsInputFeature>` via TypeScript's structural
 * subtyping — so no call site needs an `as`-cast.
 */
type BoundsInputFeature = {
  geometry?: { type: string; coordinates: unknown } | null | undefined;
};

/**
 * The union of coordinate-array shapes the utility can process, produced by
 * the `coerceCoordinates` narrowing gate (see below) and consumed by the
 * per-geometry-type branches in `extractCoordinates`.
 */
type CoordinateTree =
  | number[]          // Point
  | number[][]        // LineString, MultiPoint
  | number[][][]      // Polygon, MultiLineString
  | number[][][][];   // MultiPolygon

/**
 * Article XV.5 — explicit narrowing gate for untyped coordinate input.
 *
 * `calculateBounds`'s widened parameter admits `coordinates: unknown`. This
 * function is the single reviewable step that converts that `unknown` to a
 * typed `CoordinateTree` before any per-geometry-type branch reads it. Uses
 * `Array.isArray` + `typeof` only — no `any`, no double-cast, no external
 * dependency. Returns `null` when the input is not a tree of numbers with
 * depth 1–4 (caller treats `null` as "skip this feature").
 */
function coerceCoordinates(raw: unknown): CoordinateTree | null {
  const depth = detectDepth(raw);
  if (depth === null) {
    return null;
  }
  switch (depth) {
    case 1:
      return raw as number[];
    case 2:
      return raw as number[][];
    case 3:
      return raw as number[][][];
    case 4:
      return raw as number[][][][];
  }
}

/**
 * Walks the first element of `raw` at each level to detect the nesting depth
 * of a coordinate tree whose leaves are all numbers. Returns `null` if `raw`
 * is not a non-empty array-of-numbers / array-of-arrays-of-numbers / ... tree.
 *
 * Fully validates the tree — at every level, every sibling must match the
 * shape detected via the first-element probe. This gives callers the
 * "never throws" contract of `coerceCoordinates`.
 */
function detectDepth(raw: unknown): 1 | 2 | 3 | 4 | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  // Depth 1 — every element is a number.
  if (raw.every((v) => typeof v === 'number')) {
    return 1;
  }

  // Every element must itself be a non-empty array.
  if (!raw.every((v) => Array.isArray(v) && v.length > 0)) {
    return null;
  }

  // Depth 2 — every inner element of every inner array is a number.
  if ((raw as unknown[][]).every((inner) => inner.every((v) => typeof v === 'number'))) {
    return 2;
  }

  // Every inner element must itself be a non-empty array.
  if (!(raw as unknown[][]).every((inner) => inner.every((v) => Array.isArray(v) && (v as unknown[]).length > 0))) {
    return null;
  }

  // Depth 3 — every leaf is a number.
  if ((raw as unknown[][][]).every((outer) => outer.every((inner) => inner.every((v) => typeof v === 'number')))) {
    return 3;
  }

  // Depth 4 — every innermost element must be a non-empty array of numbers.
  if ((raw as unknown[][][]).every((outer) => outer.every((inner) => inner.every((point) => Array.isArray(point) && (point as unknown[]).length > 0 && (point as unknown[]).every((v) => typeof v === 'number'))))) {
    return 4;
  }

  return null;
}

/**
 * Calculate bounds from an array of GeoJSON-like features.
 *
 * @param features Array of features with a structural `geometry` field.
 * @returns Bounds [minLon, minLat, maxLon, maxLat] or null if no valid coordinates.
 */
export function calculateBounds(
  features: ReadonlyArray<BoundsInputFeature>
): Bounds | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    if (!feature.geometry) {
      continue;
    }
    const coords = coerceCoordinates(feature.geometry.coordinates);
    if (coords === null) {
      continue;
    }
    for (const [lon, lat] of extractCoordinates(feature.geometry.type, coords)) {
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
  if (!a) {return b;}
  if (!b) {return a;}

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
 * Extract all [lon, lat] coordinate pairs from a typed CoordinateTree.
 *
 * Dispatches on the geometry `type` string. Each branch expects a specific
 * depth of `CoordinateTree`; if the actual shape (post-gate) does not match
 * the declared geometry type, the branch no-ops — we trust the gate's depth
 * over the feature's claimed type.
 */
function extractCoordinates(
  type: string,
  coordinates: CoordinateTree
): [number, number][] {
  const coords: [number, number][] = [];

  switch (type) {
    case 'Point': {
      if (isDepth1(coordinates)) {
        pushPoint(coords, coordinates);
      }
      break;
    }

    case 'LineString':
    case 'MultiPoint': {
      if (isDepth2(coordinates)) {
        for (const point of coordinates) {
          pushPoint(coords, point);
        }
      }
      break;
    }

    case 'Polygon':
    case 'MultiLineString': {
      if (isDepth3(coordinates)) {
        for (const ring of coordinates) {
          for (const point of ring) {
            pushPoint(coords, point);
          }
        }
      }
      break;
    }

    case 'MultiPolygon': {
      if (isDepth4(coordinates)) {
        for (const polygon of coordinates) {
          for (const ring of polygon) {
            for (const point of ring) {
              pushPoint(coords, point);
            }
          }
        }
      }
      break;
    }
  }

  return coords;
}

function pushPoint(out: [number, number][], point: number[]): void {
  const lon = point[0];
  const lat = point[1];
  if (typeof lon === 'number' && typeof lat === 'number') {
    out.push([lon, lat]);
  }
}

function isDepth1(v: CoordinateTree): v is number[] {
  return v.length > 0 && typeof v[0] === 'number';
}

function isDepth2(v: CoordinateTree): v is number[][] {
  return v.length > 0 && Array.isArray(v[0]) && typeof (v[0] as unknown[])[0] === 'number';
}

function isDepth3(v: CoordinateTree): v is number[][][] {
  return (
    v.length > 0 &&
    Array.isArray(v[0]) &&
    Array.isArray((v[0] as unknown[])[0]) &&
    typeof ((v[0] as unknown[])[0] as unknown[])[0] === 'number'
  );
}

function isDepth4(v: CoordinateTree): v is number[][][][] {
  return (
    v.length > 0 &&
    Array.isArray(v[0]) &&
    Array.isArray((v[0] as unknown[])[0]) &&
    Array.isArray(((v[0] as unknown[])[0] as unknown[])[0]) &&
    typeof (((v[0] as unknown[])[0] as unknown[])[0] as unknown[])[0] === 'number'
  );
}
