/**
 * Unit tests for timeline layout logic used by CatalogOverview.
 *
 * Now imports from shared utils/timeline-helpers.ts (#131 extraction).
 */

import { describe, it, expect } from 'vitest';
import type { CatalogOverviewItem } from '../types';
import {
  computeTimeRange,
  computeBarX,
  computeBarWidth,
} from '../../utils/timeline-helpers';
import type { TimeSpan } from '../../utils/temporal-types';

// Fixtures
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

describe('Timeline time range computation', () => {
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
    const items = [
      makeItem({ datetime: '2024-06-15T12:00:00Z' }),
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
});

describe('Timeline bar positioning', () => {
  const range: TimeSpan = {
    min: new Date('2024-01-01T00:00:00Z').getTime(),
    max: new Date('2024-01-31T00:00:00Z').getTime(),
  };
  const chartWidth = 600;

  it('positions bar at start of range', () => {
    const x = computeBarX(range.min, range, chartWidth);
    expect(x).toBe(0);
  });

  it('positions bar at end of range', () => {
    const x = computeBarX(range.max, range, chartWidth);
    expect(x).toBe(chartWidth);
  });

  it('positions bar at midpoint', () => {
    const mid = (range.min + range.max) / 2;
    const x = computeBarX(mid, range, chartWidth);
    expect(x).toBeCloseTo(chartWidth / 2, 0);
  });

  it('computes bar width proportional to range', () => {
    const totalDuration = range.max - range.min;
    const halfDuration = totalDuration / 2;
    const w = computeBarWidth(range.min, range.min + halfDuration, range, chartWidth);
    expect(w).toBeCloseTo(chartWidth / 2, 0);
  });

  it('enforces minimum bar width of 4px', () => {
    const w = computeBarWidth(range.min, range.min + 1, range, chartWidth);
    expect(w).toBe(4);
  });
});
