/**
 * Type definitions for the StacBrowser component (#132).
 *
 * StacBrowser is the top-level orchestrator that composes
 * FilterBar, ExerciseListView, MapView, and TimelineView
 * with synchronized filter state.
 */

import type { StacBrowserItem, VesselTaxonomyNode } from '../filter-engine/types';

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

  /** Additional CSS class name for the root container. */
  readonly className?: string;

  /** Map from item ID to CSS colour string (for colour scheme engine). */
  readonly colorMap?: ReadonlyMap<string, string>;
}

/**
 * Return type of the useBrowserFilter hook.
 */
export interface BrowserFilterResult {
  /**
   * Items passing all active filter axes (metadata AND spatial AND temporal).
   * This array is passed to all child views.
   */
  readonly filteredItems: readonly StacBrowserItem[];

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
