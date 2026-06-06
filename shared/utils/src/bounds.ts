/**
 * Unified Bounds Utility Module — `@debrief/utils/bounds`
 *
 * Single canonical home for every bounds-related helper in the Debrief
 * monorepo. Consolidates the previous `shared/components/src/utils/bounds.ts`
 * copy into this module (feature 219, backlog #213).
 *
 * ## Supported feature-type families
 *
 * The input type for `calculateBounds` (and the other array-accepting helpers)
 * is a structural minimum (`BoundsInputFeature`) that is satisfied without
 * casts by all four input shapes used across the monorepo:
 *
 *   - `DebriefFeature[]`           — LinkML-generated; from `@debrief/schemas`
 *   - `IngressFeature[]`           — schema-derived permissive boundary (`geometry: …| null`); from `@debrief/schemas`
 *   - `RawGeoJSONFeature[]`         — raw JSON parse; from `@debrief/schemas`
 *   - `DebriefFeatureCollection`   — collection object; auto-unwrapped to `.features[]` inside `calculateBounds`
 *
 * This module does **not** re-export any of the above types — each caller
 * imports its preferred family from its canonical location and passes it in.
 * The structural minimum keeps this module decoupled from the LinkML
 * `DebriefFeature` schema (Article II compliance).
 *
 * ## Public surface (9 functions)
 *
 *   calculateBounds, mergeBounds, boundsToLeaflet, isValidBounds  — existing
 *   expandBounds, isPointInBounds, bboxOverlapsViewport,
 *   viewportToBounds, filterBySpatialExtent                       — migrated from shared/components
 */

import type { Bounds } from './types.js';
import type { ViewportPolygon } from '@debrief/schemas';

// Re-export Bounds type for convenience
export type { Bounds };

/**
 * Structural minimum shape `calculateBounds` reads from each input element.
 *
 * Private to this module — it is **not** exported from `@debrief/utils`. Keeping
 * it private avoids committing to a third public feature type alongside
 * `RawGeoJSONFeature` and `IngressFeature`. Every in-tree feature type
 * (`RawGeoJSONFeature` and `IngressFeature` from `@debrief/schemas`,
 * `DebriefFeature` and its variants) is assignable to
 * `ReadonlyArray<BoundsInputFeature>` via TypeScript's structural subtyping —
 * so no call site needs an `as`-cast.
 *
 * The optional `bbox` field supports the pre-computed-bbox fast-path (FR-008):
 * when a feature carries a valid 4-number bbox tuple, `calculateBounds` uses
 * it directly and skips the per-coordinate walk for that feature.
 */
type BoundsInputFeature = {
  geometry?: { type: string; coordinates: unknown } | null | undefined;
  bbox?: readonly number[] | null | undefined;
};

/**
 * Accepted input shapes for `calculateBounds` (FR-001).
 *
 * - A plain array (or readonly array) of features — the common case.
 * - A FeatureCollection-shaped object with a `features` array — so callers
 *   holding a `DebriefFeatureCollection` or a raw GeoJSON `FeatureCollection`
 *   can pass it directly without unwrapping to `.features[]` first.
 *
 * `calculateBounds` auto-unwraps the collection form at the top of its body.
 */
type BoundsInput =
  | ReadonlyArray<BoundsInputFeature>
  | { features: ReadonlyArray<BoundsInputFeature> };

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
 * Private narrowing predicate for the pre-computed-bbox fast-path.
 *
 * Returns `true` iff `value` is a `Bounds`-shaped array: length ≥ 4, all four
 * positional elements are finite numbers. Zero `any`, zero `as`-casts —
 * the `value is Bounds` guard gives callers a typed view after checking.
 */
function isValidBboxTuple(value: unknown): value is Bounds {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Number.isFinite(value[2]) &&
    Number.isFinite(value[3])
  );
}

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

function isFeatureCollectionInput(
  v: BoundsInput,
): v is { features: ReadonlyArray<BoundsInputFeature> } {
  return !Array.isArray(v);
}

/**
 * Calculate bounds from an array of GeoJSON-like features or a FeatureCollection.
 *
 * Accepts any of the four supported input shapes without casts:
 * `DebriefFeature[]`, `IngressFeature[]`, `RawGeoJSONFeature[]`, and
 * `DebriefFeatureCollection` / plain GeoJSON `FeatureCollection` objects.
 * FeatureCollection-shaped inputs are auto-unwrapped to their `.features` array
 * at the top of the function body (FR-001).
 *
 * When a feature carries a valid pre-computed `feature.bbox`, the fast-path
 * uses it directly and skips the per-coordinate walk for that feature, keeping
 * map-fit latency O(n features) for STAC-style collections.
 *
 * @param input Array of features, or a FeatureCollection-shaped object.
 * @returns Bounds [minLon, minLat, maxLon, maxLat] or null if no valid coordinates.
 */
export function calculateBounds(
  input: BoundsInput
): Bounds | null {
  const features = isFeatureCollectionInput(input) ? input.features : input;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    if (!feature.geometry) {
      continue;
    }

    // Pre-computed bbox fast-path (FR-008): honour feature.bbox when valid,
    // skip coordinate walk for this feature. Falls back to coordinate walk for
    // absent, null, or malformed bbox (FR-009).
    if (feature.bbox !== undefined && feature.bbox !== null && isValidBboxTuple(feature.bbox)) {
      const [fMinLon, fMinLat, fMaxLon, fMaxLat] = feature.bbox;
      minLon = Math.min(minLon, fMinLon);
      minLat = Math.min(minLat, fMinLat);
      maxLon = Math.max(maxLon, fMaxLon);
      maxLat = Math.max(maxLat, fMaxLat);
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
export function viewportToBounds(viewport: ViewportPolygon): Bounds | null {
  const coords = viewport.coordinates;
  const lons = coords.map((c) => c.longitude);
  const lats = coords.map((c) => c.latitude);

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
