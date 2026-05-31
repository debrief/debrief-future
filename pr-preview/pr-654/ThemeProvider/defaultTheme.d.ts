import { Theme, ThemeTokens, ThemeVariant } from './ThemeContext';

/**
 * Default light theme tokens
 */
export declare const lightThemeTokens: ThemeTokens;
/**
 * Dark theme tokens
 */
export declare const darkThemeTokens: ThemeTokens;
/**
 * High-contrast light theme tokens.
 *
 * Sourced from VS Code's "Default High Contrast Light" palette (#hc-light).
 * Heavier borders, pure-white background, near-black text for AA+ contrast.
 */
export declare const highContrastLightThemeTokens: ThemeTokens;
/**
 * High-contrast dark theme tokens.
 *
 * Sourced from VS Code's "Default High Contrast" palette (#hc-dark).
 * Heavier borders, pure-black background, near-white text.
 */
export declare const highContrastDarkThemeTokens: ThemeTokens;
/**
 * Resolved (non-system) variants — used by the token selector.
 */
type ResolvedVariant = Exclude<ThemeVariant, 'system'>;
/**
 * Get tokens for a theme variant
 */
export declare function getThemeTokens(variant: ResolvedVariant): ThemeTokens;
/**
 * Default theme configuration
 */
export declare const defaultTheme: Theme;
/**
 * Merge custom tokens with base theme tokens
 */
export declare function mergeThemeTokens(baseTokens: ThemeTokens, customTokens?: Partial<ThemeTokens>): ThemeTokens;
export {};
//# sourceMappingURL=defaultTheme.d.ts.map