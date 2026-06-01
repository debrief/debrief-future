import { Theme } from './ThemeContext';
import { ResolvedVariant, ThemeSource } from './ThemeSource';

/**
 * Pure boundary translator: read the VS Code body class, return a variant.
 *
 * Order in the lookup matters — VS Code applies BOTH `vscode-dark` and
 * `vscode-high-contrast` together for the high-contrast-dark theme, so
 * the high-contrast classes must be checked before the basic ones.
 *
 * Returns `null` when no `vscode-*` body class is present (the only
 * signal for "we are not inside a VS Code webview"). Callers MUST NOT
 * call `read()` and get a fictional variant back.
 *
 * Pure: does not write to the DOM.
 */
export declare function bodyClassToVariant(classList: DOMTokenList): ResolvedVariant | null;
/**
 * Check if running in a VS Code webview environment.
 *
 * Strict-by-default: returns true only if the `<body>` carries one of
 * the `vscode-*` classes that VS Code itself applies. This avoids the
 * false-positive trap where computed-style probing of a synthetic
 * `--vscode-editor-background` (injected by Storybook's decorator)
 * incorrectly reports "yes, we're in VS Code".
 */
export declare function isVSCodeEnvironment(): boolean;
/**
 * Extract VS Code theme tokens from CSS variables.
 */
export declare function extractVSCodeTokens(): Record<string, string>;
/**
 * Apply VS Code theme tokens to document.
 * Copies VS Code CSS variables to Debrief CSS variables.
 */
export declare function applyVSCodeTokens(): void;
/**
 * Construct a `ThemeSource` driven by VS Code's body class + the
 * `vscode-theme-changed` postMessage relay.
 *
 * `subscribe()` wires:
 *   1. A `MutationObserver` on `<body>`'s `class` attribute.
 *   2. A `window.message` listener for `vscode-theme-changed` events
 *      from the extension host (sent by `themeRelay.ts`).
 *
 * Cleanup is idempotent: safe to call multiple times. Identical
 * back-to-back values are de-duplicated before reaching `onChange`.
 */
export declare function vsCodeBodyClassSource(): ThemeSource;
/**
 * Detect if VS Code is in dark mode.
 *
 * Prefer reading the body class via `bodyClassToVariant` — this fall-through
 * via `extractVSCodeTokens` is retained for legacy callers only.
 */
export declare function isVSCodeDarkMode(): boolean;
/**
 * Create a VS Code-adapted theme configuration.
 *
 * Returns a `Theme` whose variant is the resolved body-class variant
 * (one of the four explicit values). The legacy `'vscode'` variant is
 * retired (#220).
 */
export declare function createVSCodeTheme(): Theme;
/**
 * Set up VS Code theme synchronisation (legacy callable form).
 *
 * Thin wrapper around `vsCodeBodyClassSource()` that preserves the
 * pre-#220 callsite signature. New code should consume the source
 * directly so multiple subscribers can share one observer.
 *
 * @returns Cleanup function to remove listeners
 */
export declare function setupVSCodeThemeSync(onThemeChange: (theme: Theme) => void): () => void;
//# sourceMappingURL=vsCodeAdapter.d.ts.map