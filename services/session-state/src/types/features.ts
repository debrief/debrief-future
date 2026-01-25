/**
 * Features state types for session state management.
 * Feature: 024-document-session-state
 */

import type { TimeInstant } from './temporal.js';
import { createTimeInstant } from './temporal.js';

/**
 * Set of selected feature identifiers with metadata (FR-017).
 */
export interface FeatureSelection {
  /** Selected feature IDs */
  featureIds: string[];
  /** Primary selection for properties display */
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
    primary: primary ?? (featureIds.length > 0 ? featureIds[0] : null),
    timestamp: createTimeInstant(Date.now()),
  };
}

/**
 * Features state slice (FR-016 through FR-019).
 */
export interface FeaturesSlice {
  /** Reference to external feature collection (FR-016) */
  featureCollectionUri: string | null;
  /** Currently selected features (FR-017) */
  selection: FeatureSelection;
  /** Features hidden from display (FR-018) */
  hiddenFeatureIds: string[];
}

/**
 * Default features state values.
 */
export const DEFAULT_FEATURES_SLICE: FeaturesSlice = {
  featureCollectionUri: null,
  selection: createEmptySelection(),
  hiddenFeatureIds: [],
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
}
