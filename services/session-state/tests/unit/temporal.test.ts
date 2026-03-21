import { describe, it, expect } from 'vitest';
import {
  timeRangeFromISO,
  timeRangeToISO,
  timeRangeFromMinMax,
} from '../../src/types/temporal';

describe('TimeRange converters', () => {
  describe('timeRangeFromISO', () => {
    it('converts ISO strings to epoch milliseconds', () => {
      const range = timeRangeFromISO('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
      expect(range.start).toBe(new Date('2026-01-01T00:00:00.000Z').getTime());
      expect(range.end).toBe(new Date('2026-01-02T00:00:00.000Z').getTime());
      expect(range.end - range.start).toBe(86400000); // 24 hours in ms
    });

    it('returns NaN for invalid ISO strings', () => {
      const range = timeRangeFromISO('not-a-date', 'also-not-a-date');
      expect(range.start).toBeNaN();
      expect(range.end).toBeNaN();
    });
  });

  describe('timeRangeToISO', () => {
    it('converts epoch milliseconds to ISO strings', () => {
      const epoch = new Date('2026-03-20T12:00:00.000Z').getTime();
      const result = timeRangeToISO({ start: epoch, end: epoch + 3600000 });
      expect(result.start).toBe('2026-03-20T12:00:00.000Z');
      expect(result.end).toBe('2026-03-20T13:00:00.000Z');
    });
  });

  describe('timeRangeFromMinMax', () => {
    it('orders start ≤ end when a < b', () => {
      const range = timeRangeFromMinMax(100, 200);
      expect(range.start).toBe(100);
      expect(range.end).toBe(200);
    });

    it('orders start ≤ end when a > b', () => {
      const range = timeRangeFromMinMax(200, 100);
      expect(range.start).toBe(100);
      expect(range.end).toBe(200);
    });

    it('handles equal values', () => {
      const range = timeRangeFromMinMax(150, 150);
      expect(range.start).toBe(150);
      expect(range.end).toBe(150);
    });
  });

  describe('round-trip', () => {
    it('ISO → epoch → ISO preserves values', () => {
      const startISO = '2026-06-15T08:30:00.000Z';
      const endISO = '2026-06-15T17:45:00.000Z';
      const range = timeRangeFromISO(startISO, endISO);
      const result = timeRangeToISO(range);
      expect(result.start).toBe(startISO);
      expect(result.end).toBe(endISO);
    });
  });
});
