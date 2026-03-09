/**
 * Map Panel - Webview panel controller for the Leaflet map
 *
 * This controller manages the webview lifecycle, message passing,
 * and state persistence for the map panel.
 *
 * Feature: 029-session-state-vscode
 * - Subscribes to session manager for active session changes
 * - Updates webview when viewport/selection/time changes in session
 * - Sends viewport changes to session state (debounced)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { Plot } from '../types/plot';
import type { ResultLayer } from '../types/tool';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from './messages';
import type { IoService } from '../services/ioService';
import type { StacService } from '../services/stacService';
import type { StacStore } from '../types/stac';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import type { ActivityPanelViewProvider } from '../views/activityPanelView';
import type { SessionManager } from '../services/sessionManager';
import {
  subscribeToSpatial,
  subscribeToSelection,
  subscribeToTemporal,
  subscribeToSlice,
  selectors,
  type SessionStoreApi,
  type SessionStoreWithUndo,
  type LogService,
  type DrawingMode,
} from '@debrief/session-state';
import { DuplicateImportError, type GeoJSONFeature } from '../types/import';
import { calculateBounds, mergeBounds } from '../utils/bounds';
import type { DebriefFeature } from '@debrief/components';
import { isTrackFeature } from '@debrief/components';

export class MapPanel {
  public static currentPanel: MapPanel | undefined;
  public static readonly viewType = 'debrief.mapPanel';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  // Current state
  private currentPlot: Plot | null = null;
  private currentFeatures: DebriefFeature[] = [];
  private resultLayers: ResultLayer[] = [];
  private isWebviewReady = false;
  private pendingMessages: ExtensionToWebviewMessage[] = [];

  // Services for REP import
  private ioService: IoService | null = null;
  private stacService: StacService | null = null;
  private currentStore: StacStore | null = null;
  private layersTreeProvider: LayersTreeProvider | null = null;
  private activityPanelProvider: ActivityPanelViewProvider | null = null;

  // Provenance recording (Feature: 094)
  private logService: LogService | null = null;

  // Event handlers
  private onSelectionChangedCallback:
    | ((selection: { featureIds: string[] }) => void)
    | undefined;
  private onExportPngCallback:
    | ((requestId: string) => Promise<void>)
    | undefined;

  // Session manager integration (Feature: 029)
  private activeSession?: SessionStoreApi;
  private spatialUnsubscribe?: () => void;
  private selectionUnsubscribe?: () => void;
  private temporalUnsubscribe?: () => void;
  private hiddenUnsubscribe?: () => void;
  private drawingUnsubscribe?: () => void;
  private sessionChangeDisposable?: vscode.Disposable;
  private viewportUpdateTimeout?: NodeJS.Timeout;
  private static readonly VIEWPORT_DEBOUNCE_MS = 100;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    // Set up webview
    this.panel.webview.html = this.getHtmlForWebview();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        this.handleWebviewMessage(message);
      },
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle visibility changes
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          void vscode.commands.executeCommand(
            'setContext',
            'debrief.mapFocused',
            true
          );
        } else {
          void vscode.commands.executeCommand(
            'setContext',
            'debrief.mapFocused',
            false
          );
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or show a map panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    title: string
  ): MapPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      MapPanel.viewType,
      title,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
        ],
      }
    );

    MapPanel.currentPanel = new MapPanel(panel, extensionUri);
    return MapPanel.currentPanel;
  }

  /**
   * Revive panel from serialization
   */
  public static revive(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ): MapPanel {
    MapPanel.currentPanel = new MapPanel(panel, extensionUri);
    return MapPanel.currentPanel;
  }

  /**
   * Get the webview panel
   */
  public getPanel(): vscode.WebviewPanel {
    return this.panel;
  }

  /**
   * Load a plot into the panel
   */
  public loadPlot(
    plot: Plot,
    features: DebriefFeature[]
  ): void {
    this.currentPlot = plot;
    this.currentFeatures = features;
    this.resultLayers = [];

    // Update panel title
    this.panel.title = plot.title;

    // Send to webview
    this.postMessage({
      type: 'loadPlot',
      plot: {
        id: plot.id,
        title: plot.title,
        features,
        bbox: plot.bbox,
        timeExtent: plot.timeExtent,
      },
    });

    // Update context
    void vscode.commands.executeCommand('setContext', 'debrief.plotOpen', true);
  }

  /**
   * Remove features by ID from in-memory array, then re-send loadPlot to webview.
   */
  public removeFeatures(ids: string[]): void {
    if (!this.currentPlot) {
      return;
    }

    const idSet = new Set(ids);

    this.currentFeatures = this.currentFeatures.filter((f) => !idSet.has(String(f.id)));
    this.resultLayers = this.resultLayers.filter((l) => !idSet.has(l.id));

    // Re-send full plot data so webview rebuilds from source of truth
    this.postMessage({
      type: 'loadPlot',
      plot: {
        id: this.currentPlot.id,
        title: this.currentPlot.title,
        features: this.currentFeatures,
        bbox: this.currentPlot.bbox,
        timeExtent: this.currentPlot.timeExtent,
      },
    });

    // Update result layers context
    if (this.resultLayers.length === 0) {
      void vscode.commands.executeCommand(
        'setContext',
        'debrief.hasResultLayers',
        false
      );
    }

    // Update layers tree provider if available
    if (this.layersTreeProvider) {
      this.layersTreeProvider.setFeatures(this.currentFeatures);
      this.layersTreeProvider.setResultLayers([...this.resultLayers]);
    }

    // Update activity panel webview if available
    if (this.activityPanelProvider) {
      this.activityPanelProvider.setFeatures(this.currentFeatures);
    }
  }

  /**
   * Set selection
   */
  public setSelection(featureIds: string[]): void {
    this.postMessage({
      type: 'setSelection',
      featureIds,
    });
  }

  /**
   * Clear selection
   */
  public clearSelection(): void {
    this.postMessage({ type: 'clearSelection' });
  }

  /**
   * Update plot features in-place (for mutation tool results).
   * Sends the modified features to the webview which replaces matching
   * features in plotFeatures by ID.
   */
  public updatePlotFeatures(layer: ResultLayer): void {
    // Update in-memory currentFeatures so subsequent tool executions
    // (via getFeatures/resolveFeatures) see the mutated geometry.
    const fid = (f: DebriefFeature | { id?: unknown; properties?: Record<string, unknown> | null }) =>
      String((f as { id?: unknown }).id ?? (f.properties as Record<string, unknown> | null)?.id ?? '');
    const updatedMap = new Map(
      layer.features.features.map((f) => [fid(f), f as DebriefFeature])
    );
    this.currentFeatures = this.currentFeatures.map(
      (f) => updatedMap.get(fid(f)) ?? f
    );

    this.postMessage({
      type: 'updatePlotFeatures',
      features: layer.features,
    });
  }

  /**
   * Add a result layer
   */
  public addResultLayer(layer: ResultLayer): void {
    this.resultLayers.push(layer);

    // Skip webview message for artifact layers (no map geometry)
    if (layer.artifactHref) {
      void vscode.commands.executeCommand(
        'setContext',
        'debrief.hasResultLayers',
        true
      );
      return;
    }

    this.postMessage({
      type: 'addResultLayer',
      layer: {
        id: layer.id,
        name: layer.name,
        features: layer.features,
        style: layer.style,
      },
    });

    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      true
    );
  }

  /**
   * Remove a result layer
   */
  public removeResultLayer(layerId: string): void {
    const index = this.resultLayers.findIndex((l) => l.id === layerId);
    if (index !== -1) {
      this.resultLayers.splice(index, 1);
      this.postMessage({
        type: 'removeResultLayer',
        layerId,
      });

      if (this.resultLayers.length === 0) {
        void vscode.commands.executeCommand(
          'setContext',
          'debrief.hasResultLayers',
          false
        );
      }
    }
  }

  /**
   * Clear all result layers
   */
  public clearResultLayers(): void {
    for (const layer of this.resultLayers) {
      this.postMessage({
        type: 'removeResultLayer',
        layerId: layer.id,
      });
    }
    this.resultLayers = [];
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      false
    );
  }

  /**
   * Set layer visibility
   */
  public setLayerVisibility(layerId: string, visible: boolean): void {
    this.postMessage({
      type: 'setLayerVisibility',
      layerId,
      visible,
    });
  }

  /**
   * Fit bounds
   */
  public fitBounds(bounds: [[number, number], [number, number]]): void {
    this.postMessage({
      type: 'fitBounds',
      bounds,
    });
  }

  /**
   * Fit to all tracks
   */
  public fitToAllTracks(): void {
    if (!this.currentPlot) {
      return;
    }

    const [west, south, east, north] = this.currentPlot.bbox;
    this.fitBounds([
      [south, west],
      [north, east],
    ]);
  }

  /**
   * Fit to selection
   */
  public fitToSelection(): void {
    // Get selected IDs from session state
    const selectedIds = this.activeSession
      ? new Set(this.activeSession.getState().selection.featureIds)
      : new Set<string>();

    if (selectedIds.size === 0) {
      return;
    }

    const selectedFeatures = this.currentFeatures.filter(
      (f) => selectedIds.has(String(f.id))
    );
    if (selectedFeatures.length === 0) {
      return;
    }

    // Calculate bounds from selected features
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const feature of selectedFeatures) {
      const geom = feature.geometry;
      const coords = geom.coordinates;
      if (geom.type === 'LineString') {
        for (const coord of coords as number[][]) {
          const lng = coord[0];
          const lat = coord[1];
          if (typeof lng === 'number' && typeof lat === 'number') {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          }
        }
      } else if (geom.type === 'Point') {
        const coord = coords as number[];
        if (coord.length >= 2) {
          minLat = Math.min(minLat, coord[1]!);
          maxLat = Math.max(maxLat, coord[1]!);
          minLng = Math.min(minLng, coord[0]!);
          maxLng = Math.max(maxLng, coord[0]!);
        }
      }
    }

    if (minLat !== Infinity) {
      this.fitBounds([
        [minLat, minLng],
        [maxLat, maxLng],
      ]);
    }
  }

  /**
   * Set time range
   */
  public setTimeRange(start: string, end: string): void {
    this.postMessage({
      type: 'setTimeRange',
      timeRange: { start, end },
    });
  }

  /**
   * Set track color
   */
  public setTrackColor(trackId: string, color: string): void {
    this.postMessage({
      type: 'setTrackColor',
      trackId,
      color,
    });
  }

  /**
   * Register selection change callback
   */
  public onSelectionChanged(callback: (selection: { featureIds: string[] }) => void): void {
    this.onSelectionChangedCallback = callback;
  }

  /**
   * Register export PNG callback
   */
  public onExportPng(callback: (requestId: string) => Promise<void>): void {
    this.onExportPngCallback = callback;
  }

  /**
   * Get current features
   */
  public getFeatures(): DebriefFeature[] {
    return this.currentFeatures;
  }

  /**
   * Get result layers
   */
  public getResultLayers(): ResultLayer[] {
    return this.resultLayers;
  }

  /**
   * Set services for REP import functionality
   */
  public setImportServices(
    ioService: IoService,
    stacService: StacService,
    store: StacStore,
    layersTreeProvider: LayersTreeProvider,
    activityPanelProvider?: ActivityPanelViewProvider
  ): void {
    this.ioService = ioService;
    this.stacService = stacService;
    this.currentStore = store;
    this.layersTreeProvider = layersTreeProvider;
    this.activityPanelProvider = activityPanelProvider ?? null;
  }

  /**
   * Set LogService for provenance recording (Feature: 094)
   */
  public setLogService(logService: LogService): void {
    this.logService = logService;
  }

  /**
   * Get LogService for provenance recording.
   */
  public getLogService(): LogService | null {
    return this.logService;
  }

  /**
   * Get current plot info
   */
  public getCurrentPlot(): Plot | null {
    return this.currentPlot;
  }

  /**
   * Get the feature kind for a feature ID (Feature: 038).
   *
   * Looks up the 'kind' property of features from the current plot data.
   * Returns the kind string (e.g., 'TRACK', 'POINT', 'CIRCLE') or undefined if unknown.
   *
   * @param featureId - The feature ID to look up
   * @returns The feature kind string or undefined
   */
  public getFeatureKind(featureId: string): string | undefined {
    const feature = this.currentFeatures.find((f) => String(f.id) === featureId);
    if (feature) {
      return (feature.properties as Record<string, unknown>).kind as string;
    }

    // Check result layers
    const resultLayer = this.resultLayers.find((l) => l.id === featureId);
    if (resultLayer) {
      return 'RESULT';
    }

    return undefined;
  }

  /**
   * Get current store
   */
  public getCurrentStore(): StacStore | null {
    return this.currentStore;
  }

  /**
   * Set session manager for state synchronization (Feature: 029)
   */
  public setSessionManager(sessionManager: SessionManager): void {
    // Subscribe to active session changes
    this.sessionChangeDisposable = sessionManager.onActiveSessionChange(
      (session) => this.handleActiveSessionChange(session)
    );

    // Initialize with current session if any
    const currentSession = sessionManager.getActiveSession();
    if (currentSession) {
      this.handleActiveSessionChange(currentSession);
    }
  }

  /**
   * Handle active session change (Feature: 029)
   */
  private handleActiveSessionChange(session: SessionStoreApi | null): void {
    // Unsubscribe from previous session
    this.spatialUnsubscribe?.();
    this.selectionUnsubscribe?.();
    this.temporalUnsubscribe?.();
    this.hiddenUnsubscribe?.();
    this.drawingUnsubscribe?.();
    this.spatialUnsubscribe = undefined;
    this.selectionUnsubscribe = undefined;
    this.temporalUnsubscribe = undefined;
    this.hiddenUnsubscribe = undefined;
    this.drawingUnsubscribe = undefined;

    this.activeSession = session ?? undefined;

    if (session) {
      // Subscribe to spatial (viewport) changes
      // Track last viewport sent to map to avoid redundant messages
      let lastSentViewportKey = '';
      this.spatialUnsubscribe = subscribeToSpatial(session, (spatial) => {
        const zoom = spatial.viewport?.zoom;
        if (spatial.viewport !== null && zoom !== undefined) {
          // Calculate center from coordinates: [NW, NE, SE, SW] in [lng, lat] order
          const coords = spatial.viewport.coordinates;
          const centerLng = (coords[0][0] + coords[1][0] + coords[2][0] + coords[3][0]) / 4;
          const centerLat = (coords[0][1] + coords[1][1] + coords[2][1] + coords[3][1]) / 4;
          const viewportKey = `${centerLat.toFixed(6)},${centerLng.toFixed(6)},${zoom}`;

          // Only send if actually different from last sent
          if (viewportKey !== lastSentViewportKey) {
            lastSentViewportKey = viewportKey;
            this.postMessage({
              type: 'setViewport',
              viewport: {
                center: [centerLat, centerLng],
                zoom,
              },
            });
          }
        }
      });

      // Subscribe to selection changes
      this.selectionUnsubscribe = subscribeToSelection(session, (selection) => {
        this.postMessage({
          type: 'setSelection',
          featureIds: selection.featureIds,
        });
      });

      // Send initial temporal state (subscriptions only fire on changes)
      const initialState = session.getState();
      if (initialState.currentTime) {
        this.postMessage({
          type: 'setCurrentTime',
          time: initialState.currentTime,
        });
      }
      {
        const webviewMode = initialState.displayMode === 'snailTrail' ? 'trail' : 'full';
        this.postMessage({
          type: 'setDisplayMode',
          displayMode: webviewMode,
        });
      }

      // Subscribe to temporal (time + displayMode) changes (Feature: 039)
      this.temporalUnsubscribe = subscribeToTemporal(session, (temporal) => {
        if (temporal.currentTime) {
          this.postMessage({
            type: 'setCurrentTime',
            time: temporal.currentTime,
          });
        }
        // Forward display mode to map webview
        const webviewMode = temporal.displayMode === 'snailTrail' ? 'trail' : 'full';
        this.postMessage({
          type: 'setDisplayMode',
          displayMode: webviewMode,
        });
      });

      // Subscribe to hidden feature IDs changes (Feature: 048)
      this.hiddenUnsubscribe = subscribeToSlice(
        session,
        selectors.hiddenFeatureIds,
        (hiddenIds: string[]) => {
          this.postMessage({
            type: 'setHiddenIds',
            hiddenIds,
          });
        }
      );

      // Subscribe to drawing state changes (#108)
      type DrawingState = { drawingMode: DrawingMode; drawingPaletteIndex: number };
      const drawingSelector = (state: SessionStoreWithUndo): DrawingState => ({
        drawingMode: state.drawingMode,
        drawingPaletteIndex: state.drawingPaletteIndex,
      });
      this.drawingUnsubscribe = subscribeToSlice(
        session,
        drawingSelector,
        (drawing: DrawingState, prev: DrawingState) => {
          if (drawing.drawingMode !== prev.drawingMode) {
            this.postMessage({
              type: 'setDrawingMode',
              drawingMode: drawing.drawingMode,
            });
          }
          if (drawing.drawingPaletteIndex !== prev.drawingPaletteIndex) {
            this.postMessage({
              type: 'setDrawingPaletteIndex',
              paletteIndex: drawing.drawingPaletteIndex,
            });
          }
        }
      );
    }
  }

  /**
   * Handle viewport change from webview with debouncing (Feature: 029)
   */
  private handleViewportChanged(viewport: {
    center: [number, number];
    zoom: number;
    bounds?: [[number, number], [number, number], [number, number], [number, number]];
  }): void {
    // Clear existing timeout
    if (this.viewportUpdateTimeout) {
      clearTimeout(this.viewportUpdateTimeout);
    }

    // Debounce viewport updates to session state
    this.viewportUpdateTimeout = setTimeout(() => {
      if (this.activeSession && viewport.bounds) {
        // bounds is [NW, NE, SE, SW] in [lng, lat] order - matches ViewportPolygon format
        const newViewport = {
          coordinates: viewport.bounds,
          zoom: viewport.zoom,
        };
        // Only update if viewport actually changed (avoid feedback loop)
        const state: SessionStoreWithUndo = this.activeSession.getState();
        const currentViewport = state.viewport;
        if (!currentViewport ||
            JSON.stringify(currentViewport.coordinates) !== JSON.stringify(newViewport.coordinates) ||
            currentViewport.zoom !== newViewport.zoom) {
          state.setViewport(newViewport);
        }
      }
    }, MapPanel.VIEWPORT_DEBOUNCE_MS);
  }

  /**
   * Dispose the panel
   */
  public dispose(): void {
    MapPanel.currentPanel = undefined;

    // Clean up session subscriptions (Feature: 029)
    this.spatialUnsubscribe?.();
    this.selectionUnsubscribe?.();
    this.temporalUnsubscribe?.();
    this.drawingUnsubscribe?.();
    this.sessionChangeDisposable?.dispose();
    if (this.viewportUpdateTimeout) {
      clearTimeout(this.viewportUpdateTimeout);
    }

    // Clean up resources
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    // Update context
    void vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);
    void vscode.commands.executeCommand('setContext', 'debrief.mapFocused', false);
    void vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasResultLayers',
      false
    );
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private postMessage(message: ExtensionToWebviewMessage): void {
    if (this.isWebviewReady) {
      void this.panel.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private handleWebviewMessage(message: WebviewToExtensionMessage): void {
    switch (message.type) {
      case 'webviewReady':
        this.isWebviewReady = true;
        // Send any pending messages
        for (const pending of this.pendingMessages) {
          void this.panel.webview.postMessage(pending);
        }
        this.pendingMessages = [];
        // Send current temporal state so the map can render temporally
        // (subscriptions only fire on changes, not initial state)
        if (this.activeSession) {
          const state = this.activeSession.getState();
          if (state.currentTime) {
            this.postMessage({
              type: 'setCurrentTime',
              time: state.currentTime,
            });
          }
          const webviewMode = state.displayMode === 'snailTrail' ? 'trail' : 'full';
          this.postMessage({
            type: 'setDisplayMode',
            displayMode: webviewMode,
          });
        }
        break;

      case 'selectionChanged':
        this.handleSelectionChanged(message);
        break;

      case 'viewStateChanged':
        // Forward viewport changes to session state (Feature: 029)
        if (message.state?.bounds) {
          this.handleViewportChanged({
            center: message.state.center,
            zoom: message.state.zoom,
            bounds: message.state.bounds,
          });
        }
        break;

      case 'viewportChanged':
        // Debounced viewport update to session state (Feature: 029)
        this.handleViewportChanged(message.viewport);
        break;

      case 'requestExportPng':
        void this.handleExportPngRequest(message.requestId);
        break;

      case 'requestTrackColorChange':
        void this.handleTrackColorChangeRequest(
          message.trackId,
          message.trackName
        );
        break;

      case 'requestTrackDetails':
        this.handleTrackDetailsRequest(message.requestId, message.trackId);
        break;

      case 'featureDrawn':
        void this.handleFeatureDrawn(message);
        break;

      case 'repFileDrop':
        void this.handleRepFileDrop(message.uris);
        break;

      case 'requestUndo':
        // Handle undo request from webview keyboard shortcut (Feature: 029)
        if (this.activeSession) {
          const state: SessionStoreWithUndo = this.activeSession.getState();
          if (state.canUndo()) {
            state.undo();
          }
        }
        break;

      case 'requestRedo':
        // Handle redo request from webview keyboard shortcut (Feature: 029)
        if (this.activeSession) {
          const state: SessionStoreWithUndo = this.activeSession.getState();
          if (state.canRedo()) {
            state.redo();
          }
        }
        break;

      case 'drawingModeChanged':
        // Handle drawing mode change from webview (#108)
        if (this.activeSession) {
          this.activeSession.getState().setDrawingMode(message.drawingMode);
        }
        break;
    }
  }

  private handleSelectionChanged(
    message: Extract<WebviewToExtensionMessage, { type: 'selectionChanged' }>
  ): void {
    // Update context
    const hasSelection = message.selection.featureIds.length > 0;
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasSelection',
      hasSelection
    );

    // Notify callback with unified featureIds
    if (this.onSelectionChangedCallback) {
      this.onSelectionChangedCallback({
        featureIds: message.selection.featureIds,
      });
    }
  }

  private async handleFeatureDrawn(
    message: Extract<WebviewToExtensionMessage, { type: 'featureDrawn' }>
  ): Promise<void> {
    const { feature } = message;
    console.log('[debrief] featureDrawn received:', feature.kind, feature.id);

    // Add drawn feature to unified features list
    const drawnFeature: DebriefFeature = {
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: {
        ...feature.properties,
        kind: feature.kind,
        name: feature.name,
        label: feature.label,
      },
    } as DebriefFeature;
    this.currentFeatures = [...this.currentFeatures, drawnFeature];
    console.log('[debrief] Added drawn feature, features count:', this.currentFeatures.length);

    // Increment drawing palette index in session state (#108)
    if (this.activeSession) {
      this.activeSession.getState().incrementDrawingPaletteIndex();
    }

    // Update layers and activity panels
    if (this.layersTreeProvider) {
      this.layersTreeProvider.setFeatures(this.currentFeatures);
    }
    if (this.activityPanelProvider) {
      this.activityPanelProvider.setFeatures(this.currentFeatures);
    }

    // Record provenance (Feature: 094)
    if (!this.logService) {
      console.warn('[debrief] MapPanel: drawn-feature provenance skipped — logService not set. Was setLogService() called?');
    }
    if (this.logService && this.stacService) {
      try {
        const store = this.getCurrentStore();
        const plot = this.getCurrentPlot();
        if (store?.path && plot?.itemPath) {
          const toolId = feature.kind === 'POINT' ? 'draw-point' : 'draw-rectangle';
          await this.logService.recordToolResult(
            {
              success: true,
              features: {
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  id: feature.id,
                  geometry: feature.geometry as { type: string; coordinates: unknown },
                  properties: feature.properties,
                }],
              },
              durationMs: 0,
              resultType: 'addition/drawn-feature',
              sourceFeatureIds: [],
              toolId,
            },
            {
              createdFeatures: [feature.id],
              parameters: {
                featureKind: { value: feature.kind, default: false, tunable: false },
              },
            },
            store.path,
            plot.itemPath
          );
          console.log('[debrief] Provenance recorded for drawn feature:', feature.id);
        }
      } catch (err) {
        console.warn('[debrief] Failed to record drawn feature provenance:', err);
      }
    }
  }

  private async handleExportPngRequest(requestId: string): Promise<void> {
    if (this.onExportPngCallback) {
      await this.onExportPngCallback(requestId);
    }
  }

  private async handleTrackColorChangeRequest(
    trackId: string,
    trackName: string
  ): Promise<void> {
    // Show color picker
    const feature = this.currentFeatures.find((f) => String(f.id) === trackId);
    const props = feature?.properties as Record<string, unknown> | undefined;
    const style = props?.style as Record<string, unknown> | undefined;
    const lineStyle = style?.line as Record<string, unknown> | undefined;
    const currentColor = (lineStyle?.color as string) ?? (style?.color as string) ?? '#377eb8';

    const result = await vscode.window.showInputBox({
      prompt: `Enter color for ${trackName}`,
      value: currentColor,
      validateInput: (value) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Please enter a valid hex color (e.g., #FF0000)';
        }
        return null;
      },
    });

    if (result) {
      this.setTrackColor(trackId, result);
    }
  }

  /**
   * Handle REP file drop - orchestrates IoService → StacService
   */
  private async handleRepFileDrop(uris: string[]): Promise<void> {
    const currentPlot = this.currentPlot;
    const currentStore = this.currentStore;
    const ioService = this.ioService;
    const stacService = this.stacService;

    if (!currentPlot || !currentStore) {
      void vscode.window.showErrorMessage(
        'No plot is currently open. Please open a plot first.'
      );
      return;
    }

    if (!ioService || !stacService) {
      void vscode.window.showErrorMessage(
        'Import services not available. REP import requires debrief-io service.'
      );
      return;
    }

    if (uris.length === 0) {
      return;
    }

    // Get the first URI (single file only)
    const uri = uris[0];
    if (!uri) {
      return;
    }
    const filePath = uri.startsWith('file://') ? uri.slice(7) : uri;
    const filename = path.basename(filePath);
    const assetKey = path.parse(filename).name;

    try {
      // Check for duplicate import
      this.postMessage({
        type: 'importProgress',
        stage: 'parsing',
        message: 'Checking for duplicates...',
      });

      const isDuplicate = await stacService.hasAsset(
        currentStore.path,
        currentPlot.itemPath,
        assetKey
      );

      if (isDuplicate) {
        // Show warning - only option is Cancel, so any result means abort
        await vscode.window.showWarningMessage(
          `File "${filename}" has already been imported to this plot.`,
          'Cancel'
        );
        this.postMessage({ type: 'importProgress', stage: 'complete' });
        return;
      }

      // Parse REP file
      this.postMessage({
        type: 'importProgress',
        stage: 'parsing',
        message: `Parsing ${filename}...`,
      });

      const parseResult = await ioService.parseRep(filePath);

      if (parseResult.warnings.length > 0) {
        // Show warnings but continue
        const warningMessages = parseResult.warnings
          .slice(0, 3)
          .map((w) => w.message)
          .join('; ');
        void vscode.window.showWarningMessage(
          `Parsed with warnings: ${warningMessages}`
        );
      }

      if (parseResult.features.length === 0) {
        void vscode.window.showWarningMessage(
          `No features found in ${filename}`
        );
        this.postMessage({ type: 'importProgress', stage: 'complete' });
        return;
      }

      // Store asset
      this.postMessage({
        type: 'importProgress',
        stage: 'storing',
        message: 'Storing asset...',
      });

      await stacService.addAsset(
        currentStore.path,
        currentPlot.itemPath,
        filePath,
        assetKey
      );

      // Store features
      this.postMessage({
        type: 'importProgress',
        stage: 'storing',
        message: 'Storing features...',
      });

      // Convert to the format StacService expects
      const safeFeatures = parseResult.features.map((f: GeoJSONFeature) => ({
        type: 'Feature' as const,
        geometry: {
          type: f.geometry.type,
          coordinates: f.geometry.coordinates as number[] | number[][],
        },
        properties: f.properties,
      }));

      await stacService.addFeatures(
        currentStore.path,
        currentPlot.itemPath,
        safeFeatures
      );

      // Calculate bounds for zoom
      const newBounds = calculateBounds(parseResult.features);
      const mergedBounds = mergeBounds(
        currentPlot.bbox,
        newBounds
      );

      // Reload plot data to get new tracks
      stacService.clearCache();
      const updatedData = await stacService.loadPlotData(
        currentStore,
        currentPlot.itemPath
      );

      if (updatedData) {
        // Update internal state
        this.currentFeatures = updatedData.features;

        // Update webview with new features
        this.postMessage({
          type: 'loadPlot',
          plot: {
            id: currentPlot.id,
            title: currentPlot.title,
            features: updatedData.features,
            bbox: mergedBounds ?? currentPlot.bbox,
            timeExtent: currentPlot.timeExtent,
          },
        });

        // Update layers and activity panels
        this.layersTreeProvider?.setFeatures(updatedData.features);
        this.activityPanelProvider?.setFeatures(updatedData.features);
      }

      // Send completion message
      this.postMessage({
        type: 'importComplete',
        featureCount: parseResult.features.length,
        bounds: mergedBounds ?? [0, 0, 0, 0],
      });

      // Show success notification
      void vscode.window.showInformationMessage(
        `Imported ${parseResult.features.length} feature(s) from ${filename}`
      );

      // Trigger tree refresh
      void vscode.commands.executeCommand('debrief.refreshStore', {
        storeId: currentStore.id,
      });

    } catch (error) {
      this.postMessage({
        type: 'importProgress',
        stage: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
      });

      if (error instanceof DuplicateImportError) {
        void vscode.window.showWarningMessage(error.message);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Import failed: ${message}`);
      }
    }
  }

  private handleTrackDetailsRequest(
    requestId: string,
    trackId: string
  ): void {
    const feature = this.currentFeatures.find((f) => String(f.id) === trackId);

    if (!feature || !isTrackFeature(feature)) {
      void this.panel.webview.postMessage({
        type: 'requestTrackDetailsResponse',
        requestId,
        success: false,
        error: 'Track not found',
      });
      return;
    }

    const props = feature.properties;
    // Calculate duration
    const startDate = new Date(props.start_time);
    const endDate = new Date(props.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const duration =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    void this.panel.webview.postMessage({
      type: 'requestTrackDetailsResponse',
      requestId,
      success: true,
      details: {
        name: props.platform_name ?? props.platform_id,
        platformType: props.track_type ?? 'Unknown',
        pointCount: (feature.geometry as unknown as { coordinates: number[][] }).coordinates.length,
        startTime: props.start_time,
        endTime: props.end_time,
        duration,
      },
    });
  }

  /**
   * Generate HTML for the map webview.
   * Uses the shared @debrief/components/MapView via thin React wrapper.
   */
  private getHtmlForWebview(): string {
    const webview = this.panel.webview;

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'mapView.js')
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'styles.css')
    );

    const cspSource = webview.cspSource;
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data: https:;">
  <title>Debrief Map</title>
  <link rel="stylesheet" href="${stylesUri.toString()}">
  <style>
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}

/**
 * Webview panel serializer for session restore
 */
export class MapPanelSerializer implements vscode.WebviewPanelSerializer {
  constructor(private extensionUri: vscode.Uri) {}

  deserializeWebviewPanel(
    webviewPanel: vscode.WebviewPanel,
    _state: unknown
  ): Promise<void> {
    MapPanel.revive(webviewPanel, this.extensionUri);
    return Promise.resolve();
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
