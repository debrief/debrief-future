/**
 * Unit tests for generate-reference-points tool (TypeScript).
 *
 * Mirrors the Python test suite to verify cross-language parity.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execute } from '../../../../src/tools/reference/generation/generateReferencePoints';

const GOLDEN_DIR = resolve(__dirname, '../../../../../..', 'shared/tools/reference/generation');

function loadGolden(name: string): any {
  return JSON.parse(readFileSync(resolve(GOLDEN_DIR, name), 'utf-8'));
}

/** Create a RECTANGLE polygon feature for the given bounds. */
function makePolygon(west: number, south: number, east: number, north: number): any {
  return {
    type: 'Feature',
    id: 'test-rect',
    geometry: {
      type: 'Polygon',
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    },
    properties: { kind: 'RECTANGLE' },
  };
}

/** Default polygon with bounds [-5, 49, 1, 52]. */
const defaultPolygon = makePolygon(-5, 49, 1, 52);

// ============================================================================
// User Story 1: Grid Pattern
// ============================================================================

describe('Grid Pattern', () => {
  it('count=12 grid returns 12 coordinates in a 3x4 layout', () => {
    const result = execute([defaultPolygon], {
      pattern: 'grid',
      count: 12,
    });

    expect(result).toHaveLength(1);
    const feature = result[0];
    expect(feature.geometry.type).toBe('MultiPoint');
    expect(feature.geometry.coordinates).toHaveLength(12);
  });

  it('count=12 grid has correct positions (3x4 layout)', () => {
    const result = execute([defaultPolygon], {
      pattern: 'grid',
      count: 12,
    });

    const coords = result[0].geometry.coordinates;

    // Row 0 (lat=49)
    expect(coords[0]).toEqual([-5.0, 49.0]);
    expect(coords[1]).toEqual([-3.0, 49.0]);
    expect(coords[2]).toEqual([-1.0, 49.0]);
    expect(coords[3]).toEqual([1.0, 49.0]);

    // Row 1 (lat=50.5)
    expect(coords[4]).toEqual([-5.0, 50.5]);
    expect(coords[5]).toEqual([-3.0, 50.5]);
    expect(coords[6]).toEqual([-1.0, 50.5]);
    expect(coords[7]).toEqual([1.0, 50.5]);

    // Row 2 (lat=52)
    expect(coords[8]).toEqual([-5.0, 52.0]);
    expect(coords[9]).toEqual([-3.0, 52.0]);
    expect(coords[10]).toEqual([-1.0, 52.0]);
    expect(coords[11]).toEqual([1.0, 52.0]);
  });

  it('count=1 grid returns centre point', () => {
    const result = execute([defaultPolygon], {
      pattern: 'grid',
      count: 1,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(1);
    expect(coords[0][0]).toBeCloseTo(-2.0);
    expect(coords[0][1]).toBeCloseTo(50.5);
  });

  it('count=25 grid has 25 coordinates at even intervals (5x5)', () => {
    const result = execute([makePolygon(0, 0, 4, 4)], {
      pattern: 'grid',
      count: 25,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(25);

    // Corners
    expect(coords[0]).toEqual([0.0, 0.0]);
    expect(coords[4]).toEqual([4.0, 0.0]);
    expect(coords[20]).toEqual([0.0, 4.0]);
    expect(coords[24]).toEqual([4.0, 4.0]);

    // Spacing
    expect(coords[1]).toEqual([1.0, 0.0]);
    expect(coords[5]).toEqual([0.0, 1.0]);
  });

  it('feature has correct properties', () => {
    const result = execute([defaultPolygon], {
      pattern: 'grid',
      count: 12,
    });

    const feature = result[0];
    expect(feature.type).toBe('Feature');
    expect(feature.id).toBe('ref-grid');
    expect(feature.properties.kind).toBe('POINT');
    expect(feature.properties.locationType).toBe('REFERENCE');
    expect((feature.properties.name as string)).toContain('grid 12');
    expect((feature.properties.style as any).shape).toBe('square');
    expect((feature.properties.style as any).color).toBe('#666666');
    expect((feature.properties.style as any).radius).toBe(5);
  });

  it('pointMetadata is parallel to coordinates', () => {
    const result = execute([defaultPolygon], {
      pattern: 'grid',
      count: 12,
    });

    const coords = result[0].geometry.coordinates;
    const metadata = result[0].properties.pointMetadata as any[];

    expect(metadata).toHaveLength(coords.length);
    metadata.forEach((entry: any, i: number) => {
      expect(entry.index).toBe(i);
      expect(entry.name).toBe(`Ref ${i + 1}`);
    });
  });

  it('count=10 trims incomplete last row', () => {
    // count=10 → cols=4, rows=3 → 12 slots, keep 10
    const result = execute([makePolygon(0, 0, 3, 2)], {
      pattern: 'grid',
      count: 10,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(10);
  });
});

// ============================================================================
// Grid Edge Cases
// ============================================================================

describe('Grid Edge Cases', () => {
  it('zero-area bounds (west==east) throws', () => {
    expect(() =>
      execute([makePolygon(0, 0, 0, 1)], { pattern: 'grid', count: 4 }),
    ).toThrow('positive area');
  });

  it('zero-area bounds (south==north) throws', () => {
    expect(() =>
      execute([makePolygon(0, 0, 1, 0)], { pattern: 'grid', count: 4 }),
    ).toThrow('must be less than north');
  });

  it('count=0 throws', () => {
    expect(() =>
      execute([defaultPolygon], { pattern: 'grid', count: 0 }),
    ).toThrow('positive integer');
  });

  it('invalid pattern throws', () => {
    expect(() =>
      execute([defaultPolygon], { pattern: 'hexagonal' as any }),
    ).toThrow("'grid' or 'scatter'");
  });

  it('no features throws', () => {
    expect(() =>
      execute([], { pattern: 'grid', count: 12 }),
    ).toThrow('polygon feature');
  });

  it('matches golden example', () => {
    const goldenInput = loadGolden('generate-reference-points.grid.input.json');
    const goldenOutput = loadGolden('generate-reference-points.grid.output.json');

    const result = execute(goldenInput.features, goldenInput.params);
    const expected = goldenOutput.features[0];
    const actual = result[0];

    expect(actual.id).toBe(expected.id);
    expect(actual.geometry).toEqual(expected.geometry);
    expect(actual.properties.pointMetadata).toEqual(expected.properties.pointMetadata);
  });

  it('antimeridian crossing normalises longitudes', () => {
    const result = execute([makePolygon(170, -10, -170, 10)], {
      pattern: 'grid',
      count: 9,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(9);
    for (const [lon, lat] of coords) {
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-10);
      expect(lat).toBeLessThanOrEqual(10);
    }
  });
});

// ============================================================================
// User Story 2: Scatter Pattern
// ============================================================================

describe('Scatter Pattern', () => {
  it('scatter with count=20 returns 20 coordinates', () => {
    const result = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 20,
      seed: 42,
    });

    expect(result).toHaveLength(1);
    expect(result[0].geometry.type).toBe('MultiPoint');
    expect(result[0].geometry.coordinates).toHaveLength(20);
  });

  it('same seed produces identical output', () => {
    const params = {
      pattern: 'scatter' as const,
      count: 20,
      seed: 42,
    };
    const result1 = execute([defaultPolygon], params);
    const result2 = execute([defaultPolygon], params);

    expect(result1[0].geometry.coordinates).toEqual(
      result2[0].geometry.coordinates,
    );
  });

  it('different seeds produce different output', () => {
    const result1 = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 20,
      seed: 1,
    });
    const result2 = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 20,
      seed: 2,
    });

    expect(result1[0].geometry.coordinates).not.toEqual(
      result2[0].geometry.coordinates,
    );
  });

  it('all points within bounds', () => {
    const result = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 100,
      seed: 99,
    });

    for (const [lon, lat] of result[0].geometry.coordinates) {
      expect(lon).toBeGreaterThanOrEqual(-5);
      expect(lon).toBeLessThanOrEqual(1);
      expect(lat).toBeGreaterThanOrEqual(49);
      expect(lat).toBeLessThanOrEqual(52);
    }
  });

  it('feature has correct properties', () => {
    const result = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 20,
      seed: 42,
    });

    const feature = result[0];
    expect(feature.id).toBe('ref-scatter');
    expect(feature.properties.kind).toBe('POINT');
    expect(feature.properties.locationType).toBe('REFERENCE');
    expect((feature.properties.name as string)).toContain('scatter 20');
  });

  it('pointMetadata is parallel to coordinates', () => {
    const result = execute([defaultPolygon], {
      pattern: 'scatter',
      count: 10,
      seed: 42,
    });

    const coords = result[0].geometry.coordinates;
    const metadata = result[0].properties.pointMetadata as any[];

    expect(metadata).toHaveLength(coords.length);
    metadata.forEach((entry: any, i: number) => {
      expect(entry.index).toBe(i);
      expect(entry.name).toBe(`Ref ${i + 1}`);
    });
  });
});

// ============================================================================
// Scatter Edge Cases
// ============================================================================

describe('Scatter Edge Cases', () => {
  it('count=0 throws', () => {
    expect(() =>
      execute([defaultPolygon], {
        pattern: 'scatter',
        count: 0,
        seed: 42,
      }),
    ).toThrow('positive integer');
  });

  it('missing count uses default (20)', () => {
    const result = execute([defaultPolygon], {
      pattern: 'scatter',
      seed: 42,
    });

    expect(result[0].geometry.coordinates).toHaveLength(20);
  });

  it('antimeridian crossing wraps longitudes', () => {
    const result = execute([makePolygon(170, -10, -170, 10)], {
      pattern: 'scatter',
      count: 50,
      seed: 42,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(50);
    for (const [lon, lat] of coords) {
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-10);
      expect(lat).toBeLessThanOrEqual(10);
    }
  });

  it('matches golden example', () => {
    const goldenInput = loadGolden(
      'generate-reference-points.scatter.input.json',
    );
    const goldenOutput = loadGolden(
      'generate-reference-points.scatter.output.json',
    );

    const result = execute(goldenInput.features, goldenInput.params);
    const expected = goldenOutput.features[0];
    const actual = result[0];

    expect(actual.id).toBe(expected.id);

    const expectedCoords = expected.geometry.coordinates;
    const actualCoords = actual.geometry.coordinates;
    expect(actualCoords).toHaveLength(expectedCoords.length);

    for (let i = 0; i < actualCoords.length; i++) {
      expect(actualCoords[i][0]).toBeCloseTo(expectedCoords[i][0], 5);
      expect(actualCoords[i][1]).toBeCloseTo(expectedCoords[i][1], 5);
    }
  });
});

// ============================================================================
// Cross-Language Parity
// ============================================================================

describe('Cross-Language Parity', () => {
  it('grid output matches golden example exactly', () => {
    const goldenInput = loadGolden('generate-reference-points.grid.input.json');
    const goldenOutput = loadGolden('generate-reference-points.grid.output.json');

    const result = execute(goldenInput.features, goldenInput.params);
    const expected = goldenOutput.features[0];

    expect(result[0].geometry.coordinates).toEqual(
      expected.geometry.coordinates,
    );
    expect(result[0].properties.pointMetadata).toEqual(
      expected.properties.pointMetadata,
    );
  });

  it('scatter output matches golden example (seed=42)', () => {
    const goldenInput = loadGolden(
      'generate-reference-points.scatter.input.json',
    );
    const goldenOutput = loadGolden(
      'generate-reference-points.scatter.output.json',
    );

    const result = execute(goldenInput.features, goldenInput.params);
    const expectedCoords = goldenOutput.features[0].geometry.coordinates;
    const actualCoords = result[0].geometry.coordinates;

    expect(actualCoords).toHaveLength(expectedCoords.length);
    for (let i = 0; i < actualCoords.length; i++) {
      expect(actualCoords[i][0]).toBeCloseTo(expectedCoords[i][0], 5);
      expect(actualCoords[i][1]).toBeCloseTo(expectedCoords[i][1], 5);
    }
  });
});
