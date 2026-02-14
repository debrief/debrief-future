import type { DrawingMode } from '../LeafletToolbar';

/**
 * Validates that a GeoJSON feature from Geoman has a valid geometry for the given drawing mode.
 *
 * - Point mode: geometry must be type "Point" with valid [lon, lat] coordinates
 * - Rectangle mode: geometry must be type "Polygon" with >= 5 coordinates in a closed ring
 *   and non-zero bounding area (rejects degenerate click-without-drag rectangles)
 * - All other modes: returns false (not handled by this feature)
 */
export function isValidDrawnGeometry(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
): boolean {
  if (!geojson.geometry) return false;

  if (mode === 'point') {
    if (geojson.geometry.type !== 'Point') return false;
    const coords = (geojson.geometry as GeoJSON.Point).coordinates;
    return (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === 'number' &&
      typeof coords[1] === 'number' &&
      isFinite(coords[0]) &&
      isFinite(coords[1])
    );
  }

  if (mode === 'rectangle') {
    if (geojson.geometry.type !== 'Polygon') return false;
    const rings = (geojson.geometry as GeoJSON.Polygon).coordinates;
    if (!Array.isArray(rings) || rings.length === 0) return false;
    const ring = rings[0];
    if (!Array.isArray(ring) || ring.length < 5) return false;

    // Check non-zero area via bounding box
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2) return false;
      const [lon, lat] = coord;
      if (typeof lon !== 'number' || typeof lat !== 'number') return false;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    return (maxLon - minLon) > 0 && (maxLat - minLat) > 0;
  }

  // Other modes not handled by this feature
  return false;
}
