import { DebriefFeature } from '../utils/types';
import { DisplayMode, PlaybackState } from '../../../schemas/src/generated/typescript/index.ts';
import { MatchResult, ToolParameter } from '../ToolMatch/types';
import { AssociatedFile } from '../LayersToolbar/types';
import { PropertiesCommitMessage } from '../PropertiesPanel/messageTypes';
import { PropertiesFormField } from '../PropertiesPanel/types';

/**
 * Collapse state for each section of the ActivityPanel.
 */
export interface ActivityPanelCollapseState {
    timeControllerCollapsed: boolean;
    toolsCollapsed: boolean;
    layersCollapsed: boolean;
    propertiesCollapsed: boolean;
}
/**
 * Default collapse state - all sections expanded.
 */
export declare const DEFAULT_COLLAPSE_STATE: ActivityPanelCollapseState;
/**
 * Item in the ToolsPanel list.
 */
export interface ToolsPanelItem {
    /** Unique identifier for the tool */
    id: string;
    /** Display name */
    name: string;
    /** Brief description of what the tool does */
    description: string;
    /** Whether the tool is applicable to the current selection */
    applicable: boolean;
    /** Explanation when tool is not applicable (optional) */
    explanation?: string;
    /** Configurable parameters with type metadata */
    parameters?: ToolParameter[];
}
/**
 * Props for the ToolsPanel component.
 */
export interface ToolsPanelProps {
    /** List of tools to display */
    tools: ToolsPanelItem[];
    /** Whether the tool inventory has been loaded (false = calc service unavailable) */
    hasToolInventory?: boolean;
    /** Whether features are currently selected */
    hasSelection?: boolean;
    /** Callback when a tool is run, with optional collected parameters */
    onRunTool?: (toolId: string, params?: Record<string, unknown>) => void;
    /** CSS class name */
    className?: string;
}
/**
 * Messages sent from ActivityPanel to the host (VS Code extension).
 */
export type ActivityPanelMessage = {
    type: 'temporal:seek';
    payload: {
        time: number;
    };
} | {
    type: 'temporal:play';
    payload: {
        rate: number;
    };
} | {
    type: 'temporal:pause';
} | {
    type: 'temporal:displayMode';
    payload: {
        mode: 'full' | 'trail';
    };
} | {
    type: 'tool:run';
    payload: {
        toolId: string;
        params?: Record<string, unknown>;
    };
} | {
    type: 'layer:toggleVisibility';
    payload: {
        featureIds: string[];
    };
} | {
    type: 'layer:delete';
    payload: {
        featureIds: string[];
    };
} | {
    type: 'layer:select';
    payload: {
        featureIds: string[];
    };
} | {
    type: 'layer:format';
    payload: {
        featureIds: string[];
        property: string;
        value: string | number | boolean;
        isPointOverride?: boolean;
        positionIndex?: number;
        childType?: string;
    };
} | {
    type: 'file:action';
    payload: {
        file: AssociatedFile;
        action: 'open' | 'openWith' | 'reveal' | 'delete';
    };
} | PropertiesCommitMessage;
/**
 * Props for the ActivityPanel component.
 */
export interface ActivityPanelProps {
    /** Time range [start, end] in milliseconds since epoch */
    timeExtent?: [number, number] | null;
    /** Current time position */
    currentTime?: number;
    /** Current playback state — widened to the canonical three-state vocabulary in Feature 205 */
    playbackState?: PlaybackState;
    /** Playback speed multiplier */
    playbackSpeed?: 1 | 2 | 4 | 8 | 16 | 32 | 64;
    /** Track display mode */
    displayMode?: DisplayMode;
    /** UI state for time controller */
    timeUiState?: 'empty' | 'loading' | 'ready';
    /** List of available tools */
    tools?: ToolsPanelItem[];
    /** Whether the tool inventory has been loaded */
    hasToolInventory?: boolean;
    /** Whether features are currently selected */
    hasToolSelection?: boolean;
    /** Features to display in the layers list */
    features?: DebriefFeature[];
    /** IDs of selected features */
    selectedFeatureIds?: string[];
    /** IDs of hidden features */
    hiddenIds?: Set<string>;
    /** Tool match results for features */
    toolMatches?: MatchResult[];
    /** Source files for Associated Files dropdown */
    sourceFiles?: AssociatedFile[];
    /** Result files for Associated Files dropdown */
    resultFiles?: AssociatedFile[];
    /** Whether new results were added (shows halo on attachments button) */
    resultsChanged?: boolean;
    /** Current collapse state for all sections */
    collapseState?: ActivityPanelCollapseState;
    /** Callback when collapse state changes */
    onCollapseStateChange?: (state: ActivityPanelCollapseState) => void;
    /** Fields to render in the Properties section. Hydrated host-side from item.properties + JSON Schema. */
    propertiesFields?: PropertiesFormField[];
    /** True while the open plot's item.json / schema is still loading. */
    propertiesLoading?: boolean;
    /** True when the item.json is on a read-only filesystem. */
    propertiesReadOnly?: boolean;
    /** Last write error to surface as a banner above the Properties form. Cleared on next successful commit. */
    propertiesWriteError?: string | null;
    /** Absolute path to the STAC store root for the open plot — used when emitting commit messages. */
    openItemStorePath?: string;
    /** Relative path (from storePath) to the item.json for the open plot. */
    openItemPath?: string;
    /** Callback for messages sent to the host */
    onMessage?: (message: ActivityPanelMessage) => void;
    /** CSS class name */
    className?: string;
}
//# sourceMappingURL=types.d.ts.map