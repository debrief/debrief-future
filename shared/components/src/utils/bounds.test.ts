import { describe, it, expect } from 'vitest';
import { bboxOverlapsViewport, filterBySpatialExtent, viewportToBounds } from './bounds';
import type { Bounds } from './types';

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

// ============================================================================
// viewportToBounds (#132, T029-T030)
// ============================================================================

describe('viewportToBounds', () => {
  it('converts 4-corner viewport to axis-aligned bounds', () => {
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [
      [-5, 55],  // NW
      [5, 55],   // NE
      [5, 50],   // SE
      [-5, 50],  // SW
    ];
    expect(viewportToBounds(coords)).toEqual([-5, 50, 5, 55]);
  });

  it('handles coordinates in any order', () => {
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [
      [5, 50],   // SE
      [-5, 55],  // NW
      [-5, 50],  // SW
      [5, 55],   // NE
    ];
    expect(viewportToBounds(coords)).toEqual([-5, 50, 5, 55]);
  });

  it('returns null for degenerate viewport (zero width)', () => {
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [
      [5, 55],
      [5, 55],
      [5, 50],
      [5, 50],
    ];
    expect(viewportToBounds(coords)).toBeNull();
  });

  it('returns null for degenerate viewport (zero height)', () => {
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [
      [-5, 50],
      [5, 50],
      [5, 50],
      [-5, 50],
    ];
    expect(viewportToBounds(coords)).toBeNull();
  });

  it('handles negative coordinates', () => {
    const coords: [[number, number], [number, number], [number, number], [number, number]] = [
      [-10, -20],
      [10, -20],
      [10, -30],
      [-10, -30],
    ];
    expect(viewportToBounds(coords)).toEqual([-10, -30, 10, -20]);
  });
});
