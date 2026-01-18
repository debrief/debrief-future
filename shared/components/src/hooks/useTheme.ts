import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '../ThemeProvider/ThemeContext';

/**
 * Hook to access the current theme context.
 *
 * @returns Theme context value with current theme, resolved variant, and setTheme function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, isDark, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme({ variant: isDark ? 'light' : 'dark' })}>
 *       Toggle Theme
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Hook to get just the dark mode status.
 * Useful when you only need to know if dark mode is active.
 *
 * @returns true if dark mode is active
 */
export function useIsDarkMode(): boolean {
  const { isDark } = useTheme();
  return isDark;
}

/**
 * Hook to get the resolved theme variant.
 * Handles 'system' by returning the actual resolved value.
 *
 * @returns Resolved theme variant ('light', 'dark', or 'vscode')
 */
export function useResolvedTheme(): 'light' | 'dark' | 'vscode' {
  const { resolvedVariant } = useTheme();
  return resolvedVariant;
}
