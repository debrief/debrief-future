import { describe, it, expect } from 'vitest';
import { bboxOverlapsViewport, filterBySpatialExtent, viewportToBounds } from './bounds';
import type { Bounds } from './types';
import type { ViewportPolygon } from './spatial-types';

// ============================================================================
// T030: viewportToBounds — convert ViewportPolygon to Bounds
// ============================================================================

describe('viewportToBounds', () => {
  it('converts a non-rotated viewport to bounds', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[-10, 55], [5, 55], [5, 45], [-10, 45]],
    };
    expect(viewportToBounds(viewport)).toEqual([-10, 45, 5, 55]);
  });

  it('handles a rotated viewport by computing enclosing AABB', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[0, 10], [10, 0], [0, -10], [-10, 0]],
    };
    expect(viewportToBounds(viewport)).toEqual([-10, -10, 10, 10]);
  });

  it('returns null for degenerate polygon (all same point)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[5, 5], [5, 5], [5, 5], [5, 5]],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('returns null for degenerate polygon (zero-width line)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[5, 0], [5, 10], [5, 10], [5, 0]],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('returns null for degenerate polygon (zero-height line)', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[0, 5], [10, 5], [10, 5], [0, 5]],
    };
    expect(viewportToBounds(viewport)).toBeNull();
  });

  it('preserves precision for small viewports', () => {
    const viewport: ViewportPolygon = {
      coordinates: [[-0.001, 51.501], [0.001, 51.501], [0.001, 51.499], [-0.001, 51.499]],
    };
    const bounds = viewportToBounds(viewport);
    expect(bounds).not.toBeNull();
    expect(bounds![0]).toBeCloseTo(-0.001, 5);
    expect(bounds![1]).toBeCloseTo(51.499, 5);
    expect(bounds![2]).toBeCloseTo(0.001, 5);
    expect(bounds![3]).toBeCloseTo(51.501, 5);
  });
});

// ============================================================================
// T002: bboxOverlapsViewport — standard cases
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

  // ============================================================================
  // T003: bboxOverlapsViewport — antimeridian cases
  // ============================================================================

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
// T004: filterBySpatialExtent
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
    expect(result[0].extra).toBe('hello');
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
