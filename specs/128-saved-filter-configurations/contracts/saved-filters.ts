/**
 * Contract types for Saved Filter Configurations (#128)
 *
 * These types define the public API surface for saving, loading,
 * and managing named filter configurations.
 *
 * Depends on: #127 filter-bar types (FilterBarState, FilterBarItem)
 */

import type { FilterBarState } from './filter-bar';

// --- Saved Filter Configuration ---

/** A named, persisted filter configuration */
export interface SavedFilterConfiguration {
  /** Unique identifier (UUID) */
  readonly id: string;
  /** User-provided or auto-generated display name */
  readonly name: string;
  /** Full filter bar state for UI restoration */
  readonly filterBarState: FilterBarState;
  /** CQL2 JSON representation for portability */
  readonly cql2Json: Record<string, unknown>;
  /** ISO 8601 timestamp of creation */
  readonly createdAt: string;
  /** ISO 8601 timestamp of last update */
  readonly updatedAt: string;
}

/** The persisted collection of saved filter configurations */
export interface SavedFiltersCollection {
  /** Schema version for future migration (starts at 1) */
  readonly version: number;
  /** Saved configurations, ordered by updatedAt descending */
  readonly configurations: readonly SavedFilterConfiguration[];
}

// --- Storage Interface ---

/** Platform-agnostic persistence interface for saved filters */
export interface SavedFiltersStorage {
  /** Load all saved filter configurations for the current workspace */
  load(): SavedFiltersCollection;
  /** Persist the full collection to storage */
  save(collection: SavedFiltersCollection): void;
}

// --- Hook Return Type ---

/** Return type of the useSavedFilters hook */
export interface UseSavedFiltersResult {
  /** All saved configurations, ordered newest first */
  readonly configurations: readonly SavedFilterConfiguration[];
  /** Save the current filter bar state as a named configuration */
  readonly saveConfiguration: (
    filterBarState: FilterBarState,
    cql2Json: Record<string, unknown>,
    name?: string,
  ) => void;
  /** Delete a saved configuration by ID */
  readonly deleteConfiguration: (id: string) => void;
  /** Check if a name already exists (for duplicate detection) */
  readonly nameExists: (name: string) => boolean;
  /** Overwrite an existing configuration (same ID, new state) */
  readonly overwriteConfiguration: (
    id: string,
    filterBarState: FilterBarState,
    cql2Json: Record<string, unknown>,
  ) => void;
}

// --- Component Props ---

/** Props for the SaveFilterButton component */
export interface SaveFilterButtonProps {
  /** Current filter bar state to save */
  readonly currentFilterBarState: FilterBarState;
  /** Current CQL2 JSON expression */
  readonly currentCql2Json: Record<string, unknown>;
  /** Whether the filter bar has active lozenges (enables/disables button) */
  readonly hasActiveFilters: boolean;
  /** Callback after a configuration is saved */
  readonly onSaved?: (config: SavedFilterConfiguration) => void;
}

/** Props for the HistoricFiltersDropdown component */
export interface HistoricFiltersDropdownProps {
  /** Saved configurations to display */
  readonly configurations: readonly SavedFilterConfiguration[];
  /** Called when the user selects a configuration to restore */
  readonly onRestore: (config: SavedFilterConfiguration) => void;
  /** Called when the user deletes a configuration */
  readonly onDelete: (id: string) => void;
}
