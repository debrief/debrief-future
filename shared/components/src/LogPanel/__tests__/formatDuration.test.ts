/**
 * Unit tests for formatDuration utility.
 *
 * Feature 176: sub-second durations display as milliseconds.
 *
 * Feature: 176-log-panel-ux
 */

import { describe, it, expect } from 'vitest';
import { formatDuration } from '../utils';

describe('formatDuration', () => {
  it('formats sub-second as milliseconds', () => {
    expect(formatDuration('PT0.25S')).toBe('250ms');
    expect(formatDuration('PT0.5S')).toBe('500ms');
    expect(formatDuration('PT0.001S')).toBe('1ms');
  });

  it('formats whole seconds', () => {
    expect(formatDuration('PT1S')).toBe('1s');
    expect(formatDuration('PT30S')).toBe('30s');
  });

  it('formats seconds with decimal (>= 1s)', () => {
    expect(formatDuration('PT2.3S')).toBe('2.3s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration('PT1M2S')).toBe('1m 2s');
  });

  it('formats hours, minutes, seconds', () => {
    expect(formatDuration('PT1H30M15S')).toBe('1h 30m 15s');
  });

  it('formats zero duration', () => {
    expect(formatDuration('PT0S')).toBe('< 1s');
  });

  it('returns raw string for unparseable input', () => {
    expect(formatDuration('invalid')).toBe('invalid');
  });
});
