/**
 * Contract: BrowserFilterSlice — Zustand store slice for browser-level filter state.
 * Feature: 132-three-view-sync
 *
 * This slice manages the metadata filter axis. Spatial and temporal axes
 * are already managed by SpatialSlice.viewport and TemporalSlice.timeFilter.
 */

import type { FilterExpression } from '../../../shared/components/src/filter-engine/types';

/**
 * Browser filter state fields.
 *
 * The metadata axis is managed here; spatial and temporal axes
 * are read from existing SpatialSlice and TemporalSlice.
 */
export interface BrowserFilterSlice {
  /**
   * Set of exercise IDs that pass the current metadata filter.
   * null = no metadata filter active (all items pass).
   */
  readonly metadataFilteredIds: ReadonlySet<string> | null;

  /**
   * The CQL2 filter expression from the filter bar.
   * Stored for persistence and debugging. null = no expression.
   */
  readonly metadataExpression: FilterExpression | null;

  /**
   * Whether the map viewport is used as a spatial filter.
   * Becomes true on first viewport event from StacBrowser.
   */
  readonly spatialFilterActive: boolean;

  /**
   * Whether the timeline range is used as a temporal filter.
   * Becomes true when the user adjusts the timeline range handles.
   */
  readonly temporalFilterActive: boolean;
}

/**
 * Actions for the browser filter slice.
 */
export interface BrowserFilterActions {
  /** Update the set of IDs passing metadata filter. null = clear. */
  setMetadataFilteredIds: (ids: ReadonlySet<string> | null) => void;

  /** Update the CQL2 expression (for persistence/debugging). */
  setMetadataExpression: (expression: FilterExpression | null) => void;

  /** Enable or disable spatial filtering. */
  setSpatialFilterActive: (active: boolean) => void;

  /** Enable or disable temporal filtering. */
  setTemporalFilterActive: (active: boolean) => void;

  /** Reset all browser filters to defaults (clear all axes). */
  clearAllBrowserFilters: () => void;
}

/**
 * Default values for the browser filter slice.
 */
export const DEFAULT_BROWSER_FILTER_SLICE: BrowserFilterSlice = {
  metadataFilteredIds: null,
  metadataExpression: null,
  spatialFilterActive: false,
  temporalFilterActive: false,
};
