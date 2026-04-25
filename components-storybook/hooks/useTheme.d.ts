import { ThemeContextValue } from '../ThemeProvider/ThemeContext';
import { ResolvedVariant } from '../ThemeProvider/ThemeSource';

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
 * @returns Resolved theme variant — one of the four explicit values.
 */
export declare function useResolvedTheme(): ResolvedVariant;
/**
 * Hook to get whether the resolved variant is one of the high-contrast
 * accessibility variants. Use to drive contrast-sensitive styling
 * (heavier focus rings, thicker borders) without inferring from colour
 * values.
 */
export declare function useIsHighContrast(): boolean;
//# sourceMappingURL=useTheme.d.ts.map