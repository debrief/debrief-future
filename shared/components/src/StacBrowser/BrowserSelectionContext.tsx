/**
 * BrowserSelectionContext — surface-local React context exposing the STAC
 * browser's currently selected item path. Scoped to the StacBrowser (no global
 * session-state slice per FR-007 + Decision 2).
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
  initialSelectedItemPath?: string | null;
  /** Optional controlled-component hook — when set, Provider forwards instead of owning state. */
  value?: BrowserSelection;
}

export function BrowserSelectionProvider({
  children,
  initialSelectedItemPath = null,
  value,
}: BrowserSelectionProviderProps): React.ReactElement {
  const [selectedItemPath, setSelectedItemPath] = React.useState<string | null>(
    initialSelectedItemPath,
  );
  const owned = React.useMemo<BrowserSelection>(
    () => ({ selectedItemPath, setSelectedItemPath }),
    [selectedItemPath],
  );
  const delivered = value ?? owned;
  return (
    <BrowserSelectionContext.Provider value={delivered}>
      {children}
    </BrowserSelectionContext.Provider>
  );
}

export function useBrowserSelection(): BrowserSelection {
  const ctx = React.useContext(BrowserSelectionContext);
  if (!ctx) {
    throw new Error(
      'useBrowserSelection: must be used inside <BrowserSelectionProvider>',
    );
  }
  return ctx;
}
