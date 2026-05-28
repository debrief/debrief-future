/**
 * Session state types - main export module.
 * Feature: 024-document-session-state
 */

// Re-export all types
export * from './temporal.js';
export * from './spatial.js';
export * from './features.js';
export * from './document.js';
export * from './results.js';
export * from './browser-filter.js';
export * from './plot.js';

// Import for composite types
import type { TemporalSlice, TemporalActions } from './temporal.js';
import type { SpatialSlice, SpatialActions } from './spatial.js';
import type { FeaturesSlice, FeaturesActions } from './features.js';
import type { DocumentSlice, DocumentActions } from './document.js';
import type { ResultsSlice, ResultsActions } from './results.js';
import type { BrowserFilterSlice, BrowserFilterActions } from './browser-filter.js';
import type { PlotSlice, PlotActions } from './plot.js';

/**
 * Schema version for persistence compatibility (FR-026).
 *
 * Bumped to 1.1.0 by feature 203 (spatial types consolidation): ViewportPolygon
 * coordinates switch from tuple form `[lon, lat]` to object form
 * `{ longitude, latitude }`, handled inline at load time by `coerceViewport`.
 */
export const SCHEMA_VERSION = '1.1.0';

/**
 * Complete session state combining all slices (FR-001, FR-002).
 * This is the flat store structure used by Zustand.
 */
export type SessionStore = TemporalSlice &
  SpatialSlice &
  FeaturesSlice &
  DocumentSlice &
  ResultsSlice &
  BrowserFilterSlice &
  PlotSlice &
  TemporalActions &
  SpatialActions &
  FeaturesActions &
  DocumentActions &
  ResultsActions &
  BrowserFilterActions &
  PlotActions & {
    /** Reset all state to defaults */
    reset: () => void;
  };

/**
 * Grouped session state for API responses and persistence.
 *
 * Schema equivalent: @debrief/schemas#SessionState
 * Not migrated: generated SessionState includes schemaVersion and lacks the
 * results slice. The slice types themselves also differ (see individual slice
 * comments). @debrief/schemas is not in this package's dependencies.
 */
export interface SessionState {
  temporal: TemporalSlice;
  spatial: SpatialSlice;
  features: FeaturesSlice;
  document: DocumentSlice;
  results: ResultsSlice;
  plot: PlotSlice;
}

/**
 * Combined actions for all state slices.
 */
export interface SessionActions
  extends TemporalActions,
    SpatialActions,
    FeaturesActions,
    DocumentActions,
    ResultsActions,
    PlotActions {
  /** Reset all state to defaults */
  reset: () => void;
}

/**
 * Persistent state - what gets saved to file (FR-024).
 * Excludes ephemeral fields: playbackState, dirty, undo/redo stacks.
 */
export interface PersistentSessionState {
  schemaVersion: string;
  savedAt: string;
  temporal: Omit<TemporalSlice, 'playbackState'>;
  // Spec 260: ephemeral spatial fields (viewportLocked + the pre-existing
  // drawingMode / drawingPaletteIndex) are excluded structurally per
  // Constitution Article IV.5. Adding another ephemeral spatial field is a
  // one-line edit here; tsc enforces that extractPersistentState does not
  // re-introduce them at the boundary.
  spatial: Omit<
    SpatialSlice,
    'viewportLocked' | 'drawingMode' | 'drawingPaletteIndex'
  >;
  features: FeaturesSlice;
}

/**
 * State snapshot for undo/redo history.
 * UI-only fields — data changes tracked by Log Service (073-undo-redo-split).
 * `plot` is derived host-capability metadata (not analyst-authored) and so is
 * excluded from undo per spec #192 R-009.
 */
export type StateSnapshot = Omit<SessionState, 'document' | 'plot'>;
