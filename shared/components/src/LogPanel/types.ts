/**
 * Type definitions for the LogPanel component.
 *
 * Feature: 072-log-panel (E02, Phase 2)
 */

// Schema ParameterValue uses `value: string` (wire format); InputFeatureState uses
// snake_case `feature_id` (wire format).
import type { ParameterValue, InputFeatureState, ToolCategoryEnum } from '@debrief/schemas';
export type { ParameterValue, InputFeatureState };

/**
 * Feature 207: runtime map of tool ID → visual category (or null when the
 * tool declared no category / declared an invalid value). Consumed by
 * `resolveToolCategory()` to paint each Log Panel card's icon.
 *
 * `undefined` at the prop level means "manifest not yet loaded" — every
 * card renders the grey fallback until a map arrives.
 */
export type ToolCategoryMap = Readonly<Record<string, ToolCategoryEnum | null>>;

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
 *
 * `category` is nullable to accommodate the neutral-grey fallback for tools
 * that have no manifest entry yet.
 */
export interface ToolCategoryConfig {
  readonly category: ToolCategory | null;
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
  readonly isNonDefault: boolean;
  readonly unit?: string | null;
}

/**
 * View mode controlling card layout and detail level.
 * - timeline: full 3-row cards, newest-first
 * - by-feature: full 3-row cards, grouped by track
 * - compact: header + meta rows only
 * - detailed: full 3-row cards + used/generated feature lists
 */
export type ViewMode = 'timeline' | 'by-feature' | 'compact' | 'detailed';

/**
 * Valid ViewMode values for runtime validation.
 */
export const VALID_VIEW_MODES: readonly ViewMode[] = ['timeline', 'by-feature', 'compact', 'detailed'] as const;

/**
 * Semantic classification of a timeline entry, independent of its visual
 * category. Projected from the PROV-side `LogEntry.activity_type` field on
 * the LinkML schema (source of truth). Feature: 208-timeline-entry-kind.
 *
 * - 'snapshot': a distinguished moment in the session (manual checkpoint,
 *   future: manual snapshot button, rationale markers).
 * - 'tool':     an ordinary tool invocation.
 * - 'tune':     reserved for future standalone tune-action entries. No
 *   populator emits `'tune'` in feature 208 — it lands when a producer
 *   sets `activity_type: 'tune'` on the record.
 */
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';

/**
 * All values of TimelineEntryKind, for runtime enumeration (tests, fixtures,
 * documentation). Feature: 208-timeline-entry-kind.
 */
export const TIMELINE_ENTRY_KINDS: readonly TimelineEntryKind[] = [
  'snapshot',
  'tool',
  'tune',
] as const;

/**
 * Exhaustiveness guard. Call at the default branch of a switch/if-chain that
 * enumerates TimelineEntryKind values. Adding a new kind without handling it
 * surfaces as a type-check failure at this site.
 * Feature: 208-timeline-entry-kind.
 */
export function assertNeverKind(value: never): never {
  throw new Error(`Unhandled TimelineEntryKind: ${String(value)}`);
}

/**
 * Display-oriented timeline entry derived from LogEntry.
 *
 * T023: TimelineEntry is a UI projection, not a schema type. It carries
 * display-oriented fields (operationCategory, deleted, tuneAnnotation) that
 * are not present in the schema LogEntry. Kept as a local UI type.
 */
export interface TimelineEntry {
  activity_id: string;
  timestamp: string;
  toolName: string;
  tool_version: string;
  parameters: Record<string, ParameterValue>;
  usedFeatureIds: string[];
  generatedFeatureIds: string[];
  execution_duration: string;
  generated_result_id: string | null;
  operationCategory: OperationCategory;
  deleted?: boolean;
  disabled?: boolean;
  rationale?: string | null;
  tuneAnnotation?: { parameter: string; previous_value: unknown; new_value: unknown } | null;
  /** Pre-tool geometry for mutation tools — enables correct tune replay. */
  input_state?: InputFeatureState[] | null;
  /**
   * Semantic classification of this entry, independent of its visual category.
   * Populated by the VS Code host on every emitted entry from the PROV-side
   * `LogEntry.activity_type` signal. Optional only because Storybook fixtures
   * and legacy mocks may omit it; consumers treat `undefined` the same as
   * `'tool'` — there is no secondary tool-name fallback.
   * Feature: 208-timeline-entry-kind.
   */
  kind?: TimelineEntryKind;
}

/**
 * Feature display info for resolving names.
 */
export interface FeatureDisplayInfo {
  feature_id: string;
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

// --- Messages: Webview → Extension ---

export type LogPanelMessage =
  | { type: 'entry:select'; payload: { activity_id: string; featureIds: string[] } }
  | { type: 'entry:deselect' }
  | { type: 'action:invoke'; payload: { actionType: ActionType; activity_id: string } }
  | { type: 'mode:change'; payload: { viewMode: ViewMode } };

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
  viewMode: ViewMode;
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
 *
 * As of feature 199 this is also the canonical prop type for the
 * `LogTimeline` and `LogByFeature` view components — every field they
 * consume is declared here as optional. The child-only fields are
 * grouped at the bottom of this interface.
 */
export interface LogPanelProps {
  entries: TimelineEntry[];
  featureNames: Record<string, string>;
  viewMode: ViewMode;
  selectedEntryId: string | null;
  /** LogPanel root only — the inner views (LogTimeline / LogByFeature) ignore this. */
  filterState?: FilterState;
  /** LogPanel root only. */
  hasActiveSession?: boolean;
  /** LogPanel root only. */
  plotName?: string | null;
  /** LogPanel root only. */
  actionResultMessage?: string | null;
  /**
   * Feature 207: manifest-declared tool categories. When provided, card
   * icons render using `toolCategories[entry.toolName]`; otherwise every
   * icon falls back to neutral grey.
   */
  toolCategories?: ToolCategoryMap;
  onMessage?: (message: LogPanelMessage) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onFilterStateChange?: (state: FilterState) => void;
  onSelectedEntryChange?: (entryId: string | null) => void;
  replayProgress?: { current: number; total: number; currentToolId: string; phase: string } | null;
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

  // --- Fields previously held by per-view child prop interfaces. ---
  // Consolidated here per feature 199 (FR-004). All optional so no existing
  // LogPanel call site needs to change.
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
  onDeleteClick?: (activityId: string) => void;
  onRationaleChange?: (activityId: string, rationale: string) => void;
  onRetrySchema?: (toolId: string) => void;
}

/**
 * Props for the LogEntry component.
 */
export interface LogEntryProps {
  entry: TimelineEntry;
  featureNames: Record<string, string>;
  viewMode: ViewMode;
  isSelected: boolean;
  /**
   * Feature 207: manifest-declared tool categories. Forwarded to
   * `ToolCategoryIcon` for icon rendering.
   */
  toolCategories?: ToolCategoryMap;
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
  /**
   * Feature 207: manifest-declared tool categories. When provided, the icon
   * uses `toolCategories[toolName]`; otherwise falls back to grey.
   */
  toolCategories?: ToolCategoryMap;
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
