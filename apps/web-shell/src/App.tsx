/**
 * App shell with two-view architecture, backed by @debrief/session-state.
 *
 * - Welcome view: CatalogOverview showing available plots
 * - Analysis view: StacFileTree + Activity/Log tabs (left) + MapView (right)
 *
 * State flow:
 *   session-state store  <->  React (via useSessionStore)
 *   useTimePlayback      ->   store.setCurrentTime (sync on change)
 *   store.selection      ->   ActivityPanel + MapView
 *   store.featureCollectionUri  (set on plot load, NOT undoable)
 *   store.displayMode    (set via UI, undoable)
 *   Ctrl+Z / Ctrl+Y      ->   store.undo() / store.redo()
 *
 * Feature: 073-undo-redo-split (runtime verification)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import {
  CatalogOverview,
  MapView,
  ActivityPanel,
  LogPanel,
  StacFileTree,
  useTimePlayback,
  calculateTimeExtent,
  getFeatureLabel,
} from '@debrief/components';
import type {
  CatalogOverviewItem,
  ToolsPanelItem,
  ActivityPanelMessage,
  DebriefFeature,
  TimelineEntry,
  PresentationMode,
  ViewMode,
  LogPanelMessage,
} from '@debrief/components';
import type { LogFilterState } from '@debrief/components';
import { LOG_DEFAULT_FILTER_STATE } from '@debrief/components';
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
import { calcService, moveShapeFeatures } from './mocks/calcService';
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

/** Sidebar tab */
type SidebarTab = 'activity' | 'log';

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
  /** Maps activityId → original feature snapshots so revert can restore them */
  const [, setActivitySnapshots] = useState<
    Record<string, Feature[]>
  >({});
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  // Sidebar tab
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('activity');

  // Log panel state
  const [logEntries, setLogEntries] = useState<TimelineEntry[]>([]);
  const [logPresentationMode, setLogPresentationMode] = useState<PresentationMode>('normal');
  const [logViewMode, setLogViewMode] = useState<ViewMode>('timeline');
  const [logSelectedEntryId, setLogSelectedEntryId] = useState<string | null>(null);
  const [logFilterState, setLogFilterState] = useState<LogFilterState>(LOG_DEFAULT_FILTER_STATE);
  const [logNotification, setLogNotification] = useState<string | null>(null);

  // Counter for generating unique activity IDs
  const [activityCounter, setActivityCounter] = useState(0);

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

  // Feature names map for LogPanel
  const featureNames = useMemo<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    for (const f of allFeatures) {
      const id = f.id;
      if (id) names[id] = getFeatureLabel(f);
    }
    return names;
  }, [allFeatures]);

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
      setLogEntries([]);
      setSidebarTab('activity');
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
    setLogEntries([]);
    setSidebarTab('activity');
    store.getState().clearSelection();
  }, [store]);

  // Restore original features for a reverted activity
  const restoreSnapshots = useCallback((aid: string) => {
    setActivitySnapshots(prev => {
      const originals = prev[aid];
      if (!originals || originals.length === 0) return prev;
      // Swap moved features back to originals in currentPlot
      const idMap = new Map(originals.map(f => [String(f.id), f]));
      setCurrentPlot(plot => {
        if (!plot) return plot;
        const updatedFeatures = plot.features.features.map(f =>
          idMap.has(String(f.id)) ? idMap.get(String(f.id))! : f
        );
        return {
          ...plot,
          features: { ...plot.features, features: updatedFeatures },
        };
      });
      const { [aid]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Handle LogPanel messages
  const handleLogMessage = useCallback((message: LogPanelMessage) => {
    if (message.type === 'entry:select') {
      store.getState().setSelection(message.payload.featureIds);
    } else if (message.type === 'entry:deselect') {
      store.getState().clearSelection();
    } else if (message.type === 'action:invoke') {
      const { actionType, activityId } = message.payload;
      if (actionType === 'tune') {
        // Tune is handled inline via onTuneRequest — prompt user
        setLogNotification('Click a tunable parameter value to edit it.');
        setTimeout(() => setLogNotification(null), 3000);
      } else if (actionType === 'revertTo') {
        // Remove all entries after the target and restore their original features
        setLogEntries((prev: TimelineEntry[]) => {
          const idx = prev.findIndex((e: TimelineEntry) => e.activityId === activityId);
          if (idx < 0) return prev;
          // Entries before idx (most-recent-first) are the ones being removed
          const removed = prev.slice(0, idx);
          for (const r of removed) {
            restoreSnapshots(r.activityId);
          }
          return prev.slice(idx);
        });
        setLogNotification('Reverted. Operations after the selected point removed.');
        setTimeout(() => setLogNotification(null), 3000);
      } else if (actionType === 'revertThis') {
        // Mark entry as deleted and restore original features
        restoreSnapshots(activityId);
        setLogEntries((prev: TimelineEntry[]) =>
          prev.map((e: TimelineEntry) =>
            e.activityId === activityId ? { ...e, deleted: true } : e
          )
        );
        setLogNotification('Operation removed.');
        setTimeout(() => setLogNotification(null), 3000);
      } else {
        setLogNotification(`Action "${actionType}" is not yet available.`);
        setTimeout(() => setLogNotification(null), 3000);
      }
    }
  }, [store, restoreSnapshots]);

  // Phase 6: Handle tune request from inline parameter click
  const handleTuneRequest = useCallback(
    (activityId: string, parameter: string, currentValue: unknown) => {
      // Prompt for new value (simple approach for web-shell demo)
      const input = window.prompt(
        `Tune "${parameter}" (current: ${String(currentValue)}):`,
        String(currentValue)
      );
      if (input === null) return; // cancelled

      // Coerce to number if the current value is numeric
      const newValue = typeof currentValue === 'number' ? Number(input) : input;

      // Find the entry being tuned
      const entry = logEntries.find((e: TimelineEntry) => e.activityId === activityId);

      // Restore features from inputState and re-execute for mutation tools
      if (entry?.inputState && entry.inputState.length > 0 && entry.toolName === 'move-shape') {
        // Build restored features from inputState (pre-tool geometry)
        setCurrentPlot(plot => {
          if (!plot) return plot;
          const restoredMap = new Map(
            entry.inputState!.map(is => [is.featureId, is])
          );
          // Restore original geometry in the plot
          const restoredFeatures = plot.features.features.map(f => {
            const saved = restoredMap.get(String(f.id));
            if (!saved) return f;
            return {
              ...f,
              geometry: JSON.parse(JSON.stringify(saved.geometry)),
              properties: {
                ...(f.properties ?? {}),
                ...JSON.parse(JSON.stringify(saved.properties ?? {})),
              },
            };
          });

          // Collect the restored features that the tool will operate on
          const featuresToMove = restoredFeatures.filter(f =>
            restoredMap.has(String(f.id))
          ) as Feature[];

          // Read the updated parameters (apply the new value)
          const params = { ...entry.parameters };
          if (params[parameter]) {
            params[parameter] = { ...params[parameter], value: newValue };
          }
          const distNm = Number((params.distance_nm?.value) ?? 5);
          const dirDeg = Number((params.direction_deg?.value) ?? 45);

          // Re-execute the tool from original position
          const moved = moveShapeFeatures(featuresToMove, distNm, dirDeg);
          const movedMap = new Map(moved.map(m => [String(m.id), m]));

          // Apply the re-executed result
          const finalFeatures = restoredFeatures.map(f => {
            const m = movedMap.get(String(f.id));
            return m ?? f;
          });

          return {
            ...plot,
            features: { ...plot.features, features: finalFeatures },
          };
        });
      }

      // Update the log entry parameters and tune annotation
      setLogEntries((prev: TimelineEntry[]) =>
        prev.map((e: TimelineEntry) => {
          if (e.activityId !== activityId) return e;
          const updatedParams = { ...e.parameters };
          if (updatedParams[parameter]) {
            updatedParams[parameter] = {
              ...updatedParams[parameter],
              value: newValue,
            };
          }
          return {
            ...e,
            parameters: updatedParams,
            tuneAnnotation: { parameter, previousValue: currentValue, newValue },
          };
        })
      );
      setLogNotification(`Tuned "${parameter}" to ${String(newValue)}.`);
      setTimeout(() => setLogNotification(null), 3000);
    },
    [logEntries]
  );

  // Phase 6: Handle restore request for deleted entries
  const handleRestoreRequest = useCallback((activityId: string) => {
    setLogEntries((prev: TimelineEntry[]) =>
      prev.map((e: TimelineEntry) =>
        e.activityId === activityId ? { ...e, deleted: false } : e
      )
    );
    setLogNotification('Operation restored.');
    setTimeout(() => setLogNotification(null), 3000);
  }, []);

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

  // Handle tool execution — persist result to STAC assets and record a log entry
  const handleRunTool = useCallback((toolId: string) => {
    const result: ToolResult = calcService.runTool(toolId, selectedFeatures as Feature[]);
    setToolMessage(result.message);

    // Tools that transform features in-place (e.g. move-shape): replace in currentPlot
    const replacesInPlace = toolId === 'move-shape';

    if (result.resultLayer && replacesInPlace) {
      // Replace the original feature in the plot with the moved version
      const movedId = String(result.resultLayer.id);
      setCurrentPlot(plot => {
        if (!plot) return plot;
        const updatedFeatures = plot.features.features.map(f =>
          String(f.id) === movedId ? result.resultLayer! : f
        );
        return {
          ...plot,
          features: { ...plot.features, features: updatedFeatures },
        };
      });
    } else if (result.resultLayer) {
      // Additive tools (e.g. analysis): add result as a new layer
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

    // Record a log entry
    const nextId = activityCounter + 1;
    setActivityCounter(nextId);

    const usedIds = selectedFeatures.map(f => f.id).filter(Boolean);

    const generatedIds = result.resultLayer
      ? [String((result.resultLayer.properties as Record<string, unknown> | null)?.id ?? `result-${nextId}`)]
      : [];

    const activityId = `act-${String(nextId).padStart(3, '0')}`;

    // Capture pre-tool geometry for mutation tools (enables correct tune replay)
    const inputState = replacesInPlace && selectedFeatures.length > 0
      ? selectedFeatures.map(f => {
          const props = (f.properties ?? {}) as unknown as Record<string, unknown>;
          const { provenance: _p, ...restProps } = props;
          return {
            featureId: String(f.id),
            geometry: JSON.parse(JSON.stringify(f.geometry)),
            properties: JSON.parse(JSON.stringify(restProps)),
          };
        })
      : null;

    const entry: TimelineEntry = {
      activityId,
      timestamp: new Date().toISOString(),
      toolName: toolId,
      toolVersion: '1.0.0',
      parameters: result.parameters ?? {},
      usedFeatureIds: usedIds,
      generatedFeatureIds: generatedIds,
      executionDuration: 'PT0.1S',
      generatedResultId: generatedIds[0] ?? null,
      operationCategory: 'calculation',
      inputState,
    };

    // Snapshot originals so revert can restore them
    if (replacesInPlace && selectedFeatures.length > 0) {
      const originals = selectedFeatures.map(f =>
        JSON.parse(JSON.stringify(f)) as Feature
      );
      setActivitySnapshots(prev => ({
        ...prev,
        [activityId]: originals,
      }));
    }

    setLogEntries(prev => [entry, ...prev]);
  }, [selectedFeatures, activityCounter, currentPlot]);

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
          <div className="web-shell__tab-bar" role="tablist">
            <button
              type="button"
              className={`web-shell__tab ${sidebarTab === 'activity' ? 'web-shell__tab--active' : ''}`}
              role="tab"
              aria-selected={sidebarTab === 'activity'}
              aria-controls="sidebar-activity"
              data-testid="sidebar-tab-activity"
              onClick={() => setSidebarTab('activity')}
            >
              Activity
            </button>
            <button
              type="button"
              className={`web-shell__tab ${sidebarTab === 'log' ? 'web-shell__tab--active' : ''}`}
              role="tab"
              aria-selected={sidebarTab === 'log'}
              aria-controls="sidebar-log"
              data-testid="sidebar-tab-log"
              onClick={() => setSidebarTab('log')}
            >
              Log
            </button>
          </div>

          <div className="web-shell__tab-content">
            {sidebarTab === 'activity' ? (
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
            ) : (
              <LogPanel
                entries={logEntries}
                featureNames={featureNames}
                presentationMode={logPresentationMode}
                viewMode={logViewMode}
                selectedEntryId={logSelectedEntryId}
                filterState={logFilterState}
                hasActiveSession={true}
                plotName={currentPlot?.title ?? null}
                actionResultMessage={logNotification}
                onMessage={handleLogMessage}
                onPresentationModeChange={setLogPresentationMode}
                onViewModeChange={setLogViewMode}
                onFilterStateChange={setLogFilterState}
                onSelectedEntryChange={setLogSelectedEntryId}
                onTuneRequest={handleTuneRequest}
                onRestoreRequest={handleRestoreRequest}
              />
            )}
          </div>
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
