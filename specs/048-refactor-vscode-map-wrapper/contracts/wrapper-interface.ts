/**
 * VS Code Map Wrapper Interface Contract
 *
 * This file defines the interface between the thin wrapper and the shared MapView component.
 * It serves as a specification for implementation - not production code.
 *
 * Feature: 048-refactor-vscode-map-wrapper
 */

import type { MapViewProps } from '@debrief/components/MapView';
import type { DebriefFeature, DisplayMode, Bounds } from '@debrief/components';

// =============================================================================
// VS Code API Types
// =============================================================================

/**
 * State persisted via vscode.setState() across webview lifecycle
 */
export interface PersistedMapState {
  /** Last map center [lat, lng] */
  center?: [number, number];

  /** Last zoom level */
  zoom?: number;

  /** Custom track color overrides keyed by track ID */
  trackColors?: Record<string, string>;

  /** Last time filter range */
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * VS Code API interface for webview
 */
export interface VSCodeAPI {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): PersistedMapState | undefined;
  setState(state: PersistedMapState): void;
}

// =============================================================================
// Wrapper State Types
// =============================================================================

/**
 * Internal state managed by the wrapper component
 */
export interface WrapperState {
  /** All features to render (tracks, locations, results) */
  features: DebriefFeature[];

  /** Currently selected feature IDs */
  selectedIds: Set<string>;

  /** Current temporal position (epoch ms), undefined = static rendering */
  currentTime: number | undefined;

  /** Track rendering mode */
  displayMode: DisplayMode;

  /** Map center from persistence or extension */
  initialCenter: [number, number] | undefined;

  /** Map zoom from persistence or extension */
  initialZoom: number | undefined;

  /** Data time extent from loadPlot */
  timeExtent: [number, number] | null;

  /** Component display state */
  uiState: 'empty' | 'loading' | 'ready';

  /** Result layers keyed by layer ID */
  resultLayers: Map<string, ResultLayerData>;

  /** Layer visibility states */
  layerVisibility: Map<string, boolean>;
}

/**
 * Result layer data from addResultLayer message
 */
export interface ResultLayerData {
  id: string;
  name: string;
  features: DebriefFeature[];
  style: LayerStyle;
}

/**
 * Layer style from tool execution
 */
export interface LayerStyle {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: string;
}

// =============================================================================
// Message Types (Re-export from messages.ts for contract reference)
// =============================================================================

/**
 * Messages from extension to webview
 */
export type ExtensionToWebviewMessage =
  | LoadPlotMessage
  | UpdateTracksMessage
  | SetSelectionMessage
  | ClearSelectionMessage
  | AddResultLayerMessage
  | RemoveResultLayerMessage
  | SetLayerVisibilityMessage
  | FitBoundsMessage
  | SetTimeRangeMessage
  | SetTrackColorMessage
  | SetViewportMessage
  | SetCurrentTimeMessage
  | SetDisplayModeMessage
  | ImportProgressMessage
  | ImportCompleteMessage;

/**
 * Messages from webview to extension
 */
export type WebviewToExtensionMessage =
  | SelectionChangedMessage
  | ViewStateChangedMessage
  | ViewportChangedMessage
  | RequestExportPngMessage
  | RequestTrackColorChangeMessage
  | WebviewReadyMessage
  | RepFileDropMessage
  | RequestUndoMessage
  | RequestRedoMessage;

// Individual message interfaces (abbreviated - full definitions in messages.ts)
interface LoadPlotMessage { type: 'loadPlot'; plot: PlotData; }
interface UpdateTracksMessage { type: 'updateTracks'; tracks: Track[]; }
interface SetSelectionMessage { type: 'setSelection'; featureIds: string[]; }
interface ClearSelectionMessage { type: 'clearSelection'; }
interface AddResultLayerMessage { type: 'addResultLayer'; layer: ResultLayerData; }
interface RemoveResultLayerMessage { type: 'removeResultLayer'; layerId: string; }
interface SetLayerVisibilityMessage { type: 'setLayerVisibility'; layerId: string; visible: boolean; }
interface FitBoundsMessage { type: 'fitBounds'; bounds: [[number, number], [number, number]]; }
interface SetTimeRangeMessage { type: 'setTimeRange'; timeRange: { start: string; end: string; }; }
interface SetTrackColorMessage { type: 'setTrackColor'; trackId: string; color: string; }
interface SetViewportMessage { type: 'setViewport'; viewport: { center: [number, number]; zoom: number; }; }
interface SetCurrentTimeMessage { type: 'setCurrentTime'; time: number; }
interface SetDisplayModeMessage { type: 'setDisplayMode'; displayMode: DisplayMode; }
interface ImportProgressMessage { type: 'importProgress'; stage: string; message?: string; }
interface ImportCompleteMessage { type: 'importComplete'; featureCount: number; bounds: Bounds; }

interface SelectionChangedMessage { type: 'selectionChanged'; selection: SelectionData; }
interface ViewStateChangedMessage { type: 'viewStateChanged'; state: ViewState; }
interface ViewportChangedMessage { type: 'viewportChanged'; viewport: { center: [number, number]; zoom: number; }; }
interface RequestExportPngMessage { type: 'requestExportPng'; requestId: string; }
interface RequestTrackColorChangeMessage { type: 'requestTrackColorChange'; trackId: string; trackName: string; }
interface WebviewReadyMessage { type: 'webviewReady'; }
interface RepFileDropMessage { type: 'repFileDrop'; uris: string[]; }
interface RequestUndoMessage { type: 'requestUndo'; }
interface RequestRedoMessage { type: 'requestRedo'; }

// Supporting types
interface PlotData { id: string; title: string; tracks: Track[]; locations: ReferenceLocation[]; bbox: Bounds; timeExtent: [string, string]; }
interface Track { id: string; name: string; geometry: LineStringGeometry; times?: string[]; color?: string; visible?: boolean; }
interface ReferenceLocation { id: string; name: string; geometry: PointGeometry; }
interface LineStringGeometry { type: 'LineString'; coordinates: [number, number][]; }
interface PointGeometry { type: 'Point'; coordinates: [number, number]; }
interface SelectionData { trackIds: string[]; locationIds: string[]; contextType: string; }
interface ViewState { center: [number, number]; zoom: number; timeRange: { start: string; end: string; }; bounds?: Bounds; }

// =============================================================================
// Props Contract
// =============================================================================

/**
 * Props that the wrapper derives and passes to MapView
 */
export interface DerivedMapViewProps extends Pick<MapViewProps,
  | 'features'
  | 'selectedIds'
  | 'currentTime'
  | 'displayMode'
  | 'initialCenter'
  | 'initialZoom'
  | 'autoFitBounds'
  | 'onSelect'
  | 'onBackgroundClick'
  | 'onZoomChange'
  | 'onBoundsChange'
> {
  // All props derived from WrapperState + callback handlers
}

// =============================================================================
// Handler Contracts
// =============================================================================

/**
 * Message handler function type
 */
export type MessageHandler = (message: ExtensionToWebviewMessage) => void;

/**
 * Handler implementations contract
 */
export interface MessageHandlers {
  handleLoadPlot(message: LoadPlotMessage): void;
  handleUpdateTracks(message: UpdateTracksMessage): void;
  handleSetSelection(message: SetSelectionMessage): void;
  handleClearSelection(): void;
  handleAddResultLayer(message: AddResultLayerMessage): void;
  handleRemoveResultLayer(message: RemoveResultLayerMessage): void;
  handleSetLayerVisibility(message: SetLayerVisibilityMessage): void;
  handleFitBounds(message: FitBoundsMessage): void;
  handleSetTimeRange(message: SetTimeRangeMessage): void;
  handleSetTrackColor(message: SetTrackColorMessage): void;
  handleSetViewport(message: SetViewportMessage): void;
  handleSetCurrentTime(message: SetCurrentTimeMessage): void;
  handleSetDisplayMode(message: SetDisplayModeMessage): void;
}

// =============================================================================
// Transformation Contracts
// =============================================================================

/**
 * Transform Track message to DebriefFeature
 */
export function trackToFeature(track: Track): DebriefFeature;

/**
 * Transform ReferenceLocation message to DebriefFeature
 */
export function locationToFeature(location: ReferenceLocation): DebriefFeature;

/**
 * Merge all feature sources into unified array
 */
export function mergeFeatures(
  tracks: Track[],
  locations: ReferenceLocation[],
  resultLayers: Map<string, ResultLayerData>,
  layerVisibility: Map<string, boolean>
): DebriefFeature[];
