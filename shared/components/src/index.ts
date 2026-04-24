// Types (canonical home: filter-engine/types.ts)
export type { CatalogOverviewItem, StacBrowserItem, VesselTaxonomyNode } from './filter-engine/types';
export { parseTaxonomy } from './filter-engine/taxonomy';
export type { RawTaxonomy } from './filter-engine/taxonomy';

// StacBrowser (Feature: 132-three-view-sync)
export { StacBrowser } from './StacBrowser';
export type { StacBrowserProps, BrowserFilterResult } from './StacBrowser';
export { ThumbnailPreview } from './StacBrowser/ThumbnailPreview';
export type { ThumbnailPreviewProps } from './StacBrowser/ThumbnailPreview';

export { TimelineView } from './TimelineView';
export type { TimelineViewProps, TimelineBarData, ColourFn, TemporalFilter } from './TimelineView';

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
export type { MapViewProps, FlyToTarget } from './MapView';
export {
  SceneRectangleLayer,
  geoJsonPolygonToLeafletCoords,
  computeFillOpacity,
  computeOverlapRanks,
} from './MapView/SceneRectangleLayer';
export type { SceneRectangleLayerProps } from './MapView/SceneRectangleLayer';

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
export { useIsMobile } from './hooks/useIsMobile';
export { useTemporalTrack } from './MapView/useTemporalTrack';

// Types
export type { DebriefFeature, DebriefFeatureCollection, SchemaAnnotationFeature, TrackFeature, ReferenceLocation, Bounds } from './utils/types';
export {
  isTrackFeature,
  isReferenceLocation,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isAnnotationFeature,
  isExpandableFeature,
} from './utils/types';

// Utilities
export { calculateBounds, bboxOverlapsViewport, filterBySpatialExtent, viewportToBounds } from '@debrief/utils';
export {
  calculateTimeExtent,
  parseDuration,
  findIntervalPositions,
} from './utils/time';
export {
  resolvePositionStyle,
  computeAllPositionStyles,
  assertNever,
  InvalidPointShapeError,
} from '@debrief/utils';
export type { PointShape, ResolvedPositionStyle } from '@debrief/utils';
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

// Thumbnail capture utilities (Feature: 174-thumbnail-capture)
export { captureMapAsDataUrl } from './MapView/captureMap';
export type { CaptureMapOptions } from './MapView/captureMap';
export { downscaleDataUrl } from './MapView/resizeImage';
export type { DownscaleOptions } from './MapView/resizeImage';

// TableRenderer (Feature: 177-tabular-results-panel)
export { TableRenderer } from './TableRenderer';
export type { TableRendererProps } from './TableRenderer';

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
export { DEFAULT_RESULTS_PANEL_LABELS } from './panels/resultsPanelLabels';
export type { ResultsPanelLabels } from './panels/resultsPanelLabels';
export { NavigationPanel } from './panels/NavigationPanel';
export { ActivityPanelWrapper } from './panels/ActivityPanelWrapper';
export { LogPanelWrapper } from './panels/LogPanelWrapper';
export { MapPanel } from './panels/MapPanel';
export { ChartPanelWrapper } from './panels/ChartPanelWrapper';

// MobileTabLayout (Feature: mobile-web-shell-preview)
export { MobileTabLayout } from './MobileTabLayout/MobileTabLayout';
export type { MobileTabLayoutProps } from './MobileTabLayout/MobileTabLayout';

// LogPanel (Feature: 072-log-panel, updated: 176-log-panel-ux)
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
  // Feature 176: Rich card types
  ToolCategory,
  ParamType,
  ToolCategoryConfig,
  ParamChipData,
  ToolCategoryIconProps,
  ParameterChipProps,
  TrackBadgeProps,
  // Feature 208: TimelineEntry kind discriminator
  TimelineEntryKind,
} from './LogPanel';
export {
  DEFAULT_FILTER_STATE as LOG_DEFAULT_FILTER_STATE,
  VALID_VIEW_MODES,
  TIMELINE_ENTRY_KINDS,
  assertNeverKind,
} from './LogPanel';
export type {
  FilterState as LogFilterState,
} from './LogPanel';
// Feature 176: Rich card sub-components and utilities
export {
  ToolCategoryIcon,
  ParameterChip,
  TrackBadge,
  resolveToolCategory,
  TOOL_CATEGORY_CONFIGS,
  UNKNOWN_CATEGORY_CONFIG,
  inferParamType,
  inferFromSchema,
  inferFromValue,
} from './LogPanel';

// Colour Engine (Feature: 134-colour-scheme-engine)
export { ColourLegend } from './colour-engine';
export { ColourDimensionSelector } from './colour-engine';
export { computeColourAssignment, getDefaultColourAssignment } from './colour-engine';
export { defaultPalette, builtInDimensions } from './colour-engine';
export type {
  ColourDimension,
  ColourPalette,
  ColourAssignment,
  LegendModel,
  LegendEntry,
  GradientSpec,
  DimensionType,
  BuiltInDimensionId,
  ColourDimensionSelectorProps,
  ColourLegendProps,
} from './colour-engine';

// PropertiesPanel (Feature: 193-properties-panel)
export {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  PROVENANCE_LOG_CAP,
  PROVENANCE_LOG_ARCHIVE_FILENAME,
  isValidPropertiesProvenanceEntry,
} from './PropertiesPanel/provenanceTypes';
export type { PropertiesProvenanceEntry } from './PropertiesPanel/provenanceTypes';
export {
  AUTO_DERIVED_FIELDS,
  isAutoDerivedField,
} from './PropertiesPanel/autoDerivedFields';
export type { AutoDerivedField } from './PropertiesPanel/autoDerivedFields';
export {
  PropertiesForm,
  ArrayWidget,
  BboxWidget,
  DateTimeWidget,
  PlatformArrayWidget,
  resolveFieldSpec,
} from './PropertiesPanel';
export type {
  FieldSpec,
  FieldDerivationState,
  PropertiesFormField,
  PropertiesFormProps,
} from './PropertiesPanel';
export {
  BrowserSelectionContext,
  BrowserSelectionProvider,
  useBrowserSelection,
  PropertiesSidePanel,
} from './StacBrowser';
export type {
  BrowserSelection,
  BrowserSelectionProviderProps,
  PropertiesSidePanelProps,
} from './StacBrowser';

// Storyboard CRUD module (Feature: 215-storyboarding-schema)
export * from './storyboard';

// Storyboard panel — presentational React component (Features: 216-storyboarding-capture + 217-storyboarding-playback + 218-storyboarding-edit)
export {
  StoryboardPanel,
  SceneRow,
  SceneList,
  TransportRow,
  HardBlockModal,
  StoryboardHeader,
  SceneEditForm,
  UndoToast,
  StaleBadge,
} from './panels/StoryboardPanel';
export type {
  StoryboardPanelProps,
  SceneRowViewModel,
  StoryboardOptionViewModel,
  TransportViewModel,
  MissingDataReason,
  TransportRowProps,
  HardBlockModalProps,
  StoryboardHeaderProps,
  SceneEditFormProps,
  SceneMissingData,
  UndoToastProps,
  UndoToastState,
  StaleBadgeProps,
  SceneEditViewModel,
  StoryboardEditViewModel,
} from './panels/StoryboardPanel';

// NL → CQL2 generator + live transport (#188, #190, #191)
export {
  generateCql2,
  PROMPT_VERSION,
  buildPrompt,
  schemaDescription,
  createRecordedLLMClient,
  createPassthroughLLMClient,
  createLiveLLMClient,
  createPostMessageLLMClient,
  extractPhraseFromPrompt,
  validateLiveConfig,
  isLiveTransportError,
  providerCall,
  parseResponse,
  canonicalisePhrase,
  sha256Hex,
} from './nl-cql2';
export type {
  Cql2Json,
  LozengeSeed,
  GenerationErrorReason,
  GenerationError,
  GenerationDiagnostics,
  GenerationResult,
  GenerationResultError,
  LLMClient,
  RecordedResponse,
  ResponseMap,
  EnumBundle,
  VesselClassNode,
  EnumBundleMeta,
  GenerateDeps,
  LiveConfig,
  BrowserLiveConfig,
  VsCodeLiveConfig,
  LiveConfigValidationError,
  LiveConfigValidationResult,
  LiveOutcome,
  LiveSuccess,
  LiveAuthFailure,
  LiveRateLimit,
  LiveProviderError,
  LiveTransportError,
  LiveTimeout,
  LiveMalformedResponse,
  LiveNotConfigured,
  LiveCeilingReached,
  TransportCallRecord,
  ProviderCall,
  ProviderCallInput,
  ProviderCallOverrides,
  PostMessageLLMClientOptions,
} from './nl-cql2';
