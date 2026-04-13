/**
 * useBrowserFilter hook tests.
 * Feature: 132-three-view-sync (T051-T052, T059-T061, T067-T069, T074-T076, T080)
 *
 * Tests all three filter axes individually and in combination.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBrowserFilter } from '../useBrowserFilter';
import type { StacBrowserItem } from '../../filter-engine/types';
import type { ViewportPolygon } from '../../utils/spatial-types';

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeItem(overrides: Partial<StacBrowserItem> & { id: string }): StacBrowserItem {
  return {
    title: overrides.id,
    itemPath: `exercises/${overrides.id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
    ...overrides,
  };
}

const ITEMS: StacBrowserItem[] = [
  makeItem({
    id: 'ex-1',
    title: 'North Atlantic Sub',
    bbox: [-20, 50, -10, 60],
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-03-01T00:00:00Z',
    platforms: [{ id: 'SUB-UK-1', vessel_class: 'subsurface/submarine', nationality: 'UK', domain: 'subsurface' }],
  }),
  makeItem({
    id: 'ex-2',
    title: 'Mediterranean Carrier',
    bbox: [10, 30, 30, 40],
    startDatetime: '2024-06-01T00:00:00Z',
    endDatetime: '2024-08-01T00:00:00Z',
    platforms: [{ id: 'CARRIER-US-1', vessel_class: 'surface/warship/carrier', nationality: 'US', domain: 'surface' }],
  }),
  makeItem({
    id: 'ex-3',
    title: 'Pacific Destroyer',
    bbox: [140, 20, 160, 40],
    startDatetime: '2024-02-01T00:00:00Z',
    endDatetime: '2024-04-01T00:00:00Z',
    platforms: [{ id: 'DEST-JP-1', vessel_class: 'surface/warship/destroyer', nationality: 'JP', domain: 'surface' }],
  }),
  makeItem({
    id: 'ex-4',
    title: 'No bbox exercise',
    bbox: null,
    startDatetime: '2024-01-15T00:00:00Z',
    endDatetime: '2024-02-15T00:00:00Z',
  }),
  makeItem({
    id: 'ex-5',
    title: 'No time exercise',
    bbox: [-5, 50, 5, 55],
    datetime: null,
    startDatetime: null,
    endDatetime: null,
  }),
];

const clearAllFilters = vi.fn();

function defaultArgs() {
  return {
    items: ITEMS,
    metadataFilteredIds: null as ReadonlySet<string> | null,
    viewport: null as ViewportPolygon | null,
    spatialFilterActive: false,
    timeFilter: null as { start: number | null; end: number | null } | null,
    temporalFilterActive: false,
    clearAllFilters,
  };
}

// ─── US1: Metadata filtering ────────────────────────────────────────────────

describe('useBrowserFilter — metadata axis (US1)', () => {
  it('T051: returns all items when metadataFilteredIds is null', () => {
    const { result } = renderHook(() => useBrowserFilter(defaultArgs()));
    expect(result.current.filteredItems).toHaveLength(5);
  });

  it('T051: filters to metadata-matching items', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-1', 'ex-3']);
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-1', 'ex-3']);
  });

  it('T052: items with no bbox pass metadata-only filter', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-4']); // no-bbox item
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.filteredItems.map(i => i.id)).toEqual(['ex-4']);
  });

  it('T051: empty metadata set returns zero items', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set<string>();
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.filteredItems).toHaveLength(0);
  });
});

// ─── US2: Spatial filtering ─────────────────────────────────────────────────

describe('useBrowserFilter — spatial axis (US2)', () => {
  const northAtlanticViewport: ViewportPolygon = {
    coordinates: [[-25, 65], [0, 65], [0, 45], [-25, 45]],
  };

  it('T059: filters to exercises overlapping viewport', () => {
    const args = defaultArgs();
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toContain('ex-1'); // bbox overlaps North Atlantic
    expect(ids).not.toContain('ex-2'); // Mediterranean
    expect(ids).not.toContain('ex-3'); // Pacific
  });

  it('T060: exercises without bbox always pass spatial filter', () => {
    const args = defaultArgs();
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toContain('ex-4'); // no bbox → passes
  });

  it('T061: degenerate viewport (zero-area) treated as no spatial filter', () => {
    const args = defaultArgs();
    args.viewport = {
      coordinates: [[0, 0], [0, 0], [0, 0], [0, 0]],
    };
    args.spatialFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    // All items should pass (degenerate viewport → no filter)
    expect(result.current.filteredItems).toHaveLength(5);
  });

  it('no spatial filtering when spatialFilterActive is false', () => {
    const args = defaultArgs();
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = false;
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.filteredItems).toHaveLength(5);
  });
});

// ─── US3: Temporal filtering ────────────────────────────────────────────────

describe('useBrowserFilter — temporal axis (US3)', () => {
  const janFeb2024 = {
    start: new Date('2024-01-01T00:00:00Z').getTime(),
    end: new Date('2024-02-28T00:00:00Z').getTime(),
  };

  it('T067: filters to exercises overlapping time range', () => {
    const args = defaultArgs();
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toContain('ex-1'); // Jan-Mar overlaps Jan-Feb
    expect(ids).not.toContain('ex-2'); // Jun-Aug does not overlap
    expect(ids).toContain('ex-3'); // Feb-Apr overlaps Jan-Feb
    expect(ids).toContain('ex-4'); // Jan 15 - Feb 15 overlaps
  });

  it('T068: exercises without temporal data always pass temporal filter', () => {
    const args = defaultArgs();
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    expect(ids).toContain('ex-5'); // no time data → passes
  });

  it('T069: inverted timeFilter (start > end) treated as no temporal filter', () => {
    const args = defaultArgs();
    args.timeFilter = {
      start: new Date('2024-06-01T00:00:00Z').getTime(),
      end: new Date('2024-01-01T00:00:00Z').getTime(), // end before start
    };
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    // All items should pass (inverted range → no filter)
    expect(result.current.filteredItems).toHaveLength(5);
  });

  it('no temporal filtering when temporalFilterActive is false', () => {
    const args = defaultArgs();
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = false;
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.filteredItems).toHaveLength(5);
  });
});

// ─── US4: Combined multi-axis filtering ─────────────────────────────────────

describe('useBrowserFilter — combined 3-axis (US4)', () => {
  const northAtlanticViewport: ViewportPolygon = {
    coordinates: [[-25, 65], [0, 65], [0, 45], [-25, 45]],
  };
  const janFeb2024 = {
    start: new Date('2024-01-01T00:00:00Z').getTime(),
    end: new Date('2024-02-28T00:00:00Z').getTime(),
  };

  it('T074: metadata + spatial + temporal compose with AND logic (combo 1)', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-1', 'ex-2', 'ex-3']);
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = true;
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    // Only ex-1 passes all three: metadata ✓, spatial (North Atlantic) ✓, temporal (Jan-Mar overlaps Jan-Feb) ✓
    expect(ids).toEqual(['ex-1']);
  });

  it('T074: metadata + spatial (no temporal) (combo 2)', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-1', 'ex-5']);
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    // ex-1 has bbox in North Atlantic ✓, ex-5 also has bbox overlapping viewport ✓
    expect(ids).toContain('ex-1');
    expect(ids).toContain('ex-5');
  });

  it('T074: metadata + temporal (no spatial) (combo 3)', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-1', 'ex-2']);
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    // ex-1: metadata ✓ and temporal (Jan-Mar overlaps) ✓
    // ex-2: metadata ✓ but temporal (Jun-Aug) ✗
    expect(ids).toEqual(['ex-1']);
  });

  it('T074: spatial + temporal (no metadata) (combo 4)', () => {
    const args = defaultArgs();
    args.viewport = northAtlanticViewport;
    args.spatialFilterActive = true;
    args.timeFilter = janFeb2024;
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    // ex-1: spatial ✓ temporal ✓
    // ex-4: no bbox → spatial ✓, temporal ✓
    // ex-5: spatial ✓ (has bbox in range), no time → temporal ✓
    expect(ids).toContain('ex-1');
    expect(ids).toContain('ex-4');
    expect(ids).toContain('ex-5');
  });

  it('T074: all three filters, different dataset (combo 5)', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set(['ex-3', 'ex-4', 'ex-5']);
    const pacificViewport: ViewportPolygon = {
      coordinates: [[130, 45], [170, 45], [170, 15], [130, 15]],
    };
    args.viewport = pacificViewport;
    args.spatialFilterActive = true;
    args.timeFilter = {
      start: new Date('2024-03-01T00:00:00Z').getTime(),
      end: new Date('2024-05-01T00:00:00Z').getTime(),
    };
    args.temporalFilterActive = true;
    const { result } = renderHook(() => useBrowserFilter(args));
    const ids = result.current.filteredItems.map(i => i.id);
    // ex-3: metadata ✓, spatial (Pacific) ✓, temporal (Feb-Apr overlaps Mar-May) ✓
    // ex-4: metadata ✓, no bbox → spatial ✓, temporal (Jan-Feb) does NOT overlap Mar-May ✗
    // ex-5: metadata ✓, bbox not in Pacific → spatial ✗
    expect(ids).toEqual(['ex-3']);
  });

  it('T075: removing one axis broadens result set', () => {
    const args3 = defaultArgs();
    args3.metadataFilteredIds = new Set(['ex-1', 'ex-2', 'ex-3']);
    args3.viewport = {
      coordinates: [[-25, 65], [0, 65], [0, 45], [-25, 45]],
    };
    args3.spatialFilterActive = true;
    args3.timeFilter = {
      start: new Date('2024-01-01T00:00:00Z').getTime(),
      end: new Date('2024-02-28T00:00:00Z').getTime(),
    };
    args3.temporalFilterActive = true;
    const { result: r3 } = renderHook(() => useBrowserFilter(args3));
    const count3 = r3.current.filteredItems.length;

    // Remove temporal filter
    const args2 = { ...args3, temporalFilterActive: false };
    const { result: r2 } = renderHook(() => useBrowserFilter(args2));
    expect(r2.current.filteredItems.length).toBeGreaterThanOrEqual(count3);
  });

  it('T076: activeFilterCount reports correct count (spatial is implicit, not counted)', () => {
    // 0 filters
    const { result: r0 } = renderHook(() => useBrowserFilter(defaultArgs()));
    expect(r0.current.activeFilterCount).toBe(0);

    // 1 filter (metadata)
    const args1 = defaultArgs();
    args1.metadataFilteredIds = new Set(['ex-1']);
    const { result: r1 } = renderHook(() => useBrowserFilter(args1));
    expect(r1.current.activeFilterCount).toBe(1);

    // spatial filter does not increment count (it's implicit via map viewport)
    const args2 = defaultArgs();
    args2.metadataFilteredIds = new Set(['ex-1']);
    args2.spatialFilterActive = true;
    const { result: r2 } = renderHook(() => useBrowserFilter(args2));
    expect(r2.current.activeFilterCount).toBe(1);

    // 2 filters (metadata + temporal)
    const args3 = defaultArgs();
    args3.metadataFilteredIds = new Set(['ex-1']);
    args3.spatialFilterActive = true;
    args3.temporalFilterActive = true;
    const { result: r3 } = renderHook(() => useBrowserFilter(args3));
    expect(r3.current.activeFilterCount).toBe(2);
  });
});

// ─── US5: Zero results handling ─────────────────────────────────────────────

describe('useBrowserFilter — zero results (US5)', () => {
  it('T080: hasNoResults is true when filteredItems is empty and filters active', () => {
    const args = defaultArgs();
    args.metadataFilteredIds = new Set<string>(); // Empty set — nothing passes
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.hasNoResults).toBe(true);
    expect(result.current.filteredItems).toHaveLength(0);
  });

  it('hasNoResults is false when no filters are active (even if items is empty)', () => {
    const args = defaultArgs();
    args.items = [];
    const { result } = renderHook(() => useBrowserFilter(args));
    expect(result.current.hasNoResults).toBe(false);
  });

  it('clearAllFilters is passed through', () => {
    const { result } = renderHook(() => useBrowserFilter(defaultArgs()));
    result.current.clearAllFilters();
    expect(clearAllFilters).toHaveBeenCalled();
  });
});
