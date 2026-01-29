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

// State (reserved for future filtering/queries)
let _currentTracks: Track[] = [];
let _currentLocations: ReferenceLocation[] = [];
let currentBbox: [number, number, number, number] | null = null;

// Layer for other GeoJSON features (polygons, etc.)
let otherFeaturesLayer: L.GeoJSON | null = null;

// Flag to suppress view notifications during undo/redo (Feature: 029)
let suppressViewNotify = false;

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
  setupDropZone();

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
 * Set up drag-and-drop event listeners for REP file import
 */
function setupDropZone(): void {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) {
    return;
  }

  // Prevent default drag behavior
  mapContainer.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mapContainer.classList.add('drop-active');
  });

  mapContainer.addEventListener('dragleave', (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mapContainer.classList.remove('drop-active');
  });

  mapContainer.addEventListener('dragenter', (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Handle file drop
  mapContainer.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    mapContainer.classList.remove('drop-active');

    // Get URI list (VS Code explorer uses text/uri-list)
    const uriList = e.dataTransfer?.getData('text/uri-list');

    // Try multiple approaches to get dropped file path
    let droppedFilePath: string | null = null;

    // Approach 1: VS Code URI list (from VS Code explorer)
    if (uriList) {
      const uris = uriList.split('\n').filter((u: string) => u.trim() && !u.startsWith('#'));
      if (uris.length > 0) {
        droppedFilePath = uris[0] ?? null;
      }
    }

    // Approach 2: Native file drop (if not from VS Code)
    const files = e.dataTransfer?.files;
    if (!droppedFilePath && files && files.length > 0) {
      const items = e.dataTransfer?.items;
      if (items && items.length > 0) {
        const item = items[0];
        if (item.kind === 'file') {
          const fileEntry = item.getAsFile();
          droppedFilePath = (fileEntry as File & { path?: string })?.path ?? null;
        }
      }
    }

    if (!droppedFilePath) {
      showDropError('Could not read dropped file. Try using right-click menu instead.');
      return;
    }

    // Convert file:// URI to path if needed
    if (droppedFilePath.startsWith('file://')) {
      droppedFilePath = decodeURIComponent(droppedFilePath.slice(7));
    }

    // Check file extension
    if (!droppedFilePath.toLowerCase().endsWith('.rep')) {
      const filename = droppedFilePath.split('/').pop() ?? droppedFilePath;
      showDropError(`Cannot import "${filename}": only .rep files are supported.`);
      return;
    }

    vscode.postMessage({
      type: 'repFileDrop',
      uris: [droppedFilePath],
    });
  });
}

/**
 * Show drop error message
 */
function showDropError(message: string): void {
  // Create temporary error overlay
  const overlay = document.createElement('div');
  overlay.className = 'drop-error-overlay';
  overlay.innerHTML = `
    <div class="drop-error-message">
      <span class="drop-error-icon">⚠️</span>
      <span>${message}</span>
    </div>
  `;

  const container = document.getElementById('map-container');
  container?.appendChild(overlay);

  // Remove after 3 seconds
  setTimeout(() => {
    overlay.remove();
  }, 3000);
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
  if (!map || suppressViewNotify) {
    return;
  }

  const center = map.getCenter();
  const leafletBounds = map.getBounds();
  // Convert to [NW, NE, SE, SW] in [lng, lat] order for GeoJSON compatibility
  const bounds: [[number, number], [number, number], [number, number], [number, number]] = [
    [leafletBounds.getNorthWest().lng, leafletBounds.getNorthWest().lat], // NW
    [leafletBounds.getNorthEast().lng, leafletBounds.getNorthEast().lat], // NE
    [leafletBounds.getSouthEast().lng, leafletBounds.getSouthEast().lat], // SE
    [leafletBounds.getSouthWest().lng, leafletBounds.getSouthWest().lat], // SW
  ];

  const message: WebviewToExtensionMessage = {
    type: 'viewStateChanged',
    state: {
      center: [center.lat, center.lng],
      zoom: map.getZoom(),
      timeRange: timeFilter?.getCurrentRange() ?? { start: '', end: '' },
      bounds,
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

    case 'setViewport':
      handleSetViewport(message);
      break;

    case 'setCurrentTime':
      handleSetCurrentTime(message);
      break;

    case 'setDisplayMode':
      handleSetDisplayMode(message);
      break;

    case 'importProgress':
      handleImportProgress(message);
      break;

    case 'importComplete':
      handleImportComplete(message);
      break;

    default:
      console.warn('Unknown message type:', (message as { type: string }).type);
  }
}

/**
 * Handle import progress message
 */
function handleImportProgress(
  message: Extract<ExtensionToWebviewMessage, { type: 'importProgress' }>
): void {
  const existingOverlay = document.querySelector('.import-progress-overlay');

  if (message.stage === 'complete' || message.stage === 'error') {
    existingOverlay?.remove();
    return;
  }

  if (!existingOverlay) {
    const overlay = document.createElement('div');
    overlay.className = 'import-progress-overlay';
    overlay.innerHTML = `
      <div class="import-progress-message">
        <span class="import-progress-spinner"></span>
        <span class="import-progress-text">${message.message ?? 'Importing...'}</span>
      </div>
    `;
    document.getElementById('map-container')?.appendChild(overlay);
  } else {
    const textEl = existingOverlay.querySelector('.import-progress-text');
    if (textEl) {
      textEl.textContent = message.message ?? 'Importing...';
    }
  }
}

/**
 * Handle import complete message
 */
function handleImportComplete(
  message: Extract<ExtensionToWebviewMessage, { type: 'importComplete' }>
): void {
  // Remove progress overlay
  document.querySelector('.import-progress-overlay')?.remove();

  // Fit to new bounds
  if (map && message.bounds) {
    const [minLon, minLat, maxLon, maxLat] = message.bounds;
    const bounds = L.latLngBounds(
      L.latLng(minLat, minLon),
      L.latLng(maxLat, maxLon)
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  // Show brief success message
  const overlay = document.createElement('div');
  overlay.className = 'import-success-overlay';
  overlay.innerHTML = `
    <div class="import-success-message">
      <span class="import-success-icon">✓</span>
      <span>Imported ${message.featureCount} feature${message.featureCount !== 1 ? 's' : ''}</span>
    </div>
  `;
  document.getElementById('map-container')?.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
  }, 2000);
}

function handleLoadPlot(message: Extract<ExtensionToWebviewMessage, { type: 'loadPlot' }>): void {
  const { plot } = message;

  // Store current data
  _currentTracks = plot.tracks;
  _currentLocations = plot.locations;
  currentBbox = plot.bbox;

  // Clear existing layers
  trackRenderer?.clear();
  locationRenderer?.clear();
  resultRenderer?.clear();
  selectionManager?.clearSelection();

  // Clear other features layer
  if (otherFeaturesLayer && map) {
    map.removeLayer(otherFeaturesLayer);
    otherFeaturesLayer = null;
  }

  // Render tracks and locations
  trackRenderer?.renderTracks(plot.tracks);
  locationRenderer?.renderLocations(plot.locations);

  // Render other features (polygons, etc.) with standard GeoJSON layer
  if (plot.otherFeatures && plot.otherFeatures.length > 0 && map) {
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: plot.otherFeatures,
    };

    otherFeaturesLayer = L.geoJSON(featureCollection as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        // Use properties for styling if available, otherwise defaults
        const props = feature?.properties ?? {};
        return {
          color: (props.stroke as string) ?? '#3388ff',
          weight: (props['stroke-width'] as number) ?? 2,
          opacity: (props['stroke-opacity'] as number) ?? 1,
          fillColor: (props.fill as string) ?? '#3388ff',
          fillOpacity: (props['fill-opacity'] as number) ?? 0.2,
        };
      },
      pointToLayer: (feature, latlng) => {
        // Render points as circle markers
        const props = feature?.properties ?? {};
        return L.circleMarker(latlng, {
          radius: 6,
          color: (props.stroke as string) ?? '#3388ff',
          fillColor: (props.fill as string) ?? '#3388ff',
          fillOpacity: 0.6,
        });
      },
      onEachFeature: (feature, layer) => {
        // Add popup with feature info
        const props = feature?.properties ?? {};
        const name = (props.name as string) ?? (props.kind as string) ?? 'Feature';
        layer.bindTooltip(name);
      },
    });

    otherFeaturesLayer.addTo(map);
  }

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
  _currentTracks =message.tracks;
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

/**
 * Handle setViewport message from extension (for undo/redo).
 * Sets the map view without notifying extension back (to avoid loop).
 */
function handleSetViewport(
  message: Extract<ExtensionToWebviewMessage, { type: 'setViewport' }>
): void {
  if (!map) return;
  suppressViewNotify = true;
  map.setView(message.viewport.center, message.viewport.zoom, { animate: false });
  saveViewState();
  // Reset flag after current event cycle
  setTimeout(() => { suppressViewNotify = false; }, 0);
}

/**
 * Handle setCurrentTime message from extension (Feature: 039).
 * Updates track rendering to reflect the current temporal position.
 */
function handleSetCurrentTime(
  message: Extract<ExtensionToWebviewMessage, { type: 'setCurrentTime' }>
): void {
  trackRenderer?.setCurrentTime(message.time);
}

/**
 * Handle setDisplayMode message from extension (Feature: 039).
 * Switches between full-track and snail-trail rendering.
 */
function handleSetDisplayMode(
  message: Extract<ExtensionToWebviewMessage, { type: 'setDisplayMode' }>
): void {
  trackRenderer?.setDisplayMode(message.displayMode);
}

// Listen for messages from extension
window.addEventListener('message', (event) => {
  const message = event.data as ExtensionToWebviewMessage;
  handleMessage(message);
});

// Handle keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo)
// These need to be captured in the webview since it's an iframe
window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault();
    vscode.postMessage({ type: 'requestUndo' } as WebviewToExtensionMessage);
  } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
    event.preventDefault();
    vscode.postMessage({ type: 'requestRedo' } as WebviewToExtensionMessage);
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMap);
} else {
  initializeMap();
}
