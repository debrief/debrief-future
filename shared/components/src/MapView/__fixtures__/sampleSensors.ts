/**
 * Sample sensor data for Storybook stories and tests.
 *
 * Provides:
 * - A host track (OWNSHIP) with positions over a 2-hour period
 * - Multiple sensor types with varied contact data:
 *   - TOWED_ARRAY: contacts with bearings, ranges, ambiguous bearings, labels
 *   - HULL_SONAR: contacts with bearings only (no ranges)
 *   - Sensor arcs (SENSORARC data)
 *
 * All coordinates are in the English Channel area (lon: -5 to -4, lat: 50 to 51).
 */

import type { TrackFeature, SensorData, SensorContact } from '@debrief/schemas';

const BASE_TIME = new Date('2026-01-27T10:00:00Z').getTime();
const MINUTE = 60_000;

function isoTime(offsetMinutes: number): string {
  return new Date(BASE_TIME + offsetMinutes * MINUTE).toISOString();
}

// ── Host Track ──────────────────────────────────────────────────────

function generateHostTrack(): TrackFeature {
  const steps = 120;
  const coordinates: [number, number][] = [];
  const positions: Array<{ time: string; course: number; speed: number }> = [];

  for (let i = 0; i < steps; i++) {
    const lon = -4.5 + 0.002 * i;
    const lat = 50.3 + 0.001 * i;
    coordinates.push([lon, lat]);
    positions.push({
      time: isoTime(i),
      course: 45,
      speed: 12,
    });
  }

  return {
    type: 'Feature',
    id: 'track-ownship-sensor',
    geometry: {
      type: 'LineString',
      coordinates: coordinates as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'PLT-001',
      platform_name: 'HMS Defender',
      track_type: 'OWNSHIP',
      start_time: positions[0]!.time,
      end_time: positions[positions.length - 1]!.time,
      positions,
      style: {
        line: {
          color: '#4CAF50',
          weight: 3,
          opacity: 1,
        },
      },
      sensors: [],
    },
  // eslint-disable-next-line no-restricted-syntax
  } as unknown as TrackFeature;
}

// ── Sensor Contacts ─────────────────────────────────────────────────

/** Towed array sensor with bearings, ranges, ambiguous bearings, labels */
export const towedArraySensor: SensorData = {
  name: 'TOWED_ARRAY',
  color: '#FF0000',
  visible: true,
  line_thickness: 2,
  contacts: [
    {
      time: isoTime(10),
      bearing: 45,
      has_bearing: true,
      range: 5000,
      visible: true,
      label: 'C1',
      show_label: true,
      put_label_at: 'END',
      label_location: 'RIGHT',
      line_style: 'SOLID',
    },
    {
      time: isoTime(15),
      bearing: 47,
      has_bearing: true,
      ambiguous_bearing: 43, // mirror of 47 across course 045: (2*45 - 47) = 43
      has_ambiguous: true,
      range: 4500,
      visible: true,
      label: 'C2',
      show_label: true,
      put_label_at: 'MIDDLE',
      label_location: 'CENTER',
      line_style: 'SOLID',
    },
    {
      time: isoTime(20),
      bearing: 50,
      has_bearing: true,
      range: 4000,
      visible: true,
      label: 'C3',
      show_label: false,
      line_style: 'DASHED',
    },
    {
      time: isoTime(25),
      bearing: 53,
      has_bearing: true,
      ambiguous_bearing: 37, // mirror of 53 across course 045: (2*45 - 53) = 37
      has_ambiguous: true,
      range: 3500,
      visible: true,
      line_style: 'SOLID',
    },
    {
      time: isoTime(30),
      bearing: 55,
      has_bearing: true,
      range: 3000,
      visible: true,
      label: 'C5',
      show_label: true,
      put_label_at: 'START',
      label_location: 'LEFT',
      line_style: 'DOT',
    },
    // Contact with has_bearing=false — should NOT render
    {
      time: isoTime(35),
      bearing: 60,
      has_bearing: false,
      visible: true,
      line_style: 'SOLID',
    },
    // Contact with visible=false — should NOT render
    {
      time: isoTime(40),
      bearing: 62,
      has_bearing: true,
      visible: false,
      line_style: 'SOLID',
    },
    // Contact without range — should extend to default cap
    {
      time: isoTime(45),
      bearing: 65,
      has_bearing: true,
      visible: true,
      line_style: 'SOLID',
    },
    // Contact with explicit origin
    {
      time: isoTime(50),
      bearing: 70,
      has_bearing: true,
      range: 6000,
      visible: true,
      origin: [-4.35, 50.4],
      line_style: 'SOLID',
    },
    // Contact with color override
    {
      time: isoTime(55),
      bearing: 75,
      has_bearing: true,
      range: 5500,
      visible: true,
      color: '#0000FF',
      line_style: 'DASH_DOT',
    },
  ] as SensorContact[],
};

/** Hull sonar — contacts with bearings only (no ranges), no ambiguous bearings */
export const hullSonarSensor: SensorData = {
  name: 'HULL_SONAR',
  color: '#00AAFF',
  visible: true,
  line_thickness: 1,
  contacts: Array.from({ length: 20 }, (_, i): SensorContact => ({
    time: isoTime(5 + i * 3),
    bearing: 270 + i * 2,
    has_bearing: true,
    visible: true,
    line_style: 'SOLID',
  })),
};

/** Sensor with many contacts for performance testing */
export const highDensitySensor: SensorData = {
  name: 'HIGH_DENSITY',
  color: '#FF6600',
  visible: true,
  line_thickness: 1,
  contacts: Array.from({ length: 500 }, (_, i): SensorContact => ({
    time: isoTime(i * 0.24),
    bearing: (i * 7.3) % 360,
    has_bearing: true,
    range: 2000 + Math.sin(i * 0.1) * 1000,
    visible: true,
    line_style: 'SOLID',
  })),
};

// ── Sensor Arc Data ─────────────────────────────────────────────────

export interface SensorArcData {
  origin: [number, number];
  leftAngle: number;
  rightAngle: number;
  innerRange: number;
  outerRange: number;
  startTime: string;
  endTime: string;
  color: string;
}

export const sampleSensorArcs: SensorArcData[] = [
  {
    origin: [-4.4, 50.35],
    leftAngle: 350,
    rightAngle: 10,
    innerRange: 1000,
    outerRange: 5000,
    startTime: isoTime(10),
    endTime: isoTime(30),
    color: '#4CAF50',
  },
  {
    origin: [-4.3, 50.4],
    leftAngle: 60,
    rightAngle: 120,
    innerRange: 0,
    outerRange: 3000,
    startTime: isoTime(20),
    endTime: isoTime(50),
    color: '#2196F3',
  },
];

// ── Assembled Track Fixtures ────────────────────────────────────────

/** Track with towed array sensor (primary test fixture) */
export function createTrackWithSensors(
  sensors: SensorData[] = [towedArraySensor]
): TrackFeature {
  const track = generateHostTrack();
  // eslint-disable-next-line no-restricted-syntax
  (track.properties as unknown as Record<string, unknown>).sensors = sensors;
  return track;
}

/** Track with towed array and hull sonar */
export const sampleTrackWithSensors = createTrackWithSensors([
  towedArraySensor,
  hullSonarSensor,
]);

/** Track with high-density sensor for performance testing */
export const performanceTrackWithSensors = createTrackWithSensors([
  highDensitySensor,
]);

/** Time extent for the sample data */
export const sensorTimeExtent: [number, number] = [
  BASE_TIME,
  BASE_TIME + 120 * MINUTE,
];

/** Convenient time values for testing */
export const sensorTestTimes = {
  beforeAll: BASE_TIME - MINUTE,
  atStart: BASE_TIME,
  atContact1: BASE_TIME + 10 * MINUTE,
  atContact2: BASE_TIME + 15 * MINUTE,
  midRange: BASE_TIME + 30 * MINUTE,
  atContact9: BASE_TIME + 50 * MINUTE,
  atEnd: BASE_TIME + 119 * MINUTE,
  afterAll: BASE_TIME + 121 * MINUTE,
  trailLength: 10 * MINUTE,
};

export { BASE_TIME, MINUTE, isoTime };
