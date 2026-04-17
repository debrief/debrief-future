/**
 * Low-level geodesic and track-interpolation primitives.
 *
 * Extracted from sensor-utils.ts so that array-offset.ts can depend on
 * these primitives without the reverse edge — breaking the
 * sensor-utils ↔ array-offset circular import.
 *
 * These functions are pure and have Python parity counterparts in
 * services/calc/debrief_calc/tools/sensor/array_offset.py.
 */

import { findNearestPointIndex } from './temporal-utils';

/** Mean Earth radius in metres. Matches Python haversine_distance_metres. */
const EARTH_RADIUS = 6_371_000;

/**
 * Calculate the destination point given start point, bearing, and distance.
 * Uses haversine formula for geodesic accuracy.
 *
 * @param origin [lon, lat] starting point
 * @param bearing Degrees from north (0-360)
 * @param distanceMetres Distance in metres
 * @returns [lon, lat] destination point
 */
export function geodesicDestination(
  origin: [number, number],
  bearing: number,
  distanceMetres: number,
): [number, number] {
  const [lon, lat] = origin;
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const lat1 = lat * toRad;
  const lon1 = lon * toRad;
  const brng = bearing * toRad;
  const d = distanceMetres / EARTH_RADIUS;

  const sinD = Math.sin(d);
  const cosD = Math.cos(d);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const lat2 = Math.asin(sinLat1 * cosD + cosLat1 * sinD * Math.cos(brng));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * sinD * cosLat1,
      cosD - sinLat1 * Math.sin(lat2),
    );

  return [lon2 * toDeg, lat2 * toDeg];
}

/**
 * Interpolate the host track's position at a given timestamp.
 * Uses binary search + linear interpolation on the positions/coordinates arrays.
 *
 * @param coordinates Array of [lon, lat] from track geometry
 * @param positions Array of { time: string } from track properties
 * @param targetTimeMs Target timestamp (epoch ms)
 * @returns [lon, lat] interpolated position, or null if time is out of range
 */
export function interpolateTrackPosition(
  coordinates: [number, number][],
  positions: Array<{ time: string }>,
  targetTimeMs: number,
): [number, number] | null {
  if (coordinates.length === 0 || positions.length === 0) return null;
  if (coordinates.length !== positions.length) return null;

  const timestamps = positions.map((p) => Date.parse(p.time));

  if (targetTimeMs < timestamps[0]! || targetTimeMs > timestamps[timestamps.length - 1]!) {
    return null;
  }

  const idx = findNearestPointIndex(timestamps, targetTimeMs);

  if (timestamps[idx] === targetTimeMs) {
    return coordinates[idx]!;
  }

  let lowIdx: number;
  let highIdx: number;
  if (timestamps[idx]! < targetTimeMs) {
    lowIdx = idx;
    highIdx = idx + 1;
  } else {
    lowIdx = idx - 1;
    highIdx = idx;
  }

  if (lowIdx < 0 || highIdx >= timestamps.length) {
    return coordinates[idx]!;
  }

  const t0 = timestamps[lowIdx]!;
  const t1 = timestamps[highIdx]!;
  const dt = t1 - t0;
  if (dt === 0) return coordinates[lowIdx]!;

  const fraction = (targetTimeMs - t0) / dt;
  const [lon0, lat0] = coordinates[lowIdx]!;
  const [lon1, lat1] = coordinates[highIdx]!;

  return [
    lon0 + (lon1 - lon0) * fraction,
    lat0 + (lat1 - lat0) * fraction,
  ];
}

/**
 * Interpolate the host track's course at a given timestamp.
 * Returns course in degrees, or null if time is out of range.
 */
export function interpolateTrackCourse(
  positions: Array<{ time: string; course?: number }>,
  targetTimeMs: number,
): number | null {
  if (positions.length === 0) return null;

  const timestamps = positions.map((p) => Date.parse(p.time));

  if (targetTimeMs < timestamps[0]! || targetTimeMs > timestamps[timestamps.length - 1]!) {
    return null;
  }

  const idx = findNearestPointIndex(timestamps, targetTimeMs);
  const pos = positions[idx];
  return pos?.course ?? null;
}
