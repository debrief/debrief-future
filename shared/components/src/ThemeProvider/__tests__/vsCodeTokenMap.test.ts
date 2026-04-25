import { describe, it, expect } from 'vitest';
import { VS_CODE_TOKEN_MAP, REQUIRED_VS_CODE_KEYS } from '../vsCodeTokenMap';

const VARIANTS = ['light', 'dark', 'high-contrast-light', 'high-contrast-dark'] as const;

describe('VS_CODE_TOKEN_MAP', () => {
  it('defines entries for every explicit variant', () => {
    expect(Object.keys(VS_CODE_TOKEN_MAP).sort()).toEqual([...VARIANTS].sort());
  });

  it('every variant entry is a non-empty record', () => {
    for (const variant of VARIANTS) {
      expect(Object.keys(VS_CODE_TOKEN_MAP[variant]).length).toBeGreaterThan(0);
    }
  });

  it('every variant has identical key sets (structural parity)', () => {
    const reference = Object.keys(VS_CODE_TOKEN_MAP.light).sort();
    for (const variant of VARIANTS) {
      const keys = Object.keys(VS_CODE_TOKEN_MAP[variant]).sort();
      expect(keys, `variant=${variant}`).toEqual(reference);
    }
  });

  it('every required key is present in every variant', () => {
    for (const key of REQUIRED_VS_CODE_KEYS) {
      for (const variant of VARIANTS) {
        expect(VS_CODE_TOKEN_MAP[variant][key], `${variant}: ${key}`).toBeDefined();
      }
    }
  });

  it('every key starts with --vscode-', () => {
    for (const key of REQUIRED_VS_CODE_KEYS) {
      expect(key.startsWith('--vscode-'), `key should start with --vscode-: ${key}`).toBe(true);
    }
  });

  it('every value is a non-empty string', () => {
    for (const variant of VARIANTS) {
      for (const [key, value] of Object.entries(VS_CODE_TOKEN_MAP[variant])) {
        expect(typeof value, `${variant}.${key} type`).toBe('string');
        expect(value.length, `${variant}.${key} length`).toBeGreaterThan(0);
      }
    }
  });

  it('light and dark produce visually distinct values for the foreground key', () => {
    expect(VS_CODE_TOKEN_MAP.light['--vscode-foreground']).not.toBe(
      VS_CODE_TOKEN_MAP.dark['--vscode-foreground']
    );
    expect(VS_CODE_TOKEN_MAP.light['--vscode-editor-background']).not.toBe(
      VS_CODE_TOKEN_MAP.dark['--vscode-editor-background']
    );
    expect(VS_CODE_TOKEN_MAP.light['--vscode-sideBar-background']).not.toBe(
      VS_CODE_TOKEN_MAP.dark['--vscode-sideBar-background']
    );
  });

  it('high-contrast variants differ from their non-HC counterparts', () => {
    expect(VS_CODE_TOKEN_MAP['high-contrast-light']['--vscode-contrastBorder']).not.toBe(
      VS_CODE_TOKEN_MAP.light['--vscode-contrastBorder']
    );
    expect(VS_CODE_TOKEN_MAP['high-contrast-dark']['--vscode-contrastBorder']).not.toBe(
      VS_CODE_TOKEN_MAP.dark['--vscode-contrastBorder']
    );
  });

  it('includes every --vscode-* variable referenced by LogPanel CSS', () => {
    // These are the LogPanel-specific keys we know must be covered for #209
    const logPanelKeys = [
      '--vscode-foreground',
      '--vscode-sideBar-background',
      '--vscode-editor-background',
      '--vscode-panel-border',
      '--vscode-descriptionForeground',
      '--vscode-focusBorder',
      '--vscode-list-activeSelectionBackground',
      '--vscode-list-activeSelectionForeground',
      '--vscode-list-hoverBackground',
      '--vscode-list-inactiveSelectionBackground',
      '--vscode-input-background',
      '--vscode-input-foreground',
      '--vscode-input-border',
      '--vscode-dropdown-background',
      '--vscode-dropdown-foreground',
      '--vscode-dropdown-border',
      '--vscode-button-secondaryBackground',
      '--vscode-button-secondaryForeground',
      '--vscode-button-secondaryHoverBackground',
      '--vscode-badge-background',
      '--vscode-badge-foreground',
      '--vscode-textLink-foreground',
      '--vscode-font-family',
      '--vscode-font-size',
      '--vscode-editor-font-family',
    ];
    for (const key of logPanelKeys) {
      for (const variant of VARIANTS) {
        expect(VS_CODE_TOKEN_MAP[variant][key], `${variant}: ${key}`).toBeDefined();
      }
    }
  });
});
