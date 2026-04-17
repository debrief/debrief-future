/**
 * StacBrowser — top-level orchestrator for synchronized STAC catalog browsing.
 * Feature: 132-three-view-sync
 */

export { StacBrowser } from './StacBrowser';
export type { StacBrowserProps, BrowserFilterResult, StacBrowserMessage } from './types';

// Surface-local context + Properties side panel (#193 / backlog #191).
export {
  BrowserSelectionContext,
  BrowserSelectionProvider,
  useBrowserSelection,
} from './BrowserSelectionContext';
export type {
  BrowserSelection,
  BrowserSelectionProviderProps,
} from './BrowserSelectionContext';

export { PropertiesSidePanel } from './PropertiesSidePanel';
export type { PropertiesSidePanelProps } from './PropertiesSidePanel';
