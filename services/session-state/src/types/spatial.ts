/**
 * Spatial state types for session state management.
 * Feature: 024-document-session-state
 */

/**
 * A geographic coordinate [longitude, latitude].
 */
export type Coordinate = [number, number];

/**
 * Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-013).
 * Coordinates are in clockwise order: [NW, NE, SE, SW].
 */
export interface ViewportPolygon {
  coordinates: [Coordinate, Coordinate, Coordinate, Coordinate];
}

/**
 * Validate that coordinates are within valid geographic bounds.
 * Longitude: [-180, 180], Latitude: [-90, 90]
 */
export function validateCoordinate(coord: Coordinate): boolean {
  const [lon, lat] = coord;
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

/**
 * Validate all coordinates in a viewport polygon.
 */
export function validateViewportPolygon(viewport: ViewportPolygon): boolean {
  return viewport.coordinates.every(validateCoordinate);
}

/**
 * Calculate the center point of a viewport polygon.
 */
export function calculateViewportCenter(viewport: ViewportPolygon): Coordinate {
  const [nw, ne, se, sw] = viewport.coordinates;
  const lon = (nw[0] + ne[0] + se[0] + sw[0]) / 4;
  const lat = (nw[1] + ne[1] + se[1] + sw[1]) / 4;
  return [lon, lat];
}

/**
 * Spatial state slice (FR-012 through FR-015).
 */
export interface SpatialSlice {
  /** Visible map area as 4-corner polygon (FR-012) */
  viewport: ViewportPolygon | null;
  /** Map rotation in degrees 0-360 (FR-013) */
  rotation: number;
}

/**
 * Default spatial state values.
 */
export const DEFAULT_SPATIAL_SLICE: SpatialSlice = {
  viewport: null,
  rotation: 0,
};

/**
 * Spatial slice actions for state updates.
 */
export interface SpatialActions {
  setViewport: (viewport: ViewportPolygon | null) => void;
  setRotation: (rotation: number) => void;
  /** Get the derived center point (not stored) */
  getCenter: () => Coordinate | null;
}

/**
 * Normalize rotation to [0, 360) range.
 */
export function normalizeRotation(rotation: number): number {
  let normalized = rotation % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}
