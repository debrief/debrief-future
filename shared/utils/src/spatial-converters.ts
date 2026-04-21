/**
 * Spatial converters between the canonical Coordinate object form and the
 * GeoJSON tuple form. Feature 203.
 *
 * The canonical form is `{ longitude: number, latitude: number }` (LinkML
 * source). GeoJSON wire-format uses `[longitude, latitude]` tuples per
 * RFC 7946 §3.1.1. Leaflet `LatLng` uses the opposite order —
 * `[latitude, longitude]` — so callers crossing the Leaflet boundary MUST
 * use Leaflet's own constructors (`L.latLng(...)`), not these helpers.
 */

import type { Coordinate } from '@debrief/schemas';

/**
 * Convert a canonical Coordinate object to a GeoJSON position tuple.
 *
 * Returns the coordinate in **GeoJSON axis order** — [longitude, latitude] —
 * per RFC 7946 §3.1.1. This is NOT the same order as Leaflet's LatLng
 * (which is [latitude, longitude]).
 *
 * Pure; deterministic; no validation. Callers needing validation call
 * `validateCoordinate` explicitly.
 *
 * @param coord — Canonical coordinate with named longitude/latitude fields.
 * @returns A length-2 tuple [longitude, latitude].
 */
export function toGeoJSONCoord(coord: Coordinate): [number, number] {
  return [coord.longitude, coord.latitude];
}

/**
 * Convert a GeoJSON position tuple to a canonical Coordinate object.
 *
 * Accepts the tuple in **GeoJSON axis order** — [longitude, latitude] —
 * per RFC 7946 §3.1.1. For Leaflet's [lat, lng] order, use `L.latLng`
 * directly rather than this helper.
 *
 * @param tuple — A length-2 tuple [longitude, latitude].
 * @returns A Coordinate object.
 */
export function fromGeoJSONCoord(tuple: [number, number]): Coordinate {
  return { longitude: tuple[0], latitude: tuple[1] };
}
