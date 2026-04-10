import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  darkenColor,
  applySnailFade,
  calculateSnailProportion,
  geodesicDestination,
  computeBearingFarEnd,
  interpolateTrackPosition,
  resolveContactColor,
  prepareSensorContacts,
  calculateLabelPosition,
  labelLocationToTextAlign,
  computeArcPath,
  LINE_STYLE_DASH_ARRAYS,
  MAXIMUM_SENSOR_BEARING_RANGE,
  DEFAULT_SENSOR_COLOR,
} from '../sensor-utils';
import type { SensorContact, SensorData, TrackFeature } from '@debrief/schemas';

// ── Colour Utilities ────────────────────────────────────────────────

describe('parseHexColor', () => {
  it('parses 6-digit hex with hash', () => {
    expect(parseHexColor('#FF0000')).toEqual([255, 0, 0]);
    expect(parseHexColor('#00FF00')).toEqual([0, 255, 0]);
    expect(parseHexColor('#0000FF')).toEqual([0, 0, 255]);
  });

  it('parses 6-digit hex without hash', () => {
    expect(parseHexColor('FF8000')).toEqual([255, 128, 0]);
  });

  it('parses 3-digit hex', () => {
    expect(parseHexColor('#F00')).toEqual([255, 0, 0]);
    expect(parseHexColor('#0F0')).toEqual([0, 255, 0]);
  });

  it('parses black and white', () => {
    expect(parseHexColor('#000000')).toEqual([0, 0, 0]);
    expect(parseHexColor('#FFFFFF')).toEqual([255, 255, 255]);
  });

  it('handles lowercase hex', () => {
    expect(parseHexColor('#ff0000')).toEqual([255, 0, 0]);
  });
});

describe('darkenColor', () => {
  it('darkens red by factor 0.7 (matches Java Color.darker())', () => {
    // #FF0000 → 255*0.7=178.5 → #b20000
    const result = darkenColor('#FF0000');
    expect(result).toBe('#b30000');
  });

  it('darkens white to grey', () => {
    // #FFFFFF → 255*0.7=178.5 → #b3b3b3
    const result = darkenColor('#FFFFFF');
    expect(result).toBe('#b3b3b3');
  });

  it('darkens black stays black', () => {
    expect(darkenColor('#000000')).toBe('#000000');
  });

  it('darkens mixed colour', () => {
    // #4CAF50 → (76*0.7, 175*0.7, 80*0.7) ≈ (53, 123, 56) → #357b38
    const result = darkenColor('#4CAF50');
    const [r, g, b] = parseHexColor(result);
    expect(r).toBeCloseTo(76 * 0.7, 0);
    expect(g).toBeCloseTo(175 * 0.7, 0);
    expect(b).toBeCloseTo(80 * 0.7, 0);
  });
});

describe('applySnailFade', () => {
  it('returns full colour at proportion 1.0', () => {
    expect(applySnailFade('#FF0000', 1.0)).toBe('#ff0000');
  });

  it('returns black at proportion 0.0', () => {
    expect(applySnailFade('#FF0000', 0.0)).toBe('#000000');
  });

  it('returns half intensity at proportion 0.5', () => {
    const result = applySnailFade('#FF0000', 0.5);
    const [r, g, b] = parseHexColor(result);
    expect(r).toBeCloseTo(128, 0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('clamps proportion above 1.0', () => {
    expect(applySnailFade('#FF0000', 1.5)).toBe('#ff0000');
  });

  it('clamps proportion below 0.0', () => {
    expect(applySnailFade('#FF0000', -0.5)).toBe('#000000');
  });
});

// ── Snail Mode ──────────────────────────────────────────────────────

describe('calculateSnailProportion', () => {
  it('returns 1.0 for contact at current time (newest)', () => {
    expect(calculateSnailProportion(1000, 1000, 500)).toBe(1.0);
  });

  it('returns 0.0 for contact at trail edge (oldest)', () => {
    expect(calculateSnailProportion(500, 1000, 500)).toBe(0.0);
  });

  it('returns 0.5 for contact at midpoint', () => {
    expect(calculateSnailProportion(750, 1000, 500)).toBe(0.5);
  });

  it('returns null for contact older than trail window', () => {
    expect(calculateSnailProportion(400, 1000, 500)).toBeNull();
  });

  it('returns null for contact in the future', () => {
    expect(calculateSnailProportion(1100, 1000, 500)).toBeNull();
  });

  it('returns null for zero trail length', () => {
    expect(calculateSnailProportion(1000, 1000, 0)).toBeNull();
  });

  it('returns null for negative trail length', () => {
    expect(calculateSnailProportion(1000, 1000, -100)).toBeNull();
  });
});

// ── Bearing Geometry ────────────────────────────────────────────────

describe('geodesicDestination', () => {
  const origin: [number, number] = [-4.0, 50.0]; // English Channel

  it('bearing 0 (north) increases latitude', () => {
    const dest = geodesicDestination(origin, 0, 111_120); // ~1 degree north
    expect(dest[0]).toBeCloseTo(-4.0, 1);
    expect(dest[1]).toBeCloseTo(51.0, 0);
  });

  it('bearing 90 (east) increases longitude', () => {
    const dest = geodesicDestination(origin, 90, 71_500); // ~1 degree east at lat 50
    expect(dest[0]).toBeGreaterThan(-4.0);
    expect(dest[1]).toBeCloseTo(50.0, 1);
  });

  it('bearing 180 (south) decreases latitude', () => {
    const dest = geodesicDestination(origin, 180, 111_120);
    expect(dest[0]).toBeCloseTo(-4.0, 1);
    expect(dest[1]).toBeCloseTo(49.0, 0);
  });

  it('bearing 360 is equivalent to bearing 0', () => {
    const dest0 = geodesicDestination(origin, 0, 10000);
    const dest360 = geodesicDestination(origin, 360, 10000);
    expect(dest360[0]).toBeCloseTo(dest0[0], 5);
    expect(dest360[1]).toBeCloseTo(dest0[1], 5);
  });

  it('zero distance returns origin', () => {
    const dest = geodesicDestination(origin, 45, 0);
    expect(dest[0]).toBeCloseTo(origin[0], 5);
    expect(dest[1]).toBeCloseTo(origin[1], 5);
  });
});

describe('computeBearingFarEnd', () => {
  const origin: [number, number] = [-4.0, 50.0];

  it('uses range when provided', () => {
    const farEnd = computeBearingFarEnd(origin, 45, 5000);
    // Should be 5km at 45 degrees
    const dist = haversineDistance(origin, farEnd);
    expect(dist).toBeCloseTo(5000, -1);
  });

  it('uses MAXIMUM_SENSOR_BEARING_RANGE when no range', () => {
    const farEnd = computeBearingFarEnd(origin, 45, null);
    const dist = haversineDistance(origin, farEnd);
    expect(dist).toBeCloseTo(MAXIMUM_SENSOR_BEARING_RANGE, -2);
  });
});

// ── Track Position Interpolation ────────────────────────────────────

describe('interpolateTrackPosition', () => {
  const coords: [number, number][] = [[-4.0, 50.0], [-3.9, 50.1], [-3.8, 50.2]];
  const positions = [
    { time: '2026-01-27T10:00:00Z' },
    { time: '2026-01-27T11:00:00Z' },
    { time: '2026-01-27T12:00:00Z' },
  ];
  const t0 = Date.parse('2026-01-27T10:00:00Z');
  const t1 = Date.parse('2026-01-27T11:00:00Z');
  const t2 = Date.parse('2026-01-27T12:00:00Z');

  it('returns exact position for exact time match', () => {
    expect(interpolateTrackPosition(coords, positions, t0)).toEqual([-4.0, 50.0]);
    expect(interpolateTrackPosition(coords, positions, t1)).toEqual([-3.9, 50.1]);
    expect(interpolateTrackPosition(coords, positions, t2)).toEqual([-3.8, 50.2]);
  });

  it('interpolates midpoint between two positions', () => {
    const mid = (t0 + t1) / 2;
    const result = interpolateTrackPosition(coords, positions, mid);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(-3.95, 4);
    expect(result![1]).toBeCloseTo(50.05, 4);
  });

  it('interpolates at 25% between two positions', () => {
    const quarter = t0 + (t1 - t0) * 0.25;
    const result = interpolateTrackPosition(coords, positions, quarter);
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(-3.975, 3);
    expect(result![1]).toBeCloseTo(50.025, 3);
  });

  it('returns null for time before track start', () => {
    expect(interpolateTrackPosition(coords, positions, t0 - 1000)).toBeNull();
  });

  it('returns null for time after track end', () => {
    expect(interpolateTrackPosition(coords, positions, t2 + 1000)).toBeNull();
  });

  it('returns null for empty arrays', () => {
    expect(interpolateTrackPosition([], [], t0)).toBeNull();
  });

  it('returns null for mismatched array lengths', () => {
    expect(interpolateTrackPosition(coords, [positions[0]!], t0)).toBeNull();
  });

  it('handles single-point track', () => {
    expect(interpolateTrackPosition([coords[0]!], [positions[0]!], t0)).toEqual(coords[0]);
  });
});

// ── Colour Inheritance ──────────────────────────────────────────────

describe('resolveContactColor', () => {
  const sensor: SensorData = { name: 'TEST', contacts: [], color: '#00FF00' };
  const sensorNoColor: SensorData = { name: 'TEST', contacts: [] };

  it('uses contact color when set', () => {
    const contact: SensorContact = { time: '', bearing: 0, color: '#0000FF' };
    expect(resolveContactColor(contact, sensor, '#FF0000')).toBe('#0000FF');
  });

  it('falls back to sensor color', () => {
    const contact: SensorContact = { time: '', bearing: 0 };
    expect(resolveContactColor(contact, sensor, '#FF0000')).toBe('#00FF00');
  });

  it('falls back to track color', () => {
    const contact: SensorContact = { time: '', bearing: 0 };
    expect(resolveContactColor(contact, sensorNoColor, '#FF0000')).toBe('#FF0000');
  });

  it('falls back to default color', () => {
    const contact: SensorContact = { time: '', bearing: 0 };
    expect(resolveContactColor(contact, sensorNoColor, undefined)).toBe(DEFAULT_SENSOR_COLOR);
  });
});

// ── Contact Filtering ───────────────────────────────────────────────

describe('prepareSensorContacts', () => {
  function makeTrack(contacts: SensorContact[]): { sensor: SensorData; feature: TrackFeature } {
    const positions = [
      { time: '2026-01-27T10:00:00Z', course: 45, speed: 12 },
      { time: '2026-01-27T11:00:00Z', course: 45, speed: 12 },
      { time: '2026-01-27T12:00:00Z', course: 45, speed: 12 },
    ];
    const coords: [number, number][] = [[-4.0, 50.0], [-3.9, 50.1], [-3.8, 50.2]];

    const sensor: SensorData = {
      name: 'TEST',
      color: '#FF0000',
      line_thickness: 2,
      contacts,
    };

    const feature = {
      type: 'Feature',
      id: 'track-test',
      geometry: { type: 'LineString', coordinates: coords as unknown as number[] },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-001',
        track_type: 'OWNSHIP',
        start_time: positions[0]!.time,
        end_time: positions[positions.length - 1]!.time,
        positions,
        style: { line: { color: '#4CAF50' } },
        sensors: [sensor],
      },
    } as unknown as TrackFeature;

    return { sensor, feature };
  }

  it('filters contacts with has_bearing=false', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true },
      { time: '2026-01-27T10:45:00Z', bearing: 90, has_bearing: false, visible: true },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.bearing).toBe(45);
  });

  it('filters contacts with visible=false', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true },
      { time: '2026-01-27T10:45:00Z', bearing: 90, has_bearing: true, visible: false },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
  });

  it('defaults has_bearing to true when undefined', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45 },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
  });

  it('defaults visible to true when undefined', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
  });

  it('filters by currentTime in full mode', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true },
      { time: '2026-01-27T11:30:00Z', bearing: 90, has_bearing: true, visible: true },
    ]);
    const currentTime = Date.parse('2026-01-27T11:00:00Z');
    const result = prepareSensorContacts(sensor, feature, currentTime, 'full', 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.bearing).toBe(45);
  });

  it('filters by trail window in trail mode', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:00:00Z', bearing: 10, has_bearing: true, visible: true },
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true },
      { time: '2026-01-27T11:00:00Z', bearing: 90, has_bearing: true, visible: true },
    ]);
    const currentTime = Date.parse('2026-01-27T11:00:00Z');
    const trailLength = 45 * 60_000; // 45 minutes
    const result = prepareSensorContacts(sensor, feature, currentTime, 'trail', trailLength);
    // Only contacts within 45 minutes before currentTime should be included
    expect(result).toHaveLength(2); // 10:30 and 11:00
    expect(result[0]!.bearing).toBe(45);
    expect(result[1]!.bearing).toBe(90);
  });

  it('computes ambiguous bearing far end', () => {
    const { sensor, feature } = makeTrack([
      {
        time: '2026-01-27T10:30:00Z',
        bearing: 45,
        has_bearing: true,
        ambiguous_bearing: 225,
        has_ambiguous: true,
        visible: true,
      },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasAmbiguous).toBe(true);
    expect(result[0]!.ambiguousFarEnd).not.toBeNull();
  });

  it('uses explicit origin when present', () => {
    const { sensor, feature } = makeTrack([
      {
        time: '2026-01-27T10:30:00Z',
        bearing: 45,
        has_bearing: true,
        visible: true,
        origin: [-3.5, 50.5],
      },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(1);
    expect(result[0]!.origin).toEqual([-3.5, 50.5]);
  });

  it('inherits sensor colour', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result[0]!.color).toBe('#FF0000'); // sensor.color
  });

  it('contact colour overrides sensor colour', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T10:30:00Z', bearing: 45, has_bearing: true, visible: true, color: '#0000FF' },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result[0]!.color).toBe('#0000FF');
  });

  it('skips contacts outside track time range', () => {
    const { sensor, feature } = makeTrack([
      { time: '2026-01-27T09:00:00Z', bearing: 45, has_bearing: true, visible: true },
    ]);
    const result = prepareSensorContacts(sensor, feature, undefined, 'full', 0);
    expect(result).toHaveLength(0); // 09:00 is before track start (10:00)
  });
});

// ── Label Position ──────────────────────────────────────────────────

describe('calculateLabelPosition', () => {
  const origin: [number, number] = [0, 0];
  const farEnd: [number, number] = [100, 200];

  it('returns origin for START', () => {
    expect(calculateLabelPosition(origin, farEnd, 'START')).toEqual([0, 0]);
  });

  it('returns midpoint for MIDDLE', () => {
    expect(calculateLabelPosition(origin, farEnd, 'MIDDLE')).toEqual([50, 100]);
  });

  it('returns far end for END', () => {
    expect(calculateLabelPosition(origin, farEnd, 'END')).toEqual([100, 200]);
  });

  it('defaults to far end for unknown position', () => {
    expect(calculateLabelPosition(origin, farEnd, 'UNKNOWN')).toEqual([100, 200]);
  });
});

describe('labelLocationToTextAlign', () => {
  it('maps LEFT to right (text to the left of point)', () => {
    expect(labelLocationToTextAlign('LEFT')).toBe('right');
  });

  it('maps CENTER to center', () => {
    expect(labelLocationToTextAlign('CENTER')).toBe('center');
  });

  it('maps RIGHT to left (text to the right of point)', () => {
    expect(labelLocationToTextAlign('RIGHT')).toBe('left');
  });

  it('defaults to left for unknown location', () => {
    expect(labelLocationToTextAlign('UNKNOWN')).toBe('left');
  });
});

// ── Line Style Constants ────────────────────────────────────────────

describe('LINE_STYLE_DASH_ARRAYS', () => {
  it('SOLID has null dash array', () => {
    expect(LINE_STYLE_DASH_ARRAYS.SOLID).toBeNull();
  });

  it('DASHED is defined', () => {
    expect(LINE_STYLE_DASH_ARRAYS.DASHED).toEqual([10, 5]);
  });

  it('DOT is defined', () => {
    expect(LINE_STYLE_DASH_ARRAYS.DOT).toEqual([2, 5]);
  });

  it('DASH_DOT is defined', () => {
    expect(LINE_STYLE_DASH_ARRAYS.DASH_DOT).toEqual([10, 5, 2, 5]);
  });

  it('all four styles are mapped', () => {
    expect(Object.keys(LINE_STYLE_DASH_ARRAYS)).toHaveLength(4);
  });
});

// ── Sensor Arc Geometry ─────────────────────────────────────────────

describe('computeArcPath', () => {
  const project = (lonLat: [number, number]): [number, number] => [lonLat[0] * 100, lonLat[1] * 100];

  it('produces a closed polygon path', () => {
    const path = computeArcPath(
      [-4.0, 50.0], // origin
      0, 90,        // 90-degree arc
      0, 5000,      // point origin, 5km outer
      project,
    );
    // Should have outer arc points + origin point
    expect(path.length).toBeGreaterThan(2);
  });

  it('handles 0/360 wraparound (350 to 10)', () => {
    const path = computeArcPath(
      [-4.0, 50.0],
      350, 10, // crosses north
      1000, 5000,
      project,
    );
    // Should produce valid path (inner + outer arcs)
    expect(path.length).toBeGreaterThan(2);
  });

  it('donut wedge has more points than point-origin wedge', () => {
    const donut = computeArcPath([-4.0, 50.0], 0, 90, 1000, 5000, project);
    const point = computeArcPath([-4.0, 50.0], 0, 90, 0, 5000, project);
    // Donut has inner arc points, point origin just has origin
    expect(donut.length).toBeGreaterThan(point.length);
  });
});

// ── Helper ──────────────────────────────────────────────────────────

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * toRad;
  const dLon = (b[0] - a[0]) * toRad;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(a[1] * toRad) * Math.cos(b[1] * toRad) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}
