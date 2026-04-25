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
    colorPrimary: string;
    colorSecondary: string;
    colorSuccess: string;
    colorWarning: string;
    colorDanger: string;
    colorOwnship: string;
    colorContact: string;
    colorReference: string;
    colorSolution: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    borderColor: string;
    borderColorFocus: string;
    selectionBg: string;
    selectionBorder: string;
    sceneRectangleStroke: string;
    sceneRectangleFill: string;
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
export declare const defaultThemeContext: ThemeContextValue;
/**
 * React context for theme configuration
 */
export declare const ThemeContext: import('../../../../node_modules/.pnpm/react@18.3.1/node_modules/react').Context<ThemeContextValue>;
//# sourceMappingURL=ThemeContext.d.ts.map