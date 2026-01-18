import { createContext } from 'react';

/**
 * Theme variant identifier
 */
export type ThemeVariant = 'light' | 'dark' | 'vscode' | 'system';

/**
 * Theme configuration for Debrief components
 */
export interface Theme {
  /** Theme variant identifier */
  variant: ThemeVariant;

  /** Override specific tokens */
  tokens?: Partial<ThemeTokens>;
}

/**
 * Available theme tokens that can be customized
 */
export interface ThemeTokens {
  // Colors
  colorPrimary: string;
  colorSecondary: string;
  colorSuccess: string;
  colorWarning: string;
  colorDanger: string;

  // Track colors
  colorOwnship: string;
  colorContact: string;
  colorReference: string;
  colorSolution: string;

  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderColor: string;
  borderColorFocus: string;

  // Selection
  selectionBg: string;
  selectionBorder: string;
}

/**
 * Context value provided by ThemeProvider
 */
export interface ThemeContextValue {
  /** Current theme configuration */
  theme: Theme;

  /** Resolved theme variant (handles 'system' based on prefers-color-scheme) */
  resolvedVariant: Exclude<ThemeVariant, 'system'>;

  /** Update the theme */
  setTheme: (theme: Theme | ((prev: Theme) => Theme)) => void;

  /** Check if dark mode is active */
  isDark: boolean;
}

/**
 * Default theme context value
 */
export const defaultThemeContext: ThemeContextValue = {
  theme: { variant: 'light' },
  resolvedVariant: 'light',
  setTheme: () => {
    console.warn('ThemeProvider not found. Wrap your app with <ThemeProvider>.');
  },
  isDark: false,
};

/**
 * React context for theme configuration
 */
export const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext);
ThemeContext.displayName = 'DebriefThemeContext';
