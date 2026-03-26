/**
 * Browser filter state types for the STAC browser's multi-axis filtering.
 * Feature: 132-three-view-sync
 *
 * This slice manages the metadata filter axis and active flags for spatial/temporal.
 * Spatial bounds (viewport) and temporal range (timeFilter) are already in
 * SpatialSlice and TemporalSlice respectively — no duplication needed.
 */

/**
 * Browser filter state fields.
 *
 * Schema equivalent: @debrief/schemas#BrowserFilterSlice
 * Not migrated: generated BrowserFilterSlice uses snake_case field names
 * (metadata_filtered_ids, metadata_expression, spatial_filter_active,
 * temporal_filter_active), uses string[] vs ReadonlySet<string> for
 * metadataFilteredIds, and serialises metadataExpression as a string rather
 * than Record<string, unknown>. These are structural divergences driven by
 * Zustand and JSON Schema limitations.
 */
export interface BrowserFilterSlice {
  /** Set of exercise IDs passing the current metadata filter. null = all pass. */
  readonly metadataFilteredIds: ReadonlySet<string> | null;

  /** CQL2 filter expression from the filter bar. Stored for debugging. null = none.
   * Uses Record<string, unknown> to avoid cross-package dependency on filter-engine. */
  readonly metadataExpression: Record<string, unknown> | null;

  /** Whether the map viewport is used as a spatial filter. */
  readonly spatialFilterActive: boolean;

  /** Whether the timeline range is used as a temporal filter. */
  readonly temporalFilterActive: boolean;
}

/**
 * Actions for the browser filter slice.
 */
export interface BrowserFilterActions {
  setMetadataFilteredIds: (ids: ReadonlySet<string> | null) => void;
  setMetadataExpression: (expression: Record<string, unknown> | null) => void;
  setSpatialFilterActive: (active: boolean) => void;
  setTemporalFilterActive: (active: boolean) => void;
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
