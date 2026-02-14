/**
 * Extension ↔ Webview Message Protocol
 *
 * This defines the typed message protocol between the VS Code extension host
 * and the map webview panel.
 */

import type { Track, ReferenceLocation, SelectionContextType } from '../types/plot';
import type { LayerStyle } from '../types/tool';

// Type-safe properties to avoid any from geojson
type SafeProperties = Record<string, unknown> | null;

// Self-contained geometry type to avoid any
interface SafeGeometry {
  type: string;
  coordinates: unknown;
}

// Self-contained feature type to avoid any from geojson Feature
interface SafeFeature {
  type: 'Feature';
  geometry: SafeGeometry;
  properties: SafeProperties;
}

// Self-contained FeatureCollection type to avoid any from geojson
interface SafeFeatureCollection {
  type: 'FeatureCollection';
  features: SafeFeature[];
}

// ============================================================================
// Base Types
// ============================================================================

/** Base message interface */
interface Message {
  type: string;
}

/** Request message with correlation ID */
interface RequestMessage extends Message {
  requestId: string;
}

/** Response message with correlation ID */
interface ResponseMessage extends Message {
  requestId: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Extension → Webview Messages
// ============================================================================

/** GeoJSON feature for fallback rendering */
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: Record<string, unknown> | null;
}

/** Load a plot into the webview */
export interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    tracks: Track[];
    locations: ReferenceLocation[];
    otherFeatures?: GeoJSONFeature[];
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
}

/** Update track data (after time filter change) */
export interface UpdateTracksMessage {
  type: 'updateTracks';
  tracks: Track[];
}

/** Set the current selection (from external source like Outline click) */
export interface SetSelectionMessage {
  type: 'setSelection';
  featureIds: string[];
}

/** Clear all selection */
export interface ClearSelectionMessage {
  type: 'clearSelection';
}

/** Add a result layer from tool execution */
export interface AddResultLayerMessage {
  type: 'addResultLayer';
  layer: {
    id: string;
    name: string;
    features: SafeFeatureCollection;
    style: LayerStyle;
  };
}

/** Remove a result layer */
export interface RemoveResultLayerMessage {
  type: 'removeResultLayer';
  layerId: string;
}

/** Toggle layer visibility */
export interface SetLayerVisibilityMessage {
  type: 'setLayerVisibility';
  layerId: string;
  visible: boolean;
}

/** Fit map to specified bounds */
export interface FitBoundsMessage {
  type: 'fitBounds';
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
}

/** Update the time range filter */
export interface SetTimeRangeMessage {
  type: 'setTimeRange';
  timeRange: {
    start: string;
    end: string;
  };
}

/** Set viewport from session state (Feature: 029) */
export interface SetViewportMessage {
  type: 'setViewport';
  viewport: {
    center: [number, number]; // [lat, lng]
    zoom: number;
  };
}

/** Set current time position from session state (Feature: 029) */
export interface SetCurrentTimeMessage {
  type: 'setCurrentTime';
  time: number; // epoch ms
}

/** Set display mode for temporal track rendering (Feature: 039) */
export interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  /** 'full' = entire track + highlight marker; 'trail' = snail-trail to current time */
  displayMode: 'full' | 'trail';
}

/** Set hidden feature IDs (Feature: 048) */
export interface SetHiddenIdsMessage {
  type: 'setHiddenIds';
  hiddenIds: string[];
}

/** Set custom color for a track */
export interface SetTrackColorMessage {
  type: 'setTrackColor';
  trackId: string;
  color: string; // hex #RRGGBB
}

/** Response to export PNG request */
export interface RequestExportPngResponse extends ResponseMessage {
  type: 'requestExportPngResponse';
}

/** Response to track details request */
export interface RequestTrackDetailsResponse extends ResponseMessage {
  type: 'requestTrackDetailsResponse';
  details?: {
    name: string;
    platformType: string;
    pointCount: number;
    startTime: string;
    endTime: string;
    duration: string;
  };
}

// ============================================================================
// Webview → Extension Messages
// ============================================================================

/** Notify extension of selection change */
export interface SelectionChangedMessage {
  type: 'selectionChanged';
  selection: {
    trackIds: string[];
    locationIds: string[];
    /** Full selection paths for all selected elements (Feature 053) */
    paths?: string[];
    contextType: SelectionContextType;
  };
}

/** Notify extension of map view state change (for persistence) */
export interface ViewStateChangedMessage {
  type: 'viewStateChanged';
  state: {
    center: [number, number];
    zoom: number;
    timeRange: { start: string; end: string };
    /** Viewport bounds as [NW, NE, SE, SW] corners in [lng, lat] order */
    bounds?: [[number, number], [number, number], [number, number], [number, number]];
  };
}

/** Request PNG export (extension handles file dialog) */
export interface RequestExportPngRequest extends RequestMessage {
  type: 'requestExportPng';
}

/** Request to change track color (extension shows color picker) */
export interface RequestTrackColorChangeMessage {
  type: 'requestTrackColorChange';
  trackId: string;
  trackName: string;
}

/** Request full track details for tooltip */
export interface RequestTrackDetailsRequest extends RequestMessage {
  type: 'requestTrackDetails';
  trackId: string;
}

/** Signal that webview has initialized and is ready to receive data */
export interface WebviewReadyMessage {
  type: 'webviewReady';
}

/** Request undo from webview (keyboard shortcut) */
export interface RequestUndoMessage {
  type: 'requestUndo';
}

/** Request redo from webview (keyboard shortcut) */
export interface RequestRedoMessage {
  type: 'requestRedo';
}

/** Notify extension that a feature was drawn on the map (Webview → Host) */
export interface FeatureDrawnMessage {
  type: 'featureDrawn';
  feature: {
    id: string;
    kind: string;
    name?: string;
    label?: string;
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties: Record<string, unknown>;
  };
}

/** Notify extension of viewport change for session state (Feature: 029) */
export interface ViewportChangedMessage {
  type: 'viewportChanged';
  viewport: {
    center: [number, number]; // [lat, lng]
    zoom: number;
  };
}

// ============================================================================
// Union Types
// ============================================================================

// ============================================================================
// Import Messages (REP File Loading)
// ============================================================================

/** REP file drop from webview to extension (Webview → Host) */
export interface RepFileDropMessage {
  type: 'repFileDrop';
  uris: string[];  // file:// URIs from dataTransfer
}

/** Import progress update (Host → Webview) */
export interface ImportProgressMessage {
  type: 'importProgress';
  stage: 'parsing' | 'storing' | 'complete' | 'error';
  message?: string;
}

/** Import complete notification (Host → Webview) */
export interface ImportCompleteMessage {
  type: 'importComplete';
  featureCount: number;
  bounds: [number, number, number, number];  // [minLon, minLat, maxLon, maxLat]
}

// ============================================================================
// Union Types
// ============================================================================

/** All messages from extension to webview */
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
  | SetHiddenIdsMessage
  | RequestExportPngResponse
  | RequestTrackDetailsResponse
  | ImportProgressMessage
  | ImportCompleteMessage;

/** All messages from webview to extension */
export type WebviewToExtensionMessage =
  | SelectionChangedMessage
  | ViewStateChangedMessage
  | ViewportChangedMessage
  | RequestExportPngRequest
  | RequestTrackColorChangeMessage
  | RequestTrackDetailsRequest
  | WebviewReadyMessage
  | RepFileDropMessage
  | RequestUndoMessage
  | RequestRedoMessage
  | FeatureDrawnMessage;

// ============================================================================
// Results Panel Messages (Feature: 095-results-bottom-panel)
// ============================================================================

/** Content type category for result artifacts. */
export type ResultArtifactType = 'dataset' | 'image' | 'other';

/** Content payload discriminated by artifact type. */
export type TabContentPayload =
  | { artifactType: 'dataset'; spec: object | null; error?: string }
  | { artifactType: 'image'; dataUri: string }
  | { artifactType: 'other'; filename: string; mimeType: string; sizeBytes: number };

/** Extension → Results Webview: add a new tab */
export interface ResultsAddTabMessage {
  type: 'results:addTab';
  tab: {
    id: string;
    title: string;
    plotTitle: string;
    artifactType: ResultArtifactType;
  };
  content: TabContentPayload;
  showPlotPrefix: boolean;
}

/** Extension → Results Webview: update content for an existing tab */
export interface ResultsUpdateContentMessage {
  type: 'results:updateContent';
  tabId: string;
  content: TabContentPayload;
}

/** Extension → Results Webview: activate an existing tab */
export interface ResultsActivateTabMessage {
  type: 'results:activateTab';
  tabId: string;
}

/** Extension → Results Webview: remove a tab */
export interface ResultsRemoveTabMessage {
  type: 'results:removeTab';
  tabId: string;
  newActiveTabId: string | null;
}

/** Extension → Results Webview: toggle plot prefixes in tab titles */
export interface ResultsUpdatePlotPrefixesMessage {
  type: 'results:updatePlotPrefixes';
  showPlotPrefix: boolean;
}

/** All messages from extension to results panel webview. */
export type ResultsExtensionToWebviewMessage =
  | ResultsAddTabMessage
  | ResultsUpdateContentMessage
  | ResultsActivateTabMessage
  | ResultsRemoveTabMessage
  | ResultsUpdatePlotPrefixesMessage;

/** Results Webview → Extension: close a tab */
export interface ResultsCloseTabMessage {
  type: 'results:closeTab';
  tabId: string;
}

/** Results Webview → Extension: select/switch to a tab */
export interface ResultsSelectTabMessage {
  type: 'results:selectTab';
  tabId: string;
}

/** Results Webview → Extension: open file externally */
export interface ResultsOpenExternalMessage {
  type: 'results:openExternal';
  tabId: string;
}

/** Results Webview → Extension: webview is ready */
export interface ResultsWebviewReadyMessage {
  type: 'results:webviewReady';
}

/** All messages from results panel webview to extension. */
export type ResultsWebviewToExtensionMessage =
  | ResultsCloseTabMessage
  | ResultsSelectTabMessage
  | ResultsOpenExternalMessage
  | ResultsWebviewReadyMessage;

// ============================================================================
// Re-exports for webview
// ============================================================================

export type {
  Track,
  ReferenceLocation,
  SelectionContextType,
  PositionStyle,
  PositionStyleOverride,
  TimestampedPosition,
} from '../types/plot';
export type { LayerStyle, ResultLayer } from '../types/tool';
