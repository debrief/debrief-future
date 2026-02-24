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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MapView, createDrawnFeature, getPaletteStyleOverrides } from '@debrief/components';
import type { DebriefFeature, DisplayMode, Bounds, DrawingMode, DrawnFeatureProvenance } from '@debrief/components';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from '../messages';

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

  // Drawing state
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [drawnFeatures, setDrawnFeatures] = useState<DebriefFeature[]>([]);
  const [paletteIndex, setPaletteIndex] = useState(0);

  // Temporal state
  const [currentTime, setCurrentTime] = useState<number | undefined>();
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

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
          setFitBoundsTrigger(prev => prev + 1);
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
        case 'removeResultLayer':
          setResultFeatures(prev => prev.filter(f => !String(f.id).startsWith(msg.layerId)));
          break;
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
        contextType: 'single-track',
      },
    });
  }, []);

  // Background click callback
  const handleBackgroundClick = useCallback(() => {
    vscode.postMessage({
      type: 'selectionChanged',
      selection: { featureIds: [], contextType: 'none' },
    });
  }, []);

  // Viewport change callback
  const handleBoundsChange = useCallback((bounds: Bounds) => {
    vscode.postMessage({
      type: 'viewStateChanged',
      state: {
        center: [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2],
        zoom: 10, // Approximate - actual zoom handled by onZoomChange
        timeRange: { start: '', end: '' },
      },
    });
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
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
          contextType: props.kind === 'POINT' ? 'location' : 'none',
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
      onDrawingModeChange={setDrawingMode}
      onShapeCreated={handleShapeCreated}
      height="100vh"
    />
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<MapViewApp />);
}
