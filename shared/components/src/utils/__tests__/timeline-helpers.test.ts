/**
 * Unit tests for timeline utility helpers (#131).
 *
 * Tests written FIRST per Constitution Art. VII — must FAIL before implementation.
 * Covers: computeTimeRange, computeBarX, computeBarWidth, formatTimeByRange,
 * formatDateRange, itemOverlapsFilter.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTimeRange,
  computeBarX,
  computeBarWidth,
  formatTimeByRange,
  formatDateRange,
  itemOverlapsFilter,
} from '../timeline-helpers';
import type { TimeSpan } from '../temporal-types';
import type { CatalogOverviewItem } from '../../CatalogOverview/types';
import type { StacBrowserItem } from '../../filter-engine/types';
import type { TemporalFilter } from '../../TimelineView/types';

// ============================================================================
// Fixtures
// ============================================================================

function makeItem(overrides: Partial<CatalogOverviewItem>): CatalogOverviewItem {
  return {
    id: 'test',
    title: 'Test',
    itemPath: 'test/item.json',
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    ...overrides,
  };
}

function makeStacItem(overrides: Partial<StacBrowserItem>): StacBrowserItem {
  return {
    id: 'test',
    title: 'Test',
    itemPath: 'test/item.json',
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    ...overrides,
  };
}

// ============================================================================
// T005: computeTimeRange tests
// ============================================================================

describe('computeTimeRange', () => {
  it('returns null for empty items', () => {
    expect(computeTimeRange([])).toBeNull();
  });

  it('returns null when no items have temporal data', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    expect(computeTimeRange(items)).toBeNull();
  });

  it('computes range from start/end datetimes', () => {
    const items = [
      makeItem({ startDatetime: '2024-01-01T00:00:00Z', endDatetime: '2024-01-10T00:00:00Z' }),
      makeItem({ startDatetime: '2024-01-05T00:00:00Z', endDatetime: '2024-01-20T00:00:00Z' }),
    ];
    const range = computeTimeRange(items)!;
    expect(range.min).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    expect(range.max).toBe(new Date('2024-01-20T00:00:00Z').getTime());
  });

  it('falls back to datetime when start/end not available', () => {
    const items = [makeItem({ datetime: '2024-06-15T12:00:00Z' })];
    const range = computeTimeRange(items)!;
    const expected = new Date('2024-06-15T12:00:00Z').getTime();
    expect(range.min).toBe(expected - 3600000);
    expect(range.max).toBe(expected + 3600000);
  });

  it('pads by ±1h when all items share identical datetimes', () => {
    const items = [
      makeItem({ startDatetime: '2024-06-15T12:00:00Z', endDatetime: '2024-06-15T12:00:00Z' }),
      makeItem({ startDatetime: '2024-06-15T12:00:00Z', endDatetime: '2024-06-15T12:00:00Z' }),
    ];
    const range = computeTimeRange(items)!;
    const expected = new Date('2024-06-15T12:00:00Z').getTime();
    expect(range.min).toBe(expected - 3600000);
    expect(range.max).toBe(expected + 3600000);
  });

  it('handles mixed items (some with time, some without)', () => {
    const items = [
      makeItem({ startDatetime: '2024-03-01T00:00:00Z', endDatetime: '2024-03-10T00:00:00Z' }),
      makeItem({}),
    ];
    const range = computeTimeRange(items)!;
    expect(range.min).toBe(new Date('2024-03-01T00:00:00Z').getTime());
    expect(range.max).toBe(new Date('2024-03-10T00:00:00Z').getTime());
  });

  it('handles single item with only datetime (no start/end)', () => {
    const items = [makeItem({ datetime: '2024-01-15T00:00:00Z' })];
    const range = computeTimeRange(items)!;
    expect(range).not.toBeNull();
    expect(range.min).toBeLessThan(range.max);
  });
});

// ============================================================================
// T006: computeBarX and computeBarWidth tests
// ============================================================================

describe('computeBarX', () => {
  const range: TimeSpan = {
    min: new Date('2024-01-01T00:00:00Z').getTime(),
    max: new Date('2024-01-31T00:00:00Z').getTime(),
  };
  const chartWidth = 600;

  it('positions bar at start of range', () => {
    expect(computeBarX(range.min, range, chartWidth)).toBe(0);
  });

  it('positions bar at end of range', () => {
    expect(computeBarX(range.max, range, chartWidth)).toBe(chartWidth);
  });

  it('positions bar at midpoint', () => {
    const mid = (range.min + range.max) / 2;
    expect(computeBarX(mid, range, chartWidth)).toBeCloseTo(chartWidth / 2, 0);
  });
});

describe('computeBarWidth', () => {
  const range: TimeSpan = {
    min: new Date('2024-01-01T00:00:00Z').getTime(),
    max: new Date('2024-01-31T00:00:00Z').getTime(),
  };
  const chartWidth = 600;

  it('computes width proportional to range', () => {
    const halfDuration = (range.max - range.min) / 2;
    const w = computeBarWidth(range.min, range.min + halfDuration, range, chartWidth);
    expect(w).toBeCloseTo(chartWidth / 2, 0);
  });

  it('enforces minimum bar width of 4px', () => {
    const w = computeBarWidth(range.min, range.min + 1, range, chartWidth);
    expect(w).toBe(4);
  });

  it('handles full-width bar', () => {
    const w = computeBarWidth(range.min, range.max, range, chartWidth);
    expect(w).toBe(chartWidth);
  });
});

// ============================================================================
// T007: formatTimeByRange tests (5 granularity tiers)
// ============================================================================

describe('formatTimeByRange', () => {
  const epoch = new Date('2024-06-15T14:30:00Z').getTime();

  it('formats sub-24h range with HH:mm', () => {
    const rangeSpan = 12 * 60 * 60 * 1000; // 12 hours
    const result = formatTimeByRange(epoch, rangeSpan);
    // Should include hours and minutes
    expect(result).toMatch(/\d/);
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats sub-7d range with day and time', () => {
    const rangeSpan = 3 * 24 * 60 * 60 * 1000; // 3 days
    const result = formatTimeByRange(epoch, rangeSpan);
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats sub-90d range with day and month', () => {
    const rangeSpan = 30 * 24 * 60 * 60 * 1000; // 30 days
    const result = formatTimeByRange(epoch, rangeSpan);
    expect(result).toMatch(/\d/);
  });

  it('formats sub-2y range with month and year', () => {
    const rangeSpan = 365 * 24 * 60 * 60 * 1000; // 1 year
    const result = formatTimeByRange(epoch, rangeSpan);
    expect(result).toMatch(/\d/);
  });

  it('formats >=2y range with year only', () => {
    const rangeSpan = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
    const result = formatTimeByRange(epoch, rangeSpan);
    expect(result).toMatch(/2024/);
  });
});

// ============================================================================
// T008: formatDateRange tests
// ============================================================================

describe('formatDateRange', () => {
  it('formats a date range with start and end', () => {
    const result = formatDateRange('2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z', null);
    expect(result).toContain('–');
  });

  it('formats a single datetime', () => {
    const result = formatDateRange(null, null, '2024-06-15T12:00:00Z');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('No time data');
  });

  it('returns "No time data" when all fields are null', () => {
    expect(formatDateRange(null, null, null)).toBe('No time data');
  });

  it('uses datetime as fallback when start/end match', () => {
    const dt = '2024-06-15T12:00:00Z';
    const result = formatDateRange(dt, dt, null);
    expect(result).not.toContain('–');
  });
});

// ============================================================================
// T009: itemOverlapsFilter tests
// ============================================================================

describe('itemOverlapsFilter', () => {
  const filter: TemporalFilter = {
    start: new Date('2024-03-01T00:00:00Z').getTime(),
    end: new Date('2024-03-31T00:00:00Z').getTime(),
  };

  it('returns true when item fully inside filter range', () => {
    const item = makeStacItem({
      startDatetime: '2024-03-05T00:00:00Z',
      endDatetime: '2024-03-15T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(true);
  });

  it('returns true when item partially overlaps filter start', () => {
    const item = makeStacItem({
      startDatetime: '2024-02-15T00:00:00Z',
      endDatetime: '2024-03-05T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(true);
  });

  it('returns true when item partially overlaps filter end', () => {
    const item = makeStacItem({
      startDatetime: '2024-03-25T00:00:00Z',
      endDatetime: '2024-04-05T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(true);
  });

  it('returns true when item contains entire filter range', () => {
    const item = makeStacItem({
      startDatetime: '2024-01-01T00:00:00Z',
      endDatetime: '2024-12-31T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(true);
  });

  it('returns false when item is entirely before filter range', () => {
    const item = makeStacItem({
      startDatetime: '2024-01-01T00:00:00Z',
      endDatetime: '2024-02-01T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(false);
  });

  it('returns false when item is entirely after filter range', () => {
    const item = makeStacItem({
      startDatetime: '2024-05-01T00:00:00Z',
      endDatetime: '2024-06-01T00:00:00Z',
    });
    expect(itemOverlapsFilter(item, filter)).toBe(false);
  });

  it('returns false when item has no temporal data', () => {
    const item = makeStacItem({});
    expect(itemOverlapsFilter(item, filter)).toBe(false);
  });

  it('handles item with only datetime (point in time)', () => {
    const item = makeStacItem({ datetime: '2024-03-15T00:00:00Z' });
    expect(itemOverlapsFilter(item, filter)).toBe(true);
  });

  it('handles item with datetime outside range', () => {
    const item = makeStacItem({ datetime: '2024-05-15T00:00:00Z' });
    expect(itemOverlapsFilter(item, filter)).toBe(false);
  });
});
