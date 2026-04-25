/**
 * Shared `<ThemeProvider>` wrapper for every Debrief webview entry.
 *
 * Wraps `children` in `<ThemeProvider source={vsCodeBodyClassSource()}>`.
 * Reads the initial variant from `document.body`'s `vscode-*` class at
 * mount and subscribes to live changes via the body-class MutationObserver
 * + the `vscode-theme-changed` postMessage relay (FR-009, FR-010).
 *
 * Every webview entry under `apps/vscode/src/webview/web/` MUST mount its
 * root React tree inside `<Bootstrap>` (SC-007). No webview may render
 * without a `ThemeProvider` ancestor.
 *
 * Feature: 220-fix-theme-responsiveness
 */

import React, { useMemo, type ReactNode } from 'react';
import { ThemeProvider, vsCodeBodyClassSource } from '@debrief/components';

export interface BootstrapProps {
  /** Children to render inside the theme context. */
  children: ReactNode;
}

/**
 * Shared root wrapper. Locates a single `vsCodeBodyClassSource` per mount
 * (the source is itself stateless — every call returns a fresh subscription).
 */
export function Bootstrap({ children }: BootstrapProps): React.ReactElement {
  // Construct the source once per mount so multiple subscribers (in the
  // unlikely event of a remount) do not pile up observers.
  const source = useMemo(() => vsCodeBodyClassSource(), []);

  return (
    <ThemeProvider theme={{ variant: 'system' }} source={source}>
      <div data-testid="debrief-webview-root" style={{ height: '100%' }}>
        {children}
      </div>
    </ThemeProvider>
  );
}

// Re-export the hook for convenience so webview consumers can import
// `useTheme` from the same module that wires the provider.
export { useTheme } from '@debrief/components';

export default Bootstrap;
