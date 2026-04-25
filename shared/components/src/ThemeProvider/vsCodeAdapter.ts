import type { Theme } from './ThemeContext';
import type { ResolvedVariant, ThemeSource } from './ThemeSource';

/**
 * VS Code CSS variable mappings to Debrief tokens.
 * Maps VS Code's built-in theme variables to our component tokens.
 */
const VS_CODE_VARIABLE_MAP: Record<string, string> = {
  // Colors
  '--vscode-editor-background': '--debrief-bg-primary',
  '--vscode-editor-foreground': '--debrief-text-primary',
  '--vscode-sideBar-background': '--debrief-bg-secondary',
  '--vscode-sideBar-foreground': '--debrief-text-secondary',
  '--vscode-list-activeSelectionBackground': '--debrief-selection-bg',
  '--vscode-list-activeSelectionForeground': '--debrief-selection-text',
  '--vscode-list-hoverBackground': '--debrief-hover-bg',
  '--vscode-focusBorder': '--debrief-focus-ring',
  '--vscode-contrastBorder': '--debrief-border-color',
  '--vscode-widget-border': '--debrief-border-color-light',
  '--vscode-button-background': '--debrief-button-bg',
  '--vscode-button-foreground': '--debrief-button-text',
  '--vscode-button-hoverBackground': '--debrief-button-hover-bg',
  '--vscode-badge-background': '--debrief-badge-bg',
  '--vscode-badge-foreground': '--debrief-badge-text',
  '--vscode-scrollbarSlider-background': '--debrief-scrollbar-thumb',
  '--vscode-scrollbarSlider-hoverBackground': '--debrief-scrollbar-thumb-hover',
  '--vscode-scrollbarSlider-activeBackground': '--debrief-scrollbar-thumb-active',

  // Font
  '--vscode-font-family': '--debrief-font-family',
  '--vscode-font-size': '--debrief-font-size',
  '--vscode-editor-font-family': '--debrief-font-family-mono',
};

/**
 * Body-class → variant boundary table.
 *
 * Maps VS Code's `<body>` class to the canonical `ResolvedVariant`.
 * Order matches the contracts/theme-source.md §3 R2 mapping. Adding a
 * new VS Code theme kind requires extending this table and re-running
 * the assertion suite.
 */
const BODY_CLASS_TO_VARIANT: Readonly<Record<string, ResolvedVariant>> = Object.freeze({
  'vscode-high-contrast-light': 'high-contrast-light',
  'vscode-high-contrast': 'high-contrast-dark',
  'vscode-light': 'light',
  'vscode-dark': 'dark',
});

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
export function bodyClassToVariant(classList: DOMTokenList): ResolvedVariant | null {
  for (const cls of Object.keys(BODY_CLASS_TO_VARIANT)) {
    if (classList.contains(cls)) return BODY_CLASS_TO_VARIANT[cls]!;
  }
  return null;
}

/**
 * Check if running in a VS Code webview environment.
 *
 * Strict-by-default: returns true only if the `<body>` carries one of
 * the `vscode-*` classes that VS Code itself applies. This avoids the
 * false-positive trap where computed-style probing of a synthetic
 * `--vscode-editor-background` (injected by Storybook's decorator)
 * incorrectly reports "yes, we're in VS Code".
 */
export function isVSCodeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if ('acquireVsCodeApi' in window) return true;
  if (typeof document === 'undefined') return false;
  return bodyClassToVariant(document.body.classList) !== null;
}

/**
 * Extract VS Code theme tokens from CSS variables.
 */
export function extractVSCodeTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const computedStyle = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = {};

  // Map VS Code variables to our token names
  for (const [vsCodeVar, debriefVar] of Object.entries(VS_CODE_VARIABLE_MAP)) {
    const value = computedStyle.getPropertyValue(vsCodeVar).trim();
    if (value) {
      // Convert --debrief-token-name to tokenName
      const tokenName = debriefVar
        .replace('--debrief-', '')
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      tokens[tokenName] = value;
    }
  }

  return tokens;
}

/**
 * Apply VS Code theme tokens to document.
 * Copies VS Code CSS variables to Debrief CSS variables.
 */
export function applyVSCodeTokens(): void {
  if (typeof window === 'undefined') return;

  const computedStyle = getComputedStyle(document.documentElement);
  const root = document.documentElement;

  for (const [vsCodeVar, debriefVar] of Object.entries(VS_CODE_VARIABLE_MAP)) {
    const value = computedStyle.getPropertyValue(vsCodeVar).trim();
    if (value) {
      root.style.setProperty(debriefVar, value);
    }
  }
}

/**
 * Read the active VS Code variant from the body class. Falls back to
 * `'dark'` when no `vscode-*` class is present (consumer should not
 * mount this source in that case — see `bodyClassToVariant` above).
 */
function readVariantFromBody(): ResolvedVariant {
  if (typeof document === 'undefined') return 'dark';
  return bodyClassToVariant(document.body.classList) ?? 'dark';
}

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
export function vsCodeBodyClassSource(): ThemeSource {
  return {
    read(): ResolvedVariant {
      return readVariantFromBody();
    },

    subscribe(onChange: (variant: ResolvedVariant) => void): () => void {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => {};
      }

      let lastEmitted: ResolvedVariant = readVariantFromBody();

      const emit = (next: ResolvedVariant): void => {
        if (next === lastEmitted) return;
        lastEmitted = next;
        onChange(next);
      };

      const observer = new MutationObserver(() => {
        const next = bodyClassToVariant(document.body.classList);
        if (next !== null) emit(next);
      });

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });

      const messageHandler = (event: MessageEvent<unknown>): void => {
        const data = event.data;
        if (
          typeof data === 'object' &&
          data !== null &&
          (data as { type?: unknown }).type === 'vscode-theme-changed'
        ) {
          // Re-read from body class — VS Code updates the class before
          // dispatching the message, so the body class is the source of truth.
          const next = bodyClassToVariant(document.body.classList);
          if (next !== null) emit(next);
        }
      };

      window.addEventListener('message', messageHandler);

      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        observer.disconnect();
        window.removeEventListener('message', messageHandler);
      };
    },
  };
}

/**
 * Detect if VS Code is in dark mode.
 *
 * Prefer reading the body class via `bodyClassToVariant` — this fall-through
 * via `extractVSCodeTokens` is retained for legacy callers only.
 */
export function isVSCodeDarkMode(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const variant = bodyClassToVariant(document.body.classList);
  if (variant !== null) {
    return variant === 'dark' || variant === 'high-contrast-dark';
  }

  const computedStyle = getComputedStyle(document.documentElement);
  const bgColor = computedStyle.getPropertyValue('--vscode-editor-background').trim();

  if (!bgColor) return false;

  const hexMatch = bgColor.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch && hexMatch[1]) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  return true;
}

/**
 * Create a VS Code-adapted theme configuration.
 *
 * Returns a `Theme` whose variant is the resolved body-class variant
 * (one of the four explicit values). The legacy `'vscode'` variant is
 * retired (#220).
 */
export function createVSCodeTheme(): Theme {
  const tokens = extractVSCodeTokens();
  const variant = readVariantFromBody();

  return {
    variant,
    tokens,
  };
}

/**
 * Set up VS Code theme synchronisation (legacy callable form).
 *
 * Thin wrapper around `vsCodeBodyClassSource()` that preserves the
 * pre-#220 callsite signature. New code should consume the source
 * directly so multiple subscribers can share one observer.
 *
 * @returns Cleanup function to remove listeners
 */
export function setupVSCodeThemeSync(onThemeChange: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  applyVSCodeTokens();

  const source = vsCodeBodyClassSource();
  return source.subscribe(() => {
    applyVSCodeTokens();
    onThemeChange(createVSCodeTheme());
  });
}
