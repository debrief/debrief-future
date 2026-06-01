import { MatchResult } from '../ToolMatch/types';
import { DebriefFeature } from '../utils/types';

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
export declare const DEFAULT_FILTER_STATE: FilterState;
/**
 * Build a featureTypes record from a list of kind strings, all enabled by default.
 * Merges with any existing state to preserve user toggles.
 */
export declare function buildFeatureTypes(kinds: string[], existing?: Record<string, boolean>): Record<string, boolean>;
/**
 * Check if any filter is active (differs from defaults).
 */
export declare function isFilterActive(state: FilterState): boolean;
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
    format: string;
    run: string;
    filter: string;
    associatedFiles: string;
    showHidden: string;
    hideHidden: string;
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
export declare const DEFAULT_LABELS: ToolbarLabels;
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
    onDelete?: (featureIds: string[]) => void;
    onToggleVisibility?: (featureIds: string[]) => void;
    /** Called when the format button is clicked with the selected feature IDs (Feature 097) */
    onFormat?: (featureIds: string[], anchorPosition: {
        x: number;
        y: number;
    }) => void;
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
//# sourceMappingURL=types.d.ts.map