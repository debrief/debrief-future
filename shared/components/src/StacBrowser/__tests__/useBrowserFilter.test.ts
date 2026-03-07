/**
 * Unit tests for useBrowserFilter hook (#132).
 * Tests: T051, T052, T059–T061, T067–T069, T074–T076, T080
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrowserFilter, type UseBrowserFilterOptions } from '../useBrowserFilter';
import type { StacBrowserItem } from '../../filter-engine/types';

function makeItem(overrides: Partial<StacBrowserItem>): StacBrowserItem {
  return {
    id: 'item-1',
    title: 'Test Item',
    itemPath: './test/item.json',
    bbox: [-5, 50, 5, 55],
    datetime: null,
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-01-31T00:00:00Z',
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    modified: null,
    ...overrides,
  };
}

const ITEMS: StacBrowserItem[] = [
  makeItem({ id: 'ex-001', title: 'Exercise Alpha' }),
  makeItem({ id: 'ex-002', title: 'Exercise Bravo' }),
  makeItem({ id: 'ex-003', title: 'Exercise Charlie' }),
];

function makeOptions(overrides: Partial<UseBrowserFilterOptions> = {}): UseBrowserFilterOptions {
  return {
    items: ITEMS,
    metadataFilteredIds: null,
    spatialFilterActive: false,
    viewportCoordinates: null,
    temporalFilterActive: false,
    timeFilter: null,
    clearAllFilters: vi.fn(),
    ...overrides,
  };
}

describe('useBrowserFilter', () => {
  describe('no filters active', () => {
    it('returns all items when no filters are active', () => {
      const { result } = renderHook(() => useBrowserFilter(makeOptions()));

      expect(result.current.filteredItems).toBe(ITEMS); // reference equality
      expect(result.current.activeFilterCount).toBe(0);
      expect(result.current.hasNoResults).toBe(false);
    });
  });

  describe('metadata-only filtering (T051)', () => {
    it('filters to items in metadataFilteredIds', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['ex-001', 'ex-003']),
        }))
      );

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-003']);
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('returns empty when no IDs match', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['nonexistent']),
        }))
      );

      expect(result.current.filteredItems).toHaveLength(0);
      expect(result.current.hasNoResults).toBe(true);
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('returns all items when metadataFilteredIds is null', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({ metadataFilteredIds: null }))
      );

      expect(result.current.filteredItems).toHaveLength(3);
    });
  });

  describe('items with no bbox pass metadata filter (T052)', () => {
    it('items without bbox pass metadata filter', () => {
      const itemsWithNoBbox = [
        makeItem({ id: 'ex-001', bbox: null }),
        makeItem({ id: 'ex-002', bbox: [-5, 50, 5, 55] }),
      ];

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: itemsWithNoBbox,
          metadataFilteredIds: new Set(['ex-001', 'ex-002']),
        }))
      );

      expect(result.current.filteredItems).toHaveLength(2);
    });
  });

  describe('reference-equality memoization (Review 9A)', () => {
    it('returns same reference when filter result unchanged', () => {
      const options = makeOptions({
        metadataFilteredIds: new Set(['ex-001']),
      });

      const { result, rerender } = renderHook(() => useBrowserFilter(options));
      const first = result.current.filteredItems;

      rerender();
      const second = result.current.filteredItems;

      expect(first).toBe(second); // same reference
    });
  });

  describe('clearAllFilters', () => {
    it('calls the provided clearAllFilters callback', () => {
      const clearFn = vi.fn();
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({ clearAllFilters: clearFn }))
      );

      result.current.clearAllFilters();
      expect(clearFn).toHaveBeenCalledOnce();
    });
  });

  // --- Phase 4: Spatial Filtering (T059–T061) ---

  describe('spatial-only filtering (T059)', () => {
    it('filters items by bounding box overlap with viewport', () => {
      const spatialItems = [
        makeItem({ id: 'ex-001', bbox: [-5, 50, 5, 55] }),   // overlaps viewport
        makeItem({ id: 'ex-002', bbox: [20, 60, 30, 65] }),  // outside viewport
        makeItem({ id: 'ex-003', bbox: [-2, 48, 2, 52] }),   // overlaps viewport
      ];

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: spatialItems,
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
        }))
      );

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-003']);
      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe('items without bbox pass spatial filter (T060)', () => {
    it('items with null bbox always pass spatial filter', () => {
      const mixedItems = [
        makeItem({ id: 'ex-001', bbox: null }),               // no bbox → passes
        makeItem({ id: 'ex-002', bbox: [20, 60, 30, 65] }),  // outside viewport
        makeItem({ id: 'ex-003', bbox: [-2, 48, 2, 52] }),   // overlaps viewport
      ];

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: mixedItems,
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
        }))
      );

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-003']);
    });
  });

  describe('degenerate viewport guard (T061)', () => {
    it('treats zero-area viewport as no spatial filter', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: ITEMS,
          spatialFilterActive: true,
          // All four corners at same point → zero-area → viewportToBounds returns null
          viewportCoordinates: [[5, 50], [5, 50], [5, 50], [5, 50]],
        }))
      );

      // Degenerate viewport → spatialFilterActive but bounds are null → no spatial filter counted
      expect(result.current.filteredItems).toHaveLength(3);
    });

    it('spatialFilterActive without coordinates treated as no filter', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: ITEMS,
          spatialFilterActive: true,
          viewportCoordinates: null,
        }))
      );

      expect(result.current.filteredItems).toHaveLength(3);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  // --- Phase 5: Temporal Filtering (T067–T069) ---

  describe('temporal-only filtering (T067)', () => {
    it('filters items by temporal overlap with timeFilter', () => {
      const temporalItems = [
        makeItem({
          id: 'ex-001',
          startDatetime: '2024-01-01T00:00:00Z',
          endDatetime: '2024-01-15T00:00:00Z',
        }),
        makeItem({
          id: 'ex-002',
          startDatetime: '2024-02-01T00:00:00Z',
          endDatetime: '2024-02-28T00:00:00Z',
        }),
        makeItem({
          id: 'ex-003',
          startDatetime: '2024-01-10T00:00:00Z',
          endDatetime: '2024-01-20T00:00:00Z',
        }),
      ];

      const filterStart = new Date('2024-01-05T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-25T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: temporalItems,
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      expect(result.current.filteredItems).toHaveLength(2);
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-003']);
      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe('items without temporal data and temporal filter (T068)', () => {
    it('items with no temporal data do not pass temporal filter', () => {
      const mixedItems = [
        makeItem({
          id: 'ex-001',
          datetime: null,
          startDatetime: null,
          endDatetime: null,
        }),
        makeItem({
          id: 'ex-002',
          startDatetime: '2024-01-10T00:00:00Z',
          endDatetime: '2024-01-20T00:00:00Z',
        }),
      ];

      const filterStart = new Date('2024-01-05T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-25T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: mixedItems,
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      // itemOverlapsFilter returns false for items without temporal data
      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].id).toBe('ex-002');
    });
  });

  describe('inverted timeFilter guard (T069)', () => {
    it('temporalFilterActive without timeFilter treated as no filter', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: ITEMS,
          temporalFilterActive: true,
          timeFilter: null,
        }))
      );

      expect(result.current.filteredItems).toHaveLength(3);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  // --- Phase 6: Combined Multi-Axis Filtering (T074–T076) ---

  describe('combined 3-axis filtering (T074)', () => {
    const combinedItems = [
      makeItem({
        id: 'ex-001',
        bbox: [-5, 50, 5, 55],
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
      makeItem({
        id: 'ex-002',
        bbox: [20, 60, 30, 65],
        startDatetime: '2024-01-10T00:00:00Z',
        endDatetime: '2024-01-20T00:00:00Z',
      }),
      makeItem({
        id: 'ex-003',
        bbox: [-2, 48, 2, 52],
        startDatetime: '2024-02-01T00:00:00Z',
        endDatetime: '2024-02-28T00:00:00Z',
      }),
      makeItem({
        id: 'ex-004',
        bbox: [-3, 49, 3, 53],
        startDatetime: '2024-01-05T00:00:00Z',
        endDatetime: '2024-01-25T00:00:00Z',
      }),
    ];

    it('metadata AND spatial AND temporal yields intersection', () => {
      const filterStart = new Date('2024-01-01T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-31T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: combinedItems,
          metadataFilteredIds: new Set(['ex-001', 'ex-003', 'ex-004']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      // ex-001: metadata ✓, spatial ✓, temporal ✓ → pass
      // ex-002: metadata ✗ → fail
      // ex-003: metadata ✓, spatial ✓, temporal ✗ (Feb) → fail
      // ex-004: metadata ✓, spatial ✓, temporal ✓ → pass
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-004']);
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('metadata AND spatial (no temporal)', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: combinedItems,
          metadataFilteredIds: new Set(['ex-001', 'ex-002', 'ex-003']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
        }))
      );

      // ex-001: metadata ✓, spatial ✓ → pass
      // ex-002: metadata ✓, spatial ✗ → fail
      // ex-003: metadata ✓, spatial ✓ → pass
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-003']);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('spatial AND temporal (no metadata)', () => {
      const filterStart = new Date('2024-01-01T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-31T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: combinedItems,
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      // ex-001: spatial ✓, temporal ✓ → pass
      // ex-002: spatial ✗ → fail
      // ex-003: spatial ✓, temporal ✗ (Feb) → fail
      // ex-004: spatial ✓, temporal ✓ → pass
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-004']);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('metadata AND temporal (no spatial)', () => {
      const filterStart = new Date('2024-01-01T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-31T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: combinedItems,
          metadataFilteredIds: new Set(['ex-001', 'ex-002', 'ex-004']),
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      // ex-001: metadata ✓, temporal ✓ → pass
      // ex-002: metadata ✓, temporal ✓ → pass
      // ex-003: metadata ✗ → fail
      // ex-004: metadata ✓, temporal ✓ → pass
      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001', 'ex-002', 'ex-004']);
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('all three active but only one item passes all axes', () => {
      const filterStart = new Date('2024-01-01T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-10T00:00:00Z').getTime();

      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: combinedItems,
          metadataFilteredIds: new Set(['ex-001']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );

      expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-001']);
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  describe('removing one axis broadens result (T075)', () => {
    it('removing temporal filter broadens to spatial + metadata result', () => {
      const items2 = [
        makeItem({ id: 'ex-001', bbox: [-5, 50, 5, 55], startDatetime: '2024-01-01T00:00:00Z', endDatetime: '2024-01-15T00:00:00Z' }),
        makeItem({ id: 'ex-002', bbox: [-3, 49, 3, 53], startDatetime: '2024-06-01T00:00:00Z', endDatetime: '2024-06-30T00:00:00Z' }),
      ];
      const filterStart = new Date('2024-01-01T00:00:00Z').getTime();
      const filterEnd = new Date('2024-01-31T00:00:00Z').getTime();

      // With temporal → only ex-001
      const { result: r1 } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: items2,
          metadataFilteredIds: new Set(['ex-001', 'ex-002']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
          temporalFilterActive: true,
          timeFilter: { start: filterStart, end: filterEnd },
        }))
      );
      expect(r1.current.filteredItems).toHaveLength(1);

      // Without temporal → both pass
      const { result: r2 } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: items2,
          metadataFilteredIds: new Set(['ex-001', 'ex-002']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
        }))
      );
      expect(r2.current.filteredItems).toHaveLength(2);
    });
  });

  describe('activeFilterCount (T076)', () => {
    it('reports 0 when no filters active', () => {
      const { result } = renderHook(() => useBrowserFilter(makeOptions()));
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('reports 1 for metadata only', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({ metadataFilteredIds: new Set(['ex-001']) }))
      );
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('reports 2 for metadata + spatial', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['ex-001']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
        }))
      );
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('reports 3 for all axes active', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['ex-001']),
          spatialFilterActive: true,
          viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
          temporalFilterActive: true,
          timeFilter: { start: 1000, end: 2000 },
        }))
      );
      expect(result.current.activeFilterCount).toBe(3);
    });
  });

  // --- Phase 7: Zero Results (T080) ---

  describe('hasNoResults (T080)', () => {
    it('is true when filteredItems empty and filters active', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['nonexistent']),
        }))
      );

      expect(result.current.hasNoResults).toBe(true);
      expect(result.current.filteredItems).toHaveLength(0);
    });

    it('is false when items is empty (no data, not a filter result)', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          items: [],
          metadataFilteredIds: new Set(['nonexistent']),
        }))
      );

      expect(result.current.hasNoResults).toBe(false);
    });

    it('is false when filters produce results', () => {
      const { result } = renderHook(() =>
        useBrowserFilter(makeOptions({
          metadataFilteredIds: new Set(['ex-001']),
        }))
      );

      expect(result.current.hasNoResults).toBe(false);
    });
  });
});
