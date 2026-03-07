// Components
export { CatalogOverview } from './CatalogOverview';
export type { CatalogOverviewProps, CatalogOverviewItem } from './CatalogOverview';

export { ExerciseListView } from './ExerciseListView';
export type {
  ExerciseListViewProps,
  ExerciseListItem,
  ExerciseListItemRowProps,
  SpatialThumbnailProps,
  RecentlyOpenedEntry,
  SortConfiguration,
  SortDimension,
  SortDirection,
} from './ExerciseListView';
export {
  computeDuration,
  formatDuration,
  formatDateRange,
  formatRelativeTime,
  sortComparators,
} from './ExerciseListView';

export { StacFileTree } from './StacFileTree';
export type {
  StacFileTreeProps,
  FilesystemAdapter,
  DirectoryEntry,
  FileStat,
  TreeNodeData,
  NodeType,
} from './StacFileTree';

export { MapView } from './MapView';
export type { MapViewProps } from './MapView';

export { Timeline } from './Timeline';
export type { TimelineProps } from './Timeline';

export { TimeController, useTimePlayback } from './TimeController';
export type {
  TimeControllerProps,
  PlaybackSpeed,
  PlaybackState,
  DisplayMode,
} from './TimeController';

export { FeatureList } from './FeatureList';
export type { FeatureListProps } from './FeatureList';

export { GeometryDialog } from './GeometryDialog';
export type { GeometryDialogProps } from './GeometryDialog';

export { LayersToolbar, FilterDropdown } from './LayersToolbar';
export type {
  LayersToolbarProps,
  FilterDropdownProps,
  FilterState,
  AssociatedFile,
  ToolbarLabels,
} from './LayersToolbar';
export { DEFAULT_FILTER_STATE, isFilterActive } from './LayersToolbar';

export { ThemeProvider } from './ThemeProvider';
export type { ThemeProviderProps, Theme } from './ThemeProvider';

// Temporal Track Rendering
export { TemporalTrackLayer } from './MapView/TemporalTrackLayer';
export type { TemporalTrackLayerProps } from './MapView/TemporalTrackLayer';
export { TrackHighlightMarker } from './MapView/TrackHighlightMarker';
export type { TrackHighlightMarkerProps, HighlightMarkerStyle } from './MapView/TrackHighlightMarker';
export { PositionSymbolsLayer } from './MapView/PositionSymbolsLayer';
export type { PositionSymbolsLayerProps } from './MapView/PositionSymbolsLayer';

// Hooks
export { useSelection } from './hooks/useSelection';
export { useTheme } from './hooks/useTheme';
export { useTemporalTrack } from './MapView/useTemporalTrack';

// Types
export type { DebriefFeature, DebriefFeatureCollection, AnnotationFeature, TrackFeature, ReferenceLocation, Bounds } from './utils/types';
export {
  isTrackFeature,
  isReferenceLocation,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isAnnotationFeature,
  isExpandableFeature,
} from './utils/types';

// Utilities
export { calculateBounds, bboxOverlapsViewport, filterBySpatialExtent } from './utils/bounds';
export {
  calculateTimeExtent,
  parseDuration,
  findIntervalPositions,
  resolvePositionStyle,
  computeAllPositionStyles,
} from './utils/time';
export type { ResolvedPositionStyle } from './utils/time';
export { getFeatureLabel, getFeatureIcon } from './utils/labels';

// ToolMatch
export {
  ToolMatchService,
  getInactiveReason,
  getAllInactiveReasons,
  createSelection,
  createSelectionFromCounts,
  extractParameters,
  fromMCPTool,
  fromMCPTools,
} from './ToolMatch';
export type { Selection, MatchResult, Tool, SelectionRequirement, MCPToolDefinition as SharedMCPToolDefinition } from './ToolMatch';

// ToolsPanel
export { ToolsPanel } from './ToolsPanel';
export type {
  ToolsPanelProps,
  ToolsPanelItem,
  ActivityPanelProps,
  ActivityPanelCollapseState,
  ActivityPanelMessage,
} from './ActivityPanel/types';

// ActivityPanel
export { ActivityPanel } from './ActivityPanel';
export { DEFAULT_COLLAPSE_STATE } from './ActivityPanel/types';

// CascadingMenu (Feature: 097-feature-format-menu)
export { CascadingMenu } from './CascadingMenu';
export type { CascadingMenuProps, CascadingMenuItem } from './CascadingMenu';

// FormatMenu (Feature: 097-feature-format-menu)
export { FormatMenu } from './FormatMenu';
export type { FormatMenuProps } from './FormatMenu';
export { buildFormatMenuItems, parseMenuItemId, resolvePresetValue } from './FormatMenu';
export type { StylePropertyDescriptor as FormatStylePropertyDescriptor } from './FormatMenu';
export {
  COLOUR_PALETTE,
  LINE_WEIGHT_PRESETS,
  OPACITY_PRESETS,
  RADIUS_PRESETS,
  DASH_PATTERN_PRESETS,
  SHAPE_PRESETS,
} from './FormatMenu';
export type { PresetValue } from './FormatMenu';

// ContextMenu (Feature: 091-tool-parameter-context-menus)
export { ContextMenu } from './ContextMenu';
export type { ContextMenuItem, ContextMenuProps } from './ContextMenu';

// Drawing (Feature: 094-point-rectangle-drawing, 096-drawing-ux-persistence)
export { createDrawnFeature } from './MapView/drawing';
export type { CreateDrawnFeatureOptions, DrawnFeatureProvenance } from './MapView/drawing';
export { DRAWING_GUIDANCE, CANCEL_HINT } from './MapView/drawing';
export type { GuidanceText } from './MapView/drawing';
export { DRAWING_PALETTE, getPaletteColour, getPaletteStyleOverrides } from './MapView/drawing';
export type { DrawingMode } from './MapView/LeafletToolbar';

// ChartRenderer (Feature: 085-chart-renderer)
export { ChartRenderer } from './ChartRenderer';
export type { ChartRendererProps } from './ChartRenderer';
export { transformDataset, registerTransformer, getSupportedTypes } from './ChartRenderer';
export type {
  DatasetEnvelope,
  DatasetMetadata,
  AxisDefinition,
  DataSeries,
  TransformerError,
  TransformResult,
} from './ChartRenderer';

// PanelWorkspace (Feature: 096-add-goldenlayout-panels)
export { PanelWorkspace } from './PanelWorkspace';
export type { PanelWorkspaceProps, PanelWorkspaceElement } from './PanelWorkspace';
export { createPanelRegistry } from './PanelWorkspace';
export type { PanelDefinition, PanelProps, PanelRegistry } from './PanelWorkspace';
export { DEFAULT_LAYOUT_CONFIG, PANEL_NAVIGATION, PANEL_ACTIVITY, PANEL_LOG, PANEL_MAP, PANEL_CHART } from './PanelWorkspace/defaultLayout';
export { saveLayout, loadLayout, clearLayout, LAYOUT_STORAGE_KEY, LAYOUT_VERSION } from './PanelWorkspace/layoutPersistence';
export { PanelErrorBoundary } from './PanelWorkspace/PanelErrorBoundary';
export { createDefaultRegistry } from './PanelWorkspace/createDefaultRegistry';

// Panel wrappers and context (Feature: 096-add-goldenlayout-panels)
export { PanelContextProvider, usePanelContext } from './panels/PanelContext';
export type { PanelContextValue, PanelComponents, ChartContextProps, ChartTabData, ResultArtifactType } from './panels/PanelContext';
export { NavigationPanel } from './panels/NavigationPanel';
export { ActivityPanelWrapper } from './panels/ActivityPanelWrapper';
export { LogPanelWrapper } from './panels/LogPanelWrapper';
export { MapPanel } from './panels/MapPanel';
export { ChartPanelWrapper } from './panels/ChartPanelWrapper';

// LogPanel (Feature: 072-log-panel)
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
  InputFeatureState,
  OperationCategory,
  PresentationMode,
  ViewMode,
  ParameterValue as LogParameterValue,
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
} from './LogPanel';
export {
  DEFAULT_FILTER_STATE as LOG_DEFAULT_FILTER_STATE,
} from './LogPanel';
export type {
  FilterState as LogFilterState,
} from './LogPanel';
