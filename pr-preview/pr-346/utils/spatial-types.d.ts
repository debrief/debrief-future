/**
 * Spatial and temporal types used by the browser filter system.
 * Feature: 132-three-view-sync
 *
 * These are local copies of types from @debrief/session-state to avoid
 * a cross-workspace build dependency. They must stay structurally compatible.
 */
/** A geographic coordinate [longitude, latitude]. */
export type Coordinate = [number, number];
/**
 * Geographic area as a 4-corner polygon supporting rotated views.
 * Coordinates are in clockwise order: [NW, NE, SE, SW].
 */
export interface ViewportPolygon {
    coordinates: [Coordinate, Coordinate, Coordinate, Coordinate];
    /** Map zoom level for restoring the view */
    zoom?: number;
}
/**
 * Constraints on the visible time window.
 * Uses plain epoch milliseconds (Review Decision 5C).
 */
export interface TimeFilter {
    start: number | null;
    end: number | null;
}
//# sourceMappingURL=spatial-types.d.ts.map