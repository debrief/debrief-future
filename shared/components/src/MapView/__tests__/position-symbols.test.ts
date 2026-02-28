import { describe, it, expect } from 'vitest';
import { svgPathForShape } from '../PositionSymbolsLayer';
import type { SymbolShape } from '../PositionSymbolsLayer';

describe('svgPathForShape', () => {
  it('returns empty string for circle (handled by CircleMarker)', () => {
    expect(svgPathForShape('circle', 5)).toBe('');
  });

  it('returns a valid SVG path for square', () => {
    const d = svgPathForShape('square', 6);
    expect(d).toContain('M');
    expect(d).toContain('h');
    expect(d).toContain('v');
    expect(d).toContain('Z');
  });

  it('returns a valid SVG path for triangle', () => {
    const d = svgPathForShape('triangle', 7);
    expect(d).toContain('M');
    expect(d).toContain('L');
    expect(d).toContain('Z');
  });

  it('returns a valid SVG path for diamond', () => {
    const d = svgPathForShape('diamond', 7);
    expect(d).toContain('M');
    expect(d).toContain('L');
    expect(d).toContain('Z');
  });

  it('returns a valid SVG path for cross', () => {
    const d = svgPathForShape('cross', 7);
    expect(d).toContain('M');
    expect(d).toContain('h');
    expect(d).toContain('v');
    expect(d).toContain('Z');
  });

  it('returns unique paths for each non-circle shape', () => {
    const shapes: SymbolShape[] = ['square', 'triangle', 'diamond', 'cross'];
    const paths = shapes.map(s => svgPathForShape(s, 8));
    const unique = new Set(paths);
    expect(unique.size).toBe(shapes.length);
  });

  it('returns empty string for unknown shape (fallback)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(svgPathForShape('unknown' as any, 5)).toBe('');
  });
});
