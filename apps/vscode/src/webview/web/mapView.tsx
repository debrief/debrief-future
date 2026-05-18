/**
 * MapView Webview Entry Point
 *
 * Thin wrapper around @debrief/components/MapView that handles VS Code integration.
 * All map rendering logic is in the shared component; this wrapper handles only:
 * - Message passing to/from VS Code extension
 * - State persistence via VS Code API
 * - Drag-and-drop for REP files
 * - Keyboard shortcuts for undo/redo
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { Map as LeafletMap } from 'leaflet';
import { MapView, createDrawnFeature, getPaletteStyleOverrides, captureMapAsDataUrl, downscaleDataUrl } from '@debrief/components';
import type { DebriefFeature, DisplayMode, Bounds, DrawingMode, DrawnFeatureProvenance, FlyToTarget, SceneRectangleLayerProps } from '@debrief/components';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  SceneRectangleSnapshot,
} from '../messages';
import { Bootstrap } from './_bootstrap';

// VS Code API type
declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): PersistedState | undefined;
  setState(state: PersistedState): void;
};

// State persisted across webview lifecycle
interface PersistedState {
  center?: [number, number];
  zoom?: number;
  trackColors?: Record<string, string>;
}

// VS Code API instance
const vscode = acquireVsCodeApi();

/**
 * MapView Webview App
 */
function MapViewApp(): React.ReactElement {
  // Feature state
  const [plotFeatures, setPlotFeatures] = useState<DebriefFeature[]>([]);
  const [resultFeatures, setResultFeatures] = useState<DebriefFeature[]>([]);
  const [trackColors, setTrackColors] = useState<Record<string, string>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Hidden features state
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Viewport state
  const [viewport, setViewport] = useState<{ center: [number, number]; zoom: number } | undefined>();
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  // Drawing state — host-driven mirror (#108). Authoritative value lives in
  // the session-state spatial slice on the extension host. These useState
  // values are seeded by the `webviewReady` flush in mapPanel.ts and kept
  // fresh by the host's change-subscription push (setDrawingMode /
  // setDrawingPaletteIndex messages). Do not promote them back to "source
  // of truth" — write paths go via `drawingModeChanged` to the host.
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [drawnFeatures, setDrawnFeatures] = useState<DebriefFeature[]>([]);
  const [paletteIndex, setPaletteIndex] = useState(0);

  // Notify extension when drawing mode changes (session-state bridge, #108)
  const handleDrawingModeChange = useCallback((mode: DrawingMode) => {
    setDrawingMode(mode); // update local state for immediate UI feedback
    vscode.postMessage({ type: 'drawingModeChanged', drawingMode: mode });
  }, []);

  // Temporal state
  const [currentTime, setCurrentTime] = useState<number | undefined>();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

  // Storyboard playback (#217)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);
  const [sceneRectanglesState, setSceneRectanglesState] = useState<
    | { scenes: readonly SceneRectangleSnapshot[]; activeStoryboardId: string | null; currentSceneId: string | null }
    | null
  >(null);

  // Restore state on mount
  useEffect(() => {
    const saved = vscode.getState();
    if (saved) {
      if (saved.center && saved.zoom) {
        setViewport({ center: saved.center, zoom: saved.zoom });
      }
      if (saved.trackColors) {
        setTrackColors(saved.trackColors);
      }
    }
    // Notify extension that webview is ready
    vscode.postMessage({ type: 'webviewReady' });
  }, []);

  // Merge all features, filtering out hidden ones
  const features = useMemo((): DebriefFeature[] => {
    const allFeatures = [...plotFeatures, ...resultFeatures, ...drawnFeatures];
    // Filter out hidden features
    if (hiddenIds.size === 0) return allFeatures;
    return allFeatures.filter(f => !hiddenIds.has(String(f.id)));
  }, [plotFeatures, resultFeatures, drawnFeatures, hiddenIds]);

  // Message handler
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'loadPlot':
          setPlotFeatures(msg.plot.features);
          setResultFeatures([]);
          // Only refit when the host explicitly requests it (default true
          // for back-compat). In-place feature updates — e.g. Scene
          // capture sending a `setFeatures` reload — pass `refitBounds:
          // false` to preserve the user's pan/zoom.
          if (msg.refitBounds !== false) {
            setFitBoundsTrigger(prev => prev + 1);
          }
          break;
        case 'setSelection':
          setSelectedIds(new Set(msg.featureIds));
          break;
        case 'clearSelection':
          setSelectedIds(new Set());
          break;
        case 'setCurrentTime':
          setCurrentTime(msg.time);
          break;
        case 'setDisplayMode':
          setDisplayMode(msg.displayMode);
          break;
        case 'setHiddenIds':
          setHiddenIds(new Set(msg.hiddenIds));
          break;
        case 'setViewport':
          setViewport({ center: msg.viewport.center, zoom: msg.viewport.zoom });
          break;
        case 'fitBounds':
          setFitBoundsTrigger(prev => prev + 1);
          break;
        case 'setTrackColor':
          setTrackColors(prev => ({ ...prev, [msg.trackId]: msg.color }));
          break;
        case 'addResultLayer':
          // Transform result layer features and add to state
          const newFeatures = msg.layer.features.features.map((f, i) => ({
            ...f,
            id: `${msg.layer.id}-${i}`,
            properties: { ...f.properties, style: msg.layer.style },
          })) as DebriefFeature[];
          setResultFeatures(prev => [...prev, ...newFeatures]);
          break;
        case 'updatePlotFeatures': {
          // Mutation tools: replace matching features in plotFeatures by ID.
          // Features may carry their ID at root (f.id) or in properties.id.
          const fid = (f: { id?: unknown; properties?: Record<string, unknown> | null }) =>
            String(f.id ?? f.properties?.id ?? '');
          const updatedMap = new Map(
            msg.features.features.map(f => [fid(f), f as DebriefFeature])
          );
          setPlotFeatures(prev =>
            prev.map(f => updatedMap.get(fid(f)) ?? f)
          );
          break;
        }
        case 'removeResultLayer':
          setResultFeatures(prev => prev.filter(f => !String(f.id).startsWith(msg.layerId)));
          break;
        case 'setDrawingMode':
          setDrawingMode(msg.drawingMode);
          break;
        case 'setDrawingPaletteIndex':
          setPaletteIndex(msg.paletteIndex);
          break;
        case 'flyTo':
          setFlyToTarget({
            token: msg.token,
            center: msg.center,
            zoom: msg.zoom,
            durationMs: msg.durationMs,
          });
          break;
        case 'setSceneRectangles':
          if (msg.scenes === null) {
            setSceneRectanglesState(null);
          } else {
            setSceneRectanglesState({
              scenes: msg.scenes,
              activeStoryboardId: msg.activeStoryboardId,
              currentSceneId: msg.currentSceneId,
            });
          }
          break;
        case 'requestThumbnailCapture':
          void (async () => {
            try {
              const mapContainer = document.querySelector('.leaflet-container') as HTMLElement | null;
              if (!mapContainer) throw new Error('No .leaflet-container found');
              const largeDataUrl = await captureMapAsDataUrl(mapContainer, { width: 800, height: 600 });
              const smallDataUrl = await downscaleDataUrl(largeDataUrl, { width: 200, height: 150 });
              // Strip data URL prefix to get raw base64
              const largePngBase64 = largeDataUrl.replace(/^data:image\/png;base64,/, '');
              const smallPngBase64 = smallDataUrl.replace(/^data:image\/png;base64,/, '');
              vscode.postMessage({
                type: 'thumbnailCaptureResponse',
                requestId: msg.requestId,
                success: true,
                largePngBase64,
                smallPngBase64,
              });
            } catch (err) {
              vscode.postMessage({
                type: 'thumbnailCaptureResponse',
                requestId: msg.requestId,
                success: false,
                largePngBase64: null,
                smallPngBase64: null,
                error: String(err),
              });
            }
          })();
          break;
        case 'requestCurrentViewport': {
          // PR #627 — answer the host's RPC for the live Leaflet viewport.
          // Read directly from `map.getCenter()`/`getZoom()`/`getBounds()`
          // so the response reflects the user's actual view RIGHT NOW,
          // bypassing the moveend → postMessage → debounce → state.viewport
          // chain that can be stale at first-capture time.
          const map = leafletMapRef.current;
          if (!map) {
            vscode.postMessage({
              type: 'currentViewportResponse',
              requestId: msg.requestId,
              success: false,
              center: [0, 0],
              zoom: 0,
              bounds: [[0, 0], [0, 0], [0, 0], [0, 0]],
              error: 'leaflet map not ready',
            });
            break;
          }
          const centre = map.getCenter();
          const zoom = map.getZoom();
          const mapBounds = map.getBounds();
          const west = mapBounds.getWest();
          const east = mapBounds.getEast();
          const south = mapBounds.getSouth();
          const north = mapBounds.getNorth();
          // 4 corners in NW, NE, SE, SW order, each [lng, lat] — same
          // shape `viewportChanged` already uses.
          const bounds: [
            [number, number],
            [number, number],
            [number, number],
            [number, number],
          ] = [
            [west, north],
            [east, north],
            [east, south],
            [west, south],
          ];
          vscode.postMessage({
            type: 'currentViewportResponse',
            requestId: msg.requestId,
            success: true,
            // `Viewport.center` is [longitude, latitude]; convert from
            // Leaflet's LatLng order before reporting.
            center: [centre.lng, centre.lat],
            zoom,
            bounds,
          });
          break;
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Selection callback
  const handleSelect = useCallback((featureId: string) => {
    vscode.postMessage({
      type: 'selectionChanged',
      selection: {
        featureIds: [featureId],
      },
    });
  }, []);

  // Background click callback
  const handleBackgroundClick = useCallback(() => {
    vscode.postMessage({
      type: 'selectionChanged',
      selection: { featureIds: [] },
    });
  }, []);

  // Track current zoom so bounds-change emissions carry a real zoom
  // rather than the prior hard-coded `10`. handleZoomChange updates this.
  const currentZoomRef = useRef<number>(10);

  // PR #627 — Leaflet map instance reference, populated by the MapView's
  // `onMapReady` callback once Leaflet has mounted. Used to answer the
  // `requestCurrentViewport` RPC at capture time without going through the
  // moveend → debounce → session-state chain (which can be stale for the
  // very first capture if the analyst hasn't panned since composing).
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const handleMapReady = useCallback((map: LeafletMap) => {
    leafletMapRef.current = map;
  }, []);

  // Viewport change callback. #230 FR-050: emit a full `viewportChanged`
  // including the polygon bounds so `mapPanel.handleViewportChanged` can
  // update the session store. Previously this fired `viewStateChanged`
  // without bounds — the host-side branch skipped the update and a fresh
  // capture surfaced "map has not reported a viewport yet".
  // `bounds` from MapView.tsx is [west, south, east, north] (WSEN).
  const handleBoundsChange = useCallback((bounds: Bounds) => {
    const [west, south, east, north] = bounds;
    const center: [number, number] = [
      (south + north) / 2,
      (west + east) / 2,
    ];
    // Four-corner polygon NW, NE, SE, SW in [lng, lat] GeoJSON order.
    const polygon: [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ] = [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ];
    vscode.postMessage({
      type: 'viewportChanged',
      viewport: {
        center,
        zoom: currentZoomRef.current,
        bounds: polygon,
      } as {
        center: [number, number];
        zoom: number;
        bounds: [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ];
      },
    });
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    currentZoomRef.current = zoom;
    const currentState = vscode.getState() ?? {};
    vscode.setState({ ...currentState, zoom });
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        vscode.postMessage({ type: 'requestUndo' });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        vscode.postMessage({ type: 'requestRedo' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // #217 — flyTo completion + scene-rectangle click
  const handleFlyToComplete = useCallback((token: number) => {
    vscode.postMessage({ type: 'flyToComplete', token });
  }, []);

  const handleSceneRectangleClick = useCallback((sceneId: string) => {
    vscode.postMessage({ type: 'sceneRectangleClicked', sceneId });
  }, []);

  // Convert SceneRectangleSnapshot[] (transport-safe primitives) to the
  // SceneFeature shape expected by SceneRectangleLayer. The layer only
  // reads `geometry.coordinates` + `properties.timestamp` + `properties.id`
  // + `properties.storyboard_id` + `properties.viewport`, so a partial
  // synthesis is sufficient.
  const sceneRectangleProps: SceneRectangleLayerProps | undefined = useMemo(() => {
    if (!sceneRectanglesState) return undefined;
    const syntheticScenes = sceneRectanglesState.scenes.map((snap) => ({
      type: 'Feature' as const,
      id: snap.sceneId,
      geometry: {
        type: 'Polygon' as const,
        coordinates: snap.polygon.map((ring) => ring.map((pt) => [pt[0], pt[1]])) as unknown as number[][][],
      },
      properties: {
        id: snap.sceneId,
        kind: 'STORYBOARD_SCENE' as const,
        storyboard_id: sceneRectanglesState.activeStoryboardId ?? '',
        viewport: snap.viewport,
        timestamp: snap.timestamp,
        title: '',
        visible_feature_ids: [] as string[],
        feature_set_hash: '',
        thumbnail_asset_ref: '',
        transition_duration_ms: 500,
        // #259 — required creation_order on SceneProperties.
        creation_order: 0,
        // Spec #258 / FR-006 — restore provenance so `pickPolygonForRender`
        // trusts the stored polygon for `'bounds'` captures and only
        // recomputes for legacy / placeholder scenes.
        ...(snap.polygonSource !== undefined && {
          _polygon_source: snap.polygonSource,
        }),
      },
    }));
    // Cast once at the boundary — the synthetic object is structurally
    // sufficient for the layer's read pattern.
    return {
      scenes: syntheticScenes as unknown as SceneRectangleLayerProps['scenes'],
      activeStoryboardId: sceneRectanglesState.activeStoryboardId,
      currentSceneId: sceneRectanglesState.currentSceneId,
      onSceneRectangleClick: handleSceneRectangleClick,
    };
  }, [sceneRectanglesState, handleSceneRectangleClick]);

  // Shape drawing callback — prompt for name, then convert Geoman output to schema-compliant features
  const handleShapeCreated = useCallback((geojson: GeoJSON.Feature, mode: DrawingMode) => {
    const defaultNames: Record<string, string> = {
      point: 'Drawn Point',
      rectangle: 'Drawn Rectangle',
      polygon: 'Drawn Polygon',
      polyline: 'Drawn Path',
    };
    const promptLabels: Record<string, string> = {
      point: 'Name this point:',
      rectangle: 'Name this shape:',
      polygon: 'Name this polygon:',
      polyline: 'Name this path:',
    };
    const defaultName = defaultNames[mode] ?? 'Drawn Feature';
    const promptLabel = promptLabels[mode] ?? 'Name this feature:';
    const name = window.prompt(promptLabel, defaultName);
    if (name === null) return; // user cancelled — discard the shape

    // FR-096: Get palette style overrides for sequential colour assignment
    const paletteOverrides = getPaletteStyleOverrides(mode, paletteIndex);

    // FR-012: Build provenance metadata
    const provenance: DrawnFeatureProvenance = {
      source: 'user-drawn',
      timestamp: new Date().toISOString(),
      operator: 'unknown',
      action: 'created',
    };

    const opts = mode === 'point'
      ? { name, ...paletteOverrides, provenance }
      : { label: name, ...paletteOverrides, provenance };
    const feature = createDrawnFeature(geojson, mode, opts);
    if (feature) {
      setDrawnFeatures(prev => [...prev, feature as DebriefFeature]);
      setSelectedIds(new Set([feature.id]));
      setPaletteIndex(prev => prev + 1);
      // Notify extension of the new drawn feature
      const props = feature.properties as Record<string, unknown>;
      vscode.postMessage({
        type: 'featureDrawn',
        feature: {
          id: feature.id,
          kind: String(props.kind),
          name: props.name != null ? String(props.name) : undefined,
          label: props.label != null ? String(props.label) : undefined,
          geometry: feature.geometry,
          properties: props,
        },
      });
      // Notify extension of new selection
      vscode.postMessage({
        type: 'selectionChanged',
        selection: {
          featureIds: [feature.id],
        },
      });
    }
  }, [paletteIndex]);

  // Drag-and-drop for REP files
  useEffect(() => {
    const container = document.getElementById('root');
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const uriList = e.dataTransfer?.getData('text/uri-list');
      if (uriList) {
        const uris = uriList.split('\n').filter(u => u.trim() && !u.startsWith('#'));
        if (uris.length > 0 && uris[0].toLowerCase().endsWith('.rep')) {
          vscode.postMessage({ type: 'repFileDrop', uris });
        }
      }
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <MapView
      features={features}
      selectedIds={selectedIds}
      currentTime={currentTime}
      displayMode={displayMode}
      viewport={viewport}
      fitBoundsTrigger={fitBoundsTrigger}
      autoFitBounds={false}
      onSelect={handleSelect}
      onBackgroundClick={handleBackgroundClick}
      onBoundsChange={handleBoundsChange}
      onZoomChange={handleZoomChange}
      drawingMode={drawingMode}
      onDrawingModeChange={handleDrawingModeChange}
      onShapeCreated={handleShapeCreated}
      flyToTarget={flyToTarget}
      onFlyToComplete={handleFlyToComplete}
      onMapReady={handleMapReady}
      sceneRectangles={sceneRectangleProps}
      height="100vh"
    />
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <Bootstrap>
      <MapViewApp />
    </Bootstrap>
  );
}
