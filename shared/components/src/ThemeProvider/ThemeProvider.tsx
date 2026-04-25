import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useContext,
  type ReactNode,
} from 'react';
import { ThemeContext, defaultThemeContext, type Theme, type ThemeVariant, type ThemeContextValue } from './ThemeContext';
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
 * Apply theme tokens as CSS custom properties to a target element.
 *
 * When the target is `document.documentElement` (the default), values
 * cascade to the whole tree. When the target is a local wrapper (used by
 * nested providers — see `scoped` mode below), values are scoped to that
 * subtree, so an inner `<ThemeProvider variant='dark'>` inside an outer
 * `<ThemeProvider variant='light'>` no longer fights over global state.
 */
function applyThemeTokens(
  variant: ResolvedVariant,
  customTokens: Theme['tokens'] | undefined,
  target: HTMLElement,
): void {
  const tokens = mergeThemeTokens(getThemeTokens(variant), customTokens);

  target.style.setProperty('--debrief-color-primary', tokens.colorPrimary);
  target.style.setProperty('--debrief-color-secondary', tokens.colorSecondary);
  target.style.setProperty('--debrief-color-success', tokens.colorSuccess);
  target.style.setProperty('--debrief-color-warning', tokens.colorWarning);
  target.style.setProperty('--debrief-color-danger', tokens.colorDanger);

  target.style.setProperty('--debrief-color-ownship', tokens.colorOwnship);
  target.style.setProperty('--debrief-color-contact', tokens.colorContact);
  target.style.setProperty('--debrief-color-reference', tokens.colorReference);
  target.style.setProperty('--debrief-color-solution', tokens.colorSolution);

  target.style.setProperty('--debrief-bg-primary', tokens.bgPrimary);
  target.style.setProperty('--debrief-bg-secondary', tokens.bgSecondary);
  target.style.setProperty('--debrief-bg-tertiary', tokens.bgTertiary);

  target.style.setProperty('--debrief-text-primary', tokens.textPrimary);
  target.style.setProperty('--debrief-text-secondary', tokens.textSecondary);
  target.style.setProperty('--debrief-text-muted', tokens.textMuted);

  target.style.setProperty('--debrief-border-color', tokens.borderColor);
  target.style.setProperty('--debrief-border-color-focus', tokens.borderColorFocus);

  target.style.setProperty('--debrief-selection-bg', tokens.selectionBg);
  target.style.setProperty('--debrief-selection-border', tokens.selectionBorder);
}

const DEBRIEF_TOKEN_KEYS: readonly string[] = [
  '--debrief-color-primary',
  '--debrief-color-secondary',
  '--debrief-color-success',
  '--debrief-color-warning',
  '--debrief-color-danger',
  '--debrief-color-ownship',
  '--debrief-color-contact',
  '--debrief-color-reference',
  '--debrief-color-solution',
  '--debrief-bg-primary',
  '--debrief-bg-secondary',
  '--debrief-bg-tertiary',
  '--debrief-text-primary',
  '--debrief-text-secondary',
  '--debrief-text-muted',
  '--debrief-border-color',
  '--debrief-border-color-focus',
  '--debrief-selection-bg',
  '--debrief-selection-border',
];

function clearDebriefTokens(target: HTMLElement): void {
  for (const key of DEBRIEF_TOKEN_KEYS) {
    target.style.removeProperty(key);
  }
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
 * variant into `target`. Only runs outside a real VS Code webview, so
 * production consumers receive the real host-supplied values untouched.
 */
function applyVSCodeTokensForVariant(
  variant: ResolvedVariant,
  target: HTMLElement,
): void {
  if (typeof document === 'undefined') return;
  if (isRealVSCodeWebview()) return;

  for (const key of VS_CODE_TOKEN_KEYS) {
    target.style.removeProperty(key);
  }

  const variantMap = VS_CODE_TOKEN_MAP[variant as VSCodeThemeVariant];
  if (!variantMap) return;
  for (const [key, value] of Object.entries(variantMap)) {
    target.style.setProperty(key, value);
  }
}

function clearVSCodeTokens(target: HTMLElement): void {
  if (typeof document === 'undefined') return;
  if (isRealVSCodeWebview()) return;
  for (const key of VS_CODE_TOKEN_KEYS) {
    target.style.removeProperty(key);
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
 * **Nested providers**: when one `<ThemeProvider>` is mounted inside another,
 * the inner provider scopes ALL its DOM writes (data-theme, --debrief-*,
 * --vscode-*) to a local wrapper `<div>` instead of fighting with the outer
 * provider over `document.documentElement`. The CSS cascade then applies the
 * inner variant to its subtree only — perfect for Storybook stories that
 * pin a specific variant inside a toolbar-driven decorator.
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

  // If we're nested inside another ThemeProvider, scope our DOM writes to
  // a local wrapper element (a per-instance ref) instead of documentElement.
  const parentContext = useContext(ThemeContext);
  const isNested = parentContext !== defaultThemeContext;
  const scopeRef = useRef<HTMLDivElement>(null);

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
    let targetElement: HTMLElement;
    if (container) {
      targetElement = container;
    } else if (isNested) {
      const ref = scopeRef.current;
      if (!ref) return;
      targetElement = ref;
    } else {
      targetElement = document.documentElement;
    }

    targetElement.setAttribute('data-theme', resolvedVariant);
    applyThemeTokens(resolvedVariant, theme.tokens, targetElement);
    applyVSCodeTokensForVariant(resolvedVariant, targetElement);

    return () => {
      // Clean up: remove data-theme + clear inline style values so a
      // sibling provider does not inherit a stale state.
      if (targetElement.getAttribute('data-theme') === resolvedVariant) {
        targetElement.removeAttribute('data-theme');
      }
      if (isNested || container) {
        clearDebriefTokens(targetElement);
        clearVSCodeTokens(targetElement);
      }
    };
  }, [resolvedVariant, theme.tokens, container, isNested]);

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
      {isNested && !container ? (
        <div ref={scopeRef} style={{ display: 'contents' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

// Re-export ThemeVariant type for downstream consumers.
export type { ThemeVariant };
