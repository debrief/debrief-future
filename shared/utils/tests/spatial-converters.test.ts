/**
 * Spatial Converter Unit Tests (feature 203).
 *
 * Asserts GeoJSON axis order (RFC 7946 §3.1.1) and round-trip identity
 * across a canonical set plus edge cases (antimeridian, poles, major cities,
 * sub-metre precision).
 */

import { describe, it, expect } from 'vitest';
import type { Coordinate } from '@debrief/schemas';
import {
  toGeoJSONCoord,
  fromGeoJSONCoord,
} from '../src/spatial-converters.js';

describe('toGeoJSONCoord', () => {
  it('returns GeoJSON-order tuple [longitude, latitude]', () => {
    expect(toGeoJSONCoord({ longitude: -1.5, latitude: 51.5 })).toEqual([
      -1.5, 51.5,
    ]);
  });

  it('is order-sensitive (positive longitude case)', () => {
    expect(toGeoJSONCoord({ longitude: 139.6917, latitude: 35.6895 })).toEqual([
      139.6917, 35.6895,
    ]);
  });
});

describe('fromGeoJSONCoord', () => {
  it('accepts GeoJSON-order tuple and returns object', () => {
    expect(fromGeoJSONCoord([-1.5, 51.5])).toEqual({
      longitude: -1.5,
      latitude: 51.5,
    });
  });
});

describe('round-trip identity (fromGeoJSONCoord(toGeoJSONCoord(c)) === c)', () => {
  const cases: Coordinate[] = [
    { longitude: 0, latitude: 0 },
    { longitude: -180, latitude: -90 }, // SW antimeridian + south pole
    { longitude: 180, latitude: 90 }, // NE antimeridian + north pole
    { longitude: 179.9999, latitude: 89.9999 },
    { longitude: -0.1276, latitude: 51.5074 }, // London
    { longitude: 139.6917, latitude: 35.6895 }, // Tokyo
    { longitude: -74.006, latitude: 40.7128 }, // New York
    { longitude: 151.2093, latitude: -33.8688 }, // Sydney
    { longitude: 0.000001, latitude: -0.000001 }, // sub-metre precision
    { longitude: -45.5, latitude: 0 }, // equator crossing
  ];

  it.each(cases)('round-trips %o unchanged', (coord) => {
    expect(fromGeoJSONCoord(toGeoJSONCoord(coord))).toEqual(coord);
  });
});
