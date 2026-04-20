/**
 * Bounds Calculation Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBounds,
  mergeBounds,
  boundsToLeaflet,
  isValidBounds,
} from '../src/bounds.js';
import type { GeoJSONFeature } from '../src/types.js';

describe('calculateBounds', () => {
  it('should calculate bounds for a single Point feature', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [10, 20] },
        properties: null,
      },
    ];

    const bounds = calculateBounds(features);
    expect(bounds).toEqual([10, 20, 10, 20]);
  });

  it('should calculate bounds for a LineString feature', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [0, 0],
            [10, 10],
            [5, 15],
          ],
        },
        properties: null,
      },
    ];

    const bounds = calculateBounds(features);
    expect(bounds).toEqual([0, 0, 10, 15]);
  });

  it('should calculate bounds for multiple features', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-10, -20] },
        properties: null,
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [5, 5],
            [15, 25],
          ],
        },
        properties: null,
      },
    ];

    const bounds = calculateBounds(features);
    expect(bounds).toEqual([-10, -20, 15, 25]);
  });

  it('should return null for empty features array', () => {
    const bounds = calculateBounds([]);
    expect(bounds).toBeNull();
  });

  it('should handle Polygon geometry', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        properties: null,
      },
    ];

    const bounds = calculateBounds(features);
    expect(bounds).toEqual([0, 0, 10, 10]);
  });

  // T004 — narrowing-gate shape-mismatch assertions (FR-007, SC-009, contract C7).
  // Each non-CoordinateTree input must produce bounds === null without throwing.
  describe('narrowing gate — shape mismatch (T004)', () => {
    it('returns null when coordinates is a string', () => {
      const bounds = calculateBounds([
        { geometry: { type: 'Point', coordinates: 'oops' } },
      ]);
      expect(bounds).toBeNull();
    });

    it('returns null when coordinates is null', () => {
      const bounds = calculateBounds([
        { geometry: { type: 'Point', coordinates: null } },
      ]);
      expect(bounds).toBeNull();
    });

    it('returns null when coordinates is an empty array', () => {
      const bounds = calculateBounds([
        { geometry: { type: 'Point', coordinates: [] } },
      ]);
      expect(bounds).toBeNull();
    });

    it('returns null when coordinates leaves are not numbers', () => {
      const bounds = calculateBounds([
        { geometry: { type: 'LineString', coordinates: [['x', 'y']] } },
      ]);
      expect(bounds).toBeNull();
    });

    it('does not throw for any of the above', () => {
      expect(() =>
        calculateBounds([
          { geometry: { type: 'Point', coordinates: 'oops' } },
          { geometry: { type: 'Point', coordinates: null } },
          { geometry: { type: 'Point', coordinates: [] } },
          { geometry: { type: 'LineString', coordinates: [['x']] } },
        ])
      ).not.toThrow();
    });
  });

  // T005 — null-geometry regression assertions (FR-002, SC-006, contract C5).
  // Before the null-guard lived in shared/utils (it was VS Code-local), the
  // shared calculateBounds threw on null geometry. This test locks the
  // canonical guard in at the shared location.
  describe('null-geometry regression (T005)', () => {
    it('skips a feature whose geometry is null and returns bounds from the rest', () => {
      const bounds = calculateBounds([
        { geometry: null },
        {
          geometry: { type: 'Point', coordinates: [10, 20] },
        },
      ]);
      expect(bounds).toEqual([10, 20, 10, 20]);
    });

    it('skips a feature whose geometry is undefined', () => {
      const bounds = calculateBounds([
        { geometry: undefined },
        {
          geometry: { type: 'Point', coordinates: [-5, -15] },
        },
      ]);
      expect(bounds).toEqual([-5, -15, -5, -15]);
    });

    it('returns null when every feature has null geometry', () => {
      const bounds = calculateBounds([
        { geometry: null },
        { geometry: undefined },
      ]);
      expect(bounds).toBeNull();
    });

    it('does not throw on mixed null + valid features', () => {
      expect(() =>
        calculateBounds([
          { geometry: null },
          { geometry: { type: 'Point', coordinates: [0, 0] } },
        ])
      ).not.toThrow();
    });
  });

  // T007 — per-geometry-type correctness (FR-008, SC-007, contract C6).
  // Each assertion locks in that calculateBounds returns the correct
  // four-number tuple for a single feature of the given geometry type. This
  // is what makes FR-008's "no silent miss in fitToSelection" durable — the
  // test fails if any type is dropped from the utility.
  describe('per-geometry-type correctness (T007)', () => {
    it('Point → tight bounds around the single coordinate', () => {
      const bounds = calculateBounds([
        { geometry: { type: 'Point', coordinates: [3, 7] } },
      ]);
      expect(bounds).toEqual([3, 7, 3, 7]);
    });

    it('LineString → covers every vertex', () => {
      const bounds = calculateBounds([
        {
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [10, 5],
              [-2, 15],
            ],
          },
        },
      ]);
      expect(bounds).toEqual([-2, 0, 10, 15]);
    });

    it('Polygon → covers every vertex of the outer ring', () => {
      const bounds = calculateBounds([
        {
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [20, 0],
                [20, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          },
        },
      ]);
      expect(bounds).toEqual([0, 0, 20, 10]);
    });

    it('MultiPoint → covers every sub-point', () => {
      const bounds = calculateBounds([
        {
          geometry: {
            type: 'MultiPoint',
            coordinates: [
              [1, 2],
              [5, 10],
              [-3, -4],
            ],
          },
        },
      ]);
      expect(bounds).toEqual([-3, -4, 5, 10]);
    });

    it('MultiLineString → covers every vertex in every line', () => {
      const bounds = calculateBounds([
        {
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [0, 0],
                [10, 10],
              ],
              [
                [-5, 2],
                [3, -7],
              ],
            ],
          },
        },
      ]);
      expect(bounds).toEqual([-5, -7, 10, 10]);
    });

    it('MultiPolygon → covers every vertex in every polygon', () => {
      const bounds = calculateBounds([
        {
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [5, 0],
                  [5, 5],
                  [0, 5],
                  [0, 0],
                ],
              ],
              [
                [
                  [10, 10],
                  [20, 10],
                  [20, 20],
                  [10, 20],
                  [10, 10],
                ],
              ],
            ],
          },
        },
      ]);
      expect(bounds).toEqual([0, 0, 20, 20]);
    });
  });
});

describe('mergeBounds', () => {
  it('should merge two bounds', () => {
    const a: [number, number, number, number] = [0, 0, 10, 10];
    const b: [number, number, number, number] = [5, 5, 20, 15];

    const merged = mergeBounds(a, b);
    expect(merged).toEqual([0, 0, 20, 15]);
  });

  it('should return second bounds when first is null', () => {
    const b: [number, number, number, number] = [5, 5, 20, 15];

    const merged = mergeBounds(null, b);
    expect(merged).toEqual(b);
  });

  it('should return first bounds when second is null', () => {
    const a: [number, number, number, number] = [0, 0, 10, 10];

    const merged = mergeBounds(a, null);
    expect(merged).toEqual(a);
  });

  it('should return null when both are null', () => {
    const merged = mergeBounds(null, null);
    expect(merged).toBeNull();
  });
});

describe('boundsToLeaflet', () => {
  it('should convert bounds to Leaflet format', () => {
    const bounds: [number, number, number, number] = [-10, -20, 30, 40];

    const leafletBounds = boundsToLeaflet(bounds);

    // [[south, west], [north, east]]
    expect(leafletBounds).toEqual([
      [-20, -10], // [minLat, minLon]
      [40, 30], // [maxLat, maxLon]
    ]);
  });
});

describe('isValidBounds', () => {
  it('should return true for valid bounds', () => {
    const bounds: [number, number, number, number] = [-10, -20, 30, 40];
    expect(isValidBounds(bounds)).toBe(true);
  });

  it('should return false when longitude out of range', () => {
    const bounds: [number, number, number, number] = [-200, -20, 30, 40];
    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should return false when latitude out of range', () => {
    const bounds: [number, number, number, number] = [-10, -100, 30, 40];
    expect(isValidBounds(bounds)).toBe(false);
  });

  it('should return false when min > max', () => {
    const bounds: [number, number, number, number] = [30, -20, -10, 40];
    expect(isValidBounds(bounds)).toBe(false);
  });
});
