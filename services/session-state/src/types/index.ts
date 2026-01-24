/**
 * Session state types - main export module.
 * Feature: 024-document-session-state
 */

// Re-export all types
export * from './temporal.js';
export * from './spatial.js';
export * from './features.js';
export * from './document.js';

// Import for composite types
import type { TemporalSlice, TemporalActions } from './temporal.js';
import type { SpatialSlice, SpatialActions } from './spatial.js';
import type { FeaturesSlice, FeaturesActions } from './features.js';
import type { DocumentSlice, DocumentActions } from './document.js';

/**
 * Schema version for persistence compatibility (FR-026).
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Complete session state combining all slices (FR-001, FR-002).
 * This is the flat store structure used by Zustand.
 */
export type SessionStore = TemporalSlice &
  SpatialSlice &
  FeaturesSlice &
  DocumentSlice &
  TemporalActions &
  SpatialActions &
  FeaturesActions &
  DocumentActions & {
    /** Reset all state to defaults */
    reset: () => void;
  };

/**
 * Grouped session state for API responses and persistence.
 */
export interface SessionState {
  temporal: TemporalSlice;
  spatial: SpatialSlice;
  features: FeaturesSlice;
  document: DocumentSlice;
}

/**
 * Combined actions for all state slices.
 */
export interface SessionActions
  extends TemporalActions,
    SpatialActions,
    FeaturesActions,
    DocumentActions {
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
  spatial: SpatialSlice;
  features: FeaturesSlice;
}

/**
 * State snapshot for undo/redo history.
 * Only persistent state that should be tracked (FR-021).
 */
export type StateSnapshot = Omit<SessionState, 'document'> & {
  document: Pick<DocumentSlice, 'savePath'>;
};
