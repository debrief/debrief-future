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

export const VS_CODE_TOKEN_MAP: Record<VSCodeThemeVariant, Record<string, string>> = {
  light: {
    // Core
    '--vscode-foreground': '#616161',
    '--vscode-editor-foreground': '#000000',
    '--vscode-editor-background': '#ffffff',
    '--vscode-sideBar-background': '#f3f3f3',
    // Darkened from VS Code's default #717171 so #209 audit passes WCAG AA
    // contrast against the light sideBar background (#f3f3f3). At #595959
    // the ratio is ~7.0 vs. 4.40 at #717171.
    '--vscode-descriptionForeground': '#595959',
    '--vscode-errorForeground': '#a1260d',
    '--vscode-disabledForeground': '#a5a5a5',
    '--vscode-icon-foreground': '#424242',
    // Darkened from VS Code's default #0090f1 so white text over the active
    // toggle button meets WCAG AA (4.5:1). At #005a9e the ratio is ~6.4
    // vs. 3.35 at #0090f1.
    '--vscode-focusBorder': '#005a9e',
    '--vscode-contrastBorder': 'transparent',
    '--vscode-widget-border': '#d4d4d4',
    '--vscode-panel-border': '#e5e5e5',
    '--vscode-textLink-foreground': '#006ab1',

    // Font
    '--vscode-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Ubuntu', 'Droid Sans', sans-serif",
    '--vscode-font-size': '13px',
    '--vscode-editor-font-family': "'Menlo', 'Monaco', 'Courier New', monospace",

    // Buttons
    '--vscode-button-background': '#007acc',
    '--vscode-button-foreground': '#ffffff',
    '--vscode-button-hoverBackground': '#0062a3',
    '--vscode-button-border': 'transparent',
    '--vscode-button-secondaryBackground': '#5f6a79',
    '--vscode-button-secondaryForeground': '#ffffff',
    '--vscode-button-secondaryHoverBackground': '#4c5461',

    // Badges
    '--vscode-badge-background': '#c4c4c4',
    '--vscode-badge-foreground': '#333333',

    // Inputs
    '--vscode-input-background': '#ffffff',
    '--vscode-input-foreground': '#333333',
    '--vscode-input-border': '#cecece',
    '--vscode-input-placeholderForeground': '#767676',
    '--vscode-inputValidation-errorBackground': '#f2dede',
    '--vscode-inputValidation-errorBorder': '#be1100',

    // Dropdowns
    '--vscode-dropdown-background': '#ffffff',
    '--vscode-dropdown-foreground': '#333333',
    '--vscode-dropdown-border': '#cecece',

    // Lists
    '--vscode-list-activeSelectionBackground': '#0060c0',
    '--vscode-list-activeSelectionForeground': '#ffffff',
    '--vscode-list-hoverBackground': '#e8e8e8',
    '--vscode-list-inactiveSelectionBackground': '#e4e6f1',

    // Editor widgets / hover / tabs / menu
    '--vscode-editorWidget-background': '#f3f3f3',
    '--vscode-editorWidget-foreground': '#616161',
    '--vscode-editorWidget-border': '#c8c8c8',
    '--vscode-editorHoverWidget-background': '#f3f3f3',
    '--vscode-editorHoverWidget-border': '#c8c8c8',
    '--vscode-editorGroupHeader-tabsBackground': '#f3f3f3',
    '--vscode-tab-activeBackground': '#ffffff',
    '--vscode-tab-activeForeground': '#333333',
    '--vscode-tab-inactiveForeground': '#666666',
    '--vscode-menu-background': '#ffffff',
    '--vscode-menu-foreground': '#616161',
    '--vscode-menu-border': '#d4d4d4',
    '--vscode-menu-selectionBackground': '#0060c0',

    // Semantic colours
    '--vscode-editorError-foreground': '#e51400',
    '--vscode-editorWarning-foreground': '#bf8803',
    '--vscode-editorWarning-background': 'rgba(191, 136, 3, 0.15)',
    '--vscode-editorInfo-foreground': '#1a85ff',
    '--vscode-editorInfo-background': 'rgba(26, 133, 255, 0.15)',
    '--vscode-progressBar-background': '#0e70c0',
  },
  dark: {
    // Core
    '--vscode-foreground': '#cccccc',
    '--vscode-editor-foreground': '#d4d4d4',
    '--vscode-editor-background': '#1e1e1e',
    '--vscode-sideBar-background': '#252526',
    '--vscode-descriptionForeground': '#cccccccc',
    '--vscode-errorForeground': '#f48771',
    '--vscode-disabledForeground': '#cccccc80',
    '--vscode-icon-foreground': '#c5c5c5',
    // Darkened from VS Code's default #007fd4 so white text over the active
    // toggle button meets WCAG AA (4.5:1). At #006abd the ratio is ~4.9
    // vs. 4.21 at #007fd4. #209 audit.
    '--vscode-focusBorder': '#006abd',
    '--vscode-contrastBorder': 'transparent',
    '--vscode-widget-border': '#303031',
    '--vscode-panel-border': '#80808059',
    '--vscode-textLink-foreground': '#3794ff',

    // Font
    '--vscode-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Ubuntu', 'Droid Sans', sans-serif",
    '--vscode-font-size': '13px',
    '--vscode-editor-font-family': "'Menlo', 'Monaco', 'Courier New', monospace",

    // Buttons
    '--vscode-button-background': '#0e639c',
    '--vscode-button-foreground': '#ffffff',
    '--vscode-button-hoverBackground': '#1177bb',
    '--vscode-button-border': 'transparent',
    '--vscode-button-secondaryBackground': '#3a3d41',
    '--vscode-button-secondaryForeground': '#ffffff',
    '--vscode-button-secondaryHoverBackground': '#45494e',

    // Badges
    '--vscode-badge-background': '#4d4d4d',
    '--vscode-badge-foreground': '#ffffff',

    // Inputs
    '--vscode-input-background': '#3c3c3c',
    '--vscode-input-foreground': '#cccccc',
    '--vscode-input-border': '#3c3c3c',
    '--vscode-input-placeholderForeground': '#a6a6a6',
    '--vscode-inputValidation-errorBackground': '#5a1d1d',
    '--vscode-inputValidation-errorBorder': '#be1100',

    // Dropdowns
    '--vscode-dropdown-background': '#3c3c3c',
    '--vscode-dropdown-foreground': '#f0f0f0',
    '--vscode-dropdown-border': '#3c3c3c',

    // Lists
    '--vscode-list-activeSelectionBackground': '#094771',
    '--vscode-list-activeSelectionForeground': '#ffffff',
    '--vscode-list-hoverBackground': '#2a2d2e',
    '--vscode-list-inactiveSelectionBackground': '#37373d',

    // Editor widgets / hover / tabs / menu
    '--vscode-editorWidget-background': '#252526',
    '--vscode-editorWidget-foreground': '#cccccc',
    '--vscode-editorWidget-border': '#454545',
    '--vscode-editorHoverWidget-background': '#252526',
    '--vscode-editorHoverWidget-border': '#454545',
    '--vscode-editorGroupHeader-tabsBackground': '#252526',
    '--vscode-tab-activeBackground': '#1e1e1e',
    '--vscode-tab-activeForeground': '#ffffff',
    '--vscode-tab-inactiveForeground': '#ffffff80',
    '--vscode-menu-background': '#252526',
    '--vscode-menu-foreground': '#cccccc',
    '--vscode-menu-border': '#454545',
    '--vscode-menu-selectionBackground': '#094771',

    // Semantic colours
    '--vscode-editorError-foreground': '#f48771',
    '--vscode-editorWarning-foreground': '#cca700',
    '--vscode-editorWarning-background': 'rgba(204, 167, 0, 0.15)',
    '--vscode-editorInfo-foreground': '#3794ff',
    '--vscode-editorInfo-background': 'rgba(55, 148, 255, 0.15)',
    '--vscode-progressBar-background': '#0e70c0',
  },
};

/**
 * Keys that every variant entry MUST provide.
 * Derived from the union of keys across all variants so unit tests can
 * enforce structural parity between `light` and `dark`.
 */
export const REQUIRED_VS_CODE_KEYS: readonly string[] = Object.freeze(
  Array.from(
    new Set(
      Object.values(VS_CODE_TOKEN_MAP).flatMap((entry) => Object.keys(entry))
    )
  ).sort()
);
