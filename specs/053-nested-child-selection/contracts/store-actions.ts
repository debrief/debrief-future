/**
 * Store Actions Contract — Selection Path Support
 *
 * Feature: 053-nested-child-selection
 * Module: services/session-state
 *
 * Documents the changes to existing store actions and any new actions
 * needed to support selection paths. The existing action signatures
 * DO NOT CHANGE — only their documented semantics are widened.
 */

import type { FeatureSelection } from './selection-path';

// ─── Existing Actions (semantics widened, signatures unchanged) ──────

/**
 * setSelection — now accepts selection paths in addition to flat IDs.
 *
 * @param featureIds - Array of selection path strings (or flat IDs)
 * @param primary - Optional primary path. If omitted, first path is primary.
 *
 * Paths are normalised before storage (trailing slash stripped).
 * Invalid paths (empty, structurally malformed) are silently filtered.
 */
export interface SetSelectionAction {
  (featureIds: string[], primary?: string): void;
}

/**
 * addToSelection — adds paths to existing selection.
 * Duplicate paths are not added.
 * Primary is preserved; set to first new path if previously null.
 */
export interface AddToSelectionAction {
  (featureIds: string[]): void;
}

/**
 * removeFromSelection — removes paths from selection.
 * Exact string match required (no parent/child inference).
 * If primary is removed, falls back to first remaining path or null.
 */
export interface RemoveFromSelectionAction {
  (featureIds: string[]): void;
}

/**
 * clearSelection — unchanged. Clears all paths.
 */
export interface ClearSelectionAction {
  (): void;
}

// ─── New Selectors ───────────────────────────────────────────────────

/**
 * Get unique root feature IDs from the current selection.
 * Extracts root from each selection path, deduplicates.
 *
 * Example: selection = ["track-001/positions/4", "track-001", "track-002/positions/7"]
 * Result:  ["track-001", "track-002"]
 */
export interface SelectedRootIdsSelector {
  (): string[];
}

/**
 * Get selection paths that belong to a specific root feature.
 *
 * Example: selection = ["track-001/positions/4", "track-001", "track-002/positions/7"]
 * getPathsForRoot("track-001") → ["track-001/positions/4", "track-001"]
 */
export interface PathsForRootSelector {
  (rootId: string): string[];
}

/**
 * Check if a specific path (or any child of a root) is selected.
 */
export interface IsPathSelectedSelector {
  (path: string): boolean;
}

/**
 * Check if any child of a root feature is selected.
 */
export interface HasChildSelectionSelector {
  (rootId: string): boolean;
}
