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
import { DuplicateImportError } from '../types/import';
import type { SafeFeature } from '@debrief/utils';
import {
  calculateBounds,
  mergeBounds,
  boundsToLeaflet,
  fromGeoJSONCoord,
} from '@debrief/utils';
import type { DebriefFeature, DebriefFeatureCollection, TrackFeature } from '@debrief/components';
import { isTrackFeature } from '@debrief/components';
import type { TrackProperties, Viewport, SceneFeature } from '@debrief/schemas';
import type { SceneRectangleSnapshot } from './messages';

// eslint-disable-next-line no-restricted-syntax -- VS Code-local MapPanel is the extension host wrapper; name collides with @debrief/components.MapPanel (React component). Follow-up to rename the host class, #214 scope-adjacent
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

  // Storyboard playback (#217) — events + token allocator
  private readonly _onSceneRectangleClick = new vscode.EventEmitter<string>();
  public readonly onSceneRectangleClick: vscode.Event<string> = this._onSceneRectangleClick.event;
  private readonly _onFlyToComplete = new vscode.EventEmitter<number>();
  public readonly onFlyToComplete: vscode.Event<number> = this._onFlyToComplete.event;
  private readonly _onFeaturesChanged = new vscode.EventEmitter<DebriefFeature[]>();
  public readonly onFeaturesChanged: vscode.Event<DebriefFeature[]> = this._onFeaturesChanged.event;
  private flyToTokenCounter = 0;

  // Session manager integration (Feature: 029)
  private activeSession?: SessionStoreApi;
  private spatialUnsubscribe?: () => void;
  private selectionUnsubscribe?: () => void;
  private temporalUnsubscribe?: () => void;
  private hiddenUnsubscribe?: () => void;
  private drawingUnsubscribe?: () => void;
  private sessionChangeDisposable?: vscode.Disposable;
  private viewportUpdateTimeout?: NodeJS.Timeout;
  /**
   * PR #625 — webview-reported viewport waiting to be written into
   * session-state. Kept as a field (not a closure inside the timer
   * callback) so `flushPendingViewportUpdate` can apply it synchronously
   * — `captureScene` calls flush at the top of every capture so the
   * read of `state.viewport` always sees the latest user pan, even if
   * the debounce timer is still in flight (otherwise the first scene
   * is captured at the *previous* viewport, the initial-fit value).
   */
  private pendingViewportUpdate?: {
    coordinates: { longitude: number; latitude: number }[];
    zoom: number;
  };
  private static readonly VIEWPORT_DEBOUNCE_MS = 100;

  /**
   * PR #625 — echo-suppression key for the spatial→webview push.
   *
   * The spatial subscription posts `setViewport(center, zoom)` to the webview
   * whenever session-state's viewport changes. `center` is computed as
   * `avg(corners.lat), avg(corners.lng)` — which is NOT the same as
   * Leaflet's `map.getCenter()` in Mercator projection (the lat-midpoint of
   * a bounds rectangle differs from the screen-pixel-centre lat by the
   * projection's non-linearity). So when the user pans, the chain is:
   *   1. webview moveend → host viewportChanged → debounce → setViewport(corners).
   *   2. Subscription fires → posts setViewport(avg-centre) BACK to webview.
   *   3. Webview map.setView(avg-centre) → map shifts off Leaflet's
   *      original pixel-centre.
   *
   * That shift is the "jump to one side" reported on PR #623's preview. To
   * suppress it, `handleViewportChanged` records the key it is about to
   * write into session-state; the subscription then sees the matching key
   * and skips the echo. Programmatic viewport changes (session load,
   * scene navigation) still push, because they don't pre-set the key.
   */
  private lastSentViewportKey = '';

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

    this.currentFeatures = this.currentFeatures.filter(
      (f: DebriefFeature) => !idSet.has(String(f.id))
    );
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

    // Update activity panel webview with combined features
    this.syncActivityPanelFeatures();
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
    const fid = (f: { id?: string | number; properties?: unknown }): string =>
      String(f.id ?? (f.properties as { [k: string]: unknown } | null)?.['id'] ?? '');
    const updatedMap = new Map(
      // eslint-disable-next-line no-restricted-syntax
      layer.features.features.map((f) => [fid(f), f as unknown as DebriefFeature])
    );
    this.currentFeatures = this.currentFeatures.map(
      (f: DebriefFeature) => updatedMap.get(fid(f)) ?? f
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

    // Sync combined features to activity panel so result layers
    // appear in the Layers listing immediately (not only after refresh)
    this.syncActivityPanelFeatures();
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
      (f: DebriefFeature) => selectedIds.has(String(f.id))
    );
    if (selectedFeatures.length === 0) {
      return;
    }

    const bounds = calculateBounds(selectedFeatures);
    if (bounds === null) {
      return;
    }
    this.fitBounds(boundsToLeaflet(bounds));
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

  // Thumbnail capture (#174) — pending callback for request/response correlation
  private thumbnailCaptureResolve: ((result: { largePngBase64: string | null; smallPngBase64: string | null }) => void) | null = null;

  /**
   * PR #627 — pending resolver for `requestCurrentViewport`. The host RPC
   * round-trips through the webview message channel so the resolver pairs
   * with the in-flight request; `null` between requests.
   */
  private currentViewportResolve:
    | ((result: {
        center: [number, number];
        zoom: number;
        bounds: [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ];
      } | null) => void)
    | null = null;

  /**
   * Request thumbnail capture from the webview.
   * Returns base64-encoded PNG data for both large and small thumbnails,
   * or null values if capture fails.
   */
  public requestThumbnailCapture(timeoutMs: number = 5000): Promise<{ largePngBase64: string | null; smallPngBase64: string | null }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.thumbnailCaptureResolve = null;
        resolve({ largePngBase64: null, smallPngBase64: null });
      }, timeoutMs);

      this.thumbnailCaptureResolve = (result) => {
        clearTimeout(timer);
        this.thumbnailCaptureResolve = null;
        resolve(result);
      };

      const requestId = `thumb-${Date.now()}`;
      this.postMessage({
        type: 'requestThumbnailCapture',
        requestId,
      });
    });
  }

  /**
   * PR #627 — synchronous-ish RPC to read the live Leaflet viewport from
   * the webview, used by `captureScene` to guarantee the captured viewport
   * matches what the analyst is looking at right now (not whatever stale
   * value `state.viewport` may have lagging behind the moveend → debounce
   * chain). Returns `null` on timeout or if Leaflet hasn't reported ready
   * yet — the caller falls back to `state.viewport` in that case.
   */
  public requestCurrentViewport(timeoutMs: number = 1000): Promise<{
    center: [number, number];
    zoom: number;
    bounds: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
  } | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.currentViewportResolve = null;
        resolve(null);
      }, timeoutMs);

      this.currentViewportResolve = (result) => {
        clearTimeout(timer);
        this.currentViewportResolve = null;
        resolve(result);
      };

      const requestId = `viewport-${Date.now()}`;
      this.postMessage({
        type: 'requestCurrentViewport',
        requestId,
      });
    });
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
   * Get a defensive shallow copy of the current in-memory feature list.
   *
   * Used by capture (#216) to wrap features into a throwaway FeatureCollection
   * at the #215 CRUD boundary without giving callers a live handle to the
   * private field.
   */
  public getCurrentFeatures(): DebriefFeature[] {
    return this.currentFeatures.slice();
  }

  /**
   * Replace the in-memory feature list and re-post a loadPlot-style update
   * so `<mapView>` rerenders. Preserves `currentPlot` (STAC metadata) intact.
   *
   * Used by capture (#216) to push the #215 CRUD-returned FeatureCollection
   * features back into the webview after a Storyboard / Scene create.
   */
  public setFeatures(features: DebriefFeature[]): void {
    this.currentFeatures = features.slice();
    if (this.currentPlot === null) {
      // Still fire onFeaturesChanged — downstream consumers (e.g. the
      // StoryboardPlaybackService) may care about feature-set transitions
      // even before a plot title has been resolved.
      this._onFeaturesChanged.fire(this.currentFeatures.slice());
      return;
    }
    // In-place feature update (Scene capture appends a STORYBOARD_SCENE,
    // edit suite renames/deletes Scenes, etc.). Suppress refitBounds so
    // the user's current pan/zoom is preserved — refitting would snap
    // back to the plot's loaded bbox and erase context the user was
    // composing into the Scene.
    this.postMessage({
      type: 'loadPlot',
      plot: {
        id: this.currentPlot.id,
        title: this.currentPlot.title,
        features: this.currentFeatures,
        bbox: this.currentPlot.bbox,
        timeExtent: this.currentPlot.timeExtent,
      },
      refitBounds: false,
    });
    this._onFeaturesChanged.fire(this.currentFeatures.slice());
  }

  /**
   * Kick off an animated flyTo on the map (#217).
   * Returns a fresh monotonic token that the caller uses to correlate
   * completion via `onFlyToComplete`. A `durationMs === 0` value is
   * forwarded to the webview as a "jump" (`setView` with `animate:false`
   * — see `contracts/map-view-flyto.md` §1).
   */
  public flyToViewport(viewport: Viewport, durationMs: number): number {
    const token = ++this.flyToTokenCounter;
    const centerLon = viewport.center[0];
    const centerLat = viewport.center[1];
    if (centerLon === undefined || centerLat === undefined) {
      // Preserve the token but drop the message; completion fires
      // synchronously so the caller's transition state clears cleanly.
      queueMicrotask(() => this._onFlyToComplete.fire(token));
      return token;
    }
    this.postMessage({
      type: 'flyTo',
      token,
      center: [centerLat, centerLon],
      zoom: viewport.zoom,
      durationMs,
    });
    return token;
  }

  /**
   * Push the active Storyboard's Scene rectangles to the webview (#217).
   * Passing `scenes: null` clears the overlay. The webview-side
   * SceneRectangleLayer reads `scene.geometry.coordinates` (the GeoJSON
   * Polygon) for each rectangle — not `scene.properties.viewport.corners`
   * (plan Fix D).
   */
  public setSceneRectangles(
    scenes: ReadonlyArray<SceneFeature> | null,
    activeStoryboardId: string | null,
    currentSceneId: string | null,
  ): void {
    const snapshots: SceneRectangleSnapshot[] | null = scenes === null
      ? null
      : scenes.map((s) => {
          const geom = s.geometry as
            | { type: 'Polygon'; coordinates: number[][][] }
            | undefined;
          const polygon: readonly (readonly (readonly [number, number])[])[] =
            geom && geom.type === 'Polygon' && Array.isArray(geom.coordinates)
              ? geom.coordinates.map((ring) =>
                  ring.map((pt) => [pt[0] as number, pt[1] as number] as const),
                )
              : [[]];
          // Spec #258 / FR-006 — preserve polygon provenance across the
          // host→webview message boundary. Without this, the webview's
          // `pickPolygonForRender` never sees `'bounds'` and falls back to
          // the legacy recompute path even for newly-captured scenes,
          // shrinking rectangles to whatever `map.getSize()` happened to
          // return at memo time.
          const polygonSource = s.properties._polygon_source;
          return {
            sceneId: s.properties.id,
            viewport: s.properties.viewport,
            timestamp: s.properties.timestamp,
            polygon,
            ...(polygonSource !== undefined && { polygonSource }),
          };
        });
    this.postMessage({
      type: 'setSceneRectangles',
      scenes: snapshots,
      activeStoryboardId,
      currentSceneId,
    });
  }

  /**
   * Get the feature kind for a feature ID (Feature: 038).
   *
   * Looks up the 'kind' property of features from the current plot data
   * and from result layer features.
   * Returns the kind string (e.g., 'TRACK', 'POINT', 'CIRCLE', 'ZONE') or undefined if unknown.
   *
   * @param featureId - The feature ID to look up
   * @returns The feature kind string or undefined
   */
  public getFeatureKind(featureId: string): string | undefined {
    const feature: DebriefFeature | undefined = this.currentFeatures.find(
      (f: DebriefFeature) => String(f.id) === featureId
    );
    if (feature !== undefined) {
      return feature.properties.kind;
    }

    // Check individual features inside result layers
    for (const rl of this.resultLayers) {
      if (rl.id === featureId) {
        // Layer-level match — inspect first feature for kind
        const firstFeature = rl.features.features[0];
        if (firstFeature) {
          const emptyProps: { [k: string]: unknown } = {};
          const kind = (firstFeature.properties ?? emptyProps)['kind'];
          return (typeof kind === 'string' ? kind : undefined) ?? 'RESULT';
        }
        return 'RESULT';
      }
      for (const f of rl.features.features) {
        if (String(f.id) === featureId) {
          const emptyProps: { [k: string]: unknown } = {};
          const kind = (f.properties ?? emptyProps)['kind'];
          return (typeof kind === 'string' ? kind : undefined) ?? 'RESULT';
        }
      }
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
      // Subscribe to spatial (viewport) changes.
      //
      // The key is shared with `handleViewportChanged` (member field
      // `lastSentViewportKey`) so the host can mark a viewport "already
      // sent to the webview" *before* the round-trip starts — see the
      // field's doc-comment for the rationale.
      this.spatialUnsubscribe = subscribeToSpatial(session, (spatial) => {
        const zoom = spatial.viewport?.zoom;
        if (spatial.viewport !== null && zoom !== undefined) {
          const viewportKey = this.viewportPolygonKey(
            spatial.viewport.coordinates,
            zoom,
          );

          if (viewportKey !== this.lastSentViewportKey) {
            this.lastSentViewportKey = viewportKey;
            const coords = spatial.viewport.coordinates;
            const centerLng =
              (coords[0]!.longitude + coords[1]!.longitude + coords[2]!.longitude + coords[3]!.longitude) /
              4;
            const centerLat =
              (coords[0]!.latitude + coords[1]!.latitude + coords[2]!.latitude + coords[3]!.latitude) / 4;
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
      if (initialState.currentTime !== null) {
        this.postMessage({
          type: 'setCurrentTime',
          time: initialState.currentTime,
        });
      }
      this.postMessage({
        type: 'setDisplayMode',
        displayMode: initialState.displayMode,
      });

      // Subscribe to temporal (time + displayMode) changes (Feature: 039)
      this.temporalUnsubscribe = subscribeToTemporal(session, (temporal) => {
        if (temporal.currentTime !== null) {
          this.postMessage({
            type: 'setCurrentTime',
            time: temporal.currentTime,
          });
        }
        // Forward display mode to map webview
        this.postMessage({
          type: 'setDisplayMode',
          displayMode: temporal.displayMode,
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
   * Handle viewport change from webview with debouncing (Feature: 029).
   * PR #625 — keeps the pending viewport in a field so
   * `flushPendingViewportUpdate` can apply it synchronously from
   * `captureScene` (kills the first-scene-captured-at-initial-fit race).
   */
  private handleViewportChanged(viewport: {
    center: [number, number];
    zoom: number;
    bounds?: [[number, number], [number, number], [number, number], [number, number]];
  }): void {
    if (!viewport.bounds) {
      return;
    }
    this.pendingViewportUpdate = {
      // bounds is [NW, NE, SE, SW] in GeoJSON tuple order [lng, lat];
      // feature 203 consolidated ViewportPolygon on the canonical
      // object form, so convert at this boundary via fromGeoJSONCoord.
      coordinates: viewport.bounds.map(fromGeoJSONCoord),
      zoom: viewport.zoom,
    };
    if (this.viewportUpdateTimeout) {
      clearTimeout(this.viewportUpdateTimeout);
    }
    this.viewportUpdateTimeout = setTimeout(() => {
      this.viewportUpdateTimeout = undefined;
      this.applyPendingViewportUpdate();
    }, MapPanel.VIEWPORT_DEBOUNCE_MS);
  }

  /**
   * Synchronously force any in-flight viewport debounce to apply now.
   * Called by `captureScene` so a fresh user pan that has not yet
   * cleared the 100 ms debounce is still written into session-state
   * before the capture reads `state.viewport`. Without this, the very
   * first scene after a pan gets the initial-fit viewport, not what the
   * analyst composed.
   */
  public flushPendingViewportUpdate(): void {
    if (this.viewportUpdateTimeout) {
      clearTimeout(this.viewportUpdateTimeout);
      this.viewportUpdateTimeout = undefined;
    }
    this.applyPendingViewportUpdate();
  }

  /**
   * Write the latest pending viewport into session-state.
   * Echo-suppresses the host→webview round-trip by priming
   * `lastSentViewportKey` before the state mutation — the spatial
   * subscription's synchronous callback then sees a matching key and
   * skips the redundant `setViewport` push (the push would shift the
   * map off pixel-centre by Mercator distortion, see PR #625 commit).
   */
  private applyPendingViewportUpdate(): void {
    const pending = this.pendingViewportUpdate;
    if (!pending || !this.activeSession) {
      return;
    }
    this.pendingViewportUpdate = undefined;

    const state: SessionStoreWithUndo = this.activeSession.getState();
    const currentViewport = state.viewport;
    if (
      currentViewport &&
      JSON.stringify(currentViewport.coordinates) === JSON.stringify(pending.coordinates) &&
      currentViewport.zoom === pending.zoom
    ) {
      return;
    }
    this.lastSentViewportKey = this.viewportPolygonKey(
      pending.coordinates,
      pending.zoom,
    );
    state.setViewport(pending);
  }

  /**
   * Build the canonical key used by the spatial echo-suppression logic.
   * Centred on the same `avg(corners)` value the subscription would
   * post to the webview, so the two sites agree on what "already sent"
   * means.
   */
  private viewportPolygonKey(
    coords: ReadonlyArray<{ longitude: number; latitude: number }>,
    zoom: number,
  ): string {
    const centerLng =
      (coords[0]!.longitude + coords[1]!.longitude + coords[2]!.longitude + coords[3]!.longitude) /
      4;
    const centerLat =
      (coords[0]!.latitude + coords[1]!.latitude + coords[2]!.latitude + coords[3]!.latitude) / 4;
    return `${centerLat.toFixed(6)},${centerLng.toFixed(6)},${zoom}`;
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

    // Clean up storyboard playback emitters (#217)
    this._onSceneRectangleClick.dispose();
    this._onFlyToComplete.dispose();
    this._onFeaturesChanged.dispose();

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

  /**
   * Sync combined source + result-layer features to the activity panel
   * so the Layers listing stays in sync without requiring a page refresh.
   */
  private syncActivityPanelFeatures(): void {
    if (!this.activityPanelProvider) {
      return;
    }
    const allFeatures: DebriefFeature[] = [...this.currentFeatures];
    for (const rl of this.resultLayers) {
      if (!rl.artifactHref) {
        for (const f of rl.features.features) {
          // eslint-disable-next-line no-restricted-syntax -- SafeFeature → DebriefFeature bridge
          allFeatures.push(f as unknown as DebriefFeature);
        }
      }
    }
    this.activityPanelProvider.setFeatures(allFeatures);
  }

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
          if (state.currentTime !== null) {
            this.postMessage({
              type: 'setCurrentTime',
              time: state.currentTime,
            });
          }
          this.postMessage({
            type: 'setDisplayMode',
            displayMode: state.displayMode,
          });
          // Seed drawing state into freshly-mounted webview (#108) — the
          // change-subscription path above only fires on changes, so the
          // initial values must be flushed here. Posted unconditionally
          // (including null/0) so the webview cannot confuse "host has no
          // opinion" with "host says null"; see research.md Decision 3.
          this.postMessage({
            type: 'setDrawingMode',
            drawingMode: state.drawingMode,
          });
          this.postMessage({
            type: 'setDrawingPaletteIndex',
            paletteIndex: state.drawingPaletteIndex,
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

      case 'thumbnailCaptureResponse':
        // Handle thumbnail capture response (#174)
        if (this.thumbnailCaptureResolve) {
          this.thumbnailCaptureResolve({
            largePngBase64: message.largePngBase64,
            smallPngBase64: message.smallPngBase64,
          });
        }
        break;

      case 'currentViewportResponse':
        // PR #627 — pair the response with the in-flight resolver. On
        // `success === false` (Leaflet not ready) report `null` so the
        // caller falls back to `state.viewport`.
        if (this.currentViewportResolve) {
          if (message.success) {
            this.currentViewportResolve({
              center: message.center,
              zoom: message.zoom,
              bounds: message.bounds,
            });
          } else {
            this.currentViewportResolve(null);
          }
        }
        break;

      case 'flyToComplete':
        // Storyboard playback flyTo animation ended (#217)
        this._onFlyToComplete.fire(message.token);
        break;

      case 'sceneRectangleClicked':
        // Storyboard Scene rectangle clicked on the map (#217)
        this._onSceneRectangleClick.fire(message.sceneId);
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
    console.warn('[debrief] featureDrawn received:', feature.kind, feature.id);

    // Add drawn feature to unified features list
    const drawnProps: Record<string, unknown> = {
      ...feature.properties,
      kind: feature.kind,
      name: feature.name,
      label: feature.label,
    };
    const drawnFeatureObj = {
      type: 'Feature' as const,
      id: feature.id,
      geometry: feature.geometry,
      properties: drawnProps,
    };
    // eslint-disable-next-line no-restricted-syntax -- drawn feature → DebriefFeature bridge
    const drawnFeature = drawnFeatureObj as unknown as DebriefFeature;
    this.currentFeatures = [...this.currentFeatures, drawnFeature];
    console.warn('[debrief] Added drawn feature, features count:', this.currentFeatures.length);

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
              duration_ms: 0,
              result_type: 'addition/drawn-feature',
              source_feature_ids: [],
              tool_id: toolId,
            },
            {
              created_features: [feature.id],
              parameters: {
                featureKind: { value: feature.kind, default: false, tunable: false },
              },
            },
            store.path,
            plot.itemPath
          );
          console.warn('[debrief] Provenance recorded for drawn feature:', feature.id);
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
    const feature: DebriefFeature | undefined = this.currentFeatures.find(
      (f: DebriefFeature) => String(f.id) === trackId
    );
    let currentColor = '#377eb8';
    if (feature !== undefined && isTrackFeature(feature)) {
      const lineColor = feature.properties.style.line.color;
      currentColor = lineColor ?? currentColor;
    }

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
      const safeFeatures = parseResult.features.flatMap((f: SafeFeature) => {
        if (!f.geometry) { return []; }
        return [{
          type: 'Feature' as const,
          geometry: {
            type: f.geometry.type,
            coordinates: f.geometry.coordinates as number[] | number[][],
          },
          properties: f.properties,
        }];
      });

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
      const updatedData: DebriefFeatureCollection | null = await stacService.loadPlotData(
        currentStore,
        currentPlot.itemPath
      );

      if (updatedData !== null) {
        // Update internal state
        const updatedFeatures: DebriefFeature[] = updatedData.features;
        this.currentFeatures = updatedFeatures;

        // Update webview with new features
        this.postMessage({
          type: 'loadPlot',
          plot: {
            id: currentPlot.id,
            title: currentPlot.title,
            features: updatedFeatures,
            bbox: mergedBounds ?? currentPlot.bbox,
            timeExtent: currentPlot.timeExtent,
          },
        });

        // Update layers and activity panels
        this.layersTreeProvider?.setFeatures(updatedFeatures);
        this.activityPanelProvider?.setFeatures(updatedFeatures);
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
    const feature: DebriefFeature | undefined = this.currentFeatures.find(
      (f: DebriefFeature) => String(f.id) === trackId
    );

    if (feature === undefined || !isTrackFeature(feature)) {
      void this.panel.webview.postMessage({
        type: 'requestTrackDetailsResponse',
        requestId,
        success: false,
        error: 'Track not found',
      });
      return;
    }

    const trackFeature: TrackFeature = feature;
    const props: TrackProperties = trackFeature.properties;
    // Calculate duration
    const startDate = new Date(props.start_time);
    const endDate = new Date(props.end_time);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    const duration =
      hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const trackGeom = trackFeature.geometry as { coordinates: number[][] };
    void this.panel.webview.postMessage({
      type: 'requestTrackDetailsResponse',
      requestId,
      success: true,
      details: {
        name: props.platform_name ?? props.platform_id,
        platformType: props.track_type ?? 'Unknown',
        pointCount: trackGeom.coordinates.length,
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data: https:; connect-src https:;">
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
