/**
 * App shell with two-view architecture, backed by @debrief/session-state.
 *
 * - Welcome view: CatalogOverview showing available plots
 * - Analysis view: ActivityPanel (left) + MapView (right) for plot analysis
 *
 * State flow:
 *   session-state store  ←→  React (via useSessionStore)
 *   useTimePlayback      →   store.setCurrentTime (sync on change)
 *   store.selection      →   ActivityPanel + MapView
 *   store.featureCollectionUri  (set on plot load, NOT undoable)
 *   store.displayMode    (set via UI, undoable)
 *   Ctrl+Z / Ctrl+Y      →   store.undo() / store.redo()
 *
 * Feature: 073-undo-redo-split (runtime verification)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import {
  CatalogOverview,
  MapView,
  ActivityPanel,
  StacFileTree,
  useTimePlayback,
  calculateTimeExtent,
} from '@debrief/components';
import type {
  CatalogOverviewItem,
  ToolsPanelItem,
  ActivityPanelMessage,
  DebriefFeature,
} from '@debrief/components';
import {
  getSessionStore,
  resetSessionStore,
  createTimeInstant,
  type DisplayMode as StoreDisplayMode,
} from '@debrief/session-state';
import type { DisplayMode as ComponentDisplayMode } from '@debrief/components';

// Map between session-state DisplayMode ('normal'|'snailTrail') and
// components DisplayMode ('full'|'trail') — the two enums diverged historically.
const toComponentMode = (m: StoreDisplayMode): ComponentDisplayMode =>
  m === 'snailTrail' ? 'trail' : 'full';
const toStoreMode = (m: string): StoreDisplayMode =>
  m === 'trail' ? 'snailTrail' : 'normal';
import { useSessionStore } from './hooks/useSessionStore';
import { stacService } from './mocks/stacService';
import { calcService } from './mocks/calcService';
import type { ToolResult } from './mocks/calcService';
import { mockFsAdapter } from './mocks/fsAdapter';

// Expose session store on window for Playwright test introspection
declare global {
  interface Window {
    __sessionStore: ReturnType<typeof getSessionStore>;
  }
}
window.__sessionStore = getSessionStore();

/** Current view state */
type View = 'welcome' | 'analysis';

/** State for the currently loaded plot */
interface PlotState {
  itemPath: string;
  title: string;
  features: FeatureCollection;
}

/**
 * Main application component.
 */
export default function App() {
  // Session-state store (reactive via useSyncExternalStore)
  const state = useSessionStore();
  const store = getSessionStore();

  // View state (local — not part of session-state)
  const [view, setView] = useState<View>('welcome');
  const [currentPlot, setCurrentPlot] = useState<PlotState | null>(null);
  const [resultLayers, setResultLayers] = useState<Feature[]>([]);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  // Catalog items
  const catalogItems = useMemo<CatalogOverviewItem[]>(() => {
    return stacService.getItems();
  }, []);

  // Extract features array from current plot
  const plotFeatures = useMemo<DebriefFeature[]>(() => {
    if (!currentPlot) return [];
    return currentPlot.features.features as DebriefFeature[];
  }, [currentPlot]);

  // All features including result layers
  const allFeatures = useMemo<DebriefFeature[]>(() => {
    return [...plotFeatures, ...resultLayers as DebriefFeature[]];
  }, [plotFeatures, resultLayers]);

  // Calculate time extent from features
  const timeExtent = useMemo<[number, number] | null>(() => {
    if (plotFeatures.length === 0) return null;
    return calculateTimeExtent(plotFeatures);
  }, [plotFeatures]);

  // Temporal playback state — animation loop lives here,
  // but we sync currentTime changes into session-state
  const playback = useTimePlayback({
    timeExtent,
    onTimeChange: useCallback((time: number) => {
      store.getState().setCurrentTime(createTimeInstant(time));
    }, [store]),
  });

  // Derive selection as a Set<string> from store (for components that need it)
  const selectedIds = useMemo<Set<string>>(() => {
    return new Set(state.selection.featureIds);
  }, [state.selection.featureIds]);

  // Selected features for tool applicability
  const selectedFeatures = useMemo(() => {
    return plotFeatures.filter(f => selectedIds.has(String(f.id)));
  }, [plotFeatures, selectedIds]);

  // Tools based on current selection
  const tools = useMemo<ToolsPanelItem[]>(() => {
    return calcService.getTools(selectedFeatures as Feature[]);
  }, [selectedFeatures]);

  // --- Keyboard: Ctrl+Z / Ctrl+Y for undo/redo ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        store.getState().redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  // Handle plot selection from catalog
  const handlePlotSelect = useCallback((itemPath: string) => {
    try {
      const plotData = stacService.getPlotData(itemPath);
      const item = stacService.getItem(itemPath);

      // Reset session store for new plot
      resetSessionStore();
      window.__sessionStore = getSessionStore();
      const freshStore = getSessionStore();

      // Set data reference (NOT undoable — tracked by Log Service)
      freshStore.getState().setFeatureCollectionUri(itemPath);

      // Initialise time range from plot data
      const features = plotData.features as DebriefFeature[];
      const extent = calculateTimeExtent(features);
      if (extent) {
        freshStore.getState().setTimeRange({
          start: createTimeInstant(extent[0]),
          end: createTimeInstant(extent[1]),
        });
        freshStore.getState().setCurrentTime(createTimeInstant(extent[0]));
      }

      // Clear undo history — initialization isn't a user action
      freshStore.getState().clearHistory();
      freshStore.getState().markClean();

      setCurrentPlot({
        itemPath,
        title: item?.properties.title ?? itemPath,
        features: plotData,
      });
      setResultLayers([]);
      setToolMessage(null);
      setView('analysis');
    } catch (error) {
      console.error('Failed to load plot:', error);
    }
  }, []);

  // Handle back to catalog
  const handleBackToCatalog = useCallback(() => {
    setView('welcome');
    setCurrentPlot(null);
    setResultLayers([]);
    setToolMessage(null);
    store.getState().clearSelection();
  }, [store]);

  // Handle map feature selection (goes through session-state)
  const handleMapSelect = useCallback((featureId: string, event: React.MouseEvent) => {
    const s = store.getState();
    if (event.ctrlKey || event.metaKey) {
      // Toggle: add or remove
      const current = s.selection.featureIds;
      if (current.includes(featureId)) {
        s.removeFromSelection([featureId]);
      } else {
        s.addToSelection([featureId]);
      }
    } else {
      s.setSelection([featureId], featureId);
    }
  }, [store]);

  // Handle background click (clear selection via session-state)
  const handleBackgroundClick = useCallback(() => {
    store.getState().clearSelection();
  }, [store]);

  // Handle tool execution — persist result to STAC assets and refresh tree
  const handleRunTool = useCallback((toolId: string) => {
    const result: ToolResult = calcService.runTool(toolId, selectedFeatures as Feature[]);
    setToolMessage(result.message);

    if (result.resultLayer) {
      setResultLayers(prev => [...prev, result.resultLayer!]);

      // Persist result as a STAC asset in the current item's assets/ directory
      if (currentPlot) {
        const itemDir = `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}`;
        const sourceNames = selectedFeatures
          .map(f => (f.properties as unknown as Record<string, unknown>)?.name ?? f.id ?? 'unknown')
          .map(n => String(n).toLowerCase().replace(/\s+/g, '-'))
          .join('-');
        const fileName = `${toolId}-${sourceNames}.json`;
        const assetPath = `${itemDir}/assets/${fileName}`;

        mockFsAdapter.writeFile(assetPath, JSON.stringify(result.resultLayer, null, 2));
        setTreeRefreshKey(k => k + 1);
      }
    }
  }, [selectedFeatures, currentPlot]);

  // Handle ActivityPanel messages
  const handleActivityMessage = useCallback((message: ActivityPanelMessage) => {
    switch (message.type) {
      case 'temporal:seek':
        playback.setCurrentTime(message.payload.time);
        break;
      case 'temporal:play':
        playback.play();
        break;
      case 'temporal:pause':
        playback.pause();
        break;
      case 'temporal:displayMode':
        store.getState().setDisplayMode(toStoreMode(message.payload.mode));
        break;
      case 'tool:run':
        handleRunTool(message.payload.toolId);
        break;
      case 'layer:select':
        store.getState().setSelection(message.payload.featureIds);
        break;
      default:
        break;
    }
  }, [playback, store, handleRunTool]);

  // Render welcome view
  if (view === 'welcome') {
    return (
      <div className="web-shell web-shell--welcome">
        <header className="web-shell__header">
          <h1 className="web-shell__title">Debrief Web Shell</h1>
          <p className="web-shell__subtitle">STAC Catalog Browser</p>
          <a
            className="web-shell__storybook-link"
            href="https://debrief.github.io/debrief-future/components-storybook/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Component Storybook &rarr;
          </a>
        </header>
        <main className="web-shell__main">
          <CatalogOverview
            items={catalogItems}
            onItemSelect={handlePlotSelect}
            className="web-shell__catalog"
          />
        </main>
      </div>
    );
  }

  // Render analysis view
  return (
    <div className="web-shell web-shell--analysis">
      <header className="web-shell__header">
        <button
          type="button"
          className="web-shell__back-button"
          onClick={handleBackToCatalog}
          aria-label="Back to catalog"
        >
          &larr; Back to Catalog
        </button>
        <h1 className="web-shell__title">{currentPlot?.title ?? 'Analysis'}</h1>
        {/* Undo/redo status indicator */}
        <span
          className="web-shell__undo-status"
          data-testid="undo-status"
          data-can-undo={state.canUndo()}
          data-can-redo={state.canRedo()}
          data-dirty={state.dirty}
          data-feature-uri={state.featureCollectionUri ?? ''}
        >
          {state.canUndo() ? 'Undo available' : ''}
          {state.canRedo() ? ' | Redo available' : ''}
        </span>
      </header>

      {toolMessage && (
        <div className="web-shell__tool-message" role="status">
          <pre>{toolMessage}</pre>
          <button
            type="button"
            onClick={() => setToolMessage(null)}
            aria-label="Dismiss message"
          >
            &times;
          </button>
        </div>
      )}

      <main className="web-shell__main web-shell__main--split">
        <aside className="web-shell__sidebar">
          <StacFileTree
            fs={mockFsAdapter}
            rootPath="/local-store"
            currentItemPath={currentPlot ? `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}` : undefined}
            refreshKey={treeRefreshKey}
            className="web-shell__file-tree"
          />
          <ActivityPanel
            timeExtent={timeExtent}
            currentTime={playback.currentTime}
            playbackState={playback.playbackState}
            playbackSpeed={playback.speed}
            displayMode={toComponentMode(state.displayMode)}
            timeUiState={timeExtent ? 'ready' : 'empty'}
            tools={tools}
            features={allFeatures}
            selectedFeatureIds={state.selection.featureIds}
            onMessage={handleActivityMessage}
          />
        </aside>
        <section className="web-shell__map-container">
          <MapView
            features={allFeatures}
            selectedIds={selectedIds}
            onSelect={handleMapSelect}
            onBackgroundClick={handleBackgroundClick}
            currentTime={playback.currentTime}
            displayMode={toComponentMode(state.displayMode)}
            height="100%"
            className="web-shell__map"
          />
        </section>
      </main>
    </div>
  );
}
