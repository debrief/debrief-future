/**
 * Type definitions for the LogPanel component.
 *
 * Feature: 072-log-panel (E02, Phase 2)
 */

/**
 * Operation category derived from tool ID.
 */
export type OperationCategory = 'calculation' | 'import' | 'property-edit' | 'export';

/**
 * Presentation mode controlling entry detail level.
 */
export type PresentationMode = 'compact' | 'normal' | 'detailed';

/**
 * View mode for the timeline.
 */
export type ViewMode = 'timeline' | 'by-feature';

/**
 * Typed parameter value with metadata.
 */
export interface ParameterValue {
  value: unknown;
  default: boolean;
  tunable: boolean;
}

/** Pre-tool feature state for mutation tools (mirrors session-state InputFeatureState). */
export interface InputFeatureState {
  featureId: string;
  geometry: unknown;
  properties: Record<string, unknown> | null;
}

/**
 * Display-oriented timeline entry derived from LogEntry.
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
  tuneAnnotation?: { parameter: string; previousValue: unknown; newValue: unknown } | null;
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
export const DEFAULT_FILTER_STATE: FilterState = {
  searchText: '',
  toolType: null,
  operationCategory: null,
  isExpanded: false,
};

/**
 * Action types available in the action bar.
 */
export type ActionType = 'tune' | 'revertTo' | 'revertThis' | 'snapshot' | 'rationale';

// --- Messages: Webview → Extension ---

export type LogPanelMessage =
  | { type: 'entry:select'; payload: { activityId: string; featureIds: string[] } }
  | { type: 'entry:deselect' }
  | { type: 'action:invoke'; payload: { actionType: ActionType; activityId: string } }
  | { type: 'mode:change'; payload: { presentationMode: PresentationMode } };

// --- Messages: Extension → Webview ---

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
  presentationMode: PresentationMode;
}

export type ExtensionToWebviewMessage =
  | { type: 'timeline:update'; payload: TimelineUpdatePayload }
  | { type: 'session:change'; payload: SessionChangePayload }
  | { type: 'selection:update'; payload: SelectionUpdatePayload }
  | { type: 'action:result'; payload: ActionResultPayload }
  | { type: 'mode:init'; payload: ModeInitPayload };

// --- Component Props ---

/**
 * Props for the LogPanel root component.
 */
export interface LogPanelProps {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  presentationMode: PresentationMode;
  viewMode: ViewMode;
  selectedEntryId: string | null;
  filterState: FilterState;
  hasActiveSession: boolean;
  plotName: string | null;
  actionResultMessage: string | null;
  onMessage?: (message: LogPanelMessage) => void;
  onPresentationModeChange?: (mode: PresentationMode) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onFilterStateChange?: (state: FilterState) => void;
  onSelectedEntryChange?: (entryId: string | null) => void;
  replayProgress?: { current: number; total: number; currentToolId: string; phase: string } | null;
  onTuneRequest?: (activityId: string, parameter: string, newValue: unknown) => void;
  onRevertToRequest?: (activityId: string) => void;
  onRevertThisRequest?: (activityId: string) => void;
  onRestoreRequest?: (activityId: string) => void;
  onReplayCancel?: () => void;
  className?: string;
}

/**
 * Props for the LogEntry component.
 */
export interface LogEntryProps {
  entry: TimelineEntry;
  featureNames: Record<string, string>;
  presentationMode: PresentationMode;
  isSelected: boolean;
  onClick?: (entry: TimelineEntry) => void;
  onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
  onRestoreClick?: (entry: TimelineEntry) => void;
  className?: string;
}

/**
 * Props for the LogTimeline component.
 */
export interface LogTimelineProps {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  presentationMode: PresentationMode;
  selectedEntryId: string | null;
  onEntryClick?: (entry: TimelineEntry) => void;
  onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
  onRestoreClick?: (entry: TimelineEntry) => void;
  className?: string;
}

/**
 * Props for the LogByFeature component.
 */
export interface LogByFeatureProps {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  presentationMode: PresentationMode;
  selectedEntryId: string | null;
  onEntryClick?: (entry: TimelineEntry) => void;
  onTuneClick?: (entry: TimelineEntry, parameterName: string) => void;
  onRestoreClick?: (entry: TimelineEntry) => void;
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
  presentationMode: PresentationMode;
  onActionInvoke?: (actionType: ActionType, activityId: string) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onPresentationModeChange?: (mode: PresentationMode) => void;
  className?: string;
}

/**
 * Props for the SnapshotBoundary component.
 */
export interface SnapshotBoundaryProps {
  className?: string;
}
