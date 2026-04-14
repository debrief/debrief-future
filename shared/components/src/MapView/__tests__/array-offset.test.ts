import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { SensorData } from '@debrief/schemas';

import {
  computeArrayCentre,
  computePlainOffset,
  backtrackAlongTrack,
  interpolateMeasuredPosition,
  haversineDistanceMetres,
} from '../array-offset';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the cross-language golden fixture
const FIXTURE_PATH = resolve(
  __dirname,
  '../../../../schemas/src/fixtures/valid/array-offset-golden-01.json',
);
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8')) as {
  cases: Array<Record<string, unknown>>;
};

// ── Haversine distance ─────────────────────────────────────────────

describe('haversineDistanceMetres', () => {
  it('returns zero for identical points', () => {
    expect(haversineDistanceMetres(0, 0, 0, 0)).toBeCloseTo(0, 5);
    expect(haversineDistanceMetres(-5, 50, -5, 50)).toBeCloseTo(0, 5);
  });

  it('returns ~111.19 km for 1 degree latitude at the equator', () => {
    const d = haversineDistanceMetres(0, 0, 0, 1);
    // 2*pi*R/360 = 111195m
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111200);
  });

  it('returns correct distance across the antimeridian', () => {
    // 179.99°E to -179.99° is 0.02° of longitude at the equator
    const d = haversineDistanceMetres(179.99, 0, -179.99, 0);
    expect(d).toBeGreaterThan(2000);
    expect(d).toBeLessThan(2500);
  });

  it('returns the distance to the North Pole from the equator', () => {
    // Quarter circle = π*R/2
    const d = haversineDistanceMetres(0, 0, 0, 90);
    const expected = (Math.PI * 6_371_000) / 2;
    expect(d).toBeCloseTo(expected, -1);
  });

  it('is symmetric', () => {
    const d1 = haversineDistanceMetres(-5, 50, -4.5, 50.5);
    const d2 = haversineDistanceMetres(-4.5, 50.5, -5, 50);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

// ── Golden fixture validation ──────────────────────────────────────

describe('golden fixture', () => {
  it('contains the 7 contract cases', () => {
    expect(fixture.cases).toHaveLength(7);
    const ids = fixture.cases.map((c) => c.id);
    expect(ids).toEqual([
      'case-1-plain-eastward',
      'case-2-plain-northward',
      'case-3-worm-straight',
      'case-4-worm-through-turn',
      'case-5-measured-midpoint',
      'case-6-measured-fallback-plain',
      'case-7-zero-offset',
    ]);
  });

  it('every case declares a tolerance_metres', () => {
    for (const c of fixture.cases) {
      expect(typeof c.tolerance_metres).toBe('number');
      expect((c.tolerance_metres as number) >= 0).toBe(true);
    }
  });
});

// ── Dispatcher ─────────────────────────────────────────────────────

describe('computeArrayCentre (dispatcher)', () => {
  const hostPosition: [number, number] = [-5.0, 50.0];
  const trackCoords: [number, number][] = [
    [-5.0, 49.99],
    [-5.0, 50.0],
  ];
  const trackPositions = [
    { time: '2026-01-01T10:00:00Z' },
    { time: '2026-01-01T11:00:00Z' },
  ];

  const makeSensor = (overrides: Partial<SensorData> = {}): SensorData => {
    const sensor: SensorData = {
      name: 'TOWED_ARRAY',
      contacts: [],
      ...overrides,
    };
    return sensor;
  };

  it('returns host position unchanged when offset is undefined', () => {
    const sensor = makeSensor({ array_centre_mode: 'PLAIN' });
    const result = computeArrayCentre(
      hostPosition,
      90,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    expect(result).toEqual(hostPosition);
  });

  it('returns host position unchanged when offset is zero', () => {
    const sensor = makeSensor({ offset: 0, array_centre_mode: 'PLAIN' });
    const result = computeArrayCentre(
      hostPosition,
      90,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    expect(result).toEqual(hostPosition);
  });

  it('returns host position unchanged when array_centre_mode is undefined', () => {
    const sensor = makeSensor({ offset: 500 });
    const result = computeArrayCentre(
      hostPosition,
      90,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    expect(result).toEqual(hostPosition);
  });

  it('dispatches PLAIN mode', () => {
    const sensor = makeSensor({ offset: 500, array_centre_mode: 'PLAIN' });
    const result = computeArrayCentre(
      hostPosition,
      90,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    // Backtrack westward 500m from (-5, 50) → approximately (-5.007, 50)
    expect(result[0]).toBeLessThan(-5.005);
    expect(result[1]).toBeCloseTo(50.0, 5);
  });

  it('dispatches WORM mode', () => {
    const sensor = makeSensor({ offset: 300, array_centre_mode: 'WORM' });
    const result = computeArrayCentre(
      hostPosition,
      0,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    // Straight northward track, 300m back → still on longitude -5.0
    expect(result[0]).toBeCloseTo(-5.0, 5);
    expect(result[1]).toBeLessThan(50.0);
    expect(result[1]).toBeGreaterThan(49.99);
  });

  it('falls back to host position when PLAIN mode has null course', () => {
    const sensor = makeSensor({ offset: 500, array_centre_mode: 'PLAIN' });
    const result = computeArrayCentre(
      hostPosition,
      null,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    expect(result).toEqual(hostPosition);
  });

  it('ignores unknown modes', () => {
    const sensor = makeSensor({ offset: 500, array_centre_mode: 'UNKNOWN' });
    const result = computeArrayCentre(
      hostPosition,
      90,
      sensor,
      Date.parse('2026-01-01T11:00:00Z'),
      trackCoords,
      trackPositions,
    );
    expect(result).toEqual(hostPosition);
  });
});

// ── PLAIN mode ─────────────────────────────────────────────────────

describe('computePlainOffset (PLAIN mode)', () => {
  it('case 1: eastward heading, 500m backtrack at (0, 50°N)', () => {
    const result = computePlainOffset([0, 50], 90, 500);
    const expected = [-0.006995480231292392, 49.99999978971712];
    // Compare within 1m tolerance
    expect(result[0]).toBeCloseTo(expected[0]!, 6);
    expect(result[1]).toBeCloseTo(expected[1]!, 6);
  });

  it('case 2: northward heading, 1000m backtrack at (-5°, 50°N)', () => {
    const result = computePlainOffset([-5, 50], 0, 1000);
    const expected = [-5.0, 49.99100678394081];
    expect(result[0]).toBeCloseTo(expected[0]!, 6);
    expect(result[1]).toBeCloseTo(expected[1]!, 6);
  });

  it('case 7: zero offset returns host position unchanged', () => {
    const result = computePlainOffset([-5, 50], 90, 0);
    expect(result).toEqual([-5, 50]);
  });

  it('handles course 360° the same as 0°', () => {
    const r0 = computePlainOffset([-5, 50], 0, 500);
    const r360 = computePlainOffset([-5, 50], 360, 500);
    expect(r0[0]).toBeCloseTo(r360[0]!, 8);
    expect(r0[1]).toBeCloseTo(r360[1]!, 8);
  });

  it('handles negative course values (e.g. -90 as west)', () => {
    const rPos = computePlainOffset([-5, 50], 270, 500);
    const rNeg = computePlainOffset([-5, 50], -90, 500);
    expect(rPos[0]).toBeCloseTo(rNeg[0]!, 8);
    expect(rPos[1]).toBeCloseTo(rNeg[1]!, 8);
  });
});

// ── WORM mode ──────────────────────────────────────────────────────

describe('backtrackAlongTrack (WORM mode)', () => {
  it('case 3: straight northward track, 500m backtrack', () => {
    const coords: [number, number][] = [
      [-5.0, 49.98],
      [-5.0, 49.99],
      [-5.0, 50.0],
    ];
    const positions = [
      { time: '2026-01-01T10:00:00Z' },
      { time: '2026-01-01T10:30:00Z' },
      { time: '2026-01-01T11:00:00Z' },
    ];
    const result = backtrackAlongTrack(
      coords,
      positions,
      Date.parse('2026-01-01T11:00:00Z'),
      500,
    );
    expect(result[0]).toBeCloseTo(-5.0, 5);
    expect(result[1]).toBeCloseTo(49.99550339197041, 5);
  });

  it('case 4: through a 90° turn, 2km backtrack', () => {
    const coords: [number, number][] = [
      [-5.0, 49.98],
      [-5.0, 50.0],
      [-4.98, 50.0],
    ];
    const positions = [
      { time: '2026-01-01T10:00:00Z' },
      { time: '2026-01-01T10:30:00Z' },
      { time: '2026-01-01T11:00:00Z' },
    ];
    const result = backtrackAlongTrack(
      coords,
      positions,
      Date.parse('2026-01-01T11:00:00Z'),
      2000,
    );
    // After the turn, continues south along the pre-turn leg
    expect(result[0]).toBeCloseTo(-5.0, 5);
    expect(result[1]).toBeCloseTo(49.994869320037054, 4);
  });

  it('returns earliest point when offset exceeds track length', () => {
    const coords: [number, number][] = [
      [-5.0, 49.99],
      [-5.0, 50.0],
    ];
    const positions = [
      { time: '2026-01-01T10:00:00Z' },
      { time: '2026-01-01T11:00:00Z' },
    ];
    const result = backtrackAlongTrack(
      coords,
      positions,
      Date.parse('2026-01-01T11:00:00Z'),
      100_000, // 100km — way beyond the ~1km track
    );
    expect(result).toEqual([-5.0, 49.99]);
  });

  it('handles a single-position track gracefully', () => {
    const coords: [number, number][] = [[-5.0, 50.0]];
    const positions = [{ time: '2026-01-01T10:00:00Z' }];
    const result = backtrackAlongTrack(
      coords,
      positions,
      Date.parse('2026-01-01T10:00:00Z'),
      500,
    );
    expect(result).toEqual([-5.0, 50.0]);
  });

  it('returns earliest point when contact time is before track range', () => {
    const coords: [number, number][] = [
      [-5.0, 49.99],
      [-5.0, 50.0],
    ];
    const positions = [
      { time: '2026-01-01T11:00:00Z' },
      { time: '2026-01-01T12:00:00Z' },
    ];
    const result = backtrackAlongTrack(
      coords,
      positions,
      Date.parse('2026-01-01T10:00:00Z'),
      500,
    );
    expect(result).toEqual([-5.0, 49.99]);
  });
});

// ── MEASURED mode ──────────────────────────────────────────────────

describe('interpolateMeasuredPosition (MEASURED mode)', () => {
  const positions = [
    { time: '2026-01-01T10:00:00Z', location: [-5.001, 49.998] },
    { time: '2026-01-01T11:00:00Z', location: [-4.901, 50.098] },
  ];

  it('case 5: interpolates the midpoint', () => {
    const result = interpolateMeasuredPosition(
      positions,
      Date.parse('2026-01-01T10:30:00Z'),
    );
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(-4.951, 5);
    expect(result![1]).toBeCloseTo(50.048, 5);
  });

  it('returns the exact measured position for a boundary timestamp', () => {
    const result = interpolateMeasuredPosition(
      positions,
      Date.parse('2026-01-01T10:00:00Z'),
    );
    expect(result).toEqual([-5.001, 49.998]);
  });

  it('returns null when contact is before the measured range', () => {
    const result = interpolateMeasuredPosition(
      positions,
      Date.parse('2026-01-01T09:00:00Z'),
    );
    expect(result).toBeNull();
  });

  it('returns null when contact is after the measured range', () => {
    const result = interpolateMeasuredPosition(
      positions,
      Date.parse('2026-01-01T12:00:00Z'),
    );
    expect(result).toBeNull();
  });

  it('returns null for an empty measured positions array', () => {
    const result = interpolateMeasuredPosition(
      [],
      Date.parse('2026-01-01T10:30:00Z'),
    );
    expect(result).toBeNull();
  });

  it('sorts unordered inputs before lookup', () => {
    const unordered = [
      { time: '2026-01-01T11:00:00Z', location: [-4.901, 50.098] },
      { time: '2026-01-01T10:00:00Z', location: [-5.001, 49.998] },
    ];
    const result = interpolateMeasuredPosition(
      unordered,
      Date.parse('2026-01-01T10:30:00Z'),
    );
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(-4.951, 5);
    expect(result![1]).toBeCloseTo(50.048, 5);
  });

  it('case 6: falls back to PLAIN via computeArrayCentre when out of range', () => {
    const sensor: SensorData = {
      name: 'TOWED_ARRAY',
      offset: 300,
      array_centre_mode: 'MEASURED',
      measured_positions: [
        { time: '2026-01-01T11:00:00Z', location: [-4.901, 50.098] },
      ],
      contacts: [],
    };
    const result = computeArrayCentre(
      [-5.0, 50.0],
      45,
      sensor,
      Date.parse('2026-01-01T10:00:00Z'),
      [],
      [],
    );
    // Reverse bearing 225° from (-5, 50) by 300m
    expect(result[0]).toBeCloseTo(-5.00296781314724, 5);
    expect(result[1]).toBeCloseTo(49.998092212932896, 5);
  });
});

// ── Golden parity (cross-language reference) ───────────────────────

describe('golden fixture cases (TypeScript side)', () => {
  for (const c of fixture.cases) {
    it(`${c.id}: reproduces expected_origin within ${c.tolerance_metres}m`, () => {
      const expected = c.expected_origin as [number, number];
      const tol = c.tolerance_metres as number;

      let actual: [number, number];
      if (c.mode === 'PLAIN') {
        actual = computePlainOffset(
          c.host_position as [number, number],
          c.course_deg as number,
          c.offset_metres as number,
        );
      } else if (c.mode === 'WORM') {
        const positions = (c.track_times as string[]).map((t) => ({ time: t }));
        actual = backtrackAlongTrack(
          c.track_coordinates as [number, number][],
          positions,
          Date.parse(c.contact_time as string),
          c.offset_metres as number,
        );
      } else if (c.id === 'case-5-measured-midpoint') {
        const r = interpolateMeasuredPosition(
          c.measured_positions as Array<{ time: string; location: number[] }>,
          Date.parse(c.contact_time as string),
        );
        actual = r!;
      } else if (c.id === 'case-6-measured-fallback-plain') {
        const sensor: SensorData = {
          name: 'TOWED_ARRAY',
          offset: c.offset_metres as number,
          array_centre_mode: 'MEASURED',
          measured_positions: c.measured_positions as Array<{
            time: string;
            location: number[];
          }>,
          contacts: [],
        };
        actual = computeArrayCentre(
          c.host_position as [number, number],
          c.course_deg as number,
          sensor,
          Date.parse(c.contact_time as string),
          [],
          [],
        );
      } else {
        throw new Error(`Unhandled case: ${c.id}`);
      }

      const dist = haversineDistanceMetres(
        actual[0],
        actual[1],
        expected[0],
        expected[1],
      );
      expect(dist).toBeLessThanOrEqual(tol);
    });
  }
});

// ── Performance benchmark (SC-004: 1000 contacts < 1s) ────────────

describe('performance', () => {
  it('computes 1000 contact origins under the 1-second budget', () => {
    // Build a zigzag track for realistic WORM cost
    const trackCoords: [number, number][] = [];
    const trackPositions: Array<{ time: string }> = [];
    for (let i = 0; i < 200; i++) {
      const base = new Date('2026-01-01T10:00:00Z').getTime() + i * 30_000;
      trackCoords.push([-5.0 + (i % 2) * 0.001, 49.98 + i * 0.0001]);
      trackPositions.push({ time: new Date(base).toISOString() });
    }

    const sensor: SensorData = {
      name: 'TOWED_ARRAY',
      offset: 500,
      array_centre_mode: 'WORM',
      contacts: [],
    };

    const start = performance.now();
    const startMs = new Date('2026-01-01T10:00:00Z').getTime();
    const endMs = startMs + 199 * 30_000;
    const step = (endMs - startMs) / 999;
    for (let i = 0; i < 1000; i++) {
      const contactMs = startMs + i * step;
      computeArrayCentre(
        [-5.0, 49.98],
        90,
        sensor,
        contactMs,
        trackCoords,
        trackPositions,
      );
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
