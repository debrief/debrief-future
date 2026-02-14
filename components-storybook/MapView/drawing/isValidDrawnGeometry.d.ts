import { DrawingMode } from '../LeafletToolbar';

/**
 * Validates that a GeoJSON feature from Geoman has a valid geometry for the given drawing mode.
 *
 * - Point mode: geometry must be type "Point" with valid [lon, lat] coordinates
 * - Rectangle mode: geometry must be type "Polygon" with >= 5 coordinates in a closed ring
 *   and non-zero bounding area (rejects degenerate click-without-drag rectangles)
 * - Polygon mode: geometry must be type "Polygon" with >= 4 coordinates in a closed ring
 *   (3 unique vertices + closure point), all finite numbers
 * - Polyline mode: geometry must be type "LineString" with >= 2 coordinate pairs, all finite
 */
export declare function isValidDrawnGeometry(geojson: GeoJSON.Feature, mode: DrawingMode): boolean;
//# sourceMappingURL=isValidDrawnGeometry.d.ts.map