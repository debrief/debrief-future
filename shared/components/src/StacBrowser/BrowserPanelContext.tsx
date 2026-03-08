/**
 * Context for passing StacBrowser filter state into GoldenLayout panels.
 *
 * GoldenLayout panels receive only PanelProps (container, panelId, isPopout).
 * This context bridges the gap, providing filtered items and callbacks
 * so that List/Map/Timeline panels can read browser state.
 */

import { createContext, useContext } from 'react';
import type { StacBrowserItem } from '../filter-engine/types';
import type { ExerciseListItem } from '../ExerciseListView';

export interface BrowserPanelContextValue {
  /** Items after all filter axes applied. */
  readonly filteredItems: readonly StacBrowserItem[];
  /** ExerciseListView-compatible items (with trackDataHref). */
  readonly listItems: readonly ExerciseListItem[];
  /** Callback when user selects an item. */
  readonly onItemSelect?: (itemPath: string) => void;
}

export const BrowserPanelContext = createContext<BrowserPanelContextValue | null>(null);

export function useBrowserPanelContext(): BrowserPanelContextValue {
  const ctx = useContext(BrowserPanelContext);
  if (!ctx) {
    throw new Error('useBrowserPanelContext must be used inside <BrowserPanelContext.Provider>');
  }
  return ctx;
}
