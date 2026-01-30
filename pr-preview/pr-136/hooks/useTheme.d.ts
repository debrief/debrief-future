import { ThemeContextValue } from '../ThemeProvider/ThemeContext';

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
export declare function useTheme(): ThemeContextValue;
/**
 * Hook to get just the dark mode status.
 * Useful when you only need to know if dark mode is active.
 *
 * @returns true if dark mode is active
 */
export declare function useIsDarkMode(): boolean;
/**
 * Hook to get the resolved theme variant.
 * Handles 'system' by returning the actual resolved value.
 *
 * @returns Resolved theme variant ('light', 'dark', or 'vscode')
 */
export declare function useResolvedTheme(): 'light' | 'dark' | 'vscode';
//# sourceMappingURL=useTheme.d.ts.map