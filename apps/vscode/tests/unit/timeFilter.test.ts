import { describe, it, expect, beforeEach } from 'vitest';

// Test time filter logic
describe('TimeFilter logic', () => {
  interface TimeRange {
    start: string;
    end: string;
  }

  interface TimeFilterState {
    dataStart: string;
    dataEnd: string;
    currentStart: string;
    currentEnd: string;
  }

  let state: TimeFilterState;

  beforeEach(() => {
    state = {
      dataStart: '2024-01-15T09:00:00Z',
      dataEnd: '2024-01-15T15:00:00Z',
      currentStart: '2024-01-15T09:00:00Z',
      currentEnd: '2024-01-15T15:00:00Z',
    };
  });

  const initialize = (start: string, end: string): void => {
    state.dataStart = start;
    state.dataEnd = end;
    state.currentStart = start;
    state.currentEnd = end;
  };

  const setRange = (start: string, end: string): void => {
    state.currentStart = start;
    state.currentEnd = end;
  };

  const resetToFullRange = (): void => {
    state.currentStart = state.dataStart;
    state.currentEnd = state.dataEnd;
  };

  const getCurrentRange = (): TimeRange => ({
    start: state.currentStart,
    end: state.currentEnd,
  });

  const isFullRange = (): boolean => {
    return (
      state.currentStart === state.dataStart &&
      state.currentEnd === state.dataEnd
    );
  };

  describe('initialization', () => {
    it('sets data extent and current range', () => {
      initialize('2024-01-15T10:00:00Z', '2024-01-15T14:00:00Z');

      expect(state.dataStart).toBe('2024-01-15T10:00:00Z');
      expect(state.dataEnd).toBe('2024-01-15T14:00:00Z');
      expect(state.currentStart).toBe('2024-01-15T10:00:00Z');
      expect(state.currentEnd).toBe('2024-01-15T14:00:00Z');
    });
  });

  describe('setRange', () => {
    it('updates current range', () => {
      setRange('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z');

      const range = getCurrentRange();
      expect(range.start).toBe('2024-01-15T10:00:00Z');
      expect(range.end).toBe('2024-01-15T12:00:00Z');
    });

    it('does not affect data extent', () => {
      setRange('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z');

      expect(state.dataStart).toBe('2024-01-15T09:00:00Z');
      expect(state.dataEnd).toBe('2024-01-15T15:00:00Z');
    });
  });

  describe('resetToFullRange', () => {
    it('resets current range to data extent', () => {
      setRange('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z');
      resetToFullRange();

      const range = getCurrentRange();
      expect(range.start).toBe('2024-01-15T09:00:00Z');
      expect(range.end).toBe('2024-01-15T15:00:00Z');
    });
  });

  describe('isFullRange', () => {
    it('returns true when at full range', () => {
      expect(isFullRange()).toBe(true);
    });

    it('returns false when range is restricted', () => {
      setRange('2024-01-15T10:00:00Z', '2024-01-15T12:00:00Z');
      expect(isFullRange()).toBe(false);
    });
  });

  describe('time range validation', () => {
    it('validates start is before end', () => {
      const isValidRange = (start: string, end: string): boolean => {
        return new Date(start) < new Date(end);
      };

      expect(
        isValidRange('2024-01-15T09:00:00Z', '2024-01-15T15:00:00Z')
      ).toBe(true);
      expect(
        isValidRange('2024-01-15T15:00:00Z', '2024-01-15T09:00:00Z')
      ).toBe(false);
      expect(
        isValidRange('2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z')
      ).toBe(false);
    });
  });
});
