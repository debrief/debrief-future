/**
 * Unit tests for formatTimestamp utility — UTC output per FR-014.
 *
 * Feature: 176-log-panel-ux (T014)
 */

import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '../utils';

describe('formatTimestamp', () => {
  it('formats ISO timestamp as HH:MM:SS UTC', () => {
    expect(formatTimestamp('2026-04-19T10:20:30Z')).toBe('10:20:30 UTC');
  });

  it('preserves UTC regardless of timezone offset in input', () => {
    // 12:00 local +02:00 is 10:00 UTC.
    expect(formatTimestamp('2026-04-19T12:00:00+02:00')).toBe('10:00:00 UTC');
    // 08:30 local -05:30 is 14:00 UTC.
    expect(formatTimestamp('2026-04-19T08:30:00-05:30')).toBe('14:00:00 UTC');
  });

  it('pads single-digit hours/minutes/seconds', () => {
    expect(formatTimestamp('2026-04-19T01:02:03Z')).toBe('01:02:03 UTC');
  });

  it('returns the raw string on unparseable input', () => {
    expect(formatTimestamp('not-a-date')).toBe('not-a-date');
  });
});
