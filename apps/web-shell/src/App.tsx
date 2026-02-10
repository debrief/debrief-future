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
  StacFileTree,
  useSelection,
  useTimePlayback,
  calculateTimeExtent,
} from '@debrief/components';
import type {
  CatalogOverviewItem,
  ToolsPanelItem,
  ActivityPanelMessage,
  DisplayMode,
  DebriefFeature,
} from '@debrief/components';
import { stacService } from './mocks/stacService';
import { calcService } from './mocks/calcService';
import type { ToolResult } from './mocks/calcService';
import { mockFsAdapter } from './mocks/fsAdapter';

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
  // View state
  const [view, setView] = useState<View>('welcome');
  const [currentPlot, setCurrentPlot] = useState<PlotState | null>(null);
  const [resultLayers, setResultLayers] = useState<Feature[]>([]);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('full');

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
    selection.clear();
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

  // Handle tool execution
  const handleRunTool = useCallback((toolId: string) => {
    const result: ToolResult = calcService.runTool(toolId, selectedFeatures as Feature[]);
    setToolMessage(result.message);

    if (result.resultLayer) {
      setResultLayers(prev => [...prev, result.resultLayer!]);
    }
  }, [selectedFeatures]);

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
          <StacFileTree
            fs={mockFsAdapter}
            rootPath="/local-store"
            currentItemPath={currentPlot ? `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}` : undefined}
            className="web-shell__file-tree"
          />
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
