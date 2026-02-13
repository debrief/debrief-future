import { describe, it, expect } from 'vitest';
import { resolveParamType, isPresetType, getNumericValue } from '../paramTypeResolver';

describe('resolveParamType', () => {
  it('resolves NamedColor to 11 color items', () => {
    const items = resolveParamType('NamedColor');
    expect(items).not.toBeNull();
    expect(items!.length).toBe(11);
    expect(items![0]).toEqual({ id: 'red', label: 'Red' });
    expect(items![10]).toEqual({ id: 'grey', label: 'Grey' });
  });

  it('resolves MarkerSymbol to 5 shape items', () => {
    const items = resolveParamType('MarkerSymbol');
    expect(items).not.toBeNull();
    expect(items!.length).toBe(5);
    expect(items!.map(i => i.id)).toEqual(['circle', 'square', 'triangle', 'diamond', 'cross']);
  });

  it('resolves CardinalDirection to 8 direction items', () => {
    const items = resolveParamType('CardinalDirection');
    expect(items).not.toBeNull();
    expect(items!.length).toBe(8);
    expect(items![0]).toEqual({ id: 'N', label: 'N' });
  });

  it('resolves DurationPreset with human-readable labels', () => {
    const items = resolveParamType('DurationPreset');
    expect(items).not.toBeNull();
    expect(items!.length).toBe(9);
    expect(items![0]).toEqual({ id: 'PT1M', label: '1 minute' });
    expect(items![4]).toEqual({ id: 'PT1H', label: '1 hour' });
  });

  it('resolves NumericPreset with numeric labels', () => {
    const items = resolveParamType('NumericPreset');
    expect(items).not.toBeNull();
    expect(items!.length).toBe(7);
    expect(items![0]).toEqual({ id: 'n_1', label: '1' });
  });

  it('returns null for unknown type', () => {
    expect(resolveParamType('UnknownType')).toBeNull();
  });
});

describe('isPresetType', () => {
  it('returns true for DurationPreset', () => {
    expect(isPresetType('DurationPreset')).toBe(true);
  });
  it('returns true for NumericPreset', () => {
    expect(isPresetType('NumericPreset')).toBe(true);
  });
  it('returns false for NamedColor', () => {
    expect(isPresetType('NamedColor')).toBe(false);
  });
});

describe('getNumericValue', () => {
  it('converts n_10 to 10', () => {
    expect(getNumericValue('n_10')).toBe(10);
  });
  it('returns null for unknown value', () => {
    expect(getNumericValue('unknown')).toBeNull();
  });
});
