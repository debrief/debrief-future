/**
 * Extension ↔ Webview Message Protocol
 *
 * This defines the typed message protocol between the VS Code extension host
 * and the map webview panel.
 */

import type { LayerStyle } from '../types/tool';
import type { DebriefFeature } from '@debrief/components';
import type { SafeFeatureCollection } from '@debrief/utils';
import type { DisplayMode, PlatformRecord, Viewport } from '@debrief/schemas';
export type { PlatformRecord };

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
    features: DebriefFeature[];
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
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

/** Update plot features in-place (mutation tool results) */
export interface UpdatePlotFeaturesMessage {
  type: 'updatePlotFeatures';
  features: SafeFeatureCollection;
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
  displayMode: DisplayMode;
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

/** Set active drawing mode from session state (#108) */
export interface SetDrawingModeMessage {
  type: 'setDrawingMode';
  drawingMode: 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
}

/** Set drawing palette index from session state (#108) */
export interface SetDrawingPaletteIndexMessage {
  type: 'setDrawingPaletteIndex';
  paletteIndex: number;
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
// Storyboard Playback Messages (#217)
// ============================================================================

/**
 * Kick off an animated flyTo on the map (extension → webview).
 * `durationMs === 0` means "jump without animation" (setView with animate:false).
 * The token correlates to the `flyToComplete` response so the extension can
 * distinguish the animation it kicked off from any intervening ones.
 */
export interface FlyToMessage {
  type: 'flyTo';
  token: number;
  center: readonly [number, number];  // [lat, lng]
  zoom: number;
  durationMs: number;
}

/** Scene snapshot sent for rectangle rendering. */
export interface SceneRectangleSnapshot {
  readonly sceneId: string;
  readonly viewport: Viewport;
  readonly timestamp: string;
  /** GeoJSON Polygon coordinates — outer ring + optional holes. */
  readonly polygon: readonly (readonly (readonly [number, number])[])[];
}

/**
 * Push the active Storyboard's Scene rectangles to the webview
 * (extension → webview). Passing `scenes: null` clears the overlay.
 */
export interface SetSceneRectanglesMessage {
  type: 'setSceneRectangles';
  scenes: readonly SceneRectangleSnapshot[] | null;
  activeStoryboardId: string | null;
  currentSceneId: string | null;
}

/** A flyTo animation has ended (webview → extension). */
export interface FlyToCompleteMessage {
  type: 'flyToComplete';
  token: number;
}

/** User clicked a Scene rectangle (webview → extension). */
export interface SceneRectangleClickedMessage {
  type: 'sceneRectangleClicked';
  sceneId: string;
}

// ============================================================================
// Webview → Extension Messages
// ============================================================================

/** Notify extension of selection change */
export interface SelectionChangedMessage {
  type: 'selectionChanged';
  selection: {
    featureIds: string[];
    /** Full selection paths for all selected elements (Feature 053) */
    paths?: string[];
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

/** Notify extension of drawing mode change from webview (#108) */
export interface DrawingModeChangedMessage {
  type: 'drawingModeChanged';
  drawingMode: 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
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
// Thumbnail Capture Messages (#174)
// ============================================================================

/** Request thumbnail capture from the webview (Extension → Webview) */
export interface RequestThumbnailCaptureMessage extends RequestMessage {
  type: 'requestThumbnailCapture';
}

// ============================================================================
// NL Search Messages (#191) — review Decision 2
// ============================================================================

/**
 * The `LiveOutcome` shape carried by `nlOutcome` messages. Mirrors the
 * `LiveOutcome` union in `@debrief/components` (`shared/components/src/nl-cql2/
 * types.ts`). We duplicate the type declaration here so the webview protocol
 * does not pull the whole nl-cql2 module graph into every message consumer —
 * the structural match is asserted in `shared/components/src/nl-cql2/
 * __tests__/clients.test.ts::createPostMessageLLMClient`.
 */
export type NlLiveOutcome =
  | { readonly kind: 'success'; readonly rawResponse: string; readonly durationMs: number; readonly responseBytes: number; readonly model: string }
  | { readonly kind: 'auth-failure'; readonly providerStatus: number; readonly durationMs: number }
  | { readonly kind: 'rate-limit'; readonly providerStatus: number; readonly retryAfterSeconds: number | null; readonly durationMs: number }
  | { readonly kind: 'provider-error'; readonly providerStatus: number; readonly durationMs: number }
  | { readonly kind: 'transport-error'; readonly reason: 'network' | 'cancelled' | 'unknown'; readonly durationMs: number }
  | { readonly kind: 'timeout'; readonly durationMs: number }
  | { readonly kind: 'malformed-response'; readonly reason: 'non-json' | 'oversize' | 'truncated'; readonly durationMs: number; readonly responseBytes: number }
  | { readonly kind: 'not-configured'; readonly reason: 'disabled' | 'no-key'; readonly durationMs: 0 }
  | { readonly kind: 'ceiling-reached'; readonly ceiling: number; readonly durationMs: 0 };

/**
 * Webview-visible NL-search configuration snapshot. Pushed by the extension
 * host on activation + whenever `workspace.onDidChangeConfiguration` or
 * `context.secrets.onDidChange` fires. The `hasApiKey` bool is presence-only
 * — the key itself NEVER leaves the extension-host process.
 */
export interface NlLiveConfigMessage {
  readonly type: 'nlConfig';
  readonly config: {
    readonly enabled: boolean;
    readonly model: string;
    readonly hasApiKey: boolean;
    readonly callCeiling: number;
    readonly timeoutMs: number;
    readonly maxResponseBytes: number;
  };
}

/**
 * Request from the webview for the host to issue one NL → CQL2 call against
 * the configured provider. The extension host resolves exactly one
 * `nlOutcome` per `nlGenerate` (never zero, never two). Cancellations come
 * back as `{ kind: "transport-error", reason: "cancelled" }`.
 */
export interface NlGenerateRequest extends RequestMessage {
  readonly type: 'nlGenerate';
  readonly prompt: string;
}

/**
 * Request from the webview to abort a specific in-flight `nlGenerate`.
 * The host cancels the matching request; the pending `nlOutcome` for that
 * id resolves to `{ kind: "transport-error", reason: "cancelled" }`.
 */
export interface NlAbortMessage extends Message {
  readonly type: 'nlAbort';
  readonly requestId: string;
}

/**
 * Response from the extension host with the outcome of one `nlGenerate`.
 * Always paired with the originating `requestId`.
 */
export interface NlOutcomeResponse extends ResponseMessage {
  readonly type: 'nlOutcome';
  readonly outcome: NlLiveOutcome;
}

/** Thumbnail capture response with base64 PNG data (Webview → Extension) */
export interface ThumbnailCaptureResponseMessage extends ResponseMessage {
  type: 'thumbnailCaptureResponse';
  largePngBase64: string | null;
  smallPngBase64: string | null;
}

// ============================================================================
// Tabular Results Messages (#177)
// ============================================================================

/** Request to save tabular result as CSV (Webview → Extension) */
export interface SaveResultMessage {
  type: 'saveResult';
  tabId: string;
  toolName: string;
}

/** Request to save tabular result with custom name (Webview → Extension) */
export interface SaveResultAsMessage {
  type: 'saveResultAs';
  tabId: string;
  toolName: string;
  baseName: string;
  tag?: string;
}

/** Retry a failed tool execution (Webview → Extension) */
export interface RetryToolMessage {
  type: 'retryTool';
  tabId: string;
}

/** Notify webview of save completion (Extension → Webview) */
export interface ResultSavedMessage {
  type: 'resultSaved';
  tabId: string;
  filename: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Results Panel Messages (#178 — VS Code Tabular Results integration)
// ============================================================================

/** Single tab shape sent to the Results panel webview. Mirrors
 * `@debrief/components#ChartTabData` but is replicated here to keep the
 * webview message surface self-contained. */
export interface ResultsTabSnapshot {
  id: string;
  title: string;
  toolId: string;
  displayHint?: 'table' | 'chart';
  /** Flat rows for the TableRenderer (when displayHint = 'table'). */
  tableData?: Record<string, unknown>[];
  /** Full DatasetEnvelope for the ChartRenderer (when displayHint = 'chart'). */
  datasetEnvelope?: Record<string, unknown>;
  isSaved?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
}

/** Replace the full tab list in the Results panel webview. */
export interface ResultsSetTabsMessage {
  type: 'results:setTabs';
  payload: {
    tabs: ResultsTabSnapshot[];
    activeTabId: string | null;
  };
}

/** Toggle the Results panel visibility (host → webview). */
export interface ResultsSetVisibilityMessage {
  type: 'results:setVisibility';
  payload: { visible: boolean };
}

/** Signal that a given tab is in a loading state. */
export interface ResultsSetLoadingMessage {
  type: 'results:setLoading';
  payload: { tabId: string; isLoading: boolean };
}

/** Webview → host: the React app has finished mounting. */
export interface ResultsWebviewReadyMessage {
  type: 'results:webviewReady';
}

/** Webview → host: user clicked Save on a tab. */
export interface ResultsSaveMessage {
  type: 'results:save';
  payload: { tabId: string };
}

/** Webview → host: user confirmed the Save As form. */
export interface ResultsSaveAsMessage {
  type: 'results:saveAs';
  payload: {
    tabId: string;
    baseName: string;
    tag?: string;
  };
}

/** Webview → host: user clicked Retry on a failed tab. */
export interface ResultsRetryMessage {
  type: 'results:retry';
  payload: { tabId: string };
}

/** Webview → host: user clicked × on a tab. */
export interface ResultsCloseTabMessage {
  type: 'results:closeTab';
  payload: { tabId: string };
}

// ============================================================================
// Union Types
// ============================================================================

/** All messages from extension to webview */
// eslint-disable-next-line no-restricted-syntax -- VS Code-local ExtensionToWebviewMessage is the superset used by the extension host; @debrief/components exports a narrower shape for the webview. Follow-up to reconcile, #214 scope-adjacent
export type ExtensionToWebviewMessage =
  | LoadPlotMessage
  | SetSelectionMessage
  | ClearSelectionMessage
  | AddResultLayerMessage
  | UpdatePlotFeaturesMessage
  | RemoveResultLayerMessage
  | SetLayerVisibilityMessage
  | FitBoundsMessage
  | SetTimeRangeMessage
  | SetTrackColorMessage
  | SetViewportMessage
  | SetCurrentTimeMessage
  | SetDisplayModeMessage
  | SetHiddenIdsMessage
  | SetDrawingModeMessage
  | SetDrawingPaletteIndexMessage
  | RequestExportPngResponse
  | RequestTrackDetailsResponse
  | ImportProgressMessage
  | ImportCompleteMessage
  | RequestThumbnailCaptureMessage
  | ResultSavedMessage
  // Results panel (#178)
  | ResultsSetTabsMessage
  | ResultsSetVisibilityMessage
  | ResultsSetLoadingMessage
  // Storyboard playback (#217)
  | FlyToMessage
  | SetSceneRectanglesMessage
  // NL search (#191)
  | NlLiveConfigMessage
  | NlOutcomeResponse;

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
  | FeatureDrawnMessage
  | DrawingModeChangedMessage
  | ThumbnailCaptureResponseMessage
  | SaveResultMessage
  | SaveResultAsMessage
  | RetryToolMessage
  // Results panel (#178)
  | ResultsWebviewReadyMessage
  | ResultsSaveMessage
  | ResultsSaveAsMessage
  | ResultsRetryMessage
  | ResultsCloseTabMessage
  // Storyboard playback (#217)
  | FlyToCompleteMessage
  | SceneRectangleClickedMessage
  // NL search (#191)
  | NlGenerateRequest
  | NlAbortMessage;

// ============================================================================
// Exercise List View Messages (#129)
// ============================================================================

/** Sent when the exercise list webview is ready; provides the full exercise list. */
export interface LoadExerciseListMessage {
  readonly type: 'loadExerciseList';
  readonly items: ExerciseListItemMessage[];
}

/** Exercise data for list view display. */
export interface ExerciseListItemMessage {
  readonly id: string;
  readonly title: string;
  readonly itemPath: string;
  readonly bbox: readonly [number, number, number, number] | null;
  readonly datetime: string | null;
  readonly startDatetime: string | null;
  readonly endDatetime: string | null;
  readonly platforms: readonly PlatformRecord[];
  readonly tags: readonly string[];
  readonly author: string | null;
  readonly trackDataHref: string | null;
}

/** Sent on initial load and after any exercise is opened; provides recent items. */
export interface LoadRecentPlotsMessage {
  readonly type: 'loadRecentPlots';
  readonly recentPlots: RecentlyOpenedEntryMessage[];
}

/** Recently opened exercise entry. */
export interface RecentlyOpenedEntryMessage {
  readonly plotId: string;
  readonly title: string;
  readonly storeId: string;
  readonly lastOpened: string;
  readonly uri: string;
}

/** Request GeoJSON track data for a specific item (webview → extension). */
export interface RequestTrackDataMessage {
  readonly type: 'requestTrackData';
  readonly itemId: string;
  readonly trackDataHref: string;
}

/** Response with GeoJSON track data (extension → webview). */
export interface TrackDataResponseMessage {
  readonly type: 'trackDataResponse';
  readonly itemId: string;
  readonly trackData: unknown; // GeoJSON FeatureCollection
  readonly error?: string;
}

/** Sent when the analyst clicks an exercise to open it (webview → extension). */
export interface OpenExerciseMessage {
  readonly type: 'openExercise';
  readonly itemPath: string;
}

/** Sent when the exercise list webview has finished initialising (webview → extension). */
export interface ExerciseListReadyMessage {
  readonly type: 'exerciseListReady';
}

// ============================================================================
// Re-exports for webview
// ============================================================================

export type { LayerStyle, ResultLayer } from '../types/tool';
export type { DebriefFeature } from '@debrief/components';
