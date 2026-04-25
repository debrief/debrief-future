import { describe, it, expect } from 'vitest';
import { VS_CODE_TOKEN_MAP, REQUIRED_VS_CODE_KEYS } from '../vsCodeTokenMap';

describe('VS_CODE_TOKEN_MAP', () => {
  it('defines entries for both light and dark variants', () => {
    expect(Object.keys(VS_CODE_TOKEN_MAP).sort()).toEqual(['dark', 'light']);
  });

  it('each variant entry is a non-empty record', () => {
    expect(Object.keys(VS_CODE_TOKEN_MAP.light).length).toBeGreaterThan(0);
    expect(Object.keys(VS_CODE_TOKEN_MAP.dark).length).toBeGreaterThan(0);
  });

  it('light and dark variants have identical key sets (structural parity)', () => {
    const lightKeys = Object.keys(VS_CODE_TOKEN_MAP.light).sort();
    const darkKeys = Object.keys(VS_CODE_TOKEN_MAP.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('every required key is present in every variant', () => {
    for (const key of REQUIRED_VS_CODE_KEYS) {
      expect(VS_CODE_TOKEN_MAP.light[key], `light: ${key}`).toBeDefined();
      expect(VS_CODE_TOKEN_MAP.dark[key], `dark: ${key}`).toBeDefined();
    }
  });

  it('every key starts with --vscode-', () => {
    for (const key of REQUIRED_VS_CODE_KEYS) {
      expect(key.startsWith('--vscode-'), `key should start with --vscode-: ${key}`).toBe(true);
    }
  });

  it('every value is a non-empty string', () => {
    for (const variant of ['light', 'dark'] as const) {
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
      expect(VS_CODE_TOKEN_MAP.light[key], `light: ${key}`).toBeDefined();
      expect(VS_CODE_TOKEN_MAP.dark[key], `dark: ${key}`).toBeDefined();
    }
  });
});
