/**
 * Type definitions for the StacBrowser component.
 * Feature: 132-three-view-sync
 */

import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine/types';
import type { PropertiesCommitMessage } from '../PropertiesPanel/messageTypes';
import type { LLMClient, EnumBundle } from '../nl-cql2';

/**
 * Messages sent from the StacBrowser surface to the host (VS Code extension).
 * Today only the Properties Panel surface sends messages; further variants
 * will be added as the StacBrowser grows.
 */
export type StacBrowserMessage = PropertiesCommitMessage;

/**
 * Props for the StacBrowser component.
 */
export interface StacBrowserProps {
  /** Full list of exercises in the catalog (unfiltered). */
  readonly items: readonly StacBrowserItem[];

  /** Vessel taxonomy tree for hierarchical filter dropdowns. */
  readonly taxonomy: readonly VesselTaxonomyNode[];

  /** Callback when user double-clicks an exercise to open it. */
  readonly onItemSelect?: (itemPath: string) => void;

  /**
   * Callback fired when the preview highlight changes (T098 / backlog #191).
   * Used by hosts to drive a Properties side panel fed off the currently
   * highlighted item rather than the open plot. Null when no item is
   * highlighted.
   */
  readonly onItemHighlight?: (itemPath: string | null) => void;

  /**
   * Optional React node rendered under the thumbnail inside the right pane
   * of the exercises list. When set, stacks the thumbnail (top) and this
   * node (bottom) with a simple vertical split. Typically used to render
   * a `<PropertiesSidePanel>` that edits the currently-highlighted item.
   */
  readonly propertiesSlot?: import('react').ReactNode;

  /** Additional CSS class name for the root container. */
  readonly className?: string;

  /** Map from item ID to CSS colour string (for colour scheme engine). */
  readonly colorMap?: ReadonlyMap<string, string>;

  /**
   * Optional NL-search client (#191 T049). When both `llmClient` and
   * `nlEnums` are provided, the embedded FilterBar routes Enter through
   * the NL → CQL2 pipeline. The host (e.g. VS Code's Catalog Overview
   * webview) owns the client; passing the prop is a pure relay here.
   */
  readonly llmClient?: LLMClient;
  readonly nlEnums?: EnumBundle;
  readonly liveModeLabel?: string;
}

/**
 * Return type of the useBrowserFilter hook.
 */
export interface BrowserFilterResult {
  /**
   * Items passing all active filter axes (metadata AND spatial AND temporal).
   * This array is passed to list and map views.
   */
  readonly filteredItems: readonly StacBrowserItem[];

  /**
   * Items passing metadata + spatial filters only (NOT temporal).
   * Used by the TimelineView so it can show all spatially-visible items
   * without circular dependency on its own temporal zoom.
   */
  readonly spatialFilteredItems: readonly StacBrowserItem[];

  /**
   * Number of active filter axes (0–3).
   * Useful for UI indicators ("3 filters active").
   */
  readonly activeFilterCount: number;

  /**
   * Whether zero items match the current filters.
   * When true, all views should show the "no matches" state.
   */
  readonly hasNoResults: boolean;

  /** Clear all browser filters (metadata + spatial + temporal). */
  readonly clearAllFilters: () => void;
}
