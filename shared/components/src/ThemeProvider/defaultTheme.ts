import type { Theme, ThemeTokens } from './ThemeContext';

/**
 * Default light theme tokens
 */
export const lightThemeTokens: ThemeTokens = {
  colorPrimary: '#0066cc',
  colorSecondary: '#6c757d',
  colorSuccess: '#28a745',
  colorWarning: '#ffc107',
  colorDanger: '#dc3545',

  colorOwnship: '#0066cc',
  colorContact: '#cc0000',
  colorReference: '#666666',
  colorSolution: '#00cc66',

  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fa',
  bgTertiary: '#e9ecef',

  textPrimary: '#212529',
  textSecondary: '#6c757d',
  textMuted: '#adb5bd',

  borderColor: '#dee2e6',
  borderColorFocus: '#0066cc',

  selectionBg: 'rgba(0, 102, 204, 0.1)',
  selectionBorder: '#0066cc',
};

/**
 * Dark theme tokens
 */
export const darkThemeTokens: ThemeTokens = {
  colorPrimary: '#4da6ff',
  colorSecondary: '#8c939a',
  colorSuccess: '#48c774',
  colorWarning: '#ffdd57',
  colorDanger: '#f14668',

  colorOwnship: '#4da6ff',
  colorContact: '#ff6b6b',
  colorReference: '#888888',
  colorSolution: '#48c774',

  bgPrimary: '#1e1e1e',
  bgSecondary: '#252526',
  bgTertiary: '#2d2d30',

  textPrimary: '#cccccc',
  textSecondary: '#9d9d9d',
  textMuted: '#6d6d6d',

  borderColor: '#3c3c3c',
  borderColorFocus: '#4da6ff',

  selectionBg: 'rgba(77, 166, 255, 0.15)',
  selectionBorder: '#4da6ff',
};

/**
 * VS Code theme tokens (adapts to VS Code's color scheme)
 */
export const vsCodeThemeTokens: ThemeTokens = {
  ...darkThemeTokens,
  // These will be overridden by CSS custom properties from VS Code
};

/**
 * Get tokens for a theme variant
 */
export function getThemeTokens(variant: 'light' | 'dark' | 'vscode'): ThemeTokens {
  switch (variant) {
    case 'dark':
      return darkThemeTokens;
    case 'vscode':
      return vsCodeThemeTokens;
    case 'light':
    default:
      return lightThemeTokens;
  }
}

/**
 * Default theme configuration
 */
export const defaultTheme: Theme = {
  variant: 'light',
};

/**
 * Merge custom tokens with base theme tokens
 */
export function mergeThemeTokens(
  baseTokens: ThemeTokens,
  customTokens?: Partial<ThemeTokens>
): ThemeTokens {
  if (!customTokens) {
    return baseTokens;
  }
  return { ...baseTokens, ...customTokens };
}
