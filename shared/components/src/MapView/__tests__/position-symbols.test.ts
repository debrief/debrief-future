import { describe, it, expect } from 'vitest';
import { svgPathForShape } from '../PositionSymbolsLayer';
import type { PointShape } from '@debrief/utils';

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
    const shapes: PointShape[] = ['square', 'triangle', 'diamond', 'cross'];
    const paths = shapes.map(s => svgPathForShape(s, 8));
    const unique = new Set(paths);
    expect(unique.size).toBe(shapes.length);
  });

  it('throws via assertNever when given a shape outside PointShape (FR-016)', () => {
    expect(() =>
      svgPathForShape('unknown' as unknown as PointShape, 5)
    ).toThrow(/assertNever/);
  });
});
