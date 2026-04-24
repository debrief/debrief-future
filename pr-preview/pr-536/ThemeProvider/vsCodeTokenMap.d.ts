/**
 * Static map of `--vscode-*` CSS custom property values per theme variant.
 *
 * Background:
 *   Many Debrief components (notably LogPanel and its sub-components) style
 *   themselves using VS Code CSS variables (`--vscode-foreground`,
 *   `--vscode-sideBar-background`, etc.). Inside VS Code those variables are
 *   supplied by the host; inside Storybook and web-shell they are not — so
 *   the CSS fallback values kick in, and the components render with their
 *   dark-mode fallbacks regardless of the active Storybook theme.
 *
 * Fix:
 *   `ThemeProvider` injects this map into `document.documentElement` when
 *   the resolved variant is `'light'` or `'dark'` and we are NOT inside a
 *   VS Code webview. When the resolved variant is `'vscode'`, injection is
 *   skipped so the real VS Code host supplies the variables.
 *
 * Values sourced from VS Code's published `Default Light+` and
 * `Default Dark+` themes (as of VS Code ^1.85). Only keys actually used by
 * components in `shared/components/src/**\/*.css` are included — adding new
 * VS Code variables to component CSS requires adding them here too.
 *
 * Feature: 209-logpanel-a11y-audit
 */
export type VSCodeThemeVariant = 'light' | 'dark';
export declare const VS_CODE_TOKEN_MAP: Record<VSCodeThemeVariant, Record<string, string>>;
/**
 * Keys that every variant entry MUST provide.
 * Derived from the union of keys across all variants so unit tests can
 * enforce structural parity between `light` and `dark`.
 */
export declare const REQUIRED_VS_CODE_KEYS: readonly string[];
//# sourceMappingURL=vsCodeTokenMap.d.ts.map