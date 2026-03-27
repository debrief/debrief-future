/**
 * Temporal Conversion Unit Tests
 *
 * Verifies that ISO 8601 string timestamps from Track.positions[].time are
 * correctly converted to epoch milliseconds for use by temporal-utils.ts.
 *
 * Feature: 077-fix-vscode-extension-bugs
 */

import { describe, it, expect } from 'vitest';

/**
 * Converts ISO 8601 timestamp strings to epoch milliseconds.
 * This is the conversion logic used in trackToFeature().
 */
function convertTimesToEpoch(times: string[]): number[] {
  return times.map(t => new Date(t).getTime());
}

describe('ISO string to epoch ms conversion', () => {
  it('should convert ISO 8601 strings to epoch milliseconds', () => {
    const isoTimes = ['2024-01-15T10:00:00Z', '2024-01-15T11:00:00Z', '2024-01-15T12:00:00Z'];
    const result = convertTimesToEpoch(isoTimes);

    expect(result).toEqual([1705312800000, 1705316400000, 1705320000000]);
    expect(result.every(t => typeof t === 'number')).toBe(true);
  });

  it('should return an empty array for empty input', () => {
    const result = convertTimesToEpoch([]);
    expect(result).toEqual([]);
  });

  it('should handle ISO strings with timezone offsets', () => {
    const times = ['2024-01-15T10:00:00+00:00'];
    const result = convertTimesToEpoch(times);
    expect(result).toEqual([1705312800000]);
  });

  it('should produce numbers that work with binary search comparison', () => {
    const times = ['2024-01-15T09:30:00Z', '2024-01-15T14:00:00Z'];
    const result = convertTimesToEpoch(times);
    const targetTime = new Date('2024-01-15T11:00:00Z').getTime();

    // Binary search comparison: targetTime should be between result[0] and result[1]
    expect(targetTime).toBeGreaterThan(result[0]);
    expect(targetTime).toBeLessThan(result[1]);
  });

  it('should produce monotonically increasing values for sorted ISO strings', () => {
    const times = [
      '2024-01-15T09:30:00Z',
      '2024-01-15T10:00:00Z',
      '2024-01-15T10:30:00Z',
      '2024-01-15T11:00:00Z',
    ];
    const result = convertTimesToEpoch(times);

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});
