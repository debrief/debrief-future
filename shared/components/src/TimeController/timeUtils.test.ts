/**
 * Tests for time utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatDateTime,
  formatTimeRange,
  formatDuration,
  calculateDuration,
  timeToPercent,
  percentToTime,
  calculateScrubIncrement,
  clampTime,
} from './timeUtils';

describe('formatTime', () => {
  it('formats midnight as 00:00:00', () => {
    const midnight = Date.UTC(2024, 0, 1, 0, 0, 0);
    expect(formatTime(midnight)).toBe('00:00:00');
  });

  it('formats noon as 12:00:00', () => {
    const noon = Date.UTC(2024, 0, 1, 12, 0, 0);
    expect(formatTime(noon)).toBe('12:00:00');
  });

  it('formats time with hours, minutes, and seconds', () => {
    const time = Date.UTC(2024, 0, 1, 14, 35, 47);
    expect(formatTime(time)).toBe('14:35:47');
  });

  it('pads single digits with zeros', () => {
    const time = Date.UTC(2024, 0, 1, 1, 5, 9);
    expect(formatTime(time)).toBe('01:05:09');
  });
});

describe('formatDateTime', () => {
  it('formats date and time together', () => {
    const time = Date.UTC(2024, 0, 15, 14, 30, 0);
    expect(formatDateTime(time)).toBe('2024-01-15 14:30:00');
  });

  it('pads month and day with zeros', () => {
    const time = Date.UTC(2024, 5, 5, 8, 0, 0);
    expect(formatDateTime(time)).toBe('2024-06-05 08:00:00');
  });
});

describe('formatTimeRange', () => {
  it('formats same-day range with single date', () => {
    const start = Date.UTC(2024, 0, 15, 9, 0, 0);
    const end = Date.UTC(2024, 0, 15, 17, 0, 0);
    expect(formatTimeRange(start, end)).toBe('2024-01-15 09:00:00 - 17:00:00');
  });

  it('formats multi-day range with both dates', () => {
    const start = Date.UTC(2024, 0, 15, 9, 0, 0);
    const end = Date.UTC(2024, 0, 16, 17, 0, 0);
    expect(formatTimeRange(start, end)).toBe('2024-01-15 09:00:00 - 2024-01-16 17:00:00');
  });
});

describe('calculateDuration', () => {
  it('calculates duration in milliseconds', () => {
    const start = 1000;
    const end = 5000;
    expect(calculateDuration(start, end)).toBe(4000);
  });

  it('returns 0 for invalid range', () => {
    expect(calculateDuration(5000, 1000)).toBe(0);
  });

  it('returns 0 for equal start and end', () => {
    expect(calculateDuration(1000, 1000)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(30000)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(150000)).toBe('2m 30s');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3723000)).toBe('1h 2m 3s');
  });
});

describe('timeToPercent', () => {
  it('returns 0 at start of range', () => {
    expect(timeToPercent(1000, 1000, 2000)).toBe(0);
  });

  it('returns 100 at end of range', () => {
    expect(timeToPercent(2000, 1000, 2000)).toBe(100);
  });

  it('returns 50 at midpoint', () => {
    expect(timeToPercent(1500, 1000, 2000)).toBe(50);
  });

  it('clamps to 0-100 range', () => {
    expect(timeToPercent(500, 1000, 2000)).toBe(0);
    expect(timeToPercent(3000, 1000, 2000)).toBe(100);
  });

  it('handles zero-length range', () => {
    expect(timeToPercent(1000, 1000, 1000)).toBe(0);
  });
});

describe('percentToTime', () => {
  it('returns start at 0%', () => {
    expect(percentToTime(0, 1000, 2000)).toBe(1000);
  });

  it('returns end at 100%', () => {
    expect(percentToTime(100, 1000, 2000)).toBe(2000);
  });

  it('returns midpoint at 50%', () => {
    expect(percentToTime(50, 1000, 2000)).toBe(1500);
  });

  it('clamps percent to 0-100', () => {
    expect(percentToTime(-10, 1000, 2000)).toBe(1000);
    expect(percentToTime(150, 1000, 2000)).toBe(2000);
  });
});

describe('calculateScrubIncrement', () => {
  it('returns at least 1 second', () => {
    const increment = calculateScrubIncrement(0, 1000);
    expect(increment).toBeGreaterThanOrEqual(1000);
  });

  it('returns larger increment for longer ranges', () => {
    const shortIncrement = calculateScrubIncrement(0, 60000); // 1 minute
    const longIncrement = calculateScrubIncrement(0, 3600000); // 1 hour
    expect(longIncrement).toBeGreaterThan(shortIncrement);
  });

  it('rounds to nice numbers', () => {
    const increment = calculateScrubIncrement(0, 10 * 60 * 1000); // 10 minutes
    // Should be a multiple of 1000 (seconds)
    expect(increment % 1000).toBe(0);
  });
});

describe('clampTime', () => {
  it('returns time if within range', () => {
    expect(clampTime(1500, 1000, 2000)).toBe(1500);
  });

  it('clamps to start if below range', () => {
    expect(clampTime(500, 1000, 2000)).toBe(1000);
  });

  it('clamps to end if above range', () => {
    expect(clampTime(3000, 1000, 2000)).toBe(2000);
  });

  it('handles edge cases', () => {
    expect(clampTime(1000, 1000, 2000)).toBe(1000);
    expect(clampTime(2000, 1000, 2000)).toBe(2000);
  });
});
