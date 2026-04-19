/**
 * Tests for interval-based position utilities
 */

import { describe, it, expect } from 'vitest';
import {
  findIntervalPositions,
  findNearestPositionIndex,
  resolvePositionStyle,
  formatTimestampForLabel,
  computeAllPositionStyles,
  type PointShape,
  type PositionStyle,
  type PositionStyleOverride,
  type ResolvedPositionStyle,
} from '../src/interval.js';
import { InvalidPointShapeError } from '../src/errors.js';

describe('findNearestPositionIndex', () => {
  it('returns -1 for empty array', () => {
    expect(findNearestPositionIndex([], 1000)).toBe(-1);
  });

  it('returns 0 for single element', () => {
    expect(findNearestPositionIndex([1000], 500)).toBe(0);
    expect(findNearestPositionIndex([1000], 1500)).toBe(0);
  });

  it('finds exact match', () => {
    const timestamps = [1000, 2000, 3000, 4000, 5000];
    expect(findNearestPositionIndex(timestamps, 3000)).toBe(2);
  });

  it('finds nearest when between timestamps', () => {
    const timestamps = [1000, 2000, 3000, 4000, 5000];
    // 2400 is closer to 2000 (index 1)
    expect(findNearestPositionIndex(timestamps, 2400)).toBe(1);
    // 2600 is closer to 3000 (index 2)
    expect(findNearestPositionIndex(timestamps, 2600)).toBe(2);
  });

  it('returns first index for time before range', () => {
    const timestamps = [1000, 2000, 3000];
    expect(findNearestPositionIndex(timestamps, 500)).toBe(0);
  });

  it('returns last index for time after range', () => {
    const timestamps = [1000, 2000, 3000];
    expect(findNearestPositionIndex(timestamps, 5000)).toBe(2);
  });
});

describe('findIntervalPositions', () => {
  it('returns empty set for empty timestamps', () => {
    const result = findIntervalPositions([], 60000);
    expect(result.size).toBe(0);
  });

  it('returns empty set for zero interval', () => {
    const timestamps = [1000, 2000, 3000];
    const result = findIntervalPositions(timestamps, 0);
    expect(result.size).toBe(0);
  });

  it('returns empty set for negative interval', () => {
    const timestamps = [1000, 2000, 3000];
    const result = findIntervalPositions(timestamps, -1000);
    expect(result.size).toBe(0);
  });

  it('finds positions at 5-minute intervals', () => {
    // Timestamps every minute for 15 minutes
    const start = new Date('2026-01-09T10:00:00Z').getTime();
    const timestamps = Array.from({ length: 16 }, (_, i) => start + i * 60000);

    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const result = findIntervalPositions(timestamps, intervalMs);

    // Should find positions at 0, 5, 10, 15 minutes (indices 0, 5, 10, 15)
    expect(result.has(0)).toBe(true); // 10:00
    expect(result.has(5)).toBe(true); // 10:05
    expect(result.has(10)).toBe(true); // 10:10
    expect(result.has(15)).toBe(true); // 10:15
    expect(result.size).toBe(4);
  });

  it('finds nearest positions when interval does not align', () => {
    // Timestamps every 3 minutes for 15 minutes
    const start = new Date('2026-01-09T10:00:00Z').getTime();
    const timestamps = Array.from({ length: 6 }, (_, i) => start + i * 3 * 60000);
    // 10:00, 10:03, 10:06, 10:09, 10:12, 10:15

    const intervalMs = 5 * 60 * 1000; // 5 minutes
    const result = findIntervalPositions(timestamps, intervalMs);

    // 5-minute marks: 10:00, 10:05, 10:10, 10:15
    // Nearest positions: 0 (10:00), 2 (10:06), 3 (10:09), 5 (10:15)
    expect(result.has(0)).toBe(true); // 10:00 exact
    expect(result.has(5)).toBe(true); // 10:15 exact
    expect(result.size).toBeGreaterThanOrEqual(2);
  });
});

describe('resolvePositionStyle', () => {
  const defaultStyle: PositionStyle = {
    show_symbol: false,
    symbol: 'circle',
    show_label: false,
  };

  it('returns defaults when no intervals or overrides', () => {
    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      null,
      '2026-01-09T10:00:00Z'
    );

    expect(result.showSymbol).toBe(false);
    expect(result.symbol).toBe('circle');
    expect(result.showLabel).toBe(false);
    expect(result.labelText).toBeNull();
  });

  it('enables symbol when position matches symbol interval', () => {
    const symbolPositions = new Set([0, 5, 10]);
    const result = resolvePositionStyle(
      5,
      defaultStyle,
      symbolPositions,
      new Set(),
      null,
      '2026-01-09T10:05:00Z'
    );

    expect(result.showSymbol).toBe(true);
    expect(result.showLabel).toBe(false);
  });

  it('enables label when position matches label interval', () => {
    const labelPositions = new Set([0, 10, 20]);
    const result = resolvePositionStyle(
      10,
      defaultStyle,
      new Set(),
      labelPositions,
      null,
      '2026-01-09T10:10:00Z'
    );

    expect(result.showLabel).toBe(true);
    expect(result.labelText).not.toBeNull(); // Should have formatted timestamp
  });

  it('override takes precedence over interval', () => {
    const symbolPositions = new Set([5]); // Would enable symbol
    const override: PositionStyleOverride = { show_symbol: false };

    const result = resolvePositionStyle(
      5,
      defaultStyle,
      symbolPositions,
      new Set(),
      override,
      '2026-01-09T10:05:00Z'
    );

    expect(result.showSymbol).toBe(false); // Override wins
  });

  it('override can specify custom label', () => {
    const override: PositionStyleOverride = {
      show_label: true,
      label: 'Contact Alpha',
    };

    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );

    expect(result.showLabel).toBe(true);
    expect(result.labelText).toBe('Contact Alpha');
  });

  it('uses formatted timestamp when label enabled but not specified', () => {
    const override: PositionStyleOverride = { show_label: true };

    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:30:45Z'
    );

    expect(result.showLabel).toBe(true);
    expect(result.labelText).toContain('10:30:45'); // HH:MM:SS format
  });

  it('override can change symbol shape', () => {
    const override: PositionStyleOverride = {
      show_symbol: true,
      symbol: 'square',
    };

    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );

    expect(result.showSymbol).toBe(true);
    expect(result.symbol).toBe('square');
  });
});

describe('resolvePositionStyle — schema-linked symbol type', () => {
  const defaultStyle: PositionStyle = {
    show_symbol: true,
    symbol: 'circle',
    show_label: false,
  };

  it.each(['circle', 'square', 'triangle', 'diamond', 'cross'] as const)(
    'accepts %s as a valid override symbol and preserves it on the result',
    (shape) => {
      const override: PositionStyleOverride = { symbol: shape };
      const result = resolvePositionStyle(
        0,
        defaultStyle,
        new Set(),
        new Set(),
        override,
        '2026-01-09T10:00:00Z'
      );
      expect(result.symbol).toBe(shape);
    }
  );

  it('lets a diamond literal assign to ResolvedPositionStyle.symbol', () => {
    // Compile-time assertion: this would not type-check if the `symbol` union
    // still excluded 'diamond'. Running the test exercises the runtime path
    // but the real value is the tsc gate on this file.
    const override: PositionStyleOverride = { symbol: 'diamond' };
    const result: ResolvedPositionStyle = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );
    const symbol: PointShape = result.symbol;
    expect(symbol).toBe('diamond');
  });
});

describe('resolvePositionStyle — override null semantics (FR-013)', () => {
  const defaultStyle: PositionStyle = {
    show_symbol: true,
    symbol: 'triangle',
    show_label: true,
  };

  it('null show_symbol override preserves the cascaded default', () => {
    const override = {
      show_symbol: null,
    } as unknown as PositionStyleOverride;
    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );
    expect(result.showSymbol).toBe(defaultStyle.show_symbol);
  });

  it('null symbol override preserves the cascaded default', () => {
    const override = {
      symbol: null,
    } as unknown as PositionStyleOverride;
    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );
    expect(result.symbol).toBe(defaultStyle.symbol);
  });

  it('null show_label override preserves the cascaded default', () => {
    const override = {
      show_label: null,
    } as unknown as PositionStyleOverride;
    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:00:00Z'
    );
    expect(result.showLabel).toBe(defaultStyle.show_label);
  });

  it('null label override falls back to the formatted timestamp default', () => {
    const override = {
      label: null,
    } as unknown as PositionStyleOverride;
    const result = resolvePositionStyle(
      0,
      defaultStyle,
      new Set(),
      new Set(),
      override,
      '2026-01-09T10:30:45Z'
    );
    // showLabel comes from default (true); labelText falls through to the
    // timestamp formatter because the null override is ignored.
    expect(result.showLabel).toBe(true);
    expect(result.labelText).toContain('10:30:45');
  });
});

describe('resolvePositionStyle — invalid-shape runtime guard (FR-015)', () => {
  const defaultStyle: PositionStyle = {
    show_symbol: true,
    symbol: 'circle',
    show_label: false,
  };

  it('throws InvalidPointShapeError when override.symbol is not a known shape', () => {
    const override = {
      symbol: 'star',
    } as unknown as PositionStyleOverride;

    expect(() =>
      resolvePositionStyle(
        0,
        defaultStyle,
        new Set(),
        new Set(),
        override,
        '2026-01-09T10:00:00Z'
      )
    ).toThrow(InvalidPointShapeError);
  });

  it('populates offendingValue and validShapes on the thrown error', () => {
    const override = {
      symbol: 'star',
    } as unknown as PositionStyleOverride;

    try {
      resolvePositionStyle(
        0,
        defaultStyle,
        new Set(),
        new Set(),
        override,
        '2026-01-09T10:00:00Z'
      );
      throw new Error('resolver should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidPointShapeError);
      const typed = err as InvalidPointShapeError;
      expect(typed.offendingValue).toBe('star');
      expect(typed.validShapes).toEqual(
        expect.arrayContaining([
          'circle',
          'square',
          'triangle',
          'diamond',
          'cross',
        ])
      );
    }
  });
});

describe('formatTimestampForLabel', () => {
  it('formats timestamp as HH:MM:SS', () => {
    const result = formatTimestampForLabel('2026-01-09T10:30:45Z');
    expect(result).toMatch(/10:30:45/);
  });

  it('handles midnight', () => {
    const result = formatTimestampForLabel('2026-01-09T00:00:00Z');
    expect(result).toMatch(/00:00:00/);
  });

  it('returns Invalid Date on parse error', () => {
    const result = formatTimestampForLabel('invalid');
    // toLocaleTimeString returns "Invalid Date" for invalid dates
    expect(result).toBe('Invalid Date');
  });
});

describe('computeAllPositionStyles', () => {
  const defaultStyle: PositionStyle = {
    show_symbol: false,
    symbol: 'circle',
    show_label: false,
  };

  it('returns array same length as positions', () => {
    const positions = [
      { time: '2026-01-09T10:00:00Z' },
      { time: '2026-01-09T10:05:00Z' },
      { time: '2026-01-09T10:10:00Z' },
    ];

    const result = computeAllPositionStyles(
      positions,
      defaultStyle,
      null,
      null,
      null
    );

    expect(result.length).toBe(3);
  });

  it('applies interval rules to matching positions', () => {
    const positions = Array.from({ length: 11 }, (_, i) => ({
      time: new Date(Date.UTC(2026, 0, 9, 10, i, 0)).toISOString(),
    }));

    const result = computeAllPositionStyles(
      positions,
      defaultStyle,
      'PT5M', // 5-minute symbol interval
      null,
      null
    );

    // Positions at 0, 5, 10 minutes should have symbols
    expect(result[0].showSymbol).toBe(true);
    expect(result[5].showSymbol).toBe(true);
    expect(result[10].showSymbol).toBe(true);

    // Other positions should not have symbols
    expect(result[1].showSymbol).toBe(false);
    expect(result[3].showSymbol).toBe(false);
  });

  it('applies overrides correctly', () => {
    const positions = [
      { time: '2026-01-09T10:00:00Z' },
      { time: '2026-01-09T10:05:00Z' },
      { time: '2026-01-09T10:10:00Z' },
    ];

    const overrides: (PositionStyleOverride | null)[] = [
      null,
      { show_symbol: true, label: 'Contact Alpha' },
      null,
    ];

    const result = computeAllPositionStyles(
      positions,
      defaultStyle,
      null,
      null,
      overrides
    );

    expect(result[0].showSymbol).toBe(false);
    expect(result[1].showSymbol).toBe(true);
    expect(result[1].labelText).toBe('Contact Alpha');
    expect(result[2].showSymbol).toBe(false);
  });
});
