/**
 * LogPanel module — public API.
 * Feature: 072-log-panel (E02, Phase 2)
 * Updated: 113-prov-card-flip (flip-card components)
 * Updated: 176-log-panel-ux (rich card UX, unified ViewMode)
 */

export { LogPanel } from './LogPanel';
export type {
  LogPanelProps,
  LogEntryProps,
  LogFilterRowProps,
  LogActionBarProps,
  SnapshotBoundaryProps,
  TimelineEntry,
  InputFeatureState,
  OperationCategory,
  ViewMode,
  FilterState,
  ParameterValue,
  FeatureDisplayInfo,
  ActionType,
  LogPanelMessage,
  ExtensionToWebviewMessage,
  TimelineUpdatePayload,
  SessionChangePayload,
  SelectionUpdatePayload,
  ActionResultPayload,
  ModeInitPayload,
  ParameterSchemaEntry,
  CardReplayStatus,
  // Feature 176: Rich card types
  ToolCategory,
  ParamType,
  ToolCategoryConfig,
  ParamChipData,
  ToolCategoryIconProps,
  ParameterChipProps,
  TrackBadgeProps,
  // Feature 207: manifest-fed icon resolution
  ToolCategoryMap,
  // Feature 208: TimelineEntry kind discriminator
  TimelineEntryKind,
} from './types';
export { DEFAULT_FILTER_STATE, VALID_VIEW_MODES, TIMELINE_ENTRY_KINDS, assertNeverKind } from './types';
export { ParameterEditor } from './ParameterEditor';
export type { ParameterEditorProps } from './ParameterEditor';
export { ReplayProgress } from './ReplayProgress';
export type { ReplayProgressProps } from './ReplayProgress';
export { CardFlip } from './CardFlip';
export type { CardFlipProps } from './CardFlip';
export { EditFace } from './EditFace';
export type { EditFaceProps } from './EditFace';
export { SkeletonLoader } from './SkeletonLoader';
export type { SkeletonLoaderProps } from './SkeletonLoader';
export { cascadeDisable } from './utils';
// Feature 176: Rich card sub-components
export { ToolCategoryIcon } from './ToolCategoryIcon';
export { ParameterChip } from './ParameterChip';
export { TrackBadge } from './TrackBadge';
export { resolveToolCategory, TOOL_CATEGORY_CONFIGS, UNKNOWN_CATEGORY_CONFIG } from './toolCategories';
export { inferParamType, inferFromSchema, inferFromValue } from './paramTypeInference';
