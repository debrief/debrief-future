import { DebriefFeature } from '../utils/types';
import { MatchResult } from '../ToolMatch/types';
import { AssociatedFile } from '../LayersToolbar/types';

/**
 * Collapse state for each section of the ActivityPanel.
 */
export interface ActivityPanelCollapseState {
    timeControllerCollapsed: boolean;
    toolsCollapsed: boolean;
    layersCollapsed: boolean;
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
}
/**
 * Props for the ToolsPanel component.
 */
export interface ToolsPanelProps {
    /** List of tools to display */
    tools: ToolsPanelItem[];
    /** Callback when a tool is run */
    onRunTool?: (toolId: string) => void;
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
};
/**
 * Props for the ActivityPanel component.
 */
export interface ActivityPanelProps {
    /** Time range [start, end] in milliseconds since epoch */
    timeExtent?: [number, number] | null;
    /** Current time position */
    currentTime?: number;
    /** Current playback state */
    playbackState?: 'playing' | 'paused';
    /** Playback speed multiplier */
    playbackSpeed?: 1 | 2 | 4 | 8 | 16 | 32 | 64;
    /** Track display mode */
    displayMode?: 'full' | 'trail';
    /** UI state for time controller */
    timeUiState?: 'empty' | 'loading' | 'ready';
    /** List of available tools */
    tools?: ToolsPanelItem[];
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
    /** Callback for messages sent to the host */
    onMessage?: (message: ActivityPanelMessage) => void;
    /** CSS class name */
    className?: string;
}
//# sourceMappingURL=types.d.ts.map