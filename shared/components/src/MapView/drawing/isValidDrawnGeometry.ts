import type { DrawingMode } from '../LeafletToolbar';

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

  if (mode === 'polygon') {
    if (geojson.geometry.type !== 'Polygon') return false;
    const rings = (geojson.geometry as GeoJSON.Polygon).coordinates;
    if (!Array.isArray(rings) || rings.length === 0) return false;
    const ring = rings[0];
    // Need at least 4 coords: 3 unique vertices + closure point
    if (!Array.isArray(ring) || ring.length < 4) return false;

    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2) return false;
      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') return false;
      if (!isFinite(coord[0]) || !isFinite(coord[1])) return false;
    }
    return true;
  }

  if (mode === 'polyline') {
    if (geojson.geometry.type !== 'LineString') return false;
    const coords = (geojson.geometry as GeoJSON.LineString).coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return false;

    for (const coord of coords) {
      if (!Array.isArray(coord) || coord.length < 2) return false;
      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') return false;
      if (!isFinite(coord[0]) || !isFinite(coord[1])) return false;
    }
    return true;
  }

  return false;
}
