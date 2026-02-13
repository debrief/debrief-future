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

// ============================================================================
// User Story 1: Grid Pattern
// ============================================================================

describe('Grid Pattern', () => {
  it('3x4 grid returns 12 coordinates', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [-5, 49, 1, 52],
      rows: 3,
      cols: 4,
    });

    expect(result).toHaveLength(1);
    const feature = result[0];
    expect(feature.geometry.type).toBe('MultiPoint');
    expect(feature.geometry.coordinates).toHaveLength(12);
  });

  it('3x4 grid has correct positions', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [-5, 49, 1, 52],
      rows: 3,
      cols: 4,
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

  it('1x1 grid returns centre point', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [-5, 49, 1, 52],
      rows: 1,
      cols: 1,
    });

    const coords = result[0].geometry.coordinates;
    expect(coords).toHaveLength(1);
    expect(coords[0][0]).toBeCloseTo(-2.0);
    expect(coords[0][1]).toBeCloseTo(50.5);
  });

  it('5x5 grid has 25 coordinates at even intervals', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [0, 0, 4, 4],
      rows: 5,
      cols: 5,
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
    const result = execute([], {
      pattern: 'grid',
      bounds: [-5, 49, 1, 52],
      rows: 3,
      cols: 4,
    });

    const feature = result[0];
    expect(feature.type).toBe('Feature');
    expect(feature.id).toBe('ref-grid');
    expect(feature.properties.kind).toBe('POINT');
    expect(feature.properties.locationType).toBe('REFERENCE');
    expect((feature.properties.name as string)).toContain('grid 3x4');
    expect((feature.properties.style as any).shape).toBe('square');
    expect((feature.properties.style as any).color).toBe('#666666');
    expect((feature.properties.style as any).radius).toBe(5);
  });

  it('pointMetadata is parallel to coordinates', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [-5, 49, 1, 52],
      rows: 3,
      cols: 4,
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
// Grid Edge Cases
// ============================================================================

describe('Grid Edge Cases', () => {
  it('zero-area bounds (west==east) throws', () => {
    expect(() =>
      execute([], { pattern: 'grid', bounds: [0, 0, 0, 1], rows: 2, cols: 2 }),
    ).toThrow('positive area');
  });

  it('south >= north throws', () => {
    expect(() =>
      execute([], { pattern: 'grid', bounds: [0, 52, 1, 49], rows: 2, cols: 2 }),
    ).toThrow('must be less than north');
  });

  it('negative rows throws', () => {
    expect(() =>
      execute([], {
        pattern: 'grid',
        bounds: [-5, 49, 1, 52],
        rows: -1,
        cols: 4,
      }),
    ).toThrow('positive integer');
  });

  it('zero cols throws', () => {
    expect(() =>
      execute([], {
        pattern: 'grid',
        bounds: [-5, 49, 1, 52],
        rows: 3,
        cols: 0,
      }),
    ).toThrow('positive integer');
  });

  it('invalid pattern throws', () => {
    expect(() =>
      execute([], { pattern: 'hexagonal' as any, bounds: [-5, 49, 1, 52] }),
    ).toThrow("'grid' or 'scatter'");
  });

  it('matches golden example', () => {
    const goldenInput = loadGolden('generate-reference-points.grid.input.json');
    const goldenOutput = loadGolden('generate-reference-points.grid.output.json');

    const result = execute([], goldenInput);
    const expected = goldenOutput.features[0];
    const actual = result[0];

    expect(actual.id).toBe(expected.id);
    expect(actual.geometry).toEqual(expected.geometry);
    expect(actual.properties.pointMetadata).toEqual(expected.properties.pointMetadata);
  });

  it('antimeridian crossing normalises longitudes', () => {
    const result = execute([], {
      pattern: 'grid',
      bounds: [170, -10, -170, 10],
      rows: 3,
      cols: 3,
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
    const result = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
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
      bounds: [-5, 49, 1, 52] as [number, number, number, number],
      count: 20,
      seed: 42,
    };
    const result1 = execute([], params);
    const result2 = execute([], params);

    expect(result1[0].geometry.coordinates).toEqual(
      result2[0].geometry.coordinates,
    );
  });

  it('different seeds produce different output', () => {
    const result1 = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
      count: 20,
      seed: 1,
    });
    const result2 = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
      count: 20,
      seed: 2,
    });

    expect(result1[0].geometry.coordinates).not.toEqual(
      result2[0].geometry.coordinates,
    );
  });

  it('all points within bounds', () => {
    const result = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
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
    const result = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
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
    const result = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
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
      execute([], {
        pattern: 'scatter',
        bounds: [-5, 49, 1, 52],
        count: 0,
        seed: 42,
      }),
    ).toThrow('positive integer');
  });

  it('missing count uses default (25)', () => {
    const result = execute([], {
      pattern: 'scatter',
      bounds: [-5, 49, 1, 52],
      seed: 42,
    });

    expect(result[0].geometry.coordinates).toHaveLength(25);
  });

  it('antimeridian crossing wraps longitudes', () => {
    const result = execute([], {
      pattern: 'scatter',
      bounds: [170, -10, -170, 10],
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

    const result = execute([], goldenInput);
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

    const result = execute([], goldenInput);
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

    const result = execute([], goldenInput);
    const expectedCoords = goldenOutput.features[0].geometry.coordinates;
    const actualCoords = result[0].geometry.coordinates;

    expect(actualCoords).toHaveLength(expectedCoords.length);
    for (let i = 0; i < actualCoords.length; i++) {
      expect(actualCoords[i][0]).toBeCloseTo(expectedCoords[i][0], 5);
      expect(actualCoords[i][1]).toBeCloseTo(expectedCoords[i][1], 5);
    }
  });
});
