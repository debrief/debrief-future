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
 *   the resolved variant is one of the four explicit values and we are
 *   NOT inside a VS Code webview (where the host supplies the variables).
 *
 * Values sourced from VS Code's published `Default Light+`, `Default Dark+`,
 * `Default High Contrast Light`, and `Default High Contrast` themes (as of
 * VS Code ^1.85). Only keys actually used by components in
 * `shared/components/src/**\/*.css` are included — adding new VS Code
 * variables to component CSS requires adding them here too.
 *
 * Features: 209-logpanel-a11y-audit, 220-fix-theme-responsiveness
 */

export type VSCodeThemeVariant =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark';

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
  'high-contrast-light': {
    // Core
    '--vscode-foreground': '#292929',
    '--vscode-editor-foreground': '#292929',
    '--vscode-editor-background': '#ffffff',
    '--vscode-sideBar-background': '#ffffff',
    '--vscode-descriptionForeground': '#292929',
    '--vscode-errorForeground': '#B5200D',
    '--vscode-disabledForeground': '#7f7f7f',
    '--vscode-icon-foreground': '#0F4A85',
    '--vscode-focusBorder': '#006BBE',
    '--vscode-contrastBorder': '#0F4A85',
    '--vscode-widget-border': '#0F4A85',
    '--vscode-panel-border': '#0F4A85',
    '--vscode-textLink-foreground': '#0F4A85',

    // Font
    '--vscode-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Ubuntu', 'Droid Sans', sans-serif",
    '--vscode-font-size': '13px',
    '--vscode-editor-font-family': "'Menlo', 'Monaco', 'Courier New', monospace",

    // Buttons
    '--vscode-button-background': '#0F4A85',
    '--vscode-button-foreground': '#ffffff',
    '--vscode-button-hoverBackground': '#0F4A85',
    '--vscode-button-border': '#292929',
    '--vscode-button-secondaryBackground': '#ffffff',
    '--vscode-button-secondaryForeground': '#0F4A85',
    '--vscode-button-secondaryHoverBackground': '#cce4ff',

    // Badges
    '--vscode-badge-background': '#0F4A85',
    '--vscode-badge-foreground': '#ffffff',

    // Inputs
    '--vscode-input-background': '#ffffff',
    '--vscode-input-foreground': '#292929',
    '--vscode-input-border': '#0F4A85',
    '--vscode-input-placeholderForeground': '#7f7f7f',
    '--vscode-inputValidation-errorBackground': '#ffffff',
    '--vscode-inputValidation-errorBorder': '#B5200D',

    // Dropdowns
    '--vscode-dropdown-background': '#ffffff',
    '--vscode-dropdown-foreground': '#292929',
    '--vscode-dropdown-border': '#0F4A85',

    // Lists
    '--vscode-list-activeSelectionBackground': '#0F4A85',
    '--vscode-list-activeSelectionForeground': '#ffffff',
    '--vscode-list-hoverBackground': '#cce4ff',
    '--vscode-list-inactiveSelectionBackground': '#cce4ff',

    // Editor widgets / hover / tabs / menu
    '--vscode-editorWidget-background': '#ffffff',
    '--vscode-editorWidget-foreground': '#292929',
    '--vscode-editorWidget-border': '#0F4A85',
    '--vscode-editorHoverWidget-background': '#ffffff',
    '--vscode-editorHoverWidget-border': '#0F4A85',
    '--vscode-editorGroupHeader-tabsBackground': '#ffffff',
    '--vscode-tab-activeBackground': '#ffffff',
    '--vscode-tab-activeForeground': '#292929',
    '--vscode-tab-inactiveForeground': '#7f7f7f',
    '--vscode-menu-background': '#ffffff',
    '--vscode-menu-foreground': '#292929',
    '--vscode-menu-border': '#0F4A85',
    '--vscode-menu-selectionBackground': '#0F4A85',

    // Semantic colours
    '--vscode-editorError-foreground': '#B5200D',
    '--vscode-editorWarning-foreground': '#B5500D',
    '--vscode-editorWarning-background': 'rgba(181, 80, 13, 0.15)',
    '--vscode-editorInfo-foreground': '#0F4A85',
    '--vscode-editorInfo-background': 'rgba(15, 74, 133, 0.15)',
    '--vscode-progressBar-background': '#0F4A85',
  },
  'high-contrast-dark': {
    // Core
    '--vscode-foreground': '#ffffff',
    '--vscode-editor-foreground': '#ffffff',
    '--vscode-editor-background': '#000000',
    '--vscode-sideBar-background': '#000000',
    '--vscode-descriptionForeground': '#ffffff',
    '--vscode-errorForeground': '#F48771',
    '--vscode-disabledForeground': '#a5a5a5',
    '--vscode-icon-foreground': '#ffffff',
    '--vscode-focusBorder': '#F38518',
    '--vscode-contrastBorder': '#6FC3DF',
    '--vscode-widget-border': '#6FC3DF',
    '--vscode-panel-border': '#6FC3DF',
    '--vscode-textLink-foreground': '#3AA0F3',

    // Font
    '--vscode-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Ubuntu', 'Droid Sans', sans-serif",
    '--vscode-font-size': '13px',
    '--vscode-editor-font-family': "'Menlo', 'Monaco', 'Courier New', monospace",

    // Buttons
    '--vscode-button-background': '#000000',
    '--vscode-button-foreground': '#ffffff',
    '--vscode-button-hoverBackground': '#0a3458',
    '--vscode-button-border': '#6FC3DF',
    '--vscode-button-secondaryBackground': '#000000',
    '--vscode-button-secondaryForeground': '#ffffff',
    '--vscode-button-secondaryHoverBackground': '#0a3458',

    // Badges
    '--vscode-badge-background': '#000000',
    '--vscode-badge-foreground': '#ffffff',

    // Inputs
    '--vscode-input-background': '#000000',
    '--vscode-input-foreground': '#ffffff',
    '--vscode-input-border': '#6FC3DF',
    '--vscode-input-placeholderForeground': '#a5a5a5',
    '--vscode-inputValidation-errorBackground': '#000000',
    '--vscode-inputValidation-errorBorder': '#F48771',

    // Dropdowns
    '--vscode-dropdown-background': '#000000',
    '--vscode-dropdown-foreground': '#ffffff',
    '--vscode-dropdown-border': '#6FC3DF',

    // Lists
    '--vscode-list-activeSelectionBackground': '#f3a823',
    '--vscode-list-activeSelectionForeground': '#000000',
    '--vscode-list-hoverBackground': '#0a3458',
    '--vscode-list-inactiveSelectionBackground': '#0a3458',

    // Editor widgets / hover / tabs / menu
    '--vscode-editorWidget-background': '#000000',
    '--vscode-editorWidget-foreground': '#ffffff',
    '--vscode-editorWidget-border': '#6FC3DF',
    '--vscode-editorHoverWidget-background': '#000000',
    '--vscode-editorHoverWidget-border': '#6FC3DF',
    '--vscode-editorGroupHeader-tabsBackground': '#000000',
    '--vscode-tab-activeBackground': '#000000',
    '--vscode-tab-activeForeground': '#ffffff',
    '--vscode-tab-inactiveForeground': '#a5a5a5',
    '--vscode-menu-background': '#000000',
    '--vscode-menu-foreground': '#ffffff',
    '--vscode-menu-border': '#6FC3DF',
    '--vscode-menu-selectionBackground': '#f3a823',

    // Semantic colours
    '--vscode-editorError-foreground': '#F48771',
    '--vscode-editorWarning-foreground': '#FFD602',
    '--vscode-editorWarning-background': 'rgba(255, 214, 2, 0.15)',
    '--vscode-editorInfo-foreground': '#3AA0F3',
    '--vscode-editorInfo-background': 'rgba(58, 160, 243, 0.15)',
    '--vscode-progressBar-background': '#3AA0F3',
  },
};

/**
 * Keys that every variant entry MUST provide.
 * Derived from the union of keys across all variants so unit tests can
 * enforce structural parity between every variant.
 */
export const REQUIRED_VS_CODE_KEYS: readonly string[] = Object.freeze(
  Array.from(
    new Set(
      Object.values(VS_CODE_TOKEN_MAP).flatMap((entry) => Object.keys(entry))
    )
  ).sort()
);
