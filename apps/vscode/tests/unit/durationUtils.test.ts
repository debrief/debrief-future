/**
 * Tests for ISO 8601 duration parsing utilities
 */

import { describe, it, expect } from 'vitest';
import { parseDuration, formatDuration } from '../../src/webview/web/durationUtils';

describe('parseDuration', () => {
  describe('valid durations', () => {
    it('parses PT5M (5 minutes)', () => {
      expect(parseDuration('PT5M')).toBe(5 * 60 * 1000);
    });

    it('parses PT1H (1 hour)', () => {
      expect(parseDuration('PT1H')).toBe(60 * 60 * 1000);
    });

    it('parses PT30S (30 seconds)', () => {
      expect(parseDuration('PT30S')).toBe(30 * 1000);
    });

    it('parses PT1H30M (1.5 hours)', () => {
      expect(parseDuration('PT1H30M')).toBe(90 * 60 * 1000);
    });

    it('parses PT2H15M30S (complex duration)', () => {
      expect(parseDuration('PT2H15M30S')).toBe(
        2 * 60 * 60 * 1000 + 15 * 60 * 1000 + 30 * 1000
      );
    });

    it('parses P1D (1 day)', () => {
      expect(parseDuration('P1D')).toBe(24 * 60 * 60 * 1000);
    });

    it('parses P1DT12H (1.5 days)', () => {
      expect(parseDuration('P1DT12H')).toBe(36 * 60 * 60 * 1000);
    });

    it('parses PT0.5S (fractional seconds)', () => {
      expect(parseDuration('PT0.5S')).toBe(500);
    });
  });

  describe('invalid durations', () => {
    it('returns null for null input', () => {
      expect(parseDuration(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(parseDuration(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDuration('')).toBeNull();
    });

    it('returns null for invalid format (missing P)', () => {
      expect(parseDuration('T5M')).toBeNull();
    });

    it('returns null for invalid format (just P)', () => {
      expect(parseDuration('P')).toBeNull();
    });

    it('returns null for invalid format (just PT)', () => {
      expect(parseDuration('PT')).toBeNull();
    });

    it('returns null for non-ISO format', () => {
      expect(parseDuration('5 minutes')).toBeNull();
    });

    it('returns null for HH:MM:SS format', () => {
      expect(parseDuration('01:30:00')).toBeNull();
    });
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(30000)).toBe('30s');
  });

  it('formats minutes', () => {
    expect(formatDuration(5 * 60 * 1000)).toBe('5m');
  });

  it('formats minutes with seconds', () => {
    expect(formatDuration(5 * 60 * 1000 + 30 * 1000)).toBe('5m 30s');
  });

  it('formats hours', () => {
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h');
  });

  it('formats hours with minutes', () => {
    expect(formatDuration(2 * 60 * 60 * 1000 + 30 * 60 * 1000)).toBe('2h 30m');
  });

  it('formats days', () => {
    expect(formatDuration(2 * 24 * 60 * 60 * 1000)).toBe('2d');
  });

  it('formats days with hours', () => {
    expect(formatDuration(1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)).toBe('1d 12h');
  });
});
