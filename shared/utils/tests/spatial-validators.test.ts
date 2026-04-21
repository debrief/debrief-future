/**
 * Spatial Validator Unit Tests (feature 203).
 *
 * Ports behaviour equivalence from the pre-203 tuple-form validators in
 * services/session-state/src/types/spatial.ts, adapted to the canonical
 * object form.
 */

import { describe, it, expect } from 'vitest';
import type { ViewportPolygon } from '@debrief/schemas';
import {
  validateCoordinate,
  validateViewportPolygon,
  calculateViewportCenter,
} from '../src/spatial-validators.js';

describe('validateCoordinate', () => {
  it.each([
    [{ longitude: 0, latitude: 0 }, true],
    [{ longitude: -180, latitude: -90 }, true],
    [{ longitude: 180, latitude: 90 }, true],
    [{ longitude: 180.1, latitude: 0 }, false],
    [{ longitude: 0, latitude: 90.1 }, false],
    [{ longitude: -180.1, latitude: 0 }, false],
    [{ longitude: 0, latitude: -90.1 }, false],
  ])('validates %o → %s', (coord, expected) => {
    expect(validateCoordinate(coord)).toBe(expected);
  });
});

describe('validateViewportPolygon', () => {
  const valid: ViewportPolygon = {
    coordinates: [
      { longitude: -1, latitude: 52 }, // NW
      { longitude: 1, latitude: 52 }, // NE
      { longitude: 1, latitude: 51 }, // SE
      { longitude: -1, latitude: 51 }, // SW
    ],
  };

  it('accepts a 4-corner polygon of valid coordinates', () => {
    expect(validateViewportPolygon(valid)).toBe(true);
  });

  it('rejects a 3-corner polygon (cardinality)', () => {
    expect(
      validateViewportPolygon({ coordinates: valid.coordinates.slice(0, 3) }),
    ).toBe(false);
  });

  it('rejects a 5-corner polygon (cardinality)', () => {
    expect(
      validateViewportPolygon({
        coordinates: [...valid.coordinates, valid.coordinates[0]],
      }),
    ).toBe(false);
  });

  it('rejects if any coordinate is out of bounds', () => {
    const bad: ViewportPolygon = {
      coordinates: [
        { longitude: 181, latitude: 52 }, // NW — out of bounds
        valid.coordinates[1],
        valid.coordinates[2],
        valid.coordinates[3],
      ],
    };
    expect(validateViewportPolygon(bad)).toBe(false);
  });
});

describe('calculateViewportCenter', () => {
  it('averages the four corners', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: -2, latitude: 52 },
        { longitude: 2, latitude: 52 },
        { longitude: 2, latitude: 50 },
        { longitude: -2, latitude: 50 },
      ],
    };
    expect(calculateViewportCenter(viewport)).toEqual({
      longitude: 0,
      latitude: 51,
    });
  });

  it('handles asymmetric corners', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: -10, latitude: 60 },
        { longitude: 10, latitude: 60 },
        { longitude: 20, latitude: 40 },
        { longitude: -20, latitude: 40 },
      ],
    };
    expect(calculateViewportCenter(viewport)).toEqual({
      longitude: 0,
      latitude: 50,
    });
  });
});
