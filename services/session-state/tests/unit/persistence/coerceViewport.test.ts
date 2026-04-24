/**
 * coerceViewport unit tests (feature 203).
 *
 * Covers the six cases enumerated in contracts/persistence-migration.md §Contract
 * assertions: legacy tuple form, current object form, null/undefined,
 * bad coordinates length, malformed entry, bad zoom.
 */

import { describe, it, expect } from 'vitest';
import type { ViewportPolygon } from '@debrief/schemas';
import { coerceViewport } from '../../../src/persistence/load.js';

describe('coerceViewport', () => {
  it('converts a legacy tuple-form viewport to object form', () => {
    const legacy = {
      coordinates: [
        [-1, 52],
        [1, 52],
        [1, 51],
        [-1, 51],
      ],
      zoom: 10,
    };
    expect(coerceViewport(legacy)).toEqual({
      coordinates: [
        { longitude: -1, latitude: 52 },
        { longitude: 1, latitude: 52 },
        { longitude: 1, latitude: 51 },
        { longitude: -1, latitude: 51 },
      ],
      zoom: 10,
    });
  });

  it('passes through an already-object viewport unchanged (by value)', () => {
    const current: ViewportPolygon = {
      coordinates: [
        { longitude: -1, latitude: 52 },
        { longitude: 1, latitude: 52 },
        { longitude: 1, latitude: 51 },
        { longitude: -1, latitude: 51 },
      ],
      zoom: 10,
    };
    expect(coerceViewport(current)).toEqual(current);
  });

  it('returns null for null or undefined', () => {
    expect(coerceViewport(null)).toBeNull();
    expect(coerceViewport(undefined)).toBeNull();
  });

  it('returns null when coordinates is missing or wrong length', () => {
    expect(coerceViewport({ coordinates: [] })).toBeNull();
    expect(
      coerceViewport({
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toBeNull();
    expect(coerceViewport({})).toBeNull();
    expect(coerceViewport('not an object')).toBeNull();
  });

  it('returns null when a coordinate entry is malformed', () => {
    const malformed = {
      coordinates: [[-1, 52], 'not a coord', [1, 51], [-1, 51]],
    };
    expect(coerceViewport(malformed)).toBeNull();
  });

  it('omits zoom when the input has no zoom or non-numeric zoom', () => {
    expect(
      coerceViewport({
        coordinates: [
          [-1, 52],
          [1, 52],
          [1, 51],
          [-1, 51],
        ],
      }),
    ).not.toHaveProperty('zoom');

    expect(
      coerceViewport({
        coordinates: [
          [-1, 52],
          [1, 52],
          [1, 51],
          [-1, 51],
        ],
        zoom: 'bad',
      }),
    ).not.toHaveProperty('zoom');
  });
});
