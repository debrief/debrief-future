import { Theme, ThemeTokens } from './ThemeContext';

/**
 * Default light theme tokens
 */
export declare const lightThemeTokens: ThemeTokens;
/**
 * Dark theme tokens
 */
export declare const darkThemeTokens: ThemeTokens;
/**
 * VS Code theme tokens (adapts to VS Code's color scheme)
 */
export declare const vsCodeThemeTokens: ThemeTokens;
/**
 * Get tokens for a theme variant
 */
export declare function getThemeTokens(variant: 'light' | 'dark' | 'vscode'): ThemeTokens;
/**
 * Default theme configuration
 */
export declare const defaultTheme: Theme;
/**
 * Merge custom tokens with base theme tokens
 */
export declare function mergeThemeTokens(baseTokens: ThemeTokens, customTokens?: Partial<ThemeTokens>): ThemeTokens;
//# sourceMappingURL=defaultTheme.d.ts.map