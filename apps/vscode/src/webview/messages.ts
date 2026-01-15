/**
 * Extension ↔ Webview Message Protocol
 *
 * This defines the typed message protocol between the VS Code extension host
 * and the map webview panel.
 */

import type { Track, ReferenceLocation, SelectionContextType } from '../types/plot';
import type { LayerStyle } from '../types/tool';
import type { FeatureCollection } from 'geojson';

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

/** Load a plot into the webview */
export interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    tracks: Track[];
    locations: ReferenceLocation[];
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
  selection: {
    trackIds: string[];
    locationIds: string[];
  };
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
    features: FeatureCollection;
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
  | RequestExportPngResponse
  | RequestTrackDetailsResponse;

/** All messages from webview to extension */
export type WebviewToExtensionMessage =
  | SelectionChangedMessage
  | ViewStateChangedMessage
  | RequestExportPngRequest
  | RequestTrackColorChangeMessage
  | RequestTrackDetailsRequest
  | WebviewReadyMessage;

// ============================================================================
// Re-exports for webview
// ============================================================================

export type { Track, ReferenceLocation, SelectionContextType } from '../types/plot';
export type { LayerStyle, ResultLayer } from '../types/tool';
