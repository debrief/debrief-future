/**
 * Sensor rendering utility functions.
 *
 * Core algorithms for sensor bearing line rendering:
 * - Colour parsing and manipulation (hex ↔ RGB, darkening, snail fade)
 * - Geodesic bearing line geometry (haversine destination)
 * - Host track position interpolation at contact timestamps
 * - Contact preparation pipeline (filtering, origin computation, far-end computation)
 * - Snail mode proportion calculation
 * - Label position calculation
 * - Sensor arc geometry
 */

import type { SensorContact, SensorData, TrackFeature } from '@debrief/schemas';
import type { DisplayMode } from '../utils/types';
import { findNearestPointIndex } from './temporal-utils';

// ── Constants ───────────────────────────────────────────────────────

/** Maximum bearing line extent when no range is specified (5 degrees of latitude in metres) */
export const MAXIMUM_SENSOR_BEARING_RANGE = 5 * 111_120; // ~555,600 metres

/** Earth radius in metres for haversine calculations */
const EARTH_RADIUS = 6_371_000;

/** Factor for darkening colours (matches Java Color.darker()) */
const DARKEN_FACTOR = 0.7;

/** Default sensor colour when no colour is specified at any level */
export const DEFAULT_SENSOR_COLOR = '#FF0000';

/** Mapping from LineStyleEnum to canvas dash arrays */
export const LINE_STYLE_DASH_ARRAYS: Record<string, number[] | null> = {
  SOLID: null,
  DASHED: [10, 5],
  DOT: [2, 5],
  DASH_DOT: [10, 5, 2, 5],
};

// ── Rendering Types ─────────────────────────────────────────────────

/** Pre-computed rendering data for a single sensor contact */
export interface SensorRenderContact {
  contactIndex: number;
  origin: [number, number];
  timeMs: number;
  bearing: number;
  farEnd: [number, number];
  ambiguousFarEnd: [number, number] | null;
  range: number | null;
  label: string | null;
  showLabel: boolean;
  putLabelAt: string;
  labelLocation: string;
  color: string;
  darkenedColor: string;
  lineStyle: string;
  lineThickness: number;
  hasAmbiguous: boolean;
}

/** Pre-computed rendering data for a sensor arc (coverage fan) */
export interface SensorArcRenderData {
  origin: [number, number];
  leftAngle: number;
  rightAngle: number;
  innerRange: number;
  outerRange: number;
  startTimeMs: number;
  endTimeMs: number;
  color: string;
  fillOpacity: number;
}

/** Props for the SensorBearingLayer React component */
export interface SensorBearingLayerProps {
  feature: TrackFeature;
  currentTime?: number;
  displayMode?: DisplayMode;
  isSelected?: boolean;
  hiddenIds?: Set<string>;
}

// ── Colour Utilities ────────────────────────────────────────────────

/**
 * Parse a hex colour string into RGB components.
 *
 * Supports 3-digit (#RGB), 6-digit (#RRGGBB), and without hash prefix.
 */
export function parseHexColor(hex: string): [number, number, number] {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

/**
 * Convert RGB components to hex colour string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

/**
 * Produce a darker shade of the given colour.
 * Matches Java's Color.darker() which multiplies RGB by 0.7.
 */
export function darkenColor(color: string): string {
  const [r, g, b] = parseHexColor(color);
  return rgbToHex(r * DARKEN_FACTOR, g * DARKEN_FACTOR, b * DARKEN_FACTOR);
}

/**
 * Apply snail mode fading to a base colour.
 *
 * @param baseColor Hex colour string
 * @param proportion Fade proportion: 1.0 = newest (full colour), 0.0 = oldest (black)
 * @returns Hex colour with faded RGB values
 */
export function applySnailFade(baseColor: string, proportion: number): string {
  const p = Math.max(0, Math.min(1, proportion));
  const [r, g, b] = parseHexColor(baseColor);
  return rgbToHex(r * p, g * p, b * p);
}

// ── Snail Mode ──────────────────────────────────────────────────────

/**
 * Calculate snail mode proportion for a contact.
 *
 * @param contactTimeMs Contact timestamp (epoch ms)
 * @param currentTimeMs Current display time (epoch ms)
 * @param trailLengthMs Trail window length (ms)
 * @returns Proportion [0, 1] or null if contact is outside trail window
 */
export function calculateSnailProportion(
  contactTimeMs: number,
  currentTimeMs: number,
  trailLengthMs: number,
): number | null {
  if (trailLengthMs <= 0) return null;
  const age = currentTimeMs - contactTimeMs;
  if (age < 0 || age > trailLengthMs) return null;
  return (trailLengthMs - age) / trailLengthMs;
}

// ── Bearing Geometry ────────────────────────────────────────────────

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
 * Calculate the far end of a bearing line.
 * If range is provided, uses it directly.
 * If no range, extends to MAXIMUM_SENSOR_BEARING_RANGE (5 degrees latitude).
 */
export function computeBearingFarEnd(
  origin: [number, number],
  bearing: number,
  range: number | null,
): [number, number] {
  const distance = range ?? MAXIMUM_SENSOR_BEARING_RANGE;
  return geodesicDestination(origin, bearing, distance);
}

// ── Track Position Interpolation ────────────────────────────────────

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

  // Out of range
  if (targetTimeMs < timestamps[0]! || targetTimeMs > timestamps[timestamps.length - 1]!) {
    return null;
  }

  // Find nearest index using binary search
  const idx = findNearestPointIndex(timestamps, targetTimeMs);

  // Exact match
  if (timestamps[idx] === targetTimeMs) {
    return coordinates[idx]!;
  }

  // Determine which pair to interpolate between
  let lowIdx: number;
  let highIdx: number;
  if (timestamps[idx]! < targetTimeMs) {
    lowIdx = idx;
    highIdx = idx + 1;
  } else {
    lowIdx = idx - 1;
    highIdx = idx;
  }

  // Bounds check
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

// ── Colour Inheritance ──────────────────────────────────────────────

/**
 * Resolve the colour for a sensor contact using the inheritance chain:
 * contact.color > sensor.color > track style colour > DEFAULT_SENSOR_COLOR
 */
export function resolveContactColor(
  contact: SensorContact,
  sensor: SensorData,
  trackColor: string | undefined,
): string {
  return contact.color ?? sensor.color ?? trackColor ?? DEFAULT_SENSOR_COLOR;
}

// ── Port/Starboard Bearing Determination ────────────────────────────

/**
 * Compute relative bearing from vessel course to a target bearing.
 * Returns value in range (-180, +180]:
 *   negative = port side
 *   positive = starboard side
 */
export function getRelativeBearing(courseDeg: number, bearingDeg: number): number {
  let rel = bearingDeg - courseDeg;
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;
  return rel;
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

  // Out of range
  if (targetTimeMs < timestamps[0]! || targetTimeMs > timestamps[timestamps.length - 1]!) {
    return null;
  }

  const idx = findNearestPointIndex(timestamps, targetTimeMs);
  const pos = positions[idx];
  return pos?.course ?? null;
}

/**
 * Determine whether a bearing is to the port side of the vessel.
 * Port = negative relative bearing.
 */
export function isBearingToPort(bearingDeg: number, courseDeg: number): boolean {
  return getRelativeBearing(courseDeg, bearingDeg) < 0;
}

/**
 * Assign colours for primary and ambiguous bearing lines based on
 * port/starboard convention from legacy Debrief:
 *   - Port-side bearing → base (brighter) colour
 *   - Starboard-side bearing → darker colour
 *
 * This is independent of which bearing is "primary" vs "ambiguous".
 */
export function assignAmbiguousColors(
  primaryBearing: number,
  _ambiguousBearing: number,
  courseDeg: number,
  baseColor: string,
): { primaryColor: string; ambiguousColor: string } {
  const darkColor = darkenColor(baseColor);
  const primaryIsPort = isBearingToPort(primaryBearing, courseDeg);

  if (primaryIsPort) {
    // Primary bearing is port → base colour; ambiguous is starboard → darker
    return { primaryColor: baseColor, ambiguousColor: darkColor };
  } else {
    // Primary bearing is starboard → darker; ambiguous is port → base colour
    return { primaryColor: darkColor, ambiguousColor: baseColor };
  }
}

// ── Contact Preparation Pipeline ────────────────────────────────────

/**
 * Filter and prepare sensor contacts for rendering.
 *
 * Filters by:
 * - has_bearing (must be true or undefined, defaults to true)
 * - visible (must be true or undefined, defaults to true)
 * - Time window (contact time must be within currentTime range)
 *
 * For each passing contact:
 * - Interpolates host position at contact time (or uses explicit origin)
 * - Computes bearing line far end
 * - Computes ambiguous bearing far end if applicable
 * - Resolves colour inheritance
 */
export function prepareSensorContacts(
  sensor: SensorData,
  feature: TrackFeature,
  currentTime: number | undefined,
  displayMode: DisplayMode,
  trailLengthMs: number,
): SensorRenderContact[] {
  const contacts = sensor.contacts;
  if (!contacts || contacts.length === 0) return [];

  // eslint-disable-next-line no-restricted-syntax
  const coords = feature.geometry.coordinates as unknown as [number, number][];
  const positions = feature.properties.positions;
  // eslint-disable-next-line no-restricted-syntax
  const trackColor = (feature.properties.style as unknown as Record<string, unknown>)?.line
    ? ((feature.properties.style as unknown as Record<string, unknown>).line as Record<string, unknown>)?.color as string | undefined
    : undefined;

  const result: SensorRenderContact[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]!;

    // Filter: has_bearing (defaults to true when undefined)
    if (contact.has_bearing === false) continue;

    // Filter: visible (defaults to true when undefined)
    if (contact.visible === false) continue;

    const contactTimeMs = Date.parse(contact.time);
    if (isNaN(contactTimeMs)) continue;

    // Time filter
    if (currentTime !== undefined) {
      if (displayMode === 'trail') {
        // In trail mode, only show contacts within the trail window
        const age = currentTime - contactTimeMs;
        if (age < 0 || age > trailLengthMs) continue;
      } else {
        // In full mode, show contacts up to currentTime
        if (contactTimeMs > currentTime) continue;
      }
    }

    // Compute origin: use explicit origin or interpolate from host track
    let origin: [number, number] | null = null;
    if (contact.origin && contact.origin.length >= 2) {
      origin = [contact.origin[0]!, contact.origin[1]!];
    } else {
      origin = interpolateTrackPosition(coords, positions, contactTimeMs);
    }

    if (!origin) continue;

    // Compute far end
    const farEnd = computeBearingFarEnd(origin, contact.bearing, contact.range ?? null);

    // Compute ambiguous far end
    let ambiguousFarEnd: [number, number] | null = null;
    if (
      contact.has_ambiguous !== false &&
      contact.ambiguous_bearing !== undefined &&
      contact.ambiguous_bearing !== contact.bearing
    ) {
      ambiguousFarEnd = computeBearingFarEnd(
        origin,
        contact.ambiguous_bearing,
        contact.range ?? null,
      );
    }

    const baseColor = resolveContactColor(contact, sensor, trackColor);

    // Assign colours based on port/starboard convention when ambiguous
    let primaryColor = baseColor;
    let ambiguousColor = darkenColor(baseColor);

    if (ambiguousFarEnd !== null) {
      // Determine vessel course at this contact's time for port/starboard
      const courseDeg = interpolateTrackCourse(
        positions as Array<{ time: string; course?: number }>,
        contactTimeMs,
      );
      if (courseDeg !== null) {
        const colors = assignAmbiguousColors(
          contact.bearing,
          contact.ambiguous_bearing!,
          courseDeg,
          baseColor,
        );
        primaryColor = colors.primaryColor;
        ambiguousColor = colors.ambiguousColor;
      }
    }

    result.push({
      contactIndex: i,
      origin,
      timeMs: contactTimeMs,
      bearing: contact.bearing,
      farEnd,
      ambiguousFarEnd,
      range: contact.range ?? null,
      label: contact.label ?? null,
      showLabel: contact.show_label ?? false,
      putLabelAt: contact.put_label_at ?? 'END',
      labelLocation: contact.label_location ?? 'RIGHT',
      color: primaryColor,
      darkenedColor: ambiguousColor,
      lineStyle: contact.line_style ?? 'SOLID',
      lineThickness: sensor.line_thickness ?? 1,
      hasAmbiguous: ambiguousFarEnd !== null,
    });
  }

  return result;
}

// ── Label Position Calculation ──────────────────────────────────────

/**
 * Calculate the pixel position for a label along a bearing line.
 *
 * @param originPx Origin in pixel coordinates [x, y]
 * @param farEndPx Far end in pixel coordinates [x, y]
 * @param putLabelAt Position along line: 'START', 'MIDDLE', or 'END'
 * @returns [x, y] pixel coordinates for the label
 */
export function calculateLabelPosition(
  originPx: [number, number],
  farEndPx: [number, number],
  putLabelAt: string,
): [number, number] {
  switch (putLabelAt) {
    case 'START':
      return originPx;
    case 'MIDDLE':
      return [
        (originPx[0] + farEndPx[0]) / 2,
        (originPx[1] + farEndPx[1]) / 2,
      ];
    case 'END':
    default:
      return farEndPx;
  }
}

/**
 * Map label_location to canvas textAlign value.
 */
export function labelLocationToTextAlign(
  labelLocation: string,
): CanvasTextAlign {
  switch (labelLocation) {
    case 'LEFT':
      return 'right'; // LEFT = text is to the left of the point → align right
    case 'CENTER':
      return 'center';
    case 'RIGHT':
    default:
      return 'left'; // RIGHT = text is to the right of the point → align left
  }
}

// ── Sensor Arc Geometry ─────────────────────────────────────────────

/**
 * Compute canvas path points for a sensor arc (donut wedge).
 *
 * Returns an array of points forming the arc outline. The path is:
 * 1. Walk outer arc from leftAngle to rightAngle
 * 2. Walk inner arc from rightAngle to leftAngle (or to origin if innerRange=0)
 *
 * @param origin [lon, lat] arc centre
 * @param leftAngle Left angular bound (degrees)
 * @param rightAngle Right angular bound (degrees)
 * @param innerRange Inner range in metres (0 for point origin)
 * @param outerRange Outer range in metres
 * @param project Function to convert [lon, lat] to [x, y] pixel coordinates
 * @returns Array of [x, y] pixel points forming the arc path
 */
export function computeArcPath(
  origin: [number, number],
  leftAngle: number,
  rightAngle: number,
  innerRange: number,
  outerRange: number,
  project: (lonLat: [number, number]) => [number, number],
): [number, number][] {
  const points: [number, number][] = [];
  const STEPS = 36; // Arc resolution

  // Normalise angular span (handle 0/360 wraparound)
  let span = rightAngle - leftAngle;
  if (span <= 0) span += 360;

  // Outer arc: left to right
  for (let i = 0; i <= STEPS; i++) {
    const angle = leftAngle + (span * i) / STEPS;
    const dest = geodesicDestination(origin, angle, outerRange);
    points.push(project(dest));
  }

  // Inner arc: right to left (or single origin point)
  if (innerRange > 0) {
    for (let i = STEPS; i >= 0; i--) {
      const angle = leftAngle + (span * i) / STEPS;
      const dest = geodesicDestination(origin, angle, innerRange);
      points.push(project(dest));
    }
  } else {
    points.push(project(origin));
  }

  return points;
}
