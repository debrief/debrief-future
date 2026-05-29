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

// PersistentSessionState (the `.debrief-session` sidecar's on-disk shape) was
// removed in feature 261 together with the sidecar I/O. Plot state now lives in
// features.geojson as SystemState features + per-feature `visible` flags.

/**
 * State snapshot for undo/redo history.
 * UI-only fields — data changes tracked by Log Service (073-undo-redo-split).
 * `plot` is derived host-capability metadata (not analyst-authored) and so is
 * excluded from undo per spec #192 R-009.
 */
export type StateSnapshot = Omit<SessionState, 'document' | 'plot'>;
