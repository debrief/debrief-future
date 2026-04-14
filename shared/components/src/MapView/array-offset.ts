/**
 * Array offset calculations for towed-array sensors.
 *
 * Three array centre modes determine where a sensor's bearing lines originate:
 *   - PLAIN: backtrack along the vessel's heading by the offset distance
 *   - WORM: walk backwards along the vessel's track path by the offset distance
 *   - MEASURED: interpolate from the sensor's measured position time-series,
 *               with fallback to PLAIN when the contact timestamp falls
 *               outside the measured range
 *
 * All calculations are pure functions with identical behaviour to the Python
 * implementation in services/calc/debrief_calc/tools/sensor/array_offset.py.
 * Parity is verified by cross-language golden tests.
 */

import type { SensorData } from '@debrief/schemas';
import { geodesicDestination, interpolateTrackCourse, interpolateTrackPosition } from './sensor-utils';
import { findNearestPointIndex } from './temporal-utils';

/** Mean Earth radius in metres (matches Python haversine_distance_metres) */
const EARTH_RADIUS_METRES = 6_371_000;

/**
 * Geodesic distance between two points in metres.
 *
 * Uses the haversine formula with the mean Earth radius (6371000m).
 *
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @returns Distance in metres
 */
export function haversineDistanceMetres(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dPhi = (lat2 - lat1) * toRad;
  const dLambda = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METRES * c;
}

/**
 * PLAIN mode: backtrack from the vessel's position along its heading.
 *
 * The reverse bearing is `(courseDeg + 180) mod 360`. The array centre is the
 * geodesic destination from the vessel at that reverse bearing, at the offset
 * distance.
 *
 * @param hostPosition Vessel position [lon, lat]
 * @param courseDeg Vessel heading (degrees, 0-360)
 * @param offsetMetres Backtrack distance in metres (must be >= 0)
 * @returns Array centre [lon, lat]
 */
export function computePlainOffset(
  hostPosition: [number, number],
  courseDeg: number,
  offsetMetres: number,
): [number, number] {
  if (offsetMetres <= 0) return hostPosition;
  const reverseBearing = ((courseDeg + 180) % 360 + 360) % 360;
  return geodesicDestination(hostPosition, reverseBearing, offsetMetres);
}

/**
 * WORM mode: walk backward along the vessel's track path.
 *
 * Starts at the interpolated vessel position at the contact time, then walks
 * backward through track segments accumulating geodesic distances until the
 * offset distance is reached. If the track is exhausted before reaching the
 * offset, the array centre is placed at the earliest available track point.
 *
 * @param trackCoordinates Track geometry coordinates [lon, lat][]
 * @param trackPositions Track positions with ISO-8601 timestamps
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param offsetMetres Distance to walk backward along the track path
 * @returns Array centre [lon, lat] on the track path
 */
export function backtrackAlongTrack(
  trackCoordinates: [number, number][],
  trackPositions: Array<{ time: string }>,
  contactTimeMs: number,
  offsetMetres: number,
): [number, number] {
  if (trackCoordinates.length === 0) {
    throw new Error('backtrackAlongTrack: empty track coordinates');
  }
  if (trackCoordinates.length === 1 || offsetMetres <= 0) {
    return trackCoordinates[0]!;
  }

  // Interpolate starting point at contact time (falls back to earliest when out of range)
  const startPoint =
    interpolateTrackPosition(trackCoordinates, trackPositions, contactTimeMs) ??
    trackCoordinates[0]!;

  // Determine starting segment index: the largest index i where positions[i].time <= contactTimeMs
  const timestamps = trackPositions.map((p) => Date.parse(p.time));
  let startIdx = 0;
  if (contactTimeMs >= timestamps[timestamps.length - 1]!) {
    startIdx = trackCoordinates.length - 1;
  } else if (contactTimeMs <= timestamps[0]!) {
    return trackCoordinates[0]!;
  } else {
    const nearest = findNearestPointIndex(timestamps, contactTimeMs);
    startIdx = timestamps[nearest]! <= contactTimeMs ? nearest : nearest - 1;
    if (startIdx < 0) startIdx = 0;
  }

  let remaining = offsetMetres;
  let currentPoint: [number, number] = [startPoint[0], startPoint[1]];

  for (let i = startIdx; i >= 1; i--) {
    const prevPoint = trackCoordinates[i - 1]!;
    const segLen = haversineDistanceMetres(
      currentPoint[0],
      currentPoint[1],
      prevPoint[0],
      prevPoint[1],
    );

    if (segLen === 0) {
      currentPoint = prevPoint;
      continue;
    }

    if (remaining <= segLen) {
      const fraction = remaining / segLen;
      return [
        currentPoint[0] + (prevPoint[0] - currentPoint[0]) * fraction,
        currentPoint[1] + (prevPoint[1] - currentPoint[1]) * fraction,
      ];
    }

    remaining -= segLen;
    currentPoint = prevPoint;
  }

  // Track exhausted: return the earliest point on the track
  return trackCoordinates[0]!;
}

/**
 * MEASURED mode: interpolate from the sensor's measured position time-series.
 *
 * If the contact time is outside the measured range, returns null so the
 * caller can fall back to PLAIN mode (FR-004).
 *
 * Measured positions are sorted by time before lookup to handle unordered input.
 *
 * @param measuredPositions Time-series of measured array positions
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @returns Interpolated [lon, lat], or null if out of measured range
 */
export function interpolateMeasuredPosition(
  measuredPositions: Array<{ time: string; location: number[] }>,
  contactTimeMs: number,
): [number, number] | null {
  if (!measuredPositions || measuredPositions.length === 0) return null;

  const parsed = measuredPositions
    .map((p) => ({ t: Date.parse(p.time), lon: p.location[0]!, lat: p.location[1]! }))
    .filter((p) => !isNaN(p.t))
    .sort((a, b) => a.t - b.t);

  if (parsed.length === 0) return null;

  const first = parsed[0]!;
  const last = parsed[parsed.length - 1]!;

  if (contactTimeMs < first.t || contactTimeMs > last.t) return null;

  if (contactTimeMs === first.t) return [first.lon, first.lat];
  if (contactTimeMs === last.t) return [last.lon, last.lat];

  // Linear search for bracketing pair (arrays are typically small)
  for (let i = 0; i < parsed.length - 1; i++) {
    const a = parsed[i]!;
    const b = parsed[i + 1]!;
    if (contactTimeMs >= a.t && contactTimeMs <= b.t) {
      if (a.t === b.t) return [a.lon, a.lat];
      const fraction = (contactTimeMs - a.t) / (b.t - a.t);
      return [a.lon + (b.lon - a.lon) * fraction, a.lat + (b.lat - a.lat) * fraction];
    }
  }

  return null;
}

/**
 * Primary dispatch function: compute the array centre for a sensor contact.
 *
 * Resolution order:
 *   1. If `sensor.offset` is null/undefined/0 → return host position unchanged
 *   2. If `sensor.array_centre_mode` is null/undefined → return host position unchanged
 *   3. Otherwise dispatch on `sensor.array_centre_mode`:
 *      - PLAIN: computePlainOffset()
 *      - WORM: backtrackAlongTrack()
 *      - MEASURED: interpolateMeasuredPosition(), falling back to PLAIN when null
 *
 * When mode is PLAIN or MEASURED fallback and `courseDeg` is null, the host
 * position is returned unchanged (no heading available to backtrack along).
 *
 * @param hostPosition Interpolated vessel position [lon, lat]
 * @param courseDeg Vessel course at contact time (degrees) or null
 * @param sensor Parent SensorData (provides offset, mode, measured_positions)
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param trackCoordinates Track geometry coordinates
 * @param trackPositions Track positions with timestamps
 * @returns Array centre [lon, lat]
 */
export function computeArrayCentre(
  hostPosition: [number, number],
  courseDeg: number | null,
  sensor: SensorData,
  contactTimeMs: number,
  trackCoordinates: [number, number][],
  trackPositions: Array<{ time: string }>,
): [number, number] {
  const offset = sensor.offset;
  const mode = sensor.array_centre_mode;

  if (offset === null || offset === undefined || offset <= 0) return hostPosition;
  if (mode === null || mode === undefined) return hostPosition;

  if (mode === 'PLAIN') {
    if (courseDeg === null) return hostPosition;
    return computePlainOffset(hostPosition, courseDeg, offset);
  }

  if (mode === 'WORM') {
    if (trackCoordinates.length === 0) return hostPosition;
    return backtrackAlongTrack(trackCoordinates, trackPositions, contactTimeMs, offset);
  }

  if (mode === 'MEASURED') {
    const measured = sensor.measured_positions;
    if (measured && measured.length > 0) {
      const interp = interpolateMeasuredPosition(measured, contactTimeMs);
      if (interp !== null) return interp;
    }
    // Fallback to PLAIN
    if (courseDeg === null) return hostPosition;
    return computePlainOffset(hostPosition, courseDeg, offset);
  }

  // Unknown mode — behave as if no offset applies
  return hostPosition;
}

/**
 * Convenience helper to resolve the course at a contact timestamp.
 * Wraps `interpolateTrackCourse` for symmetry with the Python side.
 */
export function resolveCourse(
  positions: Array<{ time: string; course?: number }>,
  contactTimeMs: number,
): number | null {
  return interpolateTrackCourse(positions, contactTimeMs);
}
