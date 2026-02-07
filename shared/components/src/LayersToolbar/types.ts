/**
 * Types for the LayersToolbar module.
 */

import type { MatchResult } from '../ToolMatch/types';
import type { DebriefFeature } from '../utils/types';

/**
 * Filter state representing all active filters in the FilterDropdown.
 */
export interface FilterState {
  /** Text search query */
  textQuery: string;
  /** Which fields to search */
  searchScope: {
    name: boolean;
    type: boolean;
    platform: boolean;
    attachments: boolean;
  };
  /** Feature type (kind) visibility — keys are the `kind` values found in features */
  featureTypes: Record<string, boolean>;
  /** Visibility filter */
  visibility: 'all' | 'hidden-only' | 'visible-only';
  /** Temporal range filter */
  temporal: {
    before: string | null;
    after: string | null;
  };
}

/**
 * Default filter state with no filters active.
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  textQuery: '',
  searchScope: {
    name: true,
    type: true,
    platform: true,
    attachments: false,
  },
  featureTypes: {},
  visibility: 'all',
  temporal: {
    before: null,
    after: null,
  },
};

/**
 * Build a featureTypes record from a list of kind strings, all enabled by default.
 * Merges with any existing state to preserve user toggles.
 */
export function buildFeatureTypes(
  kinds: string[],
  existing: Record<string, boolean> = {},
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const kind of kinds) {
    result[kind] = existing[kind] ?? true;
  }
  return result;
}

/**
 * Check if any filter is active (differs from defaults).
 */
export function isFilterActive(state: FilterState): boolean {
  if (state.textQuery !== '') return true;
  if (state.visibility !== 'all') return true;
  if (state.temporal.before !== null || state.temporal.after !== null) return true;
  // Any kind unchecked counts as active filter
  for (const v of Object.values(state.featureTypes)) {
    if (!v) return true;
  }
  return false;
}

/**
 * Associated file from STAC item sources or results folder.
 */
export interface AssociatedFile {
  /** Display name */
  name: string;
  /** Path relative to STAC item */
  path: string;
  /** Source or result */
  category: 'source' | 'result';
  /** Parsed from multi-suffix convention (e.g., '2d', 'table') */
  viewerType?: string;
  /** File format (e.g., 'json', 'geojson', 'csv') */
  format?: string;
  /** File modification time (epoch ms) for chronological ordering */
  mtime?: number;
}

/**
 * Externalisable label strings for the toolbar.
 */
export interface ToolbarLabels {
  delete: string;
  toggleVisibility: string;
  run: string;
  filter: string;
  associatedFiles: string;
  showHidden: string;
  hideHidden: string;
  // Filter dropdown
  searchPlaceholder: string;
  searchScopeName: string;
  searchScopeType: string;
  searchScopePlatform: string;
  searchScopeAttachments: string;
  /** Section title for kind checkboxes */
  featureTypesTitle: string;
  visibilityAll: string;
  visibilityHiddenOnly: string;
  visibilityVisibleOnly: string;
  temporalAfter: string;
  temporalBefore: string;
  applySelectAll: string;
  applySelectMatched: string;
  applyAddMatched: string;
  applyRemoveMatched: string;
  clearAllFilters: string;
  // Run dropdown
  fileCategory: string;
  editCategory: string;
  viewCategory: string;
  analysisCategory: string;
  noToolsAvailable: string;
  exportSelection: string;
  exportGeoJSON: string;
  exportCSV: string;
  duplicate: string;
  rename: string;
  lockUnlock: string;
  zoomToSelection: string;
  panToFeature: string;
  centerMap: string;
  // Associated files
  sources: string;
  results: string;
  open: string;
  openWith: string;
  revealInExplorer: string;
  deleteFile: string;
  provenanceWarning: string;
  noFiles: string;
}

/**
 * Default English labels.
 */
export const DEFAULT_LABELS: ToolbarLabels = {
  delete: 'Delete',
  toggleVisibility: 'Toggle Visibility',
  run: 'Run',
  filter: 'Filter',
  associatedFiles: 'Associated Files',
  searchPlaceholder: 'Search features...',
  searchScopeName: 'Name',
  searchScopeType: 'Type',
  searchScopePlatform: 'Platform',
  searchScopeAttachments: 'Attachments',
  featureTypesTitle: 'Feature types',
  visibilityAll: 'All',
  visibilityHiddenOnly: 'Hidden only',
  visibilityVisibleOnly: 'Visible only',
  temporalAfter: 'Features after',
  temporalBefore: 'Features before',
  applySelectAll: 'Select all',
  applySelectMatched: 'Select matched',
  applyAddMatched: 'Add matched to selection',
  applyRemoveMatched: 'Remove matched from selection',
  clearAllFilters: 'Clear all filters',
  fileCategory: 'File',
  editCategory: 'Edit',
  viewCategory: 'View',
  analysisCategory: 'Analysis',
  noToolsAvailable: 'No tools available',
  exportSelection: 'Export Selection',
  exportGeoJSON: 'Export to GeoJSON',
  exportCSV: 'Export to CSV',
  duplicate: 'Duplicate',
  rename: 'Rename',
  lockUnlock: 'Lock/Unlock',
  zoomToSelection: 'Zoom to Selection',
  panToFeature: 'Pan to Feature',
  centerMap: 'Center Map',
  sources: 'Sources',
  results: 'Results',
  open: 'Open',
  openWith: 'Open With...',
  revealInExplorer: 'Reveal in Explorer',
  deleteFile: 'Delete',
  provenanceWarning: 'Warning: Removing source data breaks provenance chain',
  noFiles: 'No files',
  showHidden: 'Show hidden features',
  hideHidden: 'Hide hidden features',
};

/** File action types for Associated Files context menu */
export type FileAction = 'open' | 'openWith' | 'reveal' | 'delete';

/** Selection apply action types */
export type SelectionApplyAction = 'selectAll' | 'select' | 'add' | 'remove';

/**
 * Props for the FilterDropdown component.
 */
export interface FilterDropdownProps {
  /** Sorted list of unique kind values from the current features */
  featureKinds: string[];
  /** Current filter state */
  filterState: FilterState;
  /** Called when any filter changes */
  onFilterChange: (state: FilterState) => void;
  /** Called when apply-to-selection action is triggered */
  onApplyToSelection?: (action: SelectionApplyAction) => void;
  /** Whether any filter is currently active (enables filter-dependent actions) */
  hasActiveFilter?: boolean;
  /** Whether all features are already selected (disables Select All) */
  allSelected?: boolean;
  /** Externalisable labels */
  labels?: Partial<ToolbarLabels>;
}

/**
 * Props for the RunDropdown component.
 */
export interface RunDropdownProps {
  /** Tool match results for current selection */
  toolMatches: MatchResult[];
  /** Currently selected feature IDs */
  selectedFeatureIds: string[];
  /** Called when a tool is selected */
  onRunTool: (toolId: string, featureIds: string[]) => void;
  /** Called when a static action is selected */
  onRunAction?: (actionId: string, featureIds: string[]) => void;
  /** Externalisable labels */
  labels?: Partial<ToolbarLabels>;
}

/**
 * Props for the AssociatedFilesDropdown component.
 */
export interface AssociatedFilesDropdownProps {
  /** Source files */
  sourceFiles: AssociatedFile[];
  /** Result files */
  resultFiles: AssociatedFile[];
  /** Called when a file action is performed */
  onFileAction: (file: AssociatedFile, action: FileAction) => void;
  /** Externalisable labels */
  labels?: Partial<ToolbarLabels>;
}

/**
 * Props for the LayersToolbar component.
 */
export interface LayersToolbarProps {
  /** Currently selected feature IDs */
  selectedFeatureIds: string[];
  /** All features in the current plot */
  features: DebriefFeature[];
  /** Set of hidden feature IDs (determines visibility icon state) */
  hiddenIds?: Set<string>;
  /** Tool match results for current selection */
  toolMatches?: MatchResult[];
  /** Associated source files */
  sourceFiles?: AssociatedFile[];
  /** Associated result files */
  resultFiles?: AssociatedFile[];
  /** Whether tool matches changed since last dropdown open */
  toolsChanged?: boolean;
  /** Whether new results were added since last dropdown open */
  resultsChanged?: boolean;
  /** Current filter state */
  filterState?: FilterState;
  /** Whether hidden features are shown in the list (default true) */
  showHidden?: boolean;

  // Callbacks
  onDelete?: (featureIds: string[]) => void;
  onToggleVisibility?: (featureIds: string[]) => void;
  onRunTool?: (toolId: string, featureIds: string[]) => void;
  onRunAction?: (actionId: string, featureIds: string[]) => void;
  onFilterChange?: (filterState: FilterState) => void;
  onShowHiddenChange?: (show: boolean) => void;
  onApplyToSelection?: (action: SelectionApplyAction) => void;
  onFileAction?: (file: AssociatedFile, action: FileAction) => void;
  /** Called when a dropdown is opened (parent can reset change flags) */
  onDropdownOpened?: (dropdown: 'run' | 'associated') => void;

  /** Externalisable labels */
  labels?: Partial<ToolbarLabels>;
  /** Additional CSS class */
  className?: string;
}
