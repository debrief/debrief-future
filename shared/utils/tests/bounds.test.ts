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
