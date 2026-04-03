import { ParameterValue, InputFeatureState } from '@debrief/schemas';

export type { ParameterValue, InputFeatureState };
/**
 * Operation category derived from tool ID.
 */
export type OperationCategory = 'calculation' | 'import' | 'property-edit' | 'export';
/**
 * Tool category for visual icon rendering. Feature: 176-log-panel-ux
 */
export type ToolCategory = 'import' | 'style' | 'calc' | 'filter' | 'snapshot';
/**
 * Parameter display type for chip icon selection. Feature: 176-log-panel-ux
 */
export type ParamType = 'colour' | 'number' | 'boolean' | 'range' | 'enum';
/**
 * Static config for a tool category's visual properties. Feature: 176-log-panel-ux
 */
export interface ToolCategoryConfig {
    readonly category: ToolCategory;
    readonly background: string;
    readonly glyph: string;
    readonly label: string;
}
/**
 * Data for rendering a parameter chip. Feature: 176-log-panel-ux
 */
export interface ParamChipData {
    readonly name: string;
    readonly value: unknown;
    readonly paramType: ParamType | null;
    readonly isDefault: boolean;
    readonly unit?: string | null;
}
/**
 * Presentation mode controlling entry detail level.
 * @deprecated Feature 176: Use ViewMode 'compact' | 'detailed' instead.
 */
export type PresentationMode = 'compact' | 'normal' | 'detailed';
/**
 * Unified view mode replacing ViewMode + PresentationMode.
 * Feature: 176-log-panel-ux
 * - timeline: full 3-row cards, newest-first
 * - by-feature: full 3-row cards, grouped by track
 * - compact: header + meta rows only
 * - detailed: full 3-row cards + used/generated feature lists
 */
export type ViewMode = 'timeline' | 'by-feature' | 'compact' | 'detailed';
/**
 * Valid ViewMode values for runtime validation (e.g. globalState migration).
 * Feature: 176-log-panel-ux
 */
export declare const VALID_VIEW_MODES: readonly ViewMode[];
/**
 * Display-oriented timeline entry derived from LogEntry.
 *
 * T023: TimelineEntry is a UI projection, not a schema type. It carries
 * display-oriented fields (operationCategory, deleted, tuneAnnotation) that
 * are not present in the schema LogEntry. Kept as a local UI type.
 */
export interface TimelineEntry {
    activityId: string;
    timestamp: string;
    toolName: string;
    toolVersion: string;
    parameters: Record<string, ParameterValue>;
    usedFeatureIds: string[];
    generatedFeatureIds: string[];
    executionDuration: string;
    generatedResultId: string | null;
    operationCategory: OperationCategory;
    deleted?: boolean;
    disabled?: boolean;
    rationale?: string | null;
    tuneAnnotation?: {
        parameter: string;
        previousValue: unknown;
        newValue: unknown;
    } | null;
    /** Pre-tool geometry for mutation tools — enables correct tune replay. */
    inputState?: InputFeatureState[] | null;
}
/**
 * Feature display info for resolving names.
 */
export interface FeatureDisplayInfo {
    featureId: string;
    displayName: string;
    exists: boolean;
}
/**
 * Filter state for narrowing timeline entries.
 */
export interface FilterState {
    searchText: string;
    toolType: string | null;
    operationCategory: OperationCategory | null;
    isExpanded: boolean;
}
/**
 * Default filter state.
 */
export declare const DEFAULT_FILTER_STATE: FilterState;
/**
 * Action types available in the action bar.
 * Feature 113: Tune removed (replaced by flip-card edit face).
 */
export type ActionType = 'revertTo' | 'revertThis' | 'snapshot' | 'rationale';
/**
 * Parameter schema entry describing a tool parameter's type and constraints.
 * Used by the flip-card edit face to render type-aware controls.
 * Feature: 113-prov-card-flip
 */
export interface ParameterSchemaEntry {
    readonly name: string;
    readonly type: 'number' | 'string' | 'boolean' | 'enum' | 'object' | 'array';
    readonly description: string | null;
    readonly tunable: boolean;
    readonly defaultValue: unknown;
    readonly minimum: number | null;
    readonly maximum: number | null;
    readonly step: number | null;
    readonly choices: ReadonlyArray<unknown> | null;
    readonly paramType: string | null;
}
/**
 * Replay status for a card during live editing.
 * Feature: 113-prov-card-flip
 */
export type CardReplayStatus = 'idle' | 'pending' | 'in-progress' | 'error';
export type LogPanelMessage = {
    type: 'entry:select';
    payload: {
        activityId: string;
        featureIds: string[];
    };
} | {
    type: 'entry:deselect';
} | {
    type: 'action:invoke';
    payload: {
        actionType: ActionType;
        activityId: string;
    };
} | {
    type: 'mode:change';
    payload: {
        viewMode: ViewMode;
    };
};
export interface TimelineUpdatePayload {
    entries: TimelineEntry[];
    featureNames: Record<string, string>;
}
export interface SessionChangePayload {
    hasActiveSession: boolean;
    plotName: string | null;
}
export interface SelectionUpdatePayload {
    featureIds: string[];
}
export interface ActionResultPayload {
    actionType: string;
    available: false;
    message: string;
}
export interface ModeInitPayload {
    viewMode: ViewMode;
}
export type ExtensionToWebviewMessage = {
    type: 'timeline:update';
    payload: TimelineUpdatePayload;
} | {
    type: 'session:change';
    payload: SessionChangePayload;
} | {
    type: 'selection:update';
    payload: SelectionUpdatePayload;
} | {
    type: 'action:result';
    payload: ActionResultPayload;
} | {
    type: 'mode:init';
    payload: ModeInitPayload;
} | {
    type: 'viewMode:init';
    payload: ModeInitPayload;
};
/**
 * Props for the LogPanel root component.
 */
export interface LogPanelProps {
    entries: TimelineEntry[];
    featureNames: Record<string, string>;
    /** @deprecated Use viewMode instead. Ignored when viewMode is set. */
    presentationMode?: PresentationMode;
    viewMode: ViewMode;
    selectedEntryId: string | null;
    filterState: FilterState;
    hasActiveSession: boolean;
    plotName: string | null;
    actionResultMessage: string | null;
    onMessage?: (message: LogPanelMessage) => void;
    /** @deprecated Use onViewModeChange instead. */
    onPresentationModeChange?: (mode: PresentationMode) => void;
    onViewModeChange?: (mode: ViewMode) => void;
    onFilterStateChange?: (state: FilterState) => void;
    onSelectedEntryChange?: (entryId: string | null) => void;
    replayProgress?: {
        current: number;
        total: number;
        currentToolId: string;
        phase: string;
    } | null;
    onTuneRequest?: (activityId: string, parameter: string, newValue: unknown) => void;
    onRevertToRequest?: (activityId: string) => void;
    onRevertThisRequest?: (activityId: string) => void;
    onRestoreRequest?: (activityId: string) => void;
    onReplayCancel?: () => void;
    /** Flip-card: request tool schema for edit face controls.
     *  May return void (VS Code integration pushes schema via message),
     *  or a Promise resolving to the schema array (web-shell / Storybook).
     *  Feature: 113 */
    onSchemaRequest?: (toolId: string) => void | Promise<ReadonlyArray<ParameterSchemaEntry>>;
    /** Flip-card: toggle entry disabled state. Feature: 113 */
    onDisableToggle?: (activityId: string, disabled: boolean) => void;
    /** Flip-card: update rationale text. Feature: 113 */
    onRationaleUpdate?: (activityId: string, rationale: string) => void;
    className?: string;
}
/**
 * Props for the LogEntry component.
 */
export interface LogEntryProps {
    entry: TimelineEntry;
    featureNames: Record<string, string>;
    viewMode: ViewMode;
    isSelected: boolean;
    onClick?: (entry: TimelineEntry) => void;
    onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
    onRestoreClick?: (entry: TimelineEntry) => void;
    /** Flip-card: whether this entry is in edit mode (flipped). Feature: 113 */
    isEditing?: boolean;
    /** Flip-card: callback to request edit mode (pencil icon click). Feature: 113 */
    onEditClick?: (entry: TimelineEntry) => void;
    /** Flip-card: callback when Done is clicked on the edit face. Feature: 113 */
    onDoneClick?: (entry: TimelineEntry) => void;
    /** Flip-card: tool parameter schema for the edit face (null while loading). Feature: 113 */
    schema?: ReadonlyArray<ParameterSchemaEntry> | null;
    /** Flip-card: whether the schema is currently loading. Feature: 113 */
    schemaLoading?: boolean;
    /** Flip-card: schema load error message. Feature: 113 */
    schemaError?: string | null;
    /** Flip-card: callback when a parameter value changes on the edit face. Feature: 113 */
    onParameterChange?: (activityId: string, parameterName: string, newValue: unknown) => void;
    /** Flip-card: callback to toggle disabled state. Feature: 113 */
    onDisableToggle?: (activityId: string, disabled: boolean) => void;
    /** Flip-card: callback to delete entry. Feature: 113 */
    onDeleteClick?: (activityId: string) => void;
    /** Flip-card: callback to update rationale. Feature: 113 */
    onRationaleChange?: (activityId: string, rationale: string) => void;
    /** Flip-card: callback to retry schema loading. Feature: 113 */
    onRetrySchema?: (toolId: string) => void;
    /** Flip-card: ref for rationale field auto-focus (from action bar). Feature: 113 */
    rationaleRef?: React.Ref<HTMLTextAreaElement>;
    /** Flip-card: current replay status for this card. Feature: 113 */
    replayStatus?: CardReplayStatus;
    /** Chronological step number (1 = oldest operation). */
    stepIndex?: number;
    className?: string;
}
/**
 * Props for the LogTimeline component.
 */
export interface LogTimelineProps {
    entries: TimelineEntry[];
    featureNames: Record<string, string>;
    viewMode: ViewMode;
    selectedEntryId: string | null;
    onEntryClick?: (entry: TimelineEntry) => void;
    onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
    onRestoreClick?: (entry: TimelineEntry) => void;
    /** Flip-card: currently editing entry ID. Feature: 113 */
    editingActivityId?: string | null;
    /** Flip-card: tool parameter schema for the editing entry. Feature: 113 */
    editingSchema?: ReadonlyArray<ParameterSchemaEntry> | null;
    /** Flip-card: whether the schema is loading. Feature: 113 */
    schemaLoading?: boolean;
    /** Flip-card: schema error message. Feature: 113 */
    schemaError?: string | null;
    /** Flip-card: ref for rationale field auto-focus. Feature: 113 */
    rationaleRef?: React.Ref<HTMLTextAreaElement>;
    /** Flip-card callbacks (pass-through). Feature: 113 */
    onEditClick?: (entry: TimelineEntry) => void;
    onDoneClick?: (entry: TimelineEntry) => void;
    onParameterChange?: (activityId: string, parameterName: string, newValue: unknown) => void;
    onDisableToggle?: (activityId: string, disabled: boolean) => void;
    onDeleteClick?: (activityId: string) => void;
    onRationaleChange?: (activityId: string, rationale: string) => void;
    onRetrySchema?: (toolId: string) => void;
    className?: string;
}
/**
 * Props for the LogByFeature component.
 */
export interface LogByFeatureProps {
    entries: TimelineEntry[];
    featureNames: Record<string, string>;
    viewMode: ViewMode;
    selectedEntryId: string | null;
    onEntryClick?: (entry: TimelineEntry) => void;
    onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
    onRestoreClick?: (entry: TimelineEntry) => void;
    /** Flip-card: currently editing entry ID. Feature: 113 */
    editingActivityId?: string | null;
    /** Flip-card: tool parameter schema for the editing entry. Feature: 113 */
    editingSchema?: ReadonlyArray<ParameterSchemaEntry> | null;
    /** Flip-card: whether the schema is loading. Feature: 113 */
    schemaLoading?: boolean;
    /** Flip-card: schema error message. Feature: 113 */
    schemaError?: string | null;
    /** Flip-card: ref for rationale field auto-focus. Feature: 113 */
    rationaleRef?: React.Ref<HTMLTextAreaElement>;
    /** Flip-card callbacks (pass-through). Feature: 113 */
    onEditClick?: (entry: TimelineEntry) => void;
    onDoneClick?: (entry: TimelineEntry) => void;
    onParameterChange?: (activityId: string, parameterName: string, newValue: unknown) => void;
    onDisableToggle?: (activityId: string, disabled: boolean) => void;
    onDeleteClick?: (activityId: string) => void;
    onRationaleChange?: (activityId: string, rationale: string) => void;
    onRetrySchema?: (toolId: string) => void;
    className?: string;
}
/**
 * Props for the LogFilterRow component.
 */
export interface LogFilterRowProps {
    filterState: FilterState;
    availableToolTypes: string[];
    onFilterChange: (state: FilterState) => void;
    className?: string;
}
/**
 * Props for the LogActionBar component.
 */
export interface LogActionBarProps {
    selectedEntryId: string | null;
    viewMode: ViewMode;
    onActionInvoke?: (actionType: ActionType, activityId: string) => void;
    onViewModeChange?: (mode: ViewMode) => void;
    className?: string;
}
/**
 * Props for the ToolCategoryIcon component. Feature: 176-log-panel-ux
 */
export interface ToolCategoryIconProps {
    toolName: string;
    size?: number;
    className?: string;
}
/**
 * Props for the ParameterChip component. Feature: 176-log-panel-ux
 */
export interface ParameterChipProps {
    chip: ParamChipData;
    className?: string;
}
/**
 * Props for the TrackBadge component. Feature: 176-log-panel-ux
 */
export interface TrackBadgeProps {
    name: string;
    exists: boolean;
    className?: string;
}
/**
 * Props for the SnapshotBoundary component.
 */
export interface SnapshotBoundaryProps {
    className?: string;
}
//# sourceMappingURL=types.d.ts.map