/**
 * LogPanel module — public API.
 * Feature: 072-log-panel (E02, Phase 2)
 */

export { LogPanel } from './LogPanel';
export type {
  LogPanelProps,
  LogEntryProps,
  LogTimelineProps,
  LogByFeatureProps,
  LogFilterRowProps,
  LogActionBarProps,
  SnapshotBoundaryProps,
  TimelineEntry,
  OperationCategory,
  PresentationMode,
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
} from './types';
export { DEFAULT_FILTER_STATE } from './types';
