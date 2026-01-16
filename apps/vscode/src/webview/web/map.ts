import * as L from 'leaflet';
import { SelectionManager } from './selectionManager';
import { TrackRenderer } from './trackRenderer';
import { LocationRenderer } from './locationRenderer';
import { ResultRenderer } from './resultRenderer';
import { TimeFilter } from './timeFilter';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  Track,
  ReferenceLocation,
  ResultLayer,
} from '../messages';

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): MapViewState | undefined;
  setState(state: MapViewState): void;
};

interface MapViewState {
  center: [number, number];
  zoom: number;
  timeRange?: { start: string; end: string };
  trackColors?: Record<string, string>;
}

// VS Code API reference
const vscode = acquireVsCodeApi();

// Map instance
let map: L.Map | null = null;

// Renderers
let trackRenderer: TrackRenderer | null = null;
let locationRenderer: LocationRenderer | null = null;
let resultRenderer: ResultRenderer | null = null;
let selectionManager: SelectionManager | null = null;
let timeFilter: TimeFilter | null = null;

// State
let currentTracks: Track[] = [];
let currentLocations: ReferenceLocation[] = [];
let currentBbox: [number, number, number, number] | null = null;

/**
 * Initialize the Leaflet map
 */
function initializeMap(): void {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  // Create map with Canvas renderer for performance
  map = L.map(mapContainer, {
    renderer: L.canvas(),
    zoomControl: false, // We use custom toolbar
    attributionControl: false,
  });

  // Add scale control (bottom-right per spec)
  L.control.scale({
    position: 'bottomright',
    metric: true,
    imperial: true,
  }).addTo(map);

  // Add a simple tile layer (offline-friendly base)
  // Note: In production, this could be a bundled tile set
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '',
  }).addTo(map);

  // Initialize renderers
  trackRenderer = new TrackRenderer(map);
  locationRenderer = new LocationRenderer(map);
  resultRenderer = new ResultRenderer(map);
  selectionManager = new SelectionManager(
    trackRenderer,
    locationRenderer,
    onSelectionChanged
  );
  timeFilter = new TimeFilter(trackRenderer);

  // Set up event listeners
  setupMapEvents();
  setupToolbarEvents();

  // Restore state if available
  const savedState = vscode.getState();
  if (savedState) {
    map.setView(savedState.center, savedState.zoom);
    if (savedState.trackColors) {
      trackRenderer.setTrackColors(savedState.trackColors);
    }
  } else {
    // Default view (world)
    map.setView([0, 0], 2);
  }

  // Hide welcome view when map is ready
  const welcomeView = document.getElementById('welcome-view');
  if (welcomeView) {
    welcomeView.classList.add('hidden');
  }

  // Notify extension that webview is ready
  vscode.postMessage({ type: 'webviewReady' });
}

/**
 * Set up map event listeners
 */
function setupMapEvents(): void {
  if (!map) {
    return;
  }

  // Save view state on move/zoom
  map.on('moveend', () => {
    saveViewState();
    notifyViewStateChanged();
  });

  map.on('zoomend', () => {
    saveViewState();
    notifyViewStateChanged();
  });

  // Handle clicks for selection
  map.on('click', (e: L.LeafletMouseEvent) => {
    // Check if click was on empty space
    if (!e.originalEvent.defaultPrevented) {
      selectionManager?.clearSelection();
    }
  });
}

/**
 * Set up toolbar button events
 */
function setupToolbarEvents(): void {
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    map?.zoomIn();
  });

  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    map?.zoomOut();
  });

  document.getElementById('btn-fit-bounds')?.addEventListener('click', () => {
    fitToAllTracks();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    requestExportPng();
  });
}

/**
 * Save current view state
 */
function saveViewState(): void {
  if (!map) {
    return;
  }

  const center = map.getCenter();
  const state: MapViewState = {
    center: [center.lat, center.lng],
    zoom: map.getZoom(),
    trackColors: trackRenderer?.getTrackColors(),
  };

  if (timeFilter) {
    const range = timeFilter.getCurrentRange();
    if (range) {
      state.timeRange = range;
    }
  }

  vscode.setState(state);
}

/**
 * Notify extension of view state change
 */
function notifyViewStateChanged(): void {
  if (!map) {
    return;
  }

  const center = map.getCenter();
  const message: WebviewToExtensionMessage = {
    type: 'viewStateChanged',
    state: {
      center: [center.lat, center.lng],
      zoom: map.getZoom(),
      timeRange: timeFilter?.getCurrentRange() ?? { start: '', end: '' },
    },
  };

  vscode.postMessage(message);
}

/**
 * Handle selection change
 */
function onSelectionChanged(
  trackIds: string[],
  locationIds: string[],
  contextType: 'none' | 'single-track' | 'multi-track' | 'location' | 'mixed'
): void {
  vscode.postMessage({
    type: 'selectionChanged',
    selection: {
      trackIds,
      locationIds,
      contextType,
    },
  });
}

/**
 * Fit map to all tracks
 */
function fitToAllTracks(): void {
  if (!map || !currentBbox) {
    return;
  }

  const [west, south, east, north] = currentBbox;
  const bounds = L.latLngBounds(
    L.latLng(south, west),
    L.latLng(north, east)
  );

  map.fitBounds(bounds, { padding: [50, 50] });
}

/**
 * Request PNG export
 */
function requestExportPng(): void {
  vscode.postMessage({
    type: 'requestExportPng',
    requestId: `export-${Date.now()}`,
  });
}

/**
 * Handle messages from extension
 */
function handleMessage(message: ExtensionToWebviewMessage): void {
  switch (message.type) {
    case 'loadPlot':
      handleLoadPlot(message);
      break;

    case 'updateTracks':
      handleUpdateTracks(message);
      break;

    case 'setSelection':
      handleSetSelection(message);
      break;

    case 'clearSelection':
      selectionManager?.clearSelection();
      break;

    case 'addResultLayer':
      handleAddResultLayer(message);
      break;

    case 'removeResultLayer':
      resultRenderer?.removeLayer(message.layerId);
      break;

    case 'setLayerVisibility':
      handleSetLayerVisibility(message);
      break;

    case 'fitBounds':
      handleFitBounds(message);
      break;

    case 'setTimeRange':
      handleSetTimeRange(message);
      break;

    case 'setTrackColor':
      handleSetTrackColor(message);
      break;

    default:
      console.warn('Unknown message type:', (message as { type: string }).type);
  }
}

function handleLoadPlot(message: Extract<ExtensionToWebviewMessage, { type: 'loadPlot' }>): void {
  const { plot } = message;

  // Store current data
  currentTracks = plot.tracks;
  currentLocations = plot.locations;
  currentBbox = plot.bbox;

  // Clear existing layers
  trackRenderer?.clear();
  locationRenderer?.clear();
  resultRenderer?.clear();
  selectionManager?.clearSelection();

  // Render tracks and locations
  trackRenderer?.renderTracks(plot.tracks);
  locationRenderer?.renderLocations(plot.locations);

  // Initialize time filter
  timeFilter?.initialize(plot.timeExtent[0], plot.timeExtent[1]);

  // Fit to bounds
  fitToAllTracks();

  // Hide welcome view
  const welcomeView = document.getElementById('welcome-view');
  if (welcomeView) {
    welcomeView.classList.add('hidden');
  }
}

function handleUpdateTracks(
  message: Extract<ExtensionToWebviewMessage, { type: 'updateTracks' }>
): void {
  currentTracks = message.tracks;
  trackRenderer?.renderTracks(message.tracks);
}

function handleSetSelection(
  message: Extract<ExtensionToWebviewMessage, { type: 'setSelection' }>
): void {
  selectionManager?.setSelection(
    message.selection.trackIds,
    message.selection.locationIds
  );
}

function handleAddResultLayer(
  message: Extract<ExtensionToWebviewMessage, { type: 'addResultLayer' }>
): void {
  resultRenderer?.addLayer(
    message.layer.id,
    message.layer.name,
    message.layer.features,
    message.layer.style
  );
}

function handleSetLayerVisibility(
  message: Extract<ExtensionToWebviewMessage, { type: 'setLayerVisibility' }>
): void {
  if (message.layerId.startsWith('track-')) {
    trackRenderer?.setTrackVisibility(message.layerId.replace('track-', ''), message.visible);
  } else if (message.layerId.startsWith('location-')) {
    locationRenderer?.setLocationVisibility(
      message.layerId.replace('location-', ''),
      message.visible
    );
  } else {
    resultRenderer?.setLayerVisibility(message.layerId, message.visible);
  }
}

function handleFitBounds(
  message: Extract<ExtensionToWebviewMessage, { type: 'fitBounds' }>
): void {
  if (!map) {
    return;
  }

  const [[south, west], [north, east]] = message.bounds;
  const bounds = L.latLngBounds(
    L.latLng(south, west),
    L.latLng(north, east)
  );

  map.fitBounds(bounds, { padding: [50, 50] });
}

function handleSetTimeRange(
  message: Extract<ExtensionToWebviewMessage, { type: 'setTimeRange' }>
): void {
  timeFilter?.setRange(message.timeRange.start, message.timeRange.end);
  saveViewState();
}

function handleSetTrackColor(
  message: Extract<ExtensionToWebviewMessage, { type: 'setTrackColor' }>
): void {
  trackRenderer?.setTrackColor(message.trackId, message.color);
  saveViewState();
}

// Listen for messages from extension
window.addEventListener('message', (event) => {
  const message = event.data as ExtensionToWebviewMessage;
  handleMessage(message);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMap);
} else {
  initializeMap();
}
