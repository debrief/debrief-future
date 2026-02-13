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
import { MapView } from '@debrief/components';
import type { DebriefFeature, DisplayMode, Bounds } from '@debrief/components';
import type {
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  Track,
  ReferenceLocation,
  GeoJSONFeature,
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

// Transform Track to DebriefFeature
function trackToFeature(track: Track, customColor?: string): DebriefFeature {
  return {
    type: 'Feature',
    id: track.id,
    geometry: track.geometry,
    properties: {
      kind: 'TRACK',
      platform_name: track.name,
      platform_type: track.platformType,
      start_time: track.startTime,
      end_time: track.endTime,
      times: track.times,
      positions: track.positions ?? track.times.map(t => ({ time: t })),
      default_position_style: track.defaultPositionStyle,
      symbol_interval: track.symbolInterval,
      label_interval: track.labelInterval,
      position_style_overrides: track.positionStyleOverrides,
      style: { color: customColor ?? track.color },
    },
  };
}

// Transform ReferenceLocation to DebriefFeature
function locationToFeature(location: ReferenceLocation): DebriefFeature {
  return {
    type: 'Feature',
    id: location.id,
    geometry: location.geometry,
    properties: {
      kind: 'POINT',
      name: location.name,
      location_type: location.locationType ?? 'REFERENCE',
    },
  };
}

/**
 * MapView Webview App
 */
function MapViewApp(): React.ReactElement {
  // Feature state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [locations, setLocations] = useState<ReferenceLocation[]>([]);
  const [otherFeatures, setOtherFeatures] = useState<GeoJSONFeature[]>([]);
  const [resultFeatures, setResultFeatures] = useState<DebriefFeature[]>([]);
  const [trackColors, setTrackColors] = useState<Record<string, string>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Hidden features state
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Viewport state
  const [viewport, setViewport] = useState<{ center: [number, number]; zoom: number } | undefined>();
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

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
    const trackFeatures = tracks.map(t => trackToFeature(t, trackColors[t.id]));
    const locationFeatures = locations.map(locationToFeature);
    // otherFeatures (annotations, multi-geometry) already have properties.style
    const otherDebriefFeatures = otherFeatures.map(f => ({
      type: 'Feature' as const,
      id: f.id ?? '',
      geometry: f.geometry,
      properties: f.properties ?? {},
    })) as DebriefFeature[];
    const allFeatures = [...trackFeatures, ...locationFeatures, ...otherDebriefFeatures, ...resultFeatures];
    // Filter out hidden features
    if (hiddenIds.size === 0) return allFeatures;
    return allFeatures.filter(f => !hiddenIds.has(String(f.id)));
  }, [tracks, locations, otherFeatures, resultFeatures, trackColors, hiddenIds]);

  // Message handler
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'loadPlot':
          setTracks(msg.plot.tracks);
          setLocations(msg.plot.locations);
          setOtherFeatures(msg.plot.otherFeatures ?? []);
          setResultFeatures([]);
          setFitBoundsTrigger(prev => prev + 1);
          break;
        case 'updateTracks':
          setTracks(msg.tracks);
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
    const isTrack = tracks.some(t => t.id === featureId);
    const isLocation = locations.some(l => l.id === featureId);
    vscode.postMessage({
      type: 'selectionChanged',
      selection: {
        trackIds: isTrack ? [featureId] : [],
        locationIds: isLocation ? [featureId] : [],
        contextType: isTrack ? 'single-track' : isLocation ? 'location' : 'none',
      },
    });
  }, [tracks, locations]);

  // Background click callback
  const handleBackgroundClick = useCallback(() => {
    vscode.postMessage({
      type: 'selectionChanged',
      selection: { trackIds: [], locationIds: [], contextType: 'none' },
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
