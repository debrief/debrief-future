/**
 * Unit tests for useBrowserFilter hook (#132).
 * Tests: T051, T052
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
});
