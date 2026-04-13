import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeDuration,
  formatDuration,
  formatDateRange,
  formatRelativeTime,
  sortComparators,
  truncateArray,
  simplifyLine,
  extractLineCoordinates,
  projectToPixel,
} from './utils';
import type { ExerciseListItem, GeoJSONFeatureCollection } from './types';

// Helper to create minimal ExerciseListItem
function makeItem(overrides: Partial<ExerciseListItem> = {}): ExerciseListItem {
  return {
    id: 'test-1',
    title: 'Test Exercise',
    itemPath: 'exercises/test-1/item.json',
    bbox: [-5, 49, 2, 52],
    datetime: '2024-03-15T08:00:00Z',
    startDatetime: '2024-03-15T08:00:00Z',
    endDatetime: '2024-03-17T18:00:00Z',
    platforms: [{ id: 'DEFENDER', name: 'HMS Defender', nationality: 'GB', vessel_class: 'surface/warship/destroyer', domain: 'surface' }],
    tags: ['training'],
    author: 'Jane Smith',
    trackDataHref: 'exercises/test-1/data.geojson',
    ...overrides,
  };
}

describe('computeDuration', () => {
  it('computes duration in milliseconds', () => {
    const result = computeDuration({
      startDatetime: '2024-01-01T00:00:00Z',
      endDatetime: '2024-01-01T02:00:00Z',
    });
    expect(result).toBe(2 * 3_600_000);
  });

  it('returns null when start is missing', () => {
    expect(computeDuration({ startDatetime: null, endDatetime: '2024-01-01T00:00:00Z' })).toBeNull();
  });

  it('returns null when end is missing', () => {
    expect(computeDuration({ startDatetime: '2024-01-01T00:00:00Z', endDatetime: null })).toBeNull();
  });

  it('returns null for invalid dates', () => {
    expect(computeDuration({ startDatetime: 'bad', endDatetime: 'dates' })).toBeNull();
  });

  it('returns null for negative duration', () => {
    expect(computeDuration({
      startDatetime: '2024-01-02T00:00:00Z',
      endDatetime: '2024-01-01T00:00:00Z',
    })).toBeNull();
  });
});

describe('formatDuration', () => {
  it('returns empty string for null', () => {
    expect(formatDuration(null)).toBe('');
  });

  it('formats minutes', () => {
    expect(formatDuration(5 * 60_000)).toBe('5 minutes');
  });

  it('formats single minute', () => {
    expect(formatDuration(60_000)).toBe('1 minute');
  });

  it('formats hours', () => {
    expect(formatDuration(2 * 3_600_000)).toBe('2 hours');
  });

  it('formats single hour', () => {
    expect(formatDuration(3_600_000)).toBe('1 hour');
  });

  it('formats days', () => {
    expect(formatDuration(3 * 86_400_000)).toBe('3 days');
  });

  it('formats weeks', () => {
    expect(formatDuration(2 * 604_800_000)).toBe('2 weeks');
  });

  it('formats sub-minute durations', () => {
    expect(formatDuration(30_000)).toBe('less than a minute');
  });
});

describe('formatDateRange', () => {
  it('formats a date range', () => {
    const result = formatDateRange('2024-01-12T00:00:00Z', '2024-01-14T00:00:00Z', null);
    expect(result).toContain('12');
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
    expect(result).toContain('14');
    expect(result).toContain('\u2013'); // en-dash
  });

  it('formats a single datetime when no range', () => {
    const result = formatDateRange(null, null, '2024-03-15T08:00:00Z');
    expect(result).toContain('15');
    expect(result).toContain('Mar');
    expect(result).toContain('2024');
  });

  it('returns "No date information" when all null', () => {
    expect(formatDateRange(null, null, null)).toBe('No date information');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats recent time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    const result = formatRelativeTime('2024-06-15T10:00:00Z');
    expect(result).toContain('2');
    expect(result).toContain('hour');
  });

  it('returns empty string for invalid date', () => {
    expect(formatRelativeTime('invalid')).toBe('');
  });
});

describe('sortComparators', () => {
  const item1 = makeItem({
    id: '1',
    title: 'Alpha Exercise',
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-01-02T00:00:00Z',
  });
  const item2 = makeItem({
    id: '2',
    title: 'Bravo Exercise',
    startDatetime: '2024-06-01T00:00:00Z',
    endDatetime: '2024-06-05T00:00:00Z',
  });
  const item3 = makeItem({
    id: '3',
    title: 'Charlie Exercise',
    startDatetime: null,
    endDatetime: null,
    datetime: null,
  });

  describe('recency', () => {
    it('sorts by date descending (most recent first)', () => {
      const sorted = [item1, item2].sort(sortComparators.recency);
      expect(sorted[0].id).toBe('2');
    });

    it('sorts null dates to end', () => {
      const sorted = [item3, item1].sort(sortComparators.recency);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('3');
    });
  });

  describe('title', () => {
    it('sorts alphabetically A-Z', () => {
      const sorted = [item2, item1].sort(sortComparators.title);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
    });
  });

  describe('duration', () => {
    it('sorts by duration descending (longest first)', () => {
      const sorted = [item1, item2].sort(sortComparators.duration);
      expect(sorted[0].id).toBe('2'); // 4 days vs 1 day
    });

    it('sorts null durations to end', () => {
      const sorted = [item3, item1].sort(sortComparators.duration);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('3');
    });
  });
});

describe('truncateArray', () => {
  it('returns all items when under max', () => {
    const result = truncateArray(['a', 'b'], 3);
    expect(result.visible).toEqual(['a', 'b']);
    expect(result.overflow).toBe(0);
  });

  it('truncates with overflow count', () => {
    const result = truncateArray(['a', 'b', 'c', 'd', 'e'], 3);
    expect(result.visible).toEqual(['a', 'b', 'c']);
    expect(result.overflow).toBe(2);
  });
});

describe('simplifyLine', () => {
  it('returns same points for 2-point line', () => {
    const result = simplifyLine([[0, 0], [10, 10]], 1);
    expect(result).toEqual([[0, 0], [10, 10]]);
  });

  it('simplifies a straight line to its endpoints', () => {
    const line = [[0, 0], [5, 5], [10, 10]];
    const result = simplifyLine(line, 1);
    expect(result.length).toBeLessThanOrEqual(line.length);
    expect(result[0]).toEqual([0, 0]);
    expect(result[result.length - 1]).toEqual([10, 10]);
  });

  it('preserves corners with small epsilon', () => {
    const line = [[0, 0], [10, 0], [10, 10]];
    const result = simplifyLine(line, 0.1);
    expect(result.length).toBe(3);
  });
});

describe('extractLineCoordinates', () => {
  it('extracts LineString coordinates', () => {
    const fc: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: null,
        },
      ],
    };
    const result = extractLineCoordinates(fc);
    expect(result).toEqual([[[0, 0], [1, 1]]]);
  });

  it('extracts MultiLineString coordinates', () => {
    const fc: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]],
          },
          properties: null,
        },
      ],
    };
    const result = extractLineCoordinates(fc);
    expect(result).toHaveLength(2);
  });
});

describe('projectToPixel', () => {
  it('projects center of bbox to center of pixel space', () => {
    const [x, y] = projectToPixel(0, 0, [-10, -10, 10, 10], 100, 100, 0);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(50);
  });

  it('projects with padding', () => {
    const [x, y] = projectToPixel(-10, 10, [-10, -10, 10, 10], 100, 100, 10);
    expect(x).toBeCloseTo(10); // left edge + padding
    expect(y).toBeCloseTo(10); // top edge + padding
  });

  it('handles zero-width bbox', () => {
    const [x, y] = projectToPixel(5, 5, [5, 5, 5, 5], 100, 100);
    expect(x).toBe(50);
    expect(y).toBe(50);
  });
});
