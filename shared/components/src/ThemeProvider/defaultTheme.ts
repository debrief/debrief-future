import type { Theme, ThemeTokens, ThemeVariant } from './ThemeContext';

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

  // Storyboard scene rectangles (Feature 217)
  sceneRectangleStroke: '#3b82f6',  // blue-500
  sceneRectangleFill: '#93c5fd',    // blue-300
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

  // Storyboard scene rectangles (Feature 217)
  sceneRectangleStroke: '#60a5fa',  // blue-400
  sceneRectangleFill: '#1e40af',    // blue-800
};

/**
 * High-contrast light theme tokens.
 *
 * Sourced from VS Code's "Default High Contrast Light" palette (#hc-light).
 * Heavier borders, pure-white background, near-black text for AA+ contrast.
 */
export const highContrastLightThemeTokens: ThemeTokens = {
  colorPrimary: '#0F4A85',
  colorSecondary: '#264F78',
  colorSuccess: '#0F633F',
  colorWarning: '#B5500D',
  colorDanger: '#B5200D',

  colorOwnship: '#0F4A85',
  colorContact: '#B5200D',
  colorReference: '#292929',
  colorSolution: '#0F633F',

  bgPrimary: '#ffffff',
  bgSecondary: '#ffffff',
  bgTertiary: '#f2f2f2',

  textPrimary: '#292929',
  textSecondary: '#292929',
  textMuted: '#7f7f7f',

  borderColor: '#0F4A85',
  borderColorFocus: '#006BBE',

  selectionBg: '#0F4A85',
  selectionBorder: '#0F4A85',

  // Storyboard scene rectangles — heavier border for HC
  sceneRectangleStroke: '#0F4A85',
  sceneRectangleFill: '#cce4ff',
};

/**
 * High-contrast dark theme tokens.
 *
 * Sourced from VS Code's "Default High Contrast" palette (#hc-dark).
 * Heavier borders, pure-black background, near-white text.
 */
export const highContrastDarkThemeTokens: ThemeTokens = {
  colorPrimary: '#3AA0F3',
  colorSecondary: '#A2A4A5',
  colorSuccess: '#5DB572',
  colorWarning: '#FFD602',
  colorDanger: '#F48771',

  colorOwnship: '#3AA0F3',
  colorContact: '#F48771',
  colorReference: '#A2A4A5',
  colorSolution: '#5DB572',

  bgPrimary: '#000000',
  bgSecondary: '#000000',
  bgTertiary: '#0a0a0a',

  textPrimary: '#ffffff',
  textSecondary: '#ffffff',
  textMuted: '#9d9d9d',

  borderColor: '#6FC3DF',
  borderColorFocus: '#F38518',

  selectionBg: '#f3a823',
  selectionBorder: '#F38518',

  // Storyboard scene rectangles — heavier border for HC
  sceneRectangleStroke: '#F38518',
  sceneRectangleFill: '#0a3458',
};

/**
 * Resolved (non-system) variants — used by the token selector.
 */
type ResolvedVariant = Exclude<ThemeVariant, 'system'>;

/**
 * Get tokens for a theme variant
 */
export function getThemeTokens(variant: ResolvedVariant): ThemeTokens {
  switch (variant) {
    case 'dark':
      return darkThemeTokens;
    case 'high-contrast-light':
      return highContrastLightThemeTokens;
    case 'high-contrast-dark':
      return highContrastDarkThemeTokens;
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
