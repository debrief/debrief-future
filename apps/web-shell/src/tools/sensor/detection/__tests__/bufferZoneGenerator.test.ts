/**
 * Tests for the TypeScript buffer-zone-generator tool.
 * Mirrors the Python test suite in services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py.
 */

import { describe, it, expect } from 'vitest';
import { execute, toolDefinition } from '../bufferZoneGenerator';
import type { SensorModel, SensorModelZone } from '../bufferZoneGenerator';

// ============================================================
// Test fixtures
// ============================================================

const SIMPLE_TRACK = {
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
};

const SINGLE_POINT_TRACK = {
  type: 'Feature' as const,
  id: 'track-single',
  geometry: {
    type: 'LineString',
    coordinates: [[-4.5, 50.2, 0, 1705305600000]],
  },
  properties: { kind: 'TRACK', name: 'Single Point' },
};

const NON_TRACK_FEATURE = {
  type: 'Feature' as const,
  id: 'circle-001',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  },
  properties: { kind: 'CIRCLE', name: 'Test Circle' },
};

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
// Phase 1: Basic zone generation (US1)
// ============================================================

describe('buffer-zone-generator basic generation (US1)', () => {
  it('generates exactly 3 zone features', () => {
    const result = execute([SIMPLE_TRACK], {});
    expect(result).toHaveLength(3);
  });

  it('zones have correct properties', () => {
    const result = execute([SIMPLE_TRACK], {});
    for (const zone of result) {
      expect(zone.type).toBe('Feature');
      expect(zone.geometry.type).toBe('Polygon');
      expect(zone.properties.kind).toBe('ZONE');
      expect(zone.properties.name).toBeTruthy();
      expect(zone.properties.detection_likelihood_pct).toBeDefined();
      expect(zone.properties.buffer_distance_nm).toBeDefined();
    }
  });

  it('zones have correct names and distances', () => {
    const result = execute([SIMPLE_TRACK], {});
    expect(result[0].properties.name).toBe('75%');
    expect(result[0].properties.buffer_distance_nm).toBe(3.0);
    expect(result[1].properties.name).toBe('50%');
    expect(result[1].properties.buffer_distance_nm).toBe(6.0);
    expect(result[2].properties.name).toBe('25%');
    expect(result[2].properties.buffer_distance_nm).toBe(12.0);
  });

  it('zones are ordered innermost to outermost', () => {
    const result = execute([SIMPLE_TRACK], {});
    const distances = result.map((z) => z.properties.buffer_distance_nm as number);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1]);
    }
  });

  it('zones have valid polygon geometry (closed ring)', () => {
    const result = execute([SIMPLE_TRACK], {});
    for (const zone of result) {
      const ring = (zone.geometry.coordinates as number[][][])[0];
      expect(ring.length).toBeGreaterThan(3);
      // Ring is closed
      expect(ring[0][0]).toBe(ring[ring.length - 1][0]);
      expect(ring[0][1]).toBe(ring[ring.length - 1][1]);
    }
  });

  it('zones have UUID-based IDs', () => {
    const result = execute([SIMPLE_TRACK], {});
    for (const zone of result) {
      expect(zone.id).toBeDefined();
      expect(zone.id).toMatch(/^zone-/);
    }
  });

  it('single-point track produces circular zones', () => {
    const result = execute([SINGLE_POINT_TRACK], {});
    expect(result).toHaveLength(3);
    for (const zone of result) {
      const ring = (zone.geometry.coordinates as number[][][])[0];
      expect(ring.length).toBeGreaterThan(3);
    }
  });
});

// ============================================================
// Phase 2: Custom distances (US2)
// ============================================================

describe('buffer-zone-generator custom distances (US2)', () => {
  it('accepts custom distances', () => {
    const result = execute([SIMPLE_TRACK], {
      distance_1_nm: 5,
      distance_2_nm: 10,
      distance_3_nm: 15,
    });
    expect(result[0].properties.buffer_distance_nm).toBe(5);
    expect(result[1].properties.buffer_distance_nm).toBe(10);
    expect(result[2].properties.buffer_distance_nm).toBe(15);
  });

  it('reorders non-ascending custom distances', () => {
    const result = execute([SIMPLE_TRACK], {
      distance_1_nm: 15,
      distance_2_nm: 5,
      distance_3_nm: 10,
    });
    const distances = result.map((z) => z.properties.buffer_distance_nm as number);
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
    const result = execute([SIMPLE_TRACK], { distance_1_nm: 5 });
    expect(result).toHaveLength(3);
    // distance_1_nm=5 overrides the innermost; others keep defaults (6, 12)
    const distances = result.map((z) => z.properties.buffer_distance_nm as number);
    expect(distances).toContain(5);
  });

  it('custom distances preserve likelihood ordering (highest pct -> smallest distance)', () => {
    const result = execute([SIMPLE_TRACK], {
      distance_1_nm: 1,
      distance_2_nm: 2,
      distance_3_nm: 4,
    });
    // Smallest distance should have highest likelihood
    expect(result[0].properties.detection_likelihood_pct).toBe(75);
    expect(result[1].properties.detection_likelihood_pct).toBe(50);
    expect(result[2].properties.detection_likelihood_pct).toBe(25);
  });
});

// ============================================================
// Phase 3: Provenance and statelessness (US3)
// ============================================================

describe('buffer-zone-generator provenance and statelessness (US3)', () => {
  it('is stateless — repeated calls produce consistent structure', () => {
    const r1 = execute([SIMPLE_TRACK], {});
    const r2 = execute([SIMPLE_TRACK], {});
    expect(r1.length).toBe(r2.length);
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i].properties.name).toBe(r2[i].properties.name);
      expect(r1[i].properties.buffer_distance_nm).toBe(r2[i].properties.buffer_distance_nm);
    }
  });

  it('attaches provenance annotations', () => {
    const result = execute([SIMPLE_TRACK], {});
    for (const zone of result) {
      expect(zone.properties['debrief:resultType']).toBe('addition/feature');
      expect(zone.properties['debrief:sourceFeatures']).toEqual(['track-001']);
      expect(zone.properties['debrief:label']).toBeDefined();
    }
  });

  it('provenance label has correct format', () => {
    const result = execute([SIMPLE_TRACK], {});
    const label = result[0].properties['debrief:label'] as string;
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

    const result = execute([SIMPLE_TRACK], {}, new TestSensorModel());
    expect(result[0].properties.buffer_distance_nm).toBe(1.0);
    expect(result[1].properties.buffer_distance_nm).toBe(2.0);
    expect(result[2].properties.buffer_distance_nm).toBe(4.0);
    expect(result[0].properties.name).toBe('90%');
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
    const result = execute([NON_TRACK_FEATURE, SIMPLE_TRACK], {});
    expect(result).toHaveLength(3);
    expect(result[0].properties['debrief:sourceFeatures']).toEqual(['track-001']);
  });

  it('throws on track with empty coordinates', () => {
    const emptyTrack = {
      type: 'Feature' as const,
      id: 'track-empty',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { kind: 'TRACK', name: 'Empty' },
    };
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
    const result = execute([track as unknown as Parameters<typeof execute>[0][0]], {});

    expect(result).toHaveLength(goldenOutput.length);

    const TOLERANCE = 1e-8;
    let maxDiff = 0;

    for (let z = 0; z < goldenOutput.length; z++) {
      const goldenZone = goldenOutput[z];
      const tsZone = result[z];

      // Properties must match exactly
      expect(tsZone.properties.kind).toBe(goldenZone.properties.kind);
      expect(tsZone.properties.name).toBe(goldenZone.properties.name);
      expect(tsZone.properties.detection_likelihood_pct).toBe(goldenZone.properties.detection_likelihood_pct);
      expect(tsZone.properties.buffer_distance_nm).toBe(goldenZone.properties.buffer_distance_nm);

      // Coordinate ring must match point-by-point
      const goldenRing = goldenZone.geometry.coordinates[0];
      const tsRing = (tsZone.geometry.coordinates as number[][][])[0];
      expect(tsRing).toHaveLength(goldenRing.length);

      for (let i = 0; i < goldenRing.length; i++) {
        const dLon = Math.abs(goldenRing[i][0] - tsRing[i][0]);
        const dLat = Math.abs(goldenRing[i][1] - tsRing[i][1]);
        maxDiff = Math.max(maxDiff, dLon, dLat);
        expect(dLon).toBeLessThan(TOLERANCE);
        expect(dLat).toBeLessThan(TOLERANCE);
      }
    }

    // Overall check
    expect(maxDiff).toBeLessThan(TOLERANCE);
  });

  it('has correct provenance annotations', () => {
    const track = goldenInput.features[0];
    const result = execute([track as unknown as Parameters<typeof execute>[0][0]], {});

    for (let z = 0; z < goldenOutput.length; z++) {
      expect(result[z].properties['debrief:resultType']).toBe(
        goldenOutput[z].properties['debrief:resultType'],
      );
      expect(result[z].properties['debrief:sourceFeatures']).toEqual(
        goldenOutput[z].properties['debrief:sourceFeatures'],
      );
      expect(result[z].properties['debrief:label']).toBe(
        goldenOutput[z].properties['debrief:label'],
      );
    }
  });
});
