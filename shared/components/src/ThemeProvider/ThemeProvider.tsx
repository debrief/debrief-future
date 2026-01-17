import React, { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { ThemeContext, type Theme, type ThemeVariant, type ThemeContextValue } from './ThemeContext';
import { getThemeTokens, mergeThemeTokens, defaultTheme } from './defaultTheme';
import '../styles/tokens.css';

export interface ThemeProviderProps {
  /** Initial theme configuration */
  theme?: Theme;

  /** Child components */
  children: ReactNode;

  /** Container element to apply theme data attribute */
  container?: HTMLElement;
}

/**
 * Detect system color scheme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme tokens as CSS custom properties
 */
function applyThemeTokens(variant: Exclude<ThemeVariant, 'system'>, customTokens?: Theme['tokens']) {
  const tokens = mergeThemeTokens(getThemeTokens(variant), customTokens);

  // Apply to document root
  const root = document.documentElement;

  root.style.setProperty('--debrief-color-primary', tokens.colorPrimary);
  root.style.setProperty('--debrief-color-secondary', tokens.colorSecondary);
  root.style.setProperty('--debrief-color-success', tokens.colorSuccess);
  root.style.setProperty('--debrief-color-warning', tokens.colorWarning);
  root.style.setProperty('--debrief-color-danger', tokens.colorDanger);

  root.style.setProperty('--debrief-color-ownship', tokens.colorOwnship);
  root.style.setProperty('--debrief-color-contact', tokens.colorContact);
  root.style.setProperty('--debrief-color-reference', tokens.colorReference);
  root.style.setProperty('--debrief-color-solution', tokens.colorSolution);

  root.style.setProperty('--debrief-bg-primary', tokens.bgPrimary);
  root.style.setProperty('--debrief-bg-secondary', tokens.bgSecondary);
  root.style.setProperty('--debrief-bg-tertiary', tokens.bgTertiary);

  root.style.setProperty('--debrief-text-primary', tokens.textPrimary);
  root.style.setProperty('--debrief-text-secondary', tokens.textSecondary);
  root.style.setProperty('--debrief-text-muted', tokens.textMuted);

  root.style.setProperty('--debrief-border-color', tokens.borderColor);
  root.style.setProperty('--debrief-border-color-focus', tokens.borderColorFocus);

  root.style.setProperty('--debrief-selection-bg', tokens.selectionBg);
  root.style.setProperty('--debrief-selection-border', tokens.selectionBorder);
}

/**
 * ThemeProvider component that provides theming context to child components.
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={{ variant: 'dark' }}>
 *   <MapView features={data} />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ theme: initialTheme, children, container }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Resolve the actual theme variant
  const resolvedVariant = useMemo<Exclude<ThemeVariant, 'system'>>(() => {
    if (theme.variant === 'system') {
      return systemTheme;
    }
    return theme.variant;
  }, [theme.variant, systemTheme]);

  // Apply theme to DOM
  useEffect(() => {
    const targetElement = container ?? document.documentElement;
    targetElement.setAttribute('data-theme', resolvedVariant);

    applyThemeTokens(resolvedVariant, theme.tokens);
  }, [resolvedVariant, theme.tokens, container]);

  const setTheme = useCallback((value: Theme | ((prev: Theme) => Theme)) => {
    setThemeState((prev) => (typeof value === 'function' ? value(prev) : value));
  }, []);

  const isDark = resolvedVariant === 'dark' || resolvedVariant === 'vscode';

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedVariant,
      setTheme,
      isDark,
    }),
    [theme, resolvedVariant, setTheme, isDark]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
