/**
 * Unit tests for the colour palette (#134).
 */

import { describe, it, expect } from 'vitest';
import { defaultPalette, interpolateColour, getCategoricalColour } from '../palette';

describe('defaultPalette', () => {
  it('has at least 12 categorical colours (FR-011)', () => {
    expect(defaultPalette.colours.length).toBeGreaterThanOrEqual(12);
  });

  it('all colours are valid hex strings', () => {
    for (const c of defaultPalette.colours) {
      expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(defaultPalette.unclassifiedColour).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(defaultPalette.defaultColour).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('all palette colours are unique', () => {
    const unique = new Set(defaultPalette.colours);
    expect(unique.size).toBe(defaultPalette.colours.length);
  });
});

describe('interpolateColour', () => {
  it('returns colour1 at t=0', () => {
    expect(interpolateColour('#000000', '#ffffff', 0)).toBe('#000000');
  });

  it('returns colour2 at t=1', () => {
    expect(interpolateColour('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns midpoint at t=0.5', () => {
    const result = interpolateColour('#000000', '#ffffff', 0.5);
    // Should be approximately #808080
    expect(result).toMatch(/^#[7-8][0-9a-f][7-8][0-9a-f][7-8][0-9a-f]$/);
  });

  it('clamps t below 0', () => {
    expect(interpolateColour('#000000', '#ffffff', -1)).toBe('#000000');
  });

  it('clamps t above 1', () => {
    expect(interpolateColour('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});

describe('getCategoricalColour', () => {
  it('returns palette colour for indices within range', () => {
    for (let i = 0; i < defaultPalette.colours.length; i++) {
      expect(getCategoricalColour(i, defaultPalette)).toBe(defaultPalette.colours[i]);
    }
  });

  it('recycles colours beyond palette size', () => {
    const recycled = getCategoricalColour(12, defaultPalette);
    expect(recycled).toMatch(/^#[0-9a-f]{6}$/);
    // Should be a darkened version of index 0
    expect(recycled).not.toBe(defaultPalette.colours[0]);
  });

  it('returns valid hex for high indices', () => {
    const colour = getCategoricalColour(50, defaultPalette);
    expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });
});
