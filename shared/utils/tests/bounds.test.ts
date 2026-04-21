/**
 * Bounds Calculation Unit Tests
 *
 * Covers the unified @debrief/utils bounds module (feature 219 / backlog #213).
 * Includes:
 *   - existing tests for calculateBounds, mergeBounds, boundsToLeaflet, isValidBounds
 *   - migrated tests from shared/components/src/utils/bounds.test.ts
 *     (viewportToBounds, bboxOverlapsViewport, filterBySpatialExtent)
 *   - migrated tests from shared/components/src/utils/__tests__/utils.test.ts
 *     (calculateBounds with DebriefFeatureCollection, expandBounds, isPointInBounds)
 *   - new fast-path tests (FR-011 / Story 2)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBounds,
  mergeBounds,
  boundsToLeaflet,
  isValidBounds,
  expandBounds,
  isPointInBounds,
  bboxOverlapsViewport,
  viewportToBounds,
  filterBySpatialExtent,
} from '../src/bounds.js';

// Local structural fixture shape. calculateBounds accepts any
// `{ geometry?: { type: string; coordinates: unknown } | null | undefined }`
// input; this alias keeps the happy-path tests readable without depending on
// either the deleted @debrief/utils GeoJSONFeature interface or the
// strictly-typed @debrief/schemas RawGeoJSONFeature (whose geometry union
// would force per-test narrowing).
interface BoundsTestFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown> | null;
  bbox?: [number, number, number, number];
}

// Minimal FeatureCollection shape accepted by calculateBounds
interface BoundsTestFeatureCollection {
  type: 'FeatureCollection';
  features: BoundsTestFeature[];
}

describe('calculateBounds', () => {
  it('should calculate bounds for a single Point feature', () => {
    const features: BoundsTestFeature[] = [
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
    const features: BoundsTestFeature[] = [
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
    const features: BoundsTestFeature[] = [
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
    const features: BoundsTestFeature[] = [
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

  // Migrated from shared/components/src/utils/__tests__/utils.test.ts
  // Tests calculateBounds with DebriefFeatureCollection-shaped input (feature collection unwrap)
  describe('FeatureCollection-shaped input (migrated from components utils.test.ts)', () => {
    const mockFeatureCollection: BoundsTestFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [-5.0, 50.0],
              [-4.5, 50.5],
              [-4.0, 51.0],
            ] as unknown as number[][],
          },
          properties: { kind: 'TRACK' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-3.0, 52.0] as unknown as number[],
          },
          properties: { kind: 'POINT' },
        },
      ],
    };

    it('calculates bounds for a feature collection (unwrapped)', () => {
      const bounds = calculateBounds(mockFeatureCollection.features);
      expect(bounds).not.toBeNull();
      expect(bounds![0]).toBe(-5.0); // minLon
      expect(bounds![1]).toBe(50.0); // minLat
      expect(bounds![2]).toBe(-3.0); // maxLon
      expect(bounds![3]).toBe(52.0); // maxLat
    });

    it('calculates bounds for an array of features', () => {
      const bounds = calculateBounds([mockFeatureCollection.features[0]!]);
      expect(bounds).toEqual([-5.0, 50.0, -4.0, 51.0]);
    });

    it('returns null for empty feature array', () => {
      const bounds = calculateBounds([]);
      expect(bounds).toBeNull();
    });

    it('uses feature bbox if available (fast-path)', () => {
      const featureWithBbox: BoundsTestFeature = {
        ...mockFeatureCollection.features[0]!,
        bbox: [-10, 40, 0, 60],
      };
      const bounds = calculateBounds([featureWithBbox]);
      expect(bounds).toEqual([-10, 40, 0, 60]);
    });
  });
});

// ============================================================================
// Pre-computed bbox fast-path tests (FR-011 / Story 2, feature 219)
// ============================================================================

describe('calculateBounds — pre-computed bbox fast-path', () => {
  it('uses bbox when present and geometry coordinates are inconsistent (fast-path proof)', () => {
    // bbox says [0, 0, 5, 5]; geometry says [[-100, -100]] — result MUST match bbox
    const features = [
      {
        geometry: { type: 'Point', coordinates: [-100, -100] },
        bbox: [0, 0, 5, 5] as [number, number, number, number],
      },
    ];
    expect(calculateBounds(features)).toEqual([0, 0, 5, 5]);
  });

  it('merges bbox-derived extents correctly across multiple features', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [999, 999] },
        bbox: [0, 0, 5, 5] as [number, number, number, number],
      },
      {
        geometry: { type: 'Point', coordinates: [999, 999] },
        bbox: [3, 3, 10, 10] as [number, number, number, number],
      },
    ];
    expect(calculateBounds(features)).toEqual([0, 0, 10, 10]);
  });

  it('mixed: features with bbox use fast-path; features without fall back to coordinate walk', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [999, 999] },
        bbox: [0, 0, 5, 5] as [number, number, number, number],
      },
      {
        geometry: { type: 'Point', coordinates: [20, 20] },
        // no bbox — uses coordinate walk
      },
    ];
    expect(calculateBounds(features)).toEqual([0, 0, 20, 20]);
  });

  it('falls back to coordinate walk when bbox has NaN values', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [3, 7] },
        bbox: [NaN, 0, 10, 10] as unknown as [number, number, number, number],
      },
    ];
    expect(calculateBounds(features)).toEqual([3, 7, 3, 7]);
  });

  it('falls back to coordinate walk when bbox has fewer than 4 elements', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [3, 7] },
        bbox: [1, 2, 3] as unknown as [number, number, number, number],
      },
    ];
    expect(calculateBounds(features)).toEqual([3, 7, 3, 7]);
  });

  it('falls back to coordinate walk when bbox is null', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [3, 7] },
        bbox: null as unknown as [number, number, number, number],
      },
    ];
    expect(calculateBounds(features)).toEqual([3, 7, 3, 7]);
  });

  it('falls back to coordinate walk when bbox is undefined', () => {
    const features = [
      {
        geometry: { type: 'Point', coordinates: [3, 7] },
        // bbox deliberately absent
      },
    ];
    expect(calculateBounds(features)).toEqual([3, 7, 3, 7]);
  });

  it('common-path regression — no bbox anywhere: output identical to pre-change implementation', () => {
    const features = [
      { geometry: { type: 'Point', coordinates: [10, 20] } },
      { geometry: { type: 'Point', coordinates: [-5, 30] } },
    ];
    expect(calculateBounds(features)).toEqual([-5, 20, 10, 30]);
  });
});

// ============================================================================
// expandBounds (migrated from shared/components)
// ============================================================================

describe('expandBounds', () => {
  it('expands bounds by percentage', () => {
    const bounds = expandBounds([-5, 50, -3, 52], 0.1);
    expect(bounds[0]).toBeLessThan(-5);
    expect(bounds[1]).toBeLessThan(50);
    expect(bounds[2]).toBeGreaterThan(-3);
    expect(bounds[3]).toBeGreaterThan(52);
  });

  it('uses 10% default padding', () => {
    const bounds = expandBounds([0, 0, 10, 10]);
    expect(bounds[0]).toBe(-1);
    expect(bounds[1]).toBe(-1);
    expect(bounds[2]).toBe(11);
    expect(bounds[3]).toBe(11);
  });

  it('handles zero-width bounds (point)', () => {
    const bounds = expandBounds([5, 5, 5, 5], 0.1);
    // lonRange = latRange = 0, so pad = 0, bounds unchanged
    expect(bounds).toEqual([5, 5, 5, 5]);
  });
});

// ============================================================================
// isPointInBounds (migrated from shared/components)
// ============================================================================

describe('isPointInBounds', () => {
  it('returns true for point inside bounds', () => {
    expect(isPointInBounds(-4, 51, [-5, 50, -3, 52])).toBe(true);
  });

  it('returns false for point outside bounds', () => {
    expect(isPointInBounds(-6, 51, [-5, 50, -3, 52])).toBe(false);
  });

  it('returns true for point on boundary', () => {
    expect(isPointInBounds(-5, 50, [-5, 50, -3, 52])).toBe(true);
  });

  it('returns false for point north of bounds', () => {
    expect(isPointInBounds(-4, 53, [-5, 50, -3, 52])).toBe(false);
  });
});

// ============================================================================
// mergeBounds
// ============================================================================

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

// ============================================================================
// boundsToLeaflet
// ============================================================================

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

// ============================================================================
// isValidBounds
// ============================================================================

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

// ============================================================================
// viewportToBounds (migrated from shared/components/src/utils/bounds.test.ts)
// ============================================================================

import type { ViewportPolygon } from '@debrief/schemas';
import type { Bounds } from '../src/bounds.js';

describe('viewportToBounds', () => {
  it('converts a non-rotated viewport to bounds', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: -10, latitude: 55 },
        { longitude: 5, latitude: 55 },
        { longitude: 5, latitude: 45 },
        { longitude: -10, latitude: 45 },
      ],
    };
    expect(viewportToBounds(viewport)).toEqual([-10, 45, 5, 55]);
  });

  it('handles a rotated viewport by computing enclosing AABB', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: 0, latitude: 10 },
        { longitude: 10, latitude: 0 },
        { longitude: 0, latitude: -10 },
        { longitude: -10, latitude: 0 },
      ],
    };
    expect(viewportToBounds(viewport)).toEqual([-10, -10, 10, 10]);
  });

  it('returns null for degenerate polygon (all same point)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: 5, latitude: 5 },
        { longitude: 5, latitude: 5 },
        { longitude: 5, latitude: 5 },
        { longitude: 5, latitude: 5 },
      ],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('returns null for degenerate polygon (zero-width line)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: 5, latitude: 0 },
        { longitude: 5, latitude: 10 },
        { longitude: 5, latitude: 10 },
        { longitude: 5, latitude: 0 },
      ],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('returns null for degenerate polygon (zero-height line)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: 0, latitude: 5 },
        { longitude: 10, latitude: 5 },
        { longitude: 10, latitude: 5 },
        { longitude: 0, latitude: 5 },
      ],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('preserves precision for small viewports', () => {
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: -0.001, latitude: 51.501 },
        { longitude: 0.001, latitude: 51.501 },
        { longitude: 0.001, latitude: 51.499 },
        { longitude: -0.001, latitude: 51.499 },
      ],
    };
    const bounds = viewportToBounds(viewport);
    expect(bounds).not.toBeNull();
    expect(bounds![0]).toBeCloseTo(-0.001, 5);
    expect(bounds![1]).toBeCloseTo(51.499, 5);
    expect(bounds![2]).toBeCloseTo(0.001, 5);
    expect(bounds![3]).toBeCloseTo(51.501, 5);
  });

  it('computes correct bounds from object-form coordinates (FR-022 regression)', () => {
    // New case after feature 203: explicitly verify object-field access rather
    // than tuple indexing.
    const viewport: ViewportPolygon = {
      coordinates: [
        { longitude: 151.2, latitude: -33.8 }, // NW (Sydney area)
        { longitude: 151.3, latitude: -33.8 }, // NE
        { longitude: 151.3, latitude: -33.9 }, // SE
        { longitude: 151.2, latitude: -33.9 }, // SW
      ],
    };
    const bounds = viewportToBounds(viewport);
    expect(bounds).not.toBeNull();
    // minLon = 151.2, minLat = -33.9, maxLon = 151.3, maxLat = -33.8
    expect(bounds![0]).toBeCloseTo(151.2, 5);
    expect(bounds![1]).toBeCloseTo(-33.9, 5);
    expect(bounds![2]).toBeCloseTo(151.3, 5);
    expect(bounds![3]).toBeCloseTo(-33.8, 5);
  });
});

// ============================================================================
// bboxOverlapsViewport (migrated from shared/components/src/utils/bounds.test.ts)
// ============================================================================

describe('bboxOverlapsViewport', () => {
  // Viewport: a box in the English Channel area
  const viewport: Bounds = [-5, 49, 2, 52]; // [west, south, east, north]

  it('returns true for overlapping bboxes', () => {
    // Item partially overlaps viewport on the west side
    const item: Bounds = [-8, 48, -3, 51];
    expect(bboxOverlapsViewport(item, viewport)).toBe(true);
  });

  it('returns false for non-overlapping bboxes', () => {
    // Item is far east of viewport
    const item: Bounds = [10, 49, 15, 52];
    expect(bboxOverlapsViewport(item, viewport)).toBe(false);
  });

  it('returns false when item is north of viewport', () => {
    const item: Bounds = [-5, 55, 2, 60];
    expect(bboxOverlapsViewport(item, viewport)).toBe(false);
  });

  it('returns false when item is south of viewport', () => {
    const item: Bounds = [-5, 40, 2, 45];
    expect(bboxOverlapsViewport(item, viewport)).toBe(false);
  });

  it('returns true for partial overlap (item crosses viewport east boundary)', () => {
    const item: Bounds = [0, 50, 5, 51];
    expect(bboxOverlapsViewport(item, viewport)).toBe(true);
  });

  it('returns true when viewport is fully contained within item', () => {
    // Item is much larger than viewport
    const item: Bounds = [-20, 40, 20, 60];
    expect(bboxOverlapsViewport(item, viewport)).toBe(true);
  });

  it('returns true when item is fully contained within viewport', () => {
    const item: Bounds = [-3, 50, 0, 51];
    expect(bboxOverlapsViewport(item, viewport)).toBe(true);
  });

  it('returns true for edge-touching bboxes (shared boundary)', () => {
    // Item's east edge touches viewport's west edge
    const item: Bounds = [-10, 49, -5, 52];
    expect(bboxOverlapsViewport(item, viewport)).toBe(true);
  });

  it('returns true for identical bboxes', () => {
    expect(bboxOverlapsViewport(viewport, viewport)).toBe(true);
  });

  describe('antimeridian handling', () => {
    it('detects overlap when item crosses antimeridian (west > east)', () => {
      // Item spans from 170°E to 170°W (i.e., across date line)
      const item: Bounds = [170, -10, -170, 10];
      // Viewport in the Pacific near date line
      const vp: Bounds = [175, -5, 180, 5];
      expect(bboxOverlapsViewport(item, vp)).toBe(true);
    });

    it('detects overlap when viewport crosses antimeridian', () => {
      const item: Bounds = [175, -5, 180, 5];
      // Viewport crosses date line
      const vp: Bounds = [170, -10, -170, 10];
      expect(bboxOverlapsViewport(item, vp)).toBe(true);
    });

    it('detects overlap when both cross antimeridian', () => {
      const item: Bounds = [160, -10, -160, 10];
      const vp: Bounds = [170, -5, -170, 5];
      expect(bboxOverlapsViewport(item, vp)).toBe(true);
    });

    it('returns false for non-overlapping antimeridian-crossing item', () => {
      // Item crosses date line in the Pacific
      const item: Bounds = [170, -10, -170, 10];
      // Viewport in the Atlantic
      const vp: Bounds = [-30, -10, -10, 10];
      expect(bboxOverlapsViewport(item, vp)).toBe(false);
    });

    it('does NOT treat west === east as antimeridian crossing', () => {
      // Zero-width bbox at 170° — this is a degenerate point, not a date line crossing
      const item: Bounds = [170, -10, 170, 10];
      // Viewport that does NOT include 170°
      const vp: Bounds = [0, -10, 5, 10];
      expect(bboxOverlapsViewport(item, vp)).toBe(false);
    });

    it('returns true for zero-width bbox that falls within viewport', () => {
      const item: Bounds = [170, -10, 170, 10];
      const vp: Bounds = [165, -15, 175, 15];
      expect(bboxOverlapsViewport(item, vp)).toBe(true);
    });
  });
});

// ============================================================================
// filterBySpatialExtent (migrated from shared/components/src/utils/bounds.test.ts)
// ============================================================================

interface TestItem {
  id: string;
  bbox: [number, number, number, number] | null;
}

describe('filterBySpatialExtent', () => {
  const viewport: Bounds = [-5, 49, 2, 52];

  const items: TestItem[] = [
    { id: 'inside', bbox: [-3, 50, 0, 51] },
    { id: 'outside', bbox: [10, 49, 15, 52] },
    { id: 'partial', bbox: [-8, 48, -3, 51] },
    { id: 'no-bbox', bbox: null },
  ];

  it('returns only items whose bbox overlaps the viewport', () => {
    const result = filterBySpatialExtent(items, viewport);
    const ids = result.map((i) => i.id);
    expect(ids).toContain('inside');
    expect(ids).toContain('partial');
    expect(ids).not.toContain('outside');
  });

  it('excludes items without bbox', () => {
    const result = filterBySpatialExtent(items, viewport);
    const ids = result.map((i) => i.id);
    expect(ids).not.toContain('no-bbox');
  });

  it('preserves the generic type parameter', () => {
    interface ExtendedItem extends TestItem {
      extra: string;
    }
    const extItems: ExtendedItem[] = [
      { id: 'a', bbox: [-3, 50, 0, 51], extra: 'hello' },
    ];
    const result = filterBySpatialExtent(extItems, viewport);
    expect(result[0]!.extra).toBe('hello');
  });

  it('returns empty array when no items overlap', () => {
    const farAway: TestItem[] = [{ id: 'far', bbox: [100, 0, 110, 10] }];
    const result = filterBySpatialExtent(farAway, viewport);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    const result = filterBySpatialExtent([], viewport);
    expect(result).toHaveLength(0);
  });
});
