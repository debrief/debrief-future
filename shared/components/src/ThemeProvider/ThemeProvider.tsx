import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { ThemeContext, type Theme, type ThemeVariant, type ThemeContextValue } from './ThemeContext';
import { getThemeTokens, mergeThemeTokens, defaultTheme } from './defaultTheme';
import { VS_CODE_TOKEN_MAP, type VSCodeThemeVariant } from './vsCodeTokenMap';
import { vsCodeBodyClassSource, bodyClassToVariant } from './vsCodeAdapter';
import { mediaQuerySource } from './browserAdapter';
import type { ResolvedVariant, ThemeSource } from './ThemeSource';
import '../styles/tokens.css';

/**
 * Narrow "am I running inside a real VS Code webview?" check.
 *
 * Uses `acquireVsCodeApi` (only defined by the real webview host) — a
 * reliable signal with no false-positive mode. This is *not* the same
 * thing as "did VS Code apply a body class" — a Storybook iframe could
 * be made to sport a `vscode-dark` body class without `acquireVsCodeApi`,
 * and the synthetic `--vscode-*` injection should still happen there.
 */
function isRealVSCodeWebview(): boolean {
  return typeof window !== 'undefined' && 'acquireVsCodeApi' in window;
}

export interface ThemeProviderProps {
  /** Initial theme configuration */
  theme?: Theme;

  /** Child components */
  children: ReactNode;

  /** Container element to apply theme data attribute */
  container?: HTMLElement;

  /**
   * Override the auto-detected source.
   *
   * Default: `vsCodeBodyClassSource()` if a `vscode-*` body class is present
   * at mount, else `mediaQuerySource()`. Pinned tests / stories should pass
   * `staticSource(variant)` to opt out of live updates.
   */
  source?: ThemeSource;
}

/**
 * Apply theme tokens as CSS custom properties
 */
function applyThemeTokens(variant: ResolvedVariant, customTokens?: Theme['tokens']) {
  const tokens = mergeThemeTokens(getThemeTokens(variant), customTokens);

  // Apply to document root
  const root = document.documentElement;

  root.style.setProperty('--debrief-color-primary', tokens.colorPrimary);
  root.style.setProperty('--debrief-color-secondary', tokens.colorSecondary);
  root.style.setProperty('--debrief-color-success', tokens.colorSuccess);
  root.style.setProperty('--debrief-color-warning', tokens.colorWarning);
  root.style.setProperty('--debrief-color-danger', tokens.colorDanger);

  root.style.setProperty('--debrief-color-ownship', tokens.colorOwnship);
  root.style.setProperty('--debrief-color-contact', tokens.colorContact);
  root.style.setProperty('--debrief-color-reference', tokens.colorReference);
  root.style.setProperty('--debrief-color-solution', tokens.colorSolution);

  root.style.setProperty('--debrief-bg-primary', tokens.bgPrimary);
  root.style.setProperty('--debrief-bg-secondary', tokens.bgSecondary);
  root.style.setProperty('--debrief-bg-tertiary', tokens.bgTertiary);

  root.style.setProperty('--debrief-text-primary', tokens.textPrimary);
  root.style.setProperty('--debrief-text-secondary', tokens.textSecondary);
  root.style.setProperty('--debrief-text-muted', tokens.textMuted);

  root.style.setProperty('--debrief-border-color', tokens.borderColor);
  root.style.setProperty('--debrief-border-color-focus', tokens.borderColorFocus);

  root.style.setProperty('--debrief-selection-bg', tokens.selectionBg);
  root.style.setProperty('--debrief-selection-border', tokens.selectionBorder);
}

/**
 * Keys of the VS Code token map — used to clean up injected variables
 * before re-applying a new variant (prevents stale values from bleeding
 * between theme switches).
 */
const VS_CODE_TOKEN_KEYS: readonly string[] = Array.from(
  new Set(Object.values(VS_CODE_TOKEN_MAP).flatMap((entry) => Object.keys(entry)))
);

/**
 * Inject a synthetic set of `--vscode-*` CSS custom properties for the given
 * variant. Only runs outside a real VS Code webview, so production consumers
 * receive the real host-supplied values untouched.
 */
function applyVSCodeTokensForVariant(variant: ResolvedVariant): void {
  if (typeof document === 'undefined') return;
  if (isRealVSCodeWebview()) return;

  const root = document.documentElement;

  // Clean any previously-injected variables before re-applying the new
  // variant to prevent stale values bleeding between theme switches.
  for (const key of VS_CODE_TOKEN_KEYS) {
    root.style.removeProperty(key);
  }

  const variantMap = VS_CODE_TOKEN_MAP[variant as VSCodeThemeVariant];
  if (!variantMap) return;
  for (const [key, value] of Object.entries(variantMap)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Pick the default `ThemeSource` for the current environment.
 *
 * Inside a VS Code webview (signalled by a `vscode-*` body class), use
 * the body-class source. Otherwise, use the OS media-query source.
 */
function pickDefaultSource(): ThemeSource {
  if (typeof document !== 'undefined') {
    const variant = bodyClassToVariant(document.body.classList);
    if (variant !== null) return vsCodeBodyClassSource();
  }
  return mediaQuerySource();
}

/**
 * Resolve `'system'` to one of the four explicit variants by reading the
 * source synchronously.
 */
function resolveSystemFromSource(source: ThemeSource): ResolvedVariant {
  try {
    return source.read();
  } catch {
    return 'light';
  }
}

/**
 * ThemeProvider component that provides theming context to child components.
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={{ variant: 'dark' }}>
 *   <MapView features={data} />
 * </ThemeProvider>
 * ```
 *
 * @example
 * ```tsx
 * // Inside a VS Code webview — auto-detects body class:
 * <ThemeProvider source={vsCodeBodyClassSource()}>
 *   <Panel />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  theme: initialTheme,
  children,
  container,
  source: sourceProp,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? defaultTheme);

  // Stable per-instance source. Only re-built if the prop reference changes.
  const sourceRef = useRef<ThemeSource | null>(null);
  if (sourceRef.current === null) {
    sourceRef.current = sourceProp ?? pickDefaultSource();
  }
  // Keep source in sync if the caller passes a new one between renders.
  useEffect(() => {
    if (sourceProp && sourceRef.current !== sourceProp) {
      sourceRef.current = sourceProp;
    }
  }, [sourceProp]);

  // Source-derived variant (used when `theme.variant === 'system'`).
  const [sourceVariant, setSourceVariant] = useState<ResolvedVariant>(() =>
    resolveSystemFromSource(sourceRef.current!)
  );

  // Subscribe to source changes
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return;

    let cleanup: (() => void) | undefined;
    try {
      cleanup = source.subscribe((next) => setSourceVariant(next));
    } catch (err) {
      // Source failure is non-fatal — fall back to the most recent value.
      console.warn('ThemeProvider: source.subscribe() failed', err);
    }

    // If the source changed since first read, reflect it now.
    try {
      const current = source.read();
      setSourceVariant((prev) => (prev === current ? prev : current));
    } catch {
      // ignore — keep the previous value
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [sourceProp]);

  // Resolve the actual theme variant
  const resolvedVariant = useMemo<ResolvedVariant>(() => {
    if (theme.variant === 'system') {
      return sourceVariant;
    }
    return theme.variant;
  }, [theme.variant, sourceVariant]);

  // Apply theme to DOM
  useEffect(() => {
    const targetElement = container ?? document.documentElement;
    targetElement.setAttribute('data-theme', resolvedVariant);

    applyThemeTokens(resolvedVariant, theme.tokens);
    applyVSCodeTokensForVariant(resolvedVariant);

    return () => {
      // Clean up the data-theme attribute on unmount so a sibling
      // provider does not inherit a stale value.
      if (targetElement.getAttribute('data-theme') === resolvedVariant) {
        targetElement.removeAttribute('data-theme');
      }
    };
  }, [resolvedVariant, theme.tokens, container]);

  const setTheme = useCallback((value: Theme | ((prev: Theme) => Theme)) => {
    setThemeState((prev) => (typeof value === 'function' ? value(prev) : value));
  }, []);

  const isDark =
    resolvedVariant === 'dark' || resolvedVariant === 'high-contrast-dark';
  const isHighContrast =
    resolvedVariant === 'high-contrast-light' ||
    resolvedVariant === 'high-contrast-dark';

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedVariant,
      setTheme,
      isDark,
      isHighContrast,
    }),
    [theme, resolvedVariant, setTheme, isDark, isHighContrast]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Re-export ThemeVariant type for downstream consumers.
export type { ThemeVariant };
