/**
 * T010 — Foundation tests for the flat ThemeVariant union and tokens.
 *
 * Asserts:
 *   - `ThemeVariant` accepts the four explicit variants and `'system'`.
 *   - The legacy `'vscode'` value is NOT accepted (compile-time check).
 *   - `defaultTheme` exposes one preset per explicit variant.
 *   - `mergeThemeTokens` works with the four-variant input.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Theme, ThemeVariant } from '../ThemeContext';
import {
  defaultTheme,
  getThemeTokens,
  mergeThemeTokens,
  lightThemeTokens,
  darkThemeTokens,
  highContrastLightThemeTokens,
  highContrastDarkThemeTokens,
} from '../defaultTheme';

describe('ThemeVariant — flat union', () => {
  it('accepts each of the four explicit variants', () => {
    const variants: ThemeVariant[] = [
      'light',
      'dark',
      'high-contrast-light',
      'high-contrast-dark',
      'system',
    ];
    expect(variants).toHaveLength(5);
  });

  it('rejects the legacy `vscode` value at the type level', () => {
    // @ts-expect-error — legacy 'vscode' must be removed from the union (#220)
    const _bad: ThemeVariant = 'vscode';
    expect(_bad).toBe('vscode');
  });

  it('exposes all five variant strings via expectTypeOf', () => {
    expectTypeOf<ThemeVariant>().toEqualTypeOf<
      'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark' | 'system'
    >();
  });
});

describe('defaultTheme presets — one per explicit variant', () => {
  it('has a preset for every non-system variant', () => {
    expect(getThemeTokens('light')).toBe(lightThemeTokens);
    expect(getThemeTokens('dark')).toBe(darkThemeTokens);
    expect(getThemeTokens('high-contrast-light')).toBe(highContrastLightThemeTokens);
    expect(getThemeTokens('high-contrast-dark')).toBe(highContrastDarkThemeTokens);
  });

  it('every preset has all required token fields', () => {
    const required = Object.keys(lightThemeTokens);
    for (const preset of [
      lightThemeTokens,
      darkThemeTokens,
      highContrastLightThemeTokens,
      highContrastDarkThemeTokens,
    ]) {
      const keys = Object.keys(preset);
      expect(keys.sort()).toEqual(required.sort());
    }
  });

  it('the default theme has variant=light', () => {
    expect(defaultTheme.variant).toBe('light');
  });
});

describe('mergeThemeTokens — four-variant input', () => {
  it('applies overrides on top of every variant preset', () => {
    const overrides = { colorPrimary: '#ff0000' };
    expect(mergeThemeTokens(lightThemeTokens, overrides).colorPrimary).toBe('#ff0000');
    expect(mergeThemeTokens(darkThemeTokens, overrides).colorPrimary).toBe('#ff0000');
    expect(mergeThemeTokens(highContrastLightThemeTokens, overrides).colorPrimary).toBe('#ff0000');
    expect(mergeThemeTokens(highContrastDarkThemeTokens, overrides).colorPrimary).toBe('#ff0000');
  });

  it('returns the base preset unchanged when overrides is undefined', () => {
    expect(mergeThemeTokens(lightThemeTokens)).toBe(lightThemeTokens);
  });

  it('allows partial overrides (only the supplied keys are replaced)', () => {
    const merged = mergeThemeTokens(darkThemeTokens, { colorPrimary: '#ff0000' });
    expect(merged.colorPrimary).toBe('#ff0000');
    expect(merged.bgPrimary).toBe(darkThemeTokens.bgPrimary);
  });
});

describe('Theme', () => {
  it('Theme type accepts all four explicit variants', () => {
    const themes: Theme[] = [
      { variant: 'light' },
      { variant: 'dark' },
      { variant: 'high-contrast-light' },
      { variant: 'high-contrast-dark' },
      { variant: 'system' },
    ];
    expect(themes).toHaveLength(5);
  });
});
