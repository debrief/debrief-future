/**
 * Features state types for session state management.
 * Feature: 024-document-session-state
 */

import type { TimeInstant } from './temporal.js';
import { createTimeInstant } from './temporal.js';

/**
 * Set of selected feature identifiers with metadata (FR-017).
 *
 * Feature 053: featureIds accepts selection path strings — forward-slash-separated
 * segments following RFC 6901 escaping. A single-segment path (e.g., "track-001")
 * is a flat feature ID (backward compatible). Multi-segment paths identify child
 * elements (e.g., "track-001/positions/4").
 *
 * Schema equivalent: @debrief/schemas#FeatureSelection
 * Not migrated: generated FeatureSelection has primary as optional (primary?)
 * while this type uses explicit null (primary: string | null) for Zustand
 * store compatibility. The shapes are otherwise identical.
 */
export interface FeatureSelection {
  /** Selected feature paths (or flat IDs for backward compatibility) */
  featureIds: string[];
  /** Primary selection path for properties display */
  primary: string | null;
  /** When selection was made */
  timestamp: TimeInstant;
}

/**
 * Create an empty feature selection.
 */
export function createEmptySelection(): FeatureSelection {
  return {
    featureIds: [],
    primary: null,
    timestamp: createTimeInstant(Date.now()),
  };
}

/**
 * Create a feature selection from an array of IDs.
 */
export function createSelection(
  featureIds: string[],
  primary?: string
): FeatureSelection {
  return {
    featureIds,
    primary: primary ?? (featureIds.length > 0 ? featureIds[0]! : null),
    timestamp: createTimeInstant(Date.now()),
  };
}

/**
 * Features state slice (FR-016 through FR-019).
 *
 * Schema equivalent: @debrief/schemas#FeaturesSlice
 * Not migrated: generated FeaturesSlice lacks styleVersion (ephemeral UI
 * counter used to trigger re-renders on style changes, Feature 097). Also
 * uses optional hiddenFeatureIds (hiddenFeatureIds?) vs required array here.
 */
export interface FeaturesSlice {
  /** Reference to external feature collection (FR-016) */
  featureCollectionUri: string | null;
  /** Currently selected features (FR-017) */
  selection: FeatureSelection;
  /** Features hidden from display (FR-018) */
  hiddenFeatureIds: string[];
  /** Monotonic counter incremented on style changes to trigger re-renders (Feature 097) */
  styleVersion: number;
}

/**
 * Default features state values.
 */
export const DEFAULT_FEATURES_SLICE: FeaturesSlice = {
  featureCollectionUri: null,
  selection: createEmptySelection(),
  hiddenFeatureIds: [],
  styleVersion: 0,
};

/**
 * Features slice actions for state updates.
 */
export interface FeaturesActions {
  setFeatureCollectionUri: (uri: string | null) => void;
  setSelection: (featureIds: string[], primary?: string) => void;
  clearSelection: () => void;
  addToSelection: (featureIds: string[]) => void;
  removeFromSelection: (featureIds: string[]) => void;
  setHiddenFeatures: (featureIds: string[]) => void;
  hideFeatures: (featureIds: string[]) => void;
  showFeatures: (featureIds: string[]) => void;
  toggleFeatureVisibility: (featureId: string) => void;
  /** Increment style version to trigger re-renders after format changes (Feature 097) */
  notifyStyleChange: () => void;
}
