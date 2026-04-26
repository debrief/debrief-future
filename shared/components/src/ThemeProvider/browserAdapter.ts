/**
 * Browser-environment ThemeSource implementations.
 *
 * Used by Storybook, web-shell, and any non-VS-Code consumer that wants
 * the OS-level theme signal. Maps `prefers-color-scheme` and
 * `prefers-contrast` to one of the four explicit `ResolvedVariant`s.
 *
 * Feature: 220-fix-theme-responsiveness
 */

import type { ResolvedVariant, ThemeSource } from './ThemeSource';

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const CONTRAST_QUERY = '(prefers-contrast: more)';

function readVariantFromMediaQueries(): ResolvedVariant {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  const isDark = window.matchMedia(COLOR_SCHEME_QUERY).matches;
  const isHighContrast = window.matchMedia(CONTRAST_QUERY).matches;

  if (isHighContrast) {
    return isDark ? 'high-contrast-dark' : 'high-contrast-light';
  }
  return isDark ? 'dark' : 'light';
}

/**
 * `ThemeSource` driven by `prefers-color-scheme` + `prefers-contrast`.
 *
 * `subscribe()` listens for changes on both media queries and emits the
 * combined resolution. Identical back-to-back values are de-duplicated.
 */
export function mediaQuerySource(): ThemeSource {
  return {
    read(): ResolvedVariant {
      return readVariantFromMediaQueries();
    },

    subscribe(onChange: (variant: ResolvedVariant) => void): () => void {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }

      let lastEmitted: ResolvedVariant = readVariantFromMediaQueries();

      const emit = (): void => {
        const next = readVariantFromMediaQueries();
        if (next === lastEmitted) return;
        lastEmitted = next;
        onChange(next);
      };

      const colorScheme = window.matchMedia(COLOR_SCHEME_QUERY);
      const contrast = window.matchMedia(CONTRAST_QUERY);

      colorScheme.addEventListener('change', emit);
      contrast.addEventListener('change', emit);

      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        colorScheme.removeEventListener('change', emit);
        contrast.removeEventListener('change', emit);
      };
    },
  };
}

/**
 * `ThemeSource` that always reports a fixed variant. Useful for pinned
 * Storybook stories and unit tests that want to force a specific variant
 * regardless of the OS-level signal.
 */
export function staticSource(variant: ResolvedVariant): ThemeSource {
  return {
    read(): ResolvedVariant {
      return variant;
    },
    subscribe(): () => void {
      return () => {};
    },
  };
}
