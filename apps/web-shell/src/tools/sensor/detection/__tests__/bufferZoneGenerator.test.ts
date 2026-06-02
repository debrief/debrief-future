/**
 * Tests for the TypeScript buffer-zone-generator tool.
 * Mirrors the Python test suite in services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py.
 */

import { describe, it, expect } from 'vitest';
import { execute, toolDefinition } from '../bufferZoneGenerator';
import type { SensorModel, SensorModelZone } from '../bufferZoneGenerator';
import type { RawGeoJSONFeature, TrackFeature } from '@debrief/schemas';

// ============================================================
// Test fixtures
// ============================================================

// Cast helper: test fixtures use minimal shapes; TrackFeature requires full schema properties
function asTrack(obj: unknown): TrackFeature {
  return obj as TrackFeature;
}

const SIMPLE_TRACK = asTrack({
  type: 'Feature' as const,
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-4.5, 50.2, 0, 1705305600000],
      [-4.4, 50.3, 0, 1705309200000],
      [-4.3, 50.25, 0, 1705312800000],
    ],
  },
  properties: { kind: 'TRACK', name: 'HMS Test' },
});

const SINGLE_POINT_TRACK = asTrack({
  type: 'Feature' as const,
  id: 'track-single',
  geometry: {
    type: 'LineString',
    coordinates: [[-4.5, 50.2, 0, 1705305600000]],
  },
  properties: { kind: 'TRACK', name: 'Single Point' },
});

// NON_TRACK_FEATURE is intentionally not a track; cast to TrackFeature to satisfy execute signature
const NON_TRACK_FEATURE = asTrack({
  type: 'Feature' as const,
  id: 'circle-001',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  },
  properties: { kind: 'CIRCLE', name: 'Test Circle' },
});

// ============================================================
// Helpers
// ============================================================

/** Helper type: feature with guaranteed non-null properties/geometry for test assertions. */
type AssertedFeature = {
  type: string;
  id?: string | number;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
};

/** Assert that RawGeoJSONFeature[] have non-null properties/geometry for test access. */
function assertFeatures(features: RawGeoJSONFeature[]): AssertedFeature[] {
  return features.map(f => {
    if (!f.properties) throw new Error('Expected non-null properties');
    if (!f.geometry) throw new Error('Expected non-null geometry');
    return { type: f.type, id: f.id, geometry: f.geometry as AssertedFeature['geometry'], properties: f.properties };
  });
}

/** Run the tool and return convenient accessors. */
function run(track = SIMPLE_TRACK, params = {}, sensorModel?: SensorModel) {
  const result = assertFeatures(execute([track], params, sensorModel));
  const feature = result[0];
  const zones = feature.properties.zones as Array<Record<string, unknown>>;
  const multiCoords = feature.geometry.coordinates as number[][][][];
  return { result, feature, zones, multiCoords };
}

// ============================================================
// Tool definition tests
// ============================================================

describe('buffer-zone-generator toolDefinition', () => {
  it('has correct metadata', () => {
    expect(toolDefinition.name).toBe('buffer-zone-generator');
    expect(toolDefinition.annotations['debrief:category']).toBe('sensor/detection');
    expect(toolDefinition.annotations['debrief:version']).toBe('1.0.0');
    expect(toolDefinition.annotations['debrief:outputKind']).toBe('addition/feature');
  });

  it('requires TRACK features', () => {
    const trackReq = toolDefinition.annotations['debrief:selectionRequirements'].find(
      (r: { kind: string; min: number }) => r.kind === 'TRACK',
    );
    expect(trackReq).toBeDefined();
    expect(trackReq!.min).toBe(1);
  });
});

// ============================================================
// Phase 1: Basic zone generation (US1) — now MultiPolygon
// ============================================================

describe('buffer-zone-generator basic generation (US1)', () => {
  it('returns a single MultiPolygon feature', () => {
    const { result, feature } = run();
    expect(result).toHaveLength(1);
    expect(feature.geometry.type).toBe('MultiPolygon');
  });

  it('MultiPolygon has 3 sub-polygons', () => {
    const { multiCoords } = run();
    expect(multiCoords).toHaveLength(3);
  });

  it('feature has correct top-level properties', () => {
    const { feature } = run();
    expect(feature.type).toBe('Feature');
    expect(feature.properties.kind).toBe('ZONE');
    expect(feature.properties.name).toContain('Detection Zones');
  });

  it('zones metadata has correct names and distances', () => {
    const { zones } = run();
    expect(zones).toHaveLength(3);
    expect(zones[0].name).toBe('75%');
    expect(zones[0].buffer_distance_nm).toBe(3.0);
    expect(zones[1].name).toBe('50%');
    expect(zones[1].buffer_distance_nm).toBe(6.0);
    expect(zones[2].name).toBe('25%');
    expect(zones[2].buffer_distance_nm).toBe(12.0);
  });

  it('zones are ordered innermost to outermost', () => {
    const { zones } = run();
    const distances = zones.map((z) => z.buffer_distance_nm as number);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1]);
    }
  });

  it('zones have purple/red/orange styles', () => {
    const { zones } = run();
    const styles = zones.map((z) => {
      const style = z.style;
      if (!style || typeof style !== 'object') throw new Error('Expected style object');
      return style as { color?: string; [key: string]: unknown };
    });
    expect(styles[0].color).toBe('#9C27B0'); // purple
    expect(styles[1].color).toBe('#F44336'); // red
    expect(styles[2].color).toBe('#FF9800'); // orange
  });

  it('each sub-polygon has valid closed ring', () => {
    const { multiCoords } = run();
    for (const polygon of multiCoords) {
      const ring = polygon[0]; // exterior ring
      expect(ring.length).toBeGreaterThan(3);
      // Ring is closed
      expect(ring[0][0]).toBe(ring[ring.length - 1][0]);
      expect(ring[0][1]).toBe(ring[ring.length - 1][1]);
    }
  });

  it('feature has UUID-based ID', () => {
    const { feature } = run();
    expect(feature.id).toBeDefined();
    expect(feature.id).toMatch(/^zone-/);
  });

  it('single-point track produces valid MultiPolygon zones', () => {
    const { multiCoords } = run(SINGLE_POINT_TRACK);
    expect(multiCoords).toHaveLength(3);
    for (const polygon of multiCoords) {
      expect(polygon[0].length).toBeGreaterThan(3);
    }
  });
});

// ============================================================
// Phase 2: Custom distances (US2)
// ============================================================

describe('buffer-zone-generator custom distances (US2)', () => {
  it('accepts custom distances', () => {
    const { zones } = run(SIMPLE_TRACK, {
      distance_1_nm: 5,
      distance_2_nm: 10,
      distance_3_nm: 15,
    });
    expect(zones[0].buffer_distance_nm).toBe(5);
    expect(zones[1].buffer_distance_nm).toBe(10);
    expect(zones[2].buffer_distance_nm).toBe(15);
  });

  it('reorders non-ascending custom distances', () => {
    const { zones } = run(SIMPLE_TRACK, {
      distance_1_nm: 15,
      distance_2_nm: 5,
      distance_3_nm: 10,
    });
    const distances = zones.map((z) => z.buffer_distance_nm as number);
    expect(distances).toEqual([5, 10, 15]);
  });

  it('rejects zero distance', () => {
    expect(() =>
      execute([SIMPLE_TRACK], { distance_1_nm: 0 }),
    ).toThrow('All buffer distances must be positive');
  });

  it('rejects negative distance', () => {
    expect(() =>
      execute([SIMPLE_TRACK], { distance_1_nm: -5 }),
    ).toThrow('All buffer distances must be positive');
  });

  it('partial custom distances use sensor model defaults', () => {
    const { zones } = run(SIMPLE_TRACK, { distance_1_nm: 5 });
    expect(zones).toHaveLength(3);
    const distances = zones.map((z) => z.buffer_distance_nm as number);
    expect(distances).toContain(5);
  });

  it('custom distances preserve likelihood ordering (highest pct -> smallest distance)', () => {
    const { zones } = run(SIMPLE_TRACK, {
      distance_1_nm: 1,
      distance_2_nm: 2,
      distance_3_nm: 4,
    });
    expect(zones[0].detection_likelihood_pct).toBe(75);
    expect(zones[1].detection_likelihood_pct).toBe(50);
    expect(zones[2].detection_likelihood_pct).toBe(25);
  });
});

// ============================================================
// Phase 2b: Interval parameter
// ============================================================

describe('buffer-zone-generator interval parameter', () => {
  it('small interval uses 1/2/4 nm distances', () => {
    const { zones } = run(SIMPLE_TRACK, { interval: 'small' });
    const distances = zones.map((z) => z.buffer_distance_nm);
    expect(distances).toEqual([1.0, 2.0, 4.0]);
  });

  it('medium interval uses 2/4/8 nm distances', () => {
    const { zones } = run(SIMPLE_TRACK, { interval: 'medium' });
    const distances = zones.map((z) => z.buffer_distance_nm);
    expect(distances).toEqual([2.0, 4.0, 8.0]);
  });

  it('large interval uses 3/6/12 nm distances', () => {
    const { zones } = run(SIMPLE_TRACK, { interval: 'large' });
    const distances = zones.map((z) => z.buffer_distance_nm);
    expect(distances).toEqual([3.0, 6.0, 12.0]);
  });

  it('preserves likelihood ordering with interval', () => {
    const { zones } = run(SIMPLE_TRACK, { interval: 'small' });
    expect(zones[0].detection_likelihood_pct).toBe(75);
    expect(zones[1].detection_likelihood_pct).toBe(50);
    expect(zones[2].detection_likelihood_pct).toBe(25);
  });

  it('explicit distance overrides interval', () => {
    const { zones } = run(SIMPLE_TRACK, { interval: 'small', distance_1_nm: 5.0 });
    const distances = zones.map((z) => z.buffer_distance_nm);
    expect(distances).toEqual([2.0, 4.0, 5.0]);
  });

  it('invalid interval throws', () => {
    expect(() => run(SIMPLE_TRACK, { interval: 'tiny' })).toThrow('Unknown interval');
  });

  it('omitting interval matches large preset', () => {
    const { zones: defaultZones } = run(SIMPLE_TRACK, {});
    const { zones: largeZones } = run(SIMPLE_TRACK, { interval: 'large' });
    const defaultDist = defaultZones.map((z) => z.buffer_distance_nm);
    const largeDist = largeZones.map((z) => z.buffer_distance_nm);
    expect(defaultDist).toEqual(largeDist);
  });
});

// ============================================================
// Phase 3: Provenance and statelessness (US3)
// ============================================================

describe('buffer-zone-generator provenance and statelessness (US3)', () => {
  it('is stateless — repeated calls produce consistent structure', () => {
    const r1 = run();
    const r2 = run();
    expect(r1.zones.length).toBe(r2.zones.length);
    for (let i = 0; i < r1.zones.length; i++) {
      expect(r1.zones[i].name).toBe(r2.zones[i].name);
      expect(r1.zones[i].buffer_distance_nm).toBe(r2.zones[i].buffer_distance_nm);
    }
  });

  it('attaches provenance annotations', () => {
    const { feature } = run();
    expect(feature.properties['debrief:resultType']).toBe('addition/feature');
    expect(feature.properties['debrief:sourceFeatures']).toEqual(['track-001']);
    expect(feature.properties['debrief:label']).toBeDefined();
  });

  it('provenance label has correct format', () => {
    const { feature } = run();
    const label = feature.properties['debrief:label'] as string;
    expect(label).toBe('Generated 3 detection zones (75%, 50%, 25%) for track');
  });

  it('supports swappable sensor model', () => {
    class TestSensorModel implements SensorModel {
      getDetectionZones(): SensorModelZone[] {
        return [
          { distance_nm: 1.0, likelihood_pct: 90, name: '90%' },
          { distance_nm: 2.0, likelihood_pct: 60, name: '60%' },
          { distance_nm: 4.0, likelihood_pct: 30, name: '30%' },
        ];
      }
    }

    const { zones } = run(SIMPLE_TRACK, {}, new TestSensorModel());
    expect(zones[0].buffer_distance_nm).toBe(1.0);
    expect(zones[1].buffer_distance_nm).toBe(2.0);
    expect(zones[2].buffer_distance_nm).toBe(4.0);
    expect(zones[0].name).toBe('90%');
  });
});

// ============================================================
// Phase 4: Error handling
// ============================================================

describe('buffer-zone-generator error handling', () => {
  it('throws on empty input', () => {
    expect(() => execute([], {})).toThrow('No track features found in input');
  });

  it('throws when no TRACK features', () => {
    expect(() => execute([NON_TRACK_FEATURE], {})).toThrow('No track features found in input');
  });

  it('skips non-TRACK features and uses first TRACK', () => {
    const result = assertFeatures(execute([NON_TRACK_FEATURE, SIMPLE_TRACK], {}));
    expect(result).toHaveLength(1);
    expect(result[0].properties['debrief:sourceFeatures']).toEqual(['track-001']);
  });

  it('throws on track with empty coordinates', () => {
    const emptyTrack = asTrack({
      type: 'Feature' as const,
      id: 'track-empty',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { kind: 'TRACK', name: 'Empty' },
    });
    expect(() => execute([emptyTrack], {})).toThrow('Track has no coordinates');
  });
});

// ============================================================
// Phase 5: Golden example cross-validation
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';

const GOLDEN_DIR = resolve(process.cwd(), '../../shared/tools/sensor/detection');
const goldenInput = JSON.parse(readFileSync(resolve(GOLDEN_DIR, 'buffer-zone-generator.basic-track.input.json'), 'utf-8'));
const goldenOutput = JSON.parse(readFileSync(resolve(GOLDEN_DIR, 'buffer-zone-generator.basic-track.output.json'), 'utf-8'));

describe('buffer-zone-generator golden example', () => {
  it('produces exact coordinate match with Python golden output', () => {
    const track = goldenInput.features[0];
    const result = assertFeatures(execute([asTrack(track)], {}));

    // Both return a list with 1 MultiPolygon feature
    expect(result).toHaveLength(goldenOutput.length);

    const TOLERANCE = 1e-8;
    let maxDiff = 0;

    const goldenFeature = goldenOutput[0];
    const tsFeature = result[0];

    // Properties must match
    expect(tsFeature.properties.kind).toBe(goldenFeature.properties.kind);
    expect(tsFeature.properties.name).toBe(goldenFeature.properties.name);
    expect(tsFeature.geometry.type).toBe('MultiPolygon');

    // Zones metadata must match
    const goldenZones = goldenFeature.properties.zones;
    const tsZones = tsFeature.properties.zones as Array<Record<string, unknown>>;
    expect(tsZones).toHaveLength(goldenZones.length);
    for (let z = 0; z < goldenZones.length; z++) {
      expect(tsZones[z].name).toBe(goldenZones[z].name);
      expect(tsZones[z].detection_likelihood_pct).toBe(goldenZones[z].detection_likelihood_pct);
      expect(tsZones[z].buffer_distance_nm).toBe(goldenZones[z].buffer_distance_nm);
    }

    // Coordinate rings must match point-by-point
    const goldenCoords = goldenFeature.geometry.coordinates as number[][][][];
    const tsCoords = tsFeature.geometry.coordinates as number[][][][];
    expect(tsCoords).toHaveLength(goldenCoords.length);

    for (let p = 0; p < goldenCoords.length; p++) {
      const goldenRing = goldenCoords[p][0]; // exterior ring
      const tsRing = tsCoords[p][0];
      expect(tsRing).toHaveLength(goldenRing.length);

      for (let i = 0; i < goldenRing.length; i++) {
        const dLon = Math.abs(goldenRing[i][0] - tsRing[i][0]);
        const dLat = Math.abs(goldenRing[i][1] - tsRing[i][1]);
        maxDiff = Math.max(maxDiff, dLon, dLat);
        expect(dLon).toBeLessThan(TOLERANCE);
        expect(dLat).toBeLessThan(TOLERANCE);
      }
    }

    expect(maxDiff).toBeLessThan(TOLERANCE);
  });

  it('has correct provenance annotations', () => {
    const track = goldenInput.features[0];
    const result = assertFeatures(execute([asTrack(track)], {}));

    const goldenFeature = goldenOutput[0];
    const tsFeature = result[0];

    expect(tsFeature.properties['debrief:resultType']).toBe(
      goldenFeature.properties['debrief:resultType'],
    );
    expect(tsFeature.properties['debrief:sourceFeatures']).toEqual(
      goldenFeature.properties['debrief:sourceFeatures'],
    );
    expect(tsFeature.properties['debrief:label']).toBe(
      goldenFeature.properties['debrief:label'],
    );
  });
});
