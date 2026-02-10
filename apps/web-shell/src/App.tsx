/**
 * App shell with two-view architecture.
 *
 * - Welcome view: CatalogOverview showing available plots
 * - Analysis view: ActivityPanel (left) + MapView (right) for plot analysis
 */

import { useState, useCallback, useMemo } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import {
  CatalogOverview,
  MapView,
  ActivityPanel,
  LogPanel,
  useSelection,
  useTimePlayback,
  calculateTimeExtent,
  getFeatureLabel,
} from '@debrief/components';
import type {
  CatalogOverviewItem,
  ToolsPanelItem,
  ActivityPanelMessage,
  DisplayMode,
  DebriefFeature,
  TimelineEntry,
  PresentationMode,
  ViewMode,
  LogPanelMessage,
} from '@debrief/components';
import type { LogFilterState } from '@debrief/components';
import { LOG_DEFAULT_FILTER_STATE } from '@debrief/components';
import { stacService } from './mocks/stacService';
import { calcService } from './mocks/calcService';
import type { ToolResult } from './mocks/calcService';

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
  // View state
  const [view, setView] = useState<View>('welcome');
  const [currentPlot, setCurrentPlot] = useState<PlotState | null>(null);
  const [resultLayers, setResultLayers] = useState<Feature[]>([]);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

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

  // Selection state
  const selection = useSelection();

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

  // Temporal playback state
  const playback = useTimePlayback({
    timeExtent,
  });

  // Selected features for tool applicability
  const selectedFeatures = useMemo(() => {
    return plotFeatures.filter(f => selection.selectedIds.has(f.id));
  }, [plotFeatures, selection.selectedIds]);

  // Tools based on current selection
  const tools = useMemo<ToolsPanelItem[]>(() => {
    return calcService.getTools(selectedFeatures as Feature[]);
  }, [selectedFeatures]);

  // Handle plot selection from catalog
  const handlePlotSelect = useCallback((itemPath: string) => {
    try {
      const plotData = stacService.getPlotData(itemPath);
      const item = stacService.getItem(itemPath);
      setCurrentPlot({
        itemPath,
        title: item?.properties.title ?? itemPath,
        features: plotData,
      });
      setResultLayers([]);
      setToolMessage(null);
      selection.clear();
      setView('analysis');
    } catch (error) {
      console.error('Failed to load plot:', error);
    }
  }, [selection]);

  // Handle back to catalog
  const handleBackToCatalog = useCallback(() => {
    setView('welcome');
    setCurrentPlot(null);
    setResultLayers([]);
    setToolMessage(null);
    setLogEntries([]);
    setSidebarTab('activity');
    selection.clear();
  }, [selection]);

  // Handle LogPanel messages
  const handleLogMessage = useCallback((message: LogPanelMessage) => {
    if (message.type === 'entry:select') {
      // Select affected features on the map
      selection.selectMultiple(message.payload.featureIds);
    } else if (message.type === 'entry:deselect') {
      selection.clear();
    } else if (message.type === 'action:invoke') {
      setLogNotification(`Action "${message.payload.actionType}" is not yet available.`);
      setTimeout(() => setLogNotification(null), 3000);
    }
  }, [selection]);

  // Handle map feature selection
  const handleMapSelect = useCallback((featureId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      selection.toggle(featureId);
    } else {
      selection.select(featureId);
    }
  }, [selection]);

  // Handle background click (clear selection)
  const handleBackgroundClick = useCallback(() => {
    selection.clear();
  }, [selection]);

  // Handle tool execution — also records a log entry
  const handleRunTool = useCallback((toolId: string) => {
    const result: ToolResult = calcService.runTool(toolId, selectedFeatures as Feature[]);
    setToolMessage(result.message);

    if (result.resultLayer) {
      setResultLayers(prev => [...prev, result.resultLayer!]);
    }

    // Record a log entry
    const nextId = activityCounter + 1;
    setActivityCounter(nextId);

    const usedIds = selectedFeatures.map(f => f.id).filter(Boolean);

    const generatedIds = result.resultLayer
      ? [String((result.resultLayer.properties as Record<string, unknown> | null)?.id ?? `result-${nextId}`)]
      : [];

    const entry: TimelineEntry = {
      activityId: `act-${String(nextId).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      toolName: toolId,
      toolVersion: '1.0.0',
      parameters: {},
      usedFeatureIds: usedIds,
      generatedFeatureIds: generatedIds,
      executionDuration: 'PT0.1S',
      generatedResultId: generatedIds[0] ?? null,
      operationCategory: 'calculation',
    };

    setLogEntries(prev => [entry, ...prev]);
  }, [selectedFeatures, activityCounter]);

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
        setDisplayMode(message.payload.mode);
        break;
      case 'tool:run':
        handleRunTool(message.payload.toolId);
        break;
      case 'layer:select':
        selection.selectMultiple(message.payload.featureIds);
        break;
      default:
        break;
    }
  }, [playback, selection, handleRunTool]);

  // Render welcome view
  if (view === 'welcome') {
    return (
      <div className="web-shell web-shell--welcome">
        <header className="web-shell__header">
          <h1 className="web-shell__title">Debrief Web Shell</h1>
          <p className="web-shell__subtitle">STAC Catalog Browser</p>
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
                displayMode={displayMode}
                timeUiState={timeExtent ? 'ready' : 'empty'}
                tools={tools}
                features={allFeatures}
                selectedFeatureIds={Array.from(selection.selectedIds)}
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
              />
            )}
          </div>
        </aside>
        <section className="web-shell__map-container">
          <MapView
            features={allFeatures}
            selectedIds={selection.selectedIds}
            onSelect={handleMapSelect}
            onBackgroundClick={handleBackgroundClick}
            currentTime={playback.currentTime}
            displayMode={displayMode}
            height="100%"
            className="web-shell__map"
          />
        </section>
      </main>
    </div>
  );
}
