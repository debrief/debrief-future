import { describe, it, expect } from 'vitest';
import { DRAWING_PALETTE, getPaletteColour, getPaletteStyleOverrides } from '../drawingPalette';

describe('drawingPalette', () => {
  it('contains exactly 8 colours', () => {
    expect(DRAWING_PALETTE).toHaveLength(8);
  });

  it('all colours are distinct', () => {
    const unique = new Set(DRAWING_PALETTE);
    expect(unique.size).toBe(8);
  });

  it('all colours are valid hex strings', () => {
    for (const colour of DRAWING_PALETTE) {
      expect(colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('getPaletteColour', () => {
  it('returns the first colour for index 0', () => {
    expect(getPaletteColour(0)).toBe(DRAWING_PALETTE[0]);
  });

  it('returns the last colour for index 7', () => {
    expect(getPaletteColour(7)).toBe(DRAWING_PALETTE[7]);
  });

  it('wraps around at index 8 (returns first colour)', () => {
    expect(getPaletteColour(8)).toBe(DRAWING_PALETTE[0]);
  });

  it('wraps around at index 10', () => {
    expect(getPaletteColour(10)).toBe(DRAWING_PALETTE[2]);
  });

  it('returns expected colours for indices 0-7', () => {
    for (let i = 0; i < 8; i++) {
      expect(getPaletteColour(i)).toBe(DRAWING_PALETTE[i]);
    }
  });
});

describe('getPaletteStyleOverrides', () => {
  it('returns pointStyle for point mode', () => {
    const result = getPaletteStyleOverrides('point', 0);
    expect(result.pointStyle).toBeDefined();
    expect(result.pointStyle!.color).toBe(DRAWING_PALETTE[0]);
    expect(result.pointStyle!.fill_color).toBe(DRAWING_PALETTE[0]);
  });

  it('returns rectangleStyle for rectangle mode', () => {
    const result = getPaletteStyleOverrides('rectangle', 1);
    expect(result.rectangleStyle).toBeDefined();
    expect(result.rectangleStyle!.color).toBe(DRAWING_PALETTE[1]);
    expect(result.rectangleStyle!.fill_color).toBe(DRAWING_PALETTE[1]);
  });

  it('returns polygonStyle for polygon mode', () => {
    const result = getPaletteStyleOverrides('polygon', 2);
    expect(result.polygonStyle).toBeDefined();
    expect(result.polygonStyle!.color).toBe(DRAWING_PALETTE[2]);
    expect(result.polygonStyle!.fill_color).toBe(DRAWING_PALETTE[2]);
  });

  it('returns polylineStyle for polyline mode (no fill_color)', () => {
    const result = getPaletteStyleOverrides('polyline', 3);
    expect(result.polylineStyle).toBeDefined();
    expect(result.polylineStyle!.color).toBe(DRAWING_PALETTE[3]);
    // Polylines don't have fill_color
    expect(result.polylineStyle).not.toHaveProperty('fill_color');
  });

  it('returns empty object for null mode', () => {
    const result = getPaletteStyleOverrides(null, 0);
    expect(result).toEqual({});
  });

  it('cycles palette correctly across modes', () => {
    const colour0 = getPaletteColour(0);
    const colour1 = getPaletteColour(1);
    expect(colour0).not.toBe(colour1);

    const point = getPaletteStyleOverrides('point', 0);
    const rect = getPaletteStyleOverrides('rectangle', 1);
    expect(point.pointStyle!.color).toBe(colour0);
    expect(rect.rectangleStyle!.color).toBe(colour1);
  });
});
