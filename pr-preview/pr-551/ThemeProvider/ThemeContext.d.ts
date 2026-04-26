/**
 * Theme variant identifier.
 *
 * Flat union mirroring VS Code's body-class taxonomy:
 *   `vscode-light` → `'light'`
 *   `vscode-dark` → `'dark'`
 *   `vscode-high-contrast-light` → `'high-contrast-light'`
 *   `vscode-high-contrast` → `'high-contrast-dark'`
 *
 * `'system'` is a request: it is resolved to one of the four explicit
 * values via the active `ThemeSource` (OS media queries, body class, etc.).
 *
 * The legacy `'vscode'` variant has been retired (#220) — when running
 * inside a VS Code webview, the variant is one of the four explicit
 * values resolved from the body class.
 */
export type ThemeVariant = 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark' | 'system';
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
    /** Resolved theme variant (handles 'system' based on active source) */
    resolvedVariant: Exclude<ThemeVariant, 'system'>;
    /** Update the theme */
    setTheme: (theme: Theme | ((prev: Theme) => Theme)) => void;
    /** Check if dark mode is active */
    isDark: boolean;
    /** Whether the resolved variant is one of the high-contrast accessibility variants */
    isHighContrast: boolean;
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