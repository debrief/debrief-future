/**
 * Spatial validators and viewport centre calculation, operating on the
 * canonical object form `{ longitude, latitude }`. Feature 203.
 *
 * Moved from `services/session-state/src/types/spatial.ts` (tuple-form input)
 * so that components and session-state can share a single implementation
 * without a cross-workspace dependency on session-state.
 */

import type { Coordinate, ViewportPolygon } from '@debrief/schemas';

/**
 * Validate that a coordinate lies within valid geographic bounds.
 *
 * Returns `false` rather than throwing on out-of-bounds input — callers
 * decide how to react (log, drop, refuse rehydration, etc.).
 *
 * @param coord — Coordinate object to check.
 * @returns true iff longitude ∈ [-180, 180] AND latitude ∈ [-90, 90].
 */
export function validateCoordinate(coord: Coordinate): boolean {
  return (
    coord.longitude >= -180 &&
    coord.longitude <= 180 &&
    coord.latitude >= -90 &&
    coord.latitude <= 90
  );
}

/**
 * Validate a viewport polygon.
 *
 * The LinkML source fixes cardinality at exactly 4 (NW/NE/SE/SW). The
 * TypeScript generator relaxes this to `Coordinate[]`, so the 4-corner
 * constraint is enforced here at runtime (FR-020).
 *
 * @param viewport — ViewportPolygon object.
 * @returns true iff:
 *   - viewport.coordinates has exactly 4 entries
 *   - every entry passes validateCoordinate
 */
export function validateViewportPolygon(viewport: ViewportPolygon): boolean {
  if (viewport.coordinates.length !== 4) return false;
  return viewport.coordinates.every(validateCoordinate);
}

/**
 * Calculate the geometric centre of a viewport polygon by averaging the
 * four corners.
 *
 * Assumes a valid 4-corner viewport. The generated TypeScript type relaxes
 * cardinality to `Coordinate[]` (FR-020) so the non-null assertions below
 * document the runtime invariant enforced by `validateViewportPolygon`.
 *
 * @param viewport — ViewportPolygon object assumed to be valid (4 corners).
 * @returns A Coordinate at the viewport's centre.
 */
export function calculateViewportCenter(viewport: ViewportPolygon): Coordinate {
  const coords = viewport.coordinates;
  const nw = coords[0]!;
  const ne = coords[1]!;
  const se = coords[2]!;
  const sw = coords[3]!;
  return {
    longitude: (nw.longitude + ne.longitude + se.longitude + sw.longitude) / 4,
    latitude: (nw.latitude + ne.latitude + se.latitude + sw.latitude) / 4,
  };
}
