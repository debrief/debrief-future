/**
 * BrowserSelectionContext — surface-local React context exposing the STAC
 * browser's currently selected item path. Scoped to the StacBrowser (no global
 * session-state slice per FR-007 + Decision 2).
 *
 * Phase 1 scaffold. Real provider + hook land in T061 (Phase 4).
 */

import React from 'react';

export interface BrowserSelection {
  selectedItemPath: string | null;
  setSelectedItemPath: (path: string | null) => void;
}

export const BrowserSelectionContext =
  React.createContext<BrowserSelection | null>(null);

export interface BrowserSelectionProviderProps {
  children: React.ReactNode;
}

export function BrowserSelectionProvider(
  _props: BrowserSelectionProviderProps,
): React.ReactElement {
  throw new Error('BrowserSelectionProvider: placeholder — implemented in T061');
}

export function useBrowserSelection(): BrowserSelection {
  throw new Error('useBrowserSelection: placeholder — implemented in T061');
}
