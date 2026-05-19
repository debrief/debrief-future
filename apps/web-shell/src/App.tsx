/**
 * App shell with two-view architecture, backed by @debrief/session-state.
 *
 * - Welcome view: StacBrowser showing available plots
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

import { useState, useCallback, useMemo, useEffect, useRef, createElement } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import {
  StacBrowser,
  MapView,
  ActivityPanel,
  LogPanel,
  StacFileTree,
  useTimePlayback,
  calculateTimeExtent,
  getFeatureLabel,
  ChartRenderer,
  transformDataset,
  createDrawnFeature,
  getPaletteStyleOverrides,
  PanelWorkspace,
  PanelContextProvider,
  createDefaultRegistry,
  PANEL_CHART,
  parseTaxonomy,
  useIsMobile,
  MobileTabLayout,
  PropertiesForm,
  validatePlot,
  StoryboardError,
  applyClickToSelection,
} from '@debrief/components';
import type {
  PropertiesFormField,
  PropertiesFormProps,
  SelectionClickEvent,
} from '@debrief/components';
import type { DatasetEnvelope, DrawingMode, DrawnFeatureProvenance, AssociatedFile } from '@debrief/components';
import type {
  StacBrowserItem,
  CatalogOverviewItem,
  ToolsPanelItem,
  ActivityPanelMessage,
  DebriefFeature,
  TimelineEntry,
  ViewMode,
  LogPanelMessage,
  PanelContextValue,
  PanelComponents,
  ChartContextProps,
  ChartTabData,
  PanelWorkspaceElement,
  ResultArtifactType,
  ParameterSchemaEntry,
} from '@debrief/components';
import type { LogFilterState } from '@debrief/components';
import { LOG_DEFAULT_FILTER_STATE } from '@debrief/components';
import { getSessionStore, resetSessionStore } from '@debrief/session-state';
import type { RawTaxonomy } from '@debrief/components';
import type { RawGeoJSONFeature } from '@debrief/schemas';
import { buildCsvContent, generateCsvFilename } from '@debrief/utils';
import rawTaxonomy from '../../../shared/schemas/fixtures/stac-browser/vessel-taxonomy.json';
import {
  StoryboardEditHarness,
  parseHarnessQueryString,
} from './StoryboardEditHarness';
import { StoryboardPanelMount } from './StoryboardPanelMount';

const VESSEL_TAXONOMY = parseTaxonomy((rawTaxonomy as RawTaxonomy).taxonomy);

/** Bridge: cast Feature[] to DebriefFeature[] (structural overlap). */
function asDebriefFeatures(features: Feature[]): DebriefFeature[] {
  return features as DebriefFeature[];
}

/**
 * Wrapper that reads URL params and mounts the harness view (#230 US4).
 * Exported from App.tsx so `main.tsx` can pick it up before App's hooks
 * run — keeps the hook-order invariant clean in App.
 */
export function StoryboardEditHarnessMount(): JSX.Element {
  const initial = parseHarnessQueryString(window.location.search);
  return <StoryboardEditHarness initial={initial} />;
}

/**
 * #235 — read the `?storyboardPanel=1` query string flag at module
 * load time so the analysis view conditionally renders the live rail.
 * Once the rail integration is fully validated, this gate can be lifted
 * (the rail is always-on); for now it stays so the existing
 * `apps/web-shell/playwright/tests/*.spec.ts` suite is unaffected.
 */
function isStoryboardPanelEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const v = params.get('storyboardPanel');
  return v === '1' || v === 'true';
}

/** Extract indexable properties from a feature safely. */
function featureProps(f: { properties: unknown }): { [key: string]: unknown } {
  const p = f.properties;
  if (p && typeof p === 'object') return p as { [key: string]: unknown };
  return {};
}

/** Type alias for feature style objects (avoids Record<string, unknown> casts). */
type StyleObj = { [key: string]: unknown };
type OverridesObj = { [key: string]: StyleObj };

import { useSessionStore } from './hooks/useSessionStore';
import { stacService } from './mocks/stacService';
import { calcService } from './mocks/calcService';
import { executeTool, isMutationTool, listTools } from './services/toolService';
import type { ToolResult } from './mocks/calcService';
import { mockFsAdapter } from './mocks/fsAdapter';
import { createStacWriterIdb } from './services/stacWriterIdb';
import { probeIndexedDbCapability } from './services/stacWriterCapability';
import {
  getActiveCapability,
  setActiveStacItemPath,
  setActiveStacWriter,
} from './services/stacWriterRegistry';
import {
  clearSceneThumbnailStore,
  hydrateSceneThumbnailStoreFromIdb,
} from './services/webSceneThumbnailAdapter';

/**
 * Strip the catalog-relative `./<plot>/item.json` form down to the bare
 * `<plot>` segment that #236's writer expects as its `stacItemPath`.
 */
function stripItemPathToParent(itemPath: string): string {
  return itemPath.replace(/^\.\//, '').replace(/\/item\.json$/, '');
}

// Expose session store on window for Playwright test introspection
declare global {
  interface Window {
    __sessionStore: ReturnType<typeof getSessionStore>;
    __currentPlotFeatures: Feature[];
    /** Exposed for Playwright backfill script (#174) */
    __openPlot?: (itemPath: string) => void;
    /** Exposed for Playwright backfill script (#174) */
    __backToCatalog?: () => void;
    /** #259 — Playwright hook: forces a plot-load validation against an
     *  arbitrary FeatureCollection so legacy-rejection screenshots can be
     *  captured without smuggling a pre-#259 fixture through the bundled
     *  catalog's pre-loaded cache. */
    __triggerPlotValidation?: (fc: FeatureCollection) => void;
  }
}
window.__sessionStore = getSessionStore();
window.__currentPlotFeatures = [];

/** Current view state */
type View = 'welcome' | 'analysis';

/** State for the currently loaded plot */
interface PlotState {
  itemPath: string;
  title: string;
  features: FeatureCollection;
}

/** An open result tab in the results panel */
interface ResultTab {
  id: string;
  title: string;
  path: string;
  artifactType: ResultArtifactType;
  /** Dataset envelope for chart rendering (artifactType === 'dataset') */
  dataset?: DatasetEnvelope;
  /** Base64 data URI for image display (artifactType === 'image') */
  imageDataUri?: string;
  /** File metadata for fallback display (artifactType === 'other') */
  fileMeta?: { filename: string; mimeType: string; sizeBytes: number };
  /** Rendering hint from dataset: 'table' for flat statistics (#177) */
  displayHint?: 'table' | 'chart';
  /** Whether this result has been saved (#177) */
  isSaved?: boolean;
}

/** Image file extensions that should render inline */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp']);

/** Determine artifact type from file path */
function getArtifactType(filePath: string): ResultArtifactType {
  const ext = filePath.toLowerCase().replace(/^.*(\.[^.]+)$/, '$1');
  if (filePath.endsWith('.dataset.json') || ext === '.json') return 'dataset';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'other';
}

/** MIME type lookup by extension */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().replace(/^.*(\.[^.]+)$/, '$1');
  const mimeMap: Record<string, string> = {
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.webp': 'image/webp', '.pdf': 'application/pdf',
    '.csv': 'text/csv', '.txt': 'text/plain',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
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
  // #259 — plot-load validation error banner. Populated by handlePlotSelect
  // when validatePlot throws (e.g. pre-#259 plot lacking creation_order or
  // carrying schema_version < 2).
  const [plotLoadError, setPlotLoadError] = useState<{
    readonly code: string;
    readonly message: string;
  } | null>(null);
  // Stable ref for the writer-init effect's hydration retry path
  // (avoids re-running the init effect every time currentPlot changes).
  const currentPlotRef = useRef<PlotState | null>(null);
  useEffect(() => {
    currentPlotRef.current = currentPlot;
  }, [currentPlot]);
  // Result layers now live in session-state store (#109)
  const resultLayers = state.resultLayers;
  /** Maps activityId → original feature snapshots so revert can restore them */
  const [, setActivitySnapshots] = useState<
    Record<string, Feature[]>
  >({});
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  const [savedResultFiles, setSavedResultFiles] = useState<AssociatedFile[]>([]);
  const [highlightedFilePaths, setHighlightedFilePaths] = useState<string[]>([]);

  // Properties panel demo — tracks which catalog item is highlighted in the
  // StacBrowser preview so the stacked Properties slot can render its fields.
  const [propertiesHighlightedPath, setPropertiesHighlightedPath] =
    useState<string | null>(null);

  // Log panel state
  const [logEntries, setLogEntries] = useState<TimelineEntry[]>([]);
  const [logViewMode, setLogViewMode] = useState<ViewMode>('timeline');
  const [logSelectedEntryId, setLogSelectedEntryId] = useState<string | null>(null);
  const [logFilterState, setLogFilterState] = useState<LogFilterState>(LOG_DEFAULT_FILTER_STATE);
  const [logNotification, setLogNotification] = useState<string | null>(null);

  // Counter for generating unique activity IDs
  const [activityCounter, setActivityCounter] = useState(0);

  // Results panel state — tabs opened by clicking files in the STAC tree
  const [resultTabs, setResultTabs] = useState<ResultTab[]>([]);
  const [activeResultTabId, setActiveResultTabId] = useState<string | null>(null);
  const [layoutResetCount, setLayoutResetCount] = useState(0);

  // Mobile viewport detection (Feature: mobile-web-shell-preview)
  const isMobile = useIsMobile();

  // #235 — storyboard panel feature flag (query string for now).
  const storyboardPanelEnabled = useMemo(() => isStoryboardPanelEnabled(), []);

  // Drawing state (Feature: 094) — drawingMode wired to session-state store (#108)
  const drawingMode = state.drawingMode;
  const [drawnFeatures, setDrawnFeatures] = useState<DebriefFeature[]>([]);

  // Catalog revision counter — starts at 1 because bundled items are seeded synchronously.
  // Incremented after init() to pick up any additional store items.
  const [catalogRevision, setCatalogRevision] = useState(1);

  useEffect(() => {
    void stacService.init().then(() => {
      // Bump revision to re-render with store items (may include more than bundled set)
      setCatalogRevision(r => r + 1);

      // Auto-open a plot if ?plot= URL parameter is present (#174 backfill support)
      const params = new URLSearchParams(window.location.search);
      const plotParam = params.get('plot');
      if (plotParam) {
        handlePlotSelect(plotParam);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // #236 — initialise the IndexedDB-backed StacWriter and probe capability.
  // Failure modes (private mode, denied browser policy, IDB missing) are
  // captured in the registry's CapabilityReport and surface via the
  // session-only badge rather than throwing.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const capability = await probeIndexedDbCapability();
      if (cancelled) return;
      if (!capability.available) {
        setActiveStacWriter(null, capability);
        return;
      }
      try {
        const writer = await createStacWriterIdb();
        if (cancelled) {
          await writer.close();
          return;
        }
        setActiveStacWriter(writer, capability);
        // Re-apply IDB metadata overlays on top of the in-memory catalog
        // (FR-002 / FR-008). Required after writer becomes available
        // since the stacService.init() call above may have raced ahead.
        void stacService.reapplyIdbOverlays();
        // If a plot was already selected before the writer became
        // available (the URL ?plot= auto-open path can race the writer
        // init), re-hydrate now that the IDB read path is ready.
        const cp = currentPlotRef.current;
        if (cp !== null) {
          void hydrateSceneThumbnailStoreFromIdb(cp.features.features);
        }
      } catch (err) {
        console.warn('[App] stacWriter init failed:', err);
        setActiveStacWriter(null, {
          available: false,
          persistent: false,
          reason: 'unavailable',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-render the catalog whenever an item's metadata is patched (Properties
  // Panel commits → stacService.updateItemMetadata → bumps revision).
  useEffect(() => {
    return stacService.onItemsChanged(() => {
      setCatalogRevision(r => r + 1);
    });
  }, []);

  // Catalog items — map to StacBrowserItem for StacBrowser component
  const catalogItems = useMemo<StacBrowserItem[]>(() => {
    void catalogRevision; // dependency — re-compute when store items arrive
    return stacService.getItems().map((item: CatalogOverviewItem): StacBrowserItem => ({
      ...item,
      platforms: item.platforms ?? [],
      tags: item.tags ?? [],
      featureTags: item.featureTags ?? [],
      author: null,
      collection: null,
      modified: null,
    }));
  }, [catalogRevision]);

  // Extract features array from current plot
  const plotFeatures = useMemo<DebriefFeature[]>(() => {
    if (!currentPlot) return [];
    return currentPlot.features.features as DebriefFeature[];
  }, [currentPlot]);

  // All features including result layers and drawn features
  const allFeatures = useMemo<DebriefFeature[]>(() => {
    return [...plotFeatures, ...asDebriefFeatures(resultLayers as Feature[]), ...drawnFeatures];
  }, [plotFeatures, resultLayers, drawnFeatures]);

  // Features visible on map (excludes those with visible === false)
  const visibleFeatures = useMemo<DebriefFeature[]>(() => {
    return allFeatures.filter(f => {
      const props = featureProps(f);
      return props.visible !== false; // default to visible
    });
  }, [allFeatures]);

  // Derive hidden IDs set for the ActivityPanel's FeatureList / LayersToolbar
  const hiddenFeatureIds = useMemo<Set<string>>(() => {
    const hidden = new Set<string>();
    for (const f of allFeatures) {
      const props = featureProps(f);
      if (props.visible === false) hidden.add(f.id);
    }
    return hidden;
  }, [allFeatures]);

  // Feature names map for LogPanel
  const featureNames = useMemo<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    for (const f of allFeatures) {
      const id = f.id;
      if (id) names[id] = getFeatureLabel(f);
    }
    return names;
  }, [allFeatures]);

  // Expose plot features on window for Playwright test introspection
  useEffect(() => {
    window.__currentPlotFeatures = plotFeatures as Feature[];
  }, [plotFeatures]);

  // #259 — Playwright hook: run validatePlot against an arbitrary FC and
  // drive the same banner state handlePlotSelect would on a real failure.
  useEffect(() => {
    window.__triggerPlotValidation = (fc) => {
      try {
        validatePlot({
          type: 'FeatureCollection',
          features: fc.features as Parameters<typeof validatePlot>[0]['features'],
        });
        setPlotLoadError(null);
      } catch (err) {
        if (err instanceof StoryboardError) {
          setPlotLoadError({ code: err.code, message: err.message });
        } else {
          throw err;
        }
      }
    };
    return () => { delete window.__triggerPlotValidation; };
  }, []);

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
      store.getState().setCurrentTime(time);
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

  // Convert ToolsPanelItem[] to MatchResult[] for the Run dropdown in LayersToolbar
  const toolMatches = useMemo(() => {
    return tools.map(t => ({
      tool: { id: t.id, name: t.name, description: t.description },
      isActive: t.applicable,
      explanation: t.explanation ?? '',
    }));
  }, [tools]);

  // --- Keyboard: Ctrl+Z / Ctrl+Y for undo/redo ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Tool-level undo (#110): if last tool execution is recorded,
        // remove its result layers instead of performing UI-state undo
        const s = store.getState();
        if (s.lastToolExecution) {
          s.removeResultLayers(s.lastToolExecution.resultLayerIds);
          s.clearLastToolExecution();
        } else {
          s.undo();
        }
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
    void (async () => {
    try {
      const plotData = await stacService.getPlotData(itemPath);
      const item = stacService.getItem(itemPath);

      // #259 — validate the plot's Storyboards / Scenes before swapping
      // in any state. Pre-#259 plots (schema_version < 2 or Scenes lacking
      // creation_order) are rejected here per FR-010 — no silent coercion.
      try {
        validatePlot({
          type: 'FeatureCollection',
          features: plotData.features as Parameters<typeof validatePlot>[0]['features'],
        });
        setPlotLoadError(null);
      } catch (err) {
        if (err instanceof StoryboardError) {
          setPlotLoadError({ code: err.code, message: err.message });
          return;
        }
        throw err;
      }

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
          start: extent[0],
          end: extent[1],
        });
        freshStore.getState().setCurrentTime(extent[0]);
      }

      // Clear undo history — initialization isn't a user action
      freshStore.getState().clearHistory();
      freshStore.getState().markClean();
      // Spec 260 / FR-012 — opening a different plot force-unlocks the
      // viewport. The fresh store defaults to false; we set explicitly so
      // the invariant survives a future refactor that, say, copies a slice
      // across the boundary.
      freshStore.getState().setViewportLocked(false);
      // Spec #192 T017 (producer rule 1) — dispatch the read-only signal
      // from the IDB writer's capability. `getActiveCapability()` is
      // populated by the writer-init effect above; if it hasn't resolved
      // yet (race), we default to writable and rely on the save-time
      // escalation path to catch real write failures.
      {
        const capability = getActiveCapability();
        const persistent = capability.persistent === true;
        freshStore.getState().setReadOnly(
          !persistent,
          persistent ? null : 'Storage location is not writable',
        );
      }

      setCurrentPlot({
        itemPath,
        title: item?.properties.title ?? itemPath,
        features: plotData,
      });
      // #236 — register the active STAC item parent so scene-thumbnail
      // captures know which item.json overlay to land into.
      setActiveStacItemPath(stripItemPathToParent(itemPath));
      // #236 FR-001 — re-hydrate the in-memory thumbnail store from IDB
      // so previously-captured scenes show their thumbnails after reload.
      // Best-effort; failures fall back to empty thumbnails.
      clearSceneThumbnailStore();
      void hydrateSceneThumbnailStoreFromIdb(plotData.features);
      freshStore.getState().clearResultLayers();
      setDrawnFeatures([]);
      freshStore.getState().setDrawingMode(null);
      setToolMessage(null);
      setLogEntries([]);
      setView('analysis');
    } catch (error) {
      console.error('Failed to load plot:', error);
    }
    })();
  }, []);

  // Handle back to catalog
  const handleBackToCatalog = useCallback(() => {
    setView('welcome');
    setCurrentPlot(null);
    setActiveStacItemPath(null);
    store.getState().clearResultLayers();
    // Spec 260 / FR-012 — leaving the plot view force-unlocks (no active
    // map means there's nothing for the lock to constrain).
    store.getState().setViewportLocked(false);
    setToolMessage(null);
    setLogEntries([]);
    setSavedResultFiles([]);
    setHighlightedFilePaths([]);
    store.getState().clearSelection();
  }, [store]);

  // Expose navigation functions for Playwright backfill script (#174)
  useEffect(() => {
    window.__openPlot = handlePlotSelect;
    window.__backToCatalog = handleBackToCatalog;
    return () => { delete window.__openPlot; delete window.__backToCatalog; };
  }, [handlePlotSelect, handleBackToCatalog]);

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
      return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== aid));
    });
  }, []);

  // Handle LogPanel messages
  const handleLogMessage = useCallback((message: LogPanelMessage) => {
    if (message.type === 'entry:select') {
      store.getState().setSelection(message.payload.featureIds);
    } else if (message.type === 'entry:deselect') {
      store.getState().clearSelection();
    } else if (message.type === 'action:invoke') {
      const { actionType, activity_id: activityId } = message.payload;
      if (actionType === 'revertTo') {
        // Remove all entries after the target and restore their original features
        setLogEntries((prev: TimelineEntry[]) => {
          const idx = prev.findIndex((e: TimelineEntry) => e.activity_id === activityId);
          if (idx < 0) return prev;
          // Entries before idx (most-recent-first) are the ones being removed
          const removed = prev.slice(0, idx);
          for (const r of removed) {
            restoreSnapshots(r.activity_id);
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
            e.activity_id === activityId ? { ...e, deleted: true } : e
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

  // Phase 6: Debounce timer for slider tune requests.
  // Without this, every pixel of slider drag fires a full tool re-execution.
  const tuneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 6: Handle tune request from slider/edit face or display face click.
  // Display face click passes the current value (needs prompt for new value).
  // Edit face slider passes the already-new value (use directly, debounced).
  const handleTuneRequest = useCallback(
    (activityId: string, parameter: string, value: unknown) => {
      const entry = logEntries.find((e: TimelineEntry) => e.activity_id === activityId);
      const currentValue = entry?.parameters[parameter]?.value;

      // Ignore display-face clicks (value unchanged) — tuning is done via
      // the edit-face slider only.
      if (value === currentValue) return;

      // Edit face slider — debounce so rapid drags don't re-execute per pixel
      if (tuneTimerRef.current) clearTimeout(tuneTimerRef.current);
      tuneTimerRef.current = setTimeout(() => {
        tuneTimerRef.current = null;
        applyTune(activityId, parameter, value);
      }, 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logEntries]
  );

  // Actual tune logic, called after debounce settles (slider) or immediately (prompt).
  const applyTune = useCallback(
    (activityId: string, parameter: string, newValue: unknown) => {
      // Find the entry being tuned
      const entry = logEntries.find((e: TimelineEntry) => e.activity_id === activityId);

      // Extract raw parameter values from a log entry's ParameterValue wrappers
      const unwrapParams = (params: Record<string, { value: unknown }>): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        for (const [key, param] of Object.entries(params)) {
          if (param && typeof param === 'object' && 'value' in param) {
            result[key] = param.value;
          } else {
            result[key] = param;
          }
        }
        return result;
      };

      // Track updated inputState for subsequent entries replayed during propagation
      // T022: InputFeatureState now uses schema field names (feature_id, geometry/properties as JSON strings)
      const updatedInputStates = new Map<string, Array<{ feature_id: string; geometry: string; properties?: string }>>();

      // Restore features from inputState and re-execute for mutation tools
      if (entry?.input_state && entry.input_state.length > 0 && isMutationTool(entry.toolName)) {
        setCurrentPlot(plot => {
          if (!plot) return plot;
          const restoredMap = new Map(
            entry.input_state!.map(is => [is.feature_id, is])
          );
          // Restore original geometry in the plot (pre-tuned-entry state)
          // T022: schema InputFeatureState stores geometry/properties as JSON strings
          let currentFeatures = plot.features.features.map(f => {
            const saved = restoredMap.get(String(f.id));
            if (!saved) return f;
            return {
              ...f,
              geometry: JSON.parse(saved.geometry) as Feature['geometry'],
              properties: {
                ...(f.properties ?? {}),
                // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
                ...(saved.properties ? JSON.parse(saved.properties) as Record<string, unknown> : {}),
              },
            };
          });

          // Collect the restored features that the tuned tool will operate on
          const featuresToMove = currentFeatures.filter(f =>
            restoredMap.has(String(f.id))
          ) as Feature[];

          // Build parameters with the tuned value applied
          const tunedParams = unwrapParams(entry.parameters);
          tunedParams[parameter] = newValue;

          // Re-execute the tuned entry from the restored geometry
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = executeTool(entry.toolName, featuresToMove as any, tunedParams);
          const fc = JSON.parse(response.content[0]?.resource?.text ?? '{"features":[]}');
          const moved = (fc.features ?? []) as Feature[];
          const movedMap = new Map(moved.map(m => [String(m.id), m]));

          // Apply the tuned entry's result
          currentFeatures = currentFeatures.map(f => {
            const m = movedMap.get(String(f.id));
            return m ?? f;
          });

          // Propagate: replay all subsequent mutation entries on affected features.
          // logEntries is stored newest-first, so entries at indices before tunedIdx
          // are chronologically after the tuned entry. Iterate from tunedIdx-1 → 0
          // to replay in chronological order.
          const tunedIdx = logEntries.findIndex((e: TimelineEntry) => e.activity_id === activityId);
          if (tunedIdx > 0) {
            for (let i = tunedIdx - 1; i >= 0; i--) {
              const nextEntry = logEntries[i]!;
              if (!isMutationTool(nextEntry.toolName)) continue;
              if (!nextEntry.input_state || nextEntry.input_state.length === 0) continue;

              // Only replay if this entry affects features that were modified
              // T022: schema InputFeatureState uses feature_id (snake_case)
              const affectedIds = new Set(nextEntry.input_state.map(is => is.feature_id));
              const featuresToReplay = currentFeatures.filter(f =>
                affectedIds.has(String(f.id))
              ) as Feature[];
              if (featuresToReplay.length === 0) continue;

              // Capture pre-execution state as updated inputState for this entry
              // T022: schema InputFeatureState stores geometry/properties as JSON strings
              updatedInputStates.set(nextEntry.activity_id, featuresToReplay.map(f => {
                const props = (f.properties ?? {}) as { [key: string]: unknown };
                const restProps = Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'provenance'));
                return {
                  feature_id: String(f.id),
                  geometry: JSON.stringify(f.geometry),
                  properties: JSON.stringify(restProps),
                };
              }));

              // Re-execute subsequent entry with its original parameters
              const subParams = unwrapParams(nextEntry.parameters);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const subResponse = executeTool(nextEntry.toolName, featuresToReplay as any, subParams);
              const subFc = JSON.parse(subResponse.content[0]?.resource?.text ?? '{"features":[]}');
              const subMoved = (subFc.features ?? []) as Feature[];
              const subMovedMap = new Map(subMoved.map(m => [String(m.id), m]));

              currentFeatures = currentFeatures.map(f => {
                const m = subMovedMap.get(String(f.id));
                return m ?? f;
              });
            }
          }

          return {
            ...plot,
            features: { ...plot.features, features: currentFeatures },
          };
        });
      }

      // Update the tuned entry's parameters/annotation and inputState for replayed entries
      setLogEntries((prev: TimelineEntry[]) =>
        prev.map((e: TimelineEntry) => {
          if (e.activity_id === activityId) {
            const updatedParams = { ...e.parameters };
            if (updatedParams[parameter]) {
              // T022: schema ParameterValue.value is string (wire format); serialize if needed
              updatedParams[parameter] = {
                ...updatedParams[parameter],
                value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
              };
            }
            return {
              ...e,
              parameters: updatedParams,
              tuneAnnotation: { parameter, previous_value: e.parameters[parameter]?.value, new_value: newValue },
            };
          }
          // Update inputState for subsequent entries that were replayed
          const newState = updatedInputStates.get(e.activity_id);
          if (newState) {
            return { ...e, input_state: newState };
          }
          return e;
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
        e.activity_id === activityId ? { ...e, deleted: false } : e
      )
    );
    setLogNotification('Operation restored.');
    setTimeout(() => setLogNotification(null), 3000);
  }, []);

  // Feature 113: Flip-card schema request — builds schema from tool definitions
  const handleSchemaRequest = useCallback(
    (toolId: string): Promise<ReadonlyArray<ParameterSchemaEntry>> => {
      // Look up the tool definition to get proper schema info (enum, paramType, etc.)
      const toolDefs = listTools();
      const toolDef = toolDefs.find((t) => t.name === toolId);
      const paramsSchema = (toolDef?.inputSchema?.properties?.params as
        | { properties?: Record<string, { type?: string; enum?: unknown[]; default?: unknown; description?: string; minimum?: number; maximum?: number; step?: number; 'x-debrief-param-type'?: string }> }
        | undefined)?.properties;

      // Find the log entry to get current values and tunability
      const entry = logEntries.find((e: TimelineEntry) => e.toolName === toolId);
      const schema: ParameterSchemaEntry[] = [];
      if (entry) {
        for (const [name, param] of Object.entries(entry.parameters)) {
          const propSchema = paramsSchema?.[name];
          const hasEnum = propSchema?.enum && propSchema.enum.length > 0;
          const schemaType = propSchema?.type;

          // Determine type: enum if choices exist, otherwise from schema or runtime value
          let type: ParameterSchemaEntry['type'];
          if (hasEnum) {
            type = 'enum';
          } else if (schemaType === 'number' || schemaType === 'integer') {
            type = 'number';
          } else if (schemaType === 'boolean') {
            type = 'boolean';
          } else if (schemaType === 'object') {
            type = 'object';
          } else if (schemaType === 'array') {
            type = 'array';
          } else {
            // Fallback to runtime value type
            const valueType = typeof param.value;
            type = valueType === 'number' ? 'number' : valueType === 'boolean' ? 'boolean' : 'string';
          }

          schema.push({
            name,
            type,
            description: propSchema?.description ?? null,
            tunable: param.tunable !== false,
            defaultValue: propSchema?.default ?? (param.default ? param.value : null),
            minimum: propSchema?.minimum ?? (type === 'number' ? 0 : null),
            maximum: propSchema?.maximum ?? (type === 'number' ? Number(param.value) * 3 : null),
            step: propSchema?.step ?? (type === 'number' ? 1 : null),
            choices: hasEnum ? (propSchema!.enum ?? null) : null,
            paramType: propSchema?.['x-debrief-param-type'] ?? null,
          });
        }
      }
      return Promise.resolve(schema);
    },
    [logEntries]
  );

  // Feature 113: Flip-card disable toggle
  const handleDisableToggle = useCallback(
    (activityId: string, disabled: boolean) => {
      setLogEntries((prev: TimelineEntry[]) =>
        prev.map((e: TimelineEntry) =>
          e.activity_id === activityId ? { ...e, disabled } : e
        )
      );
    },
    []
  );

  // Feature 113: Flip-card rationale update
  const handleRationaleUpdate = useCallback(
    (activityId: string, rationale: string) => {
      setLogEntries((prev: TimelineEntry[]) =>
        prev.map((e: TimelineEntry) =>
          e.activity_id === activityId ? { ...e, rationale } : e
        )
      );
    },
    []
  );

  // Handle map feature selection (goes through session-state).
  //
  // #192 Phase 5: routes the new `SelectionClickEvent` through the shared
  // `applyClickToSelection` helper so the map and the Layers panel
  // produce identical selection sets for identical sequences.
  const handleMapSelect = useCallback((event: SelectionClickEvent) => {
    const s = store.getState();
    const next = applyClickToSelection({
      current: {
        featureIds: s.selection.featureIds,
        primary: s.selection.primary ?? null,
      },
      event,
    });
    s.setSelection(next.featureIds, next.primary ?? undefined);
  }, [store]);

  // Handle background click (clear selection via session-state)
  const handleBackgroundClick = useCallback(() => {
    store.getState().clearSelection();
  }, [store]);

  // Handle drawing mode change — write to session-state store (#108)
  const handleDrawingModeChange = useCallback((mode: DrawingMode) => {
    store.getState().setDrawingMode(mode);
  }, [store]);

  // Spec 260 — viewport lock toggle from MapView (banner click, padlock,
  // L shortcut). The session-state slice is the source of truth. The
  // Storyboard padlock has its own toggle helper inside StoryboardPanelMount.
  const handleViewportLockChange = useCallback((locked: boolean) => {
    store.getState().setViewportLocked(locked);
  }, [store]);

  // #235 — track the latest map bounds + zoom and write a 4-corner
  // ViewportPolygon to session-state so the capture command can read
  // viewport / zoom synchronously. Mirrors VS Code's mapPanel.ts viewport
  // wiring (lines 875-894) but without the postMessage bridge.
  const latestMapZoomRef = useRef<number | null>(null);
  const handleMapZoomChange = useCallback((zoom: number): void => {
    latestMapZoomRef.current = zoom;
  }, []);
  const handleMapBoundsChange = useCallback(
    (bounds: [number, number, number, number]): void => {
      // bounds = [west, south, east, north]
      const [west, south, east, north] = bounds;
      // Default zoom to MapView's initialZoom (10) if zoomend hasn't
      // fired yet — the capture command rejects when zoom is undefined,
      // and zoomend is unreliable in headless browsers on initial mount.
      const zoom = latestMapZoomRef.current ?? 10;
      // 4-corner polygon in clockwise order [NW, NE, SE, SW] per
      // ViewportPolygon's documented contract.
      const coordinates = [
        { longitude: west, latitude: north },
        { longitude: east, latitude: north },
        { longitude: east, latitude: south },
        { longitude: west, latitude: south },
      ];
      store.getState().setViewport({ coordinates, zoom });
    },
    [store],
  );

  // Handle shape drawn on map (Feature: 094, 096)
  const handleShapeCreated = useCallback((geojson: GeoJSON.Feature, mode: DrawingMode) => {
    const defaultName = mode === 'point' ? 'Drawn Point' : 'Drawn Rectangle';
    const promptLabel = mode === 'point' ? 'Name this point:' : 'Name this shape:';
    const name = window.prompt(promptLabel, defaultName);
    if (name === null) return; // user cancelled — discard the shape

    // FR-096: Get palette style overrides for sequential colour assignment
    const paletteIndex = store.getState().drawingPaletteIndex;
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
      store.getState().setSelection([feature.id]);
      store.getState().incrementDrawingPaletteIndex();

      // Record a log entry for the drawing action
      const nextId = activityCounter + 1;
      setActivityCounter(nextId);
      const entry: TimelineEntry = {
        activity_id: `act-${String(nextId).padStart(3, '0')}`,
        timestamp: new Date().toISOString(),
        toolName: `draw-${mode ?? 'shape'}`,
        tool_version: '1.0.0',
        parameters: {},
        usedFeatureIds: [],
        generatedFeatureIds: [feature.id],
        execution_duration: 'PT0S',
        generated_result_id: feature.id,
        operationCategory: 'property-edit',
      };
      setLogEntries(prev => [entry, ...prev]);
    }
  }, [store, activityCounter]);

  // Handle file selection from STAC tree — open result files as tabs
  const handleFileSelect = useCallback(async (filePath: string) => {
    const artifactType = getArtifactType(filePath);
    const filename = filePath.replace(/^.*\//, '');

    // Skip item.json (STAC metadata, not a result)
    if (filename === 'item.json' || filename === 'catalog.json') return;

    // Already open? Just activate the tab
    const existing = resultTabs.find(t => t.path === filePath);
    if (existing) {
      setActiveResultTabId(existing.id);
      return;
    }

    try {
      if (artifactType === 'dataset') {
        const content = await mockFsAdapter.readFile(filePath);
        const parsed = JSON.parse(content) as DatasetEnvelope;
        if (!parsed.type || !parsed.title) return;
        const tab: ResultTab = {
          id: filePath, title: parsed.title, path: filePath,
          artifactType: 'dataset', dataset: parsed,
          displayHint: parsed.displayHint,
        };
        setResultTabs(prev => [...prev, tab]);
        setActiveResultTabId(tab.id);
      } else if (artifactType === 'image') {
        // Read image content — in the mock FS it's stored as text (SVG etc.)
        const content = await mockFsAdapter.readFile(filePath);
        const mime = getMimeType(filePath);
        const dataUri = mime === 'image/svg+xml'
          ? `data:${mime};base64,${btoa(content)}`
          : `data:${mime};base64,${content}`;
        const tab: ResultTab = {
          id: filePath, title: filename, path: filePath,
          artifactType: 'image', imageDataUri: dataUri,
        };
        setResultTabs(prev => [...prev, tab]);
        setActiveResultTabId(tab.id);
      } else {
        // Fallback: show file metadata
        const stats = await mockFsAdapter.stat(filePath);
        const tab: ResultTab = {
          id: filePath, title: filename, path: filePath,
          artifactType: 'other',
          fileMeta: { filename, mimeType: getMimeType(filePath), sizeBytes: stats.size },
        };
        setResultTabs(prev => [...prev, tab]);
        setActiveResultTabId(tab.id);
      }
    } catch {
      // Cannot read file — ignore silently
    }
  }, [resultTabs]);

  // Close a result tab
  const handleCloseResultTab = useCallback((tabId: string) => {
    setResultTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (tabId === activeResultTabId) {
        setActiveResultTabId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeResultTabId]);

  // Active result tab
  const activeResultTab = useMemo(
    () => resultTabs.find(t => t.id === activeResultTabId) ?? null,
    [resultTabs, activeResultTabId]
  );

  // Transform active dataset to Vega-Lite spec (only for dataset tabs)
  const activeChartSpec = useMemo(() => {
    if (!activeResultTab || activeResultTab.artifactType !== 'dataset' || !activeResultTab.dataset) return null;
    const result = transformDataset(activeResultTab.dataset);
    return result.ok ? result.spec : null;
  }, [activeResultTab]);

  // Handle tool execution — persist result to STAC assets and record a log entry
  const handleRunTool = useCallback((toolId: string, params?: Record<string, unknown>) => {
    // Determine if this is a mutation tool BEFORE execution
    const replacesInPlace = isMutationTool(toolId);

    // Capture pre-tool geometry for mutation tools BEFORE execution.
    // executeTool() mutates feature geometry and properties in-place,
    // so we must snapshot the originals before the call.
    // T022: schema InputFeatureState uses feature_id (snake_case) and stores
    // geometry/properties as JSON strings (wire format).
    const inputState = replacesInPlace && selectedFeatures.length > 0
      ? selectedFeatures.map(f => {
          const props = featureProps(f);
          const restProps = Object.fromEntries(Object.entries(props).filter(([k]) => k !== 'provenance'));
          return {
            feature_id: String(f.id),
            geometry: JSON.stringify(f.geometry),
            properties: JSON.stringify(restProps),
          };
        })
      : null;

    // Also snapshot full originals for revert before execution
    const originalSnapshots = replacesInPlace && selectedFeatures.length > 0
      ? selectedFeatures.map(f => JSON.parse(JSON.stringify(f)) as Feature)
      : null;

    const result: ToolResult = calcService.runTool(toolId, selectedFeatures as Feature[], params);
    setToolMessage(result.message);

    if (replacesInPlace) {
      // Replace the original features in the plot with the moved versions
      const movedFeatures = result.resultLayers ?? (result.resultLayer ? [result.resultLayer] : []);
      if (movedFeatures.length > 0) {
        const movedMap = new Map(movedFeatures.map(m => [String(m.id), m]));
        setCurrentPlot(plot => {
          if (!plot) return plot;
          const updatedFeatures = plot.features.features.map(f => {
            const moved = movedMap.get(String(f.id));
            return moved ?? f;
          });
          return {
            ...plot,
            features: { ...plot.features, features: updatedFeatures },
          };
        });
      }
    }

    // Collect all result layers (singular or plural) for additive tools
    const allResultLayers: Feature[] = replacesInPlace
      ? []
      : [
          ...(result.resultLayer ? [result.resultLayer] : []),
          ...(result.resultLayers ?? []),
        ];

    if (allResultLayers.length > 0) {
      store.getState().addResultLayers(allResultLayers as RawGeoJSONFeature[]);

      // Record last tool execution for single-step undo (#110)
      const resultIds = allResultLayers.map((layer, i) =>
        String(layer.id ?? layer.properties?.['id'] ?? `result-${activityCounter + 1}-${i}`)
      );
      store.getState().setLastToolExecution({
        toolId,
        sourceFeatureIds: selectedFeatures.map(f => String(f.id)),
        resultLayerIds: resultIds,
      });

      // Persist results as STAC assets in the current item's assets/ directory
      if (currentPlot) {
        const itemDir = `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}`;
        const sourceNames = selectedFeatures
          .map(f => featureProps(f).name ?? f.id ?? 'unknown')
          .map(n => String(n).toLowerCase().replace(/\s+/g, '-'))
          .join('-');

        for (let i = 0; i < allResultLayers.length; i++) {
          const suffix = allResultLayers.length > 1 ? `-${i + 1}` : '';
          const fileName = `${toolId}-${sourceNames}${suffix}.json`;
          const assetPath = `${itemDir}/assets/${fileName}`;
          mockFsAdapter.writeFile(assetPath, JSON.stringify(allResultLayers[i], null, 2));
        }
        setTreeRefreshKey(k => k + 1);
      }
    }

    // Write dataset results to STAC assets and auto-open in Results panel
    if (result.datasets && result.datasets.length > 0 && currentPlot) {
      const itemDir = `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}`;
      for (const ds of result.datasets) {
        const assetPath = `${itemDir}/assets/${ds.filename}`;
        mockFsAdapter.writeFile(assetPath, JSON.stringify(ds.envelope, null, 2));
        // Auto-open the dataset as a result tab
        handleFileSelect(assetPath);
      }
      setTreeRefreshKey(k => k + 1);
    }

    // Record a log entry
    const nextId = activityCounter + 1;
    setActivityCounter(nextId);

    const usedIds = selectedFeatures.map(f => f.id).filter(Boolean);

    const generatedIds = allResultLayers.length > 0
      ? allResultLayers.map((layer, i) =>
          String(layer.properties?.['id'] ?? `result-${nextId}-${i}`))
      : [];

    const activityId = `act-${String(nextId).padStart(3, '0')}`;

    const entry: TimelineEntry = {
      activity_id: activityId,
      timestamp: new Date().toISOString(),
      toolName: toolId,
      tool_version: '1.0.0',
      // T022: schema ParameterValue.value is string; serialize non-string values
      parameters: result.parameters
        ? Object.fromEntries(Object.entries(result.parameters).map(([k, v]) => [
            k,
            { ...v, value: typeof v.value === 'string' ? v.value : JSON.stringify(v.value) },
          ]))
        : {},
      usedFeatureIds: usedIds,
      generatedFeatureIds: generatedIds,
      execution_duration: 'PT0.1S',
      generated_result_id: generatedIds[0] ?? null,
      operationCategory: 'calculation',
      input_state: inputState,
    };

    // Store pre-tool snapshots for revert (captured before execution above)
    if (originalSnapshots) {
      setActivitySnapshots(prev => ({
        ...prev,
        [activityId]: originalSnapshots,
      }));
    }

    setLogEntries(prev => [entry, ...prev]);
  }, [selectedFeatures, activityCounter, currentPlot, handleFileSelect, store]);

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
        store.getState().setDisplayMode(message.payload.mode);
        break;
      case 'tool:run':
        handleRunTool(message.payload.toolId, message.payload.params);
        break;
      case 'layer:select':
        store.getState().setSelection(message.payload.featureIds);
        break;
      case 'layer:selectEvent': {
        // #192 Phase 5: emitted right after `layer:select` by FeatureList
        // for plain/modifier clicks. Re-route through the shared
        // `applyClickToSelection` helper so `selection.primary` follows
        // the modifier-aware "most recent action" rule, matching the
        // map-click path.
        const s = store.getState();
        const next = applyClickToSelection({
          current: {
            featureIds: s.selection.featureIds,
            primary: s.selection.primary ?? null,
          },
          event: message.payload,
        });
        s.setSelection(next.featureIds, next.primary ?? undefined);
        break;
      }
      case 'layer:toggleVisibility': {
        const targetIds = new Set(message.payload.featureIds);

        // Determine toggle direction: if ALL targets are already hidden, show them; otherwise hide all
        const allCurrentlyHidden = message.payload.featureIds.every(id => {
          const f = allFeatures.find(feat => feat.id === id);
          return f ? featureProps(f).visible === false : false;
        });
        const newVisible = allCurrentlyHidden; // true = show, false = hide

        // Update plot features
        setCurrentPlot(plot => {
          if (!plot) return plot;
          const updatedFeatures = plot.features.features.map(f => {
            if (!targetIds.has(String(f.id))) return f;
            const props = (f.properties ?? {}) as { [key: string]: unknown };
            return { ...f, properties: { ...props, visible: newVisible } };
          });
          return { ...plot, features: { ...plot.features, features: updatedFeatures } };
        });

        // Also update drawn features
        setDrawnFeatures(prev =>
          prev.map(f => {
            if (!targetIds.has(f.id)) return f;
            return Object.assign({}, f, {
              properties: { ...f.properties, visible: newVisible },
            });
          }),
        );
        break;
      }
      case 'layer:format': {
        const { featureIds, property, isPointOverride, positionIndex } = message.payload;
        // Coerce boolean string values ('true'/'false') to actual booleans
        const rawValue = message.payload.value;
        const value = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;
        const targetIds = new Set(featureIds);

        // Helper: apply a style property to a feature-level style object
        const applyStyleProperty = (style: StyleObj, prop: string, val: unknown): StyleObj => {
          const result = { ...style };
          const dotIndex = prop.indexOf('.');
          if (dotIndex > 0) {
            const category = prop.slice(0, dotIndex);
            const field = prop.slice(dotIndex + 1);
            const oldCategory = (result[category] ?? {}) as StyleObj;
            result[category] = { ...oldCategory, [field]: val };
          } else {
            result[prop] = val;
          }
          return result;
        };

        // Update features in the current plot
        setCurrentPlot(plot => {
          if (!plot) return plot;
          const updatedFeatures = plot.features.features.map(f => {
            if (!targetIds.has(String(f.id))) return f;

            const props = (f.properties ?? {}) as { [key: string]: unknown };

            // Per-position override: write to position_style_overrides[index]
            if (isPointOverride && positionIndex !== undefined) {
              const overrides = { ...(props.position_style_overrides ?? {}) as OverridesObj };
              const key = String(positionIndex);
              overrides[key] = { ...(overrides[key] ?? {}), [property]: value };
              return { ...f, properties: { ...props, position_style_overrides: overrides } };
            }

            // Feature-level style change
            const oldStyle = (props.style ?? {}) as StyleObj;
            const newStyle = applyStyleProperty(oldStyle, property, value);
            return { ...f, properties: { ...props, style: newStyle } };
          });

          return {
            ...plot,
            features: { ...plot.features, features: updatedFeatures },
          };
        });

        // Also update drawn features if targeted (drawn features don't have positions)
        if (!isPointOverride) {
          setDrawnFeatures(prev =>
            prev.map(f => {
              if (!targetIds.has(f.id)) return f;

              const props = featureProps(f);
              const oldStyle = (props.style ?? {}) as StyleObj;
              const newStyle = applyStyleProperty(oldStyle, property, value);
              return Object.assign({}, f, {
                properties: { ...f.properties, style: newStyle },
              });
            }),
          );
        }
        break;
      }
      case 'file:action': {
        const { file, action } = message.payload;
        if (action === 'open') {
          // Load the file as a result tab in the Results panel
          void handleFileSelect(file.path);
        } else if (action === 'reveal') {
          // Highlight the file in the Navigation tree
          setHighlightedFilePaths([file.path]);
        } else if (action === 'openWith') {
          // Web-shell has no viewer picker — show a notification
          setToolMessage(`Open with: no alternative viewers available for ${file.name}`);
        } else if (action === 'delete') {
          // Remove from saved results list (does not delete from filesystem)
          setSavedResultFiles(prev => prev.filter(f => f.path !== file.path));
        }
        break;
      }
      default:
        break;
    }
  }, [playback, store, handleRunTool, handleFileSelect, allFeatures]);

  // --- Panel workspace infrastructure ---
  // Create panel registry once (stable reference)
  const panelRegistry = useMemo(() => createDefaultRegistry(), []);

  // Panel component references (stable across renders)
  const panelComponents = useMemo<PanelComponents>(() => ({
    ActivityPanel,
    MapView,
    LogPanel,
    StacFileTree,
    ChartRenderer,
  }), []);

  // Save result as CSV to the plot's asset folder (#177)
  const handleSaveResult = useCallback((tabId: string, baseName?: string, tag?: string) => {
    const tab = resultTabs.find(t => t.id === tabId);
    if (!tab || !tab.dataset || !currentPlot) return;

    // Build CSV from dataset
    const data = tab.dataset.data ?? tab.dataset.series?.flatMap(s => s.data) ?? [];
    if (data.length === 0) return;
    const csv = buildCsvContent(data as Record<string, unknown>[]);

    // Generate filename
    const toolName = tab.title.split(':')[0]?.trim().toLowerCase().replace(/\s+/g, '-') ?? 'result';
    const filename = generateCsvFilename(toolName, baseName, tag);

    // Write to mock filesystem
    const itemDir = `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}`;
    const assetPath = `${itemDir}/assets/${filename}`;
    mockFsAdapter.writeFile(assetPath, csv);

    // Mark tab as saved
    setResultTabs(prev => prev.map(t => t.id === tabId ? { ...t, isSaved: true } : t));

    // Add to associated result files so it appears in the LayersToolbar dropdown
    setSavedResultFiles(prev => {
      // Avoid duplicates if same file saved twice
      if (prev.some(f => f.path === assetPath)) return prev;
      return [...prev, {
        name: filename,
        path: assetPath,
        category: 'result' as const,
        format: 'csv',
        mtime: Date.now(),
      }];
    });

    // Refresh the file tree so the new asset appears
    setTreeRefreshKey(k => k + 1);
  }, [resultTabs, currentPlot]);

  // Results context for the Chart/Results panel wrapper
  const chartContextProps = useMemo<ChartContextProps | null>(() => {
    if (resultTabs.length === 0 && !activeChartSpec) return null;
    const tabData: ChartTabData[] = resultTabs.map(t => ({
      id: t.id,
      title: t.title,
      artifactType: t.artifactType,
      imageDataUri: t.imageDataUri,
      fileMeta: t.fileMeta,
      displayHint: t.displayHint,
      tableData: t.displayHint === 'table' && t.dataset?.data ? t.dataset.data : undefined,
      isSaved: t.isSaved ?? false,
    }));
    return {
      chartSpec: activeChartSpec,
      chartTabs: tabData,
      activeChartTabId: activeResultTabId,
      onChartTabSelect: setActiveResultTabId,
      onChartTabClose: handleCloseResultTab,
      onSave: (tabId: string) => handleSaveResult(tabId),
      onSaveAs: (tabId: string, baseName: string, tag?: string) => handleSaveResult(tabId, baseName, tag),
      onRetry: (_tabId: string) => { /* Retry not yet implemented in web-shell */ },
    };
  }, [resultTabs, activeChartSpec, activeResultTabId, handleCloseResultTab, handleSaveResult]);

  // Full context value for all panel wrappers
  const panelContextValue = useMemo<PanelContextValue>(() => ({
    components: panelComponents,
    activityPanelProps: currentPlot ? {
      timeExtent,
      currentTime: playback.currentTime,
      playbackState: playback.playbackState,
      playbackSpeed: playback.speed,
      displayMode: state.displayMode,
      timeUiState: timeExtent ? 'ready' : 'empty',
      tools,
      toolMatches,
      features: allFeatures,
      selectedFeatureIds: state.selection.featureIds,
      hiddenIds: hiddenFeatureIds,
      resultFiles: savedResultFiles,
      onMessage: handleActivityMessage,
    } : null,
    mapViewProps: currentPlot ? {
      features: visibleFeatures,
      selectedIds: selectedIds,
      onSelect: handleMapSelect,
      onBackgroundClick: handleBackgroundClick,
      // #235 — viewport-sync wiring is gated on the storyboard rail flag.
      // Leaflet fires `boundsChange` during initial mount, which would
      // call `setViewport` and push an undo entry the moment the map
      // renders — breaking the #073 invariant that plot load is not
      // undoable. The sync only exists for the capture command, which
      // is unreachable without the rail.
      onZoomChange: storyboardPanelEnabled ? handleMapZoomChange : undefined,
      onBoundsChange: storyboardPanelEnabled ? handleMapBoundsChange : undefined,
      currentTime: playback.currentTime,
      displayMode: state.displayMode,
      drawingMode,
      onDrawingModeChange: handleDrawingModeChange,
      onShapeCreated: handleShapeCreated,
      // Spec 260 — viewport lock wired through session-state.
      viewportLocked: state.viewportLocked,
      onViewportLockChange: handleViewportLockChange,
      height: '100%',
      className: 'web-shell__map',
    } : null,
    logPanelProps: currentPlot ? {
      entries: logEntries,
      featureNames,
      viewMode: logViewMode,
      selectedEntryId: logSelectedEntryId,
      filterState: logFilterState,
      hasActiveSession: true,
      plotName: currentPlot?.title ?? null,
      actionResultMessage: logNotification,
      onMessage: handleLogMessage,
      onViewModeChange: setLogViewMode,
      onFilterStateChange: setLogFilterState,
      onSelectedEntryChange: setLogSelectedEntryId,
      onTuneRequest: handleTuneRequest,
      onRestoreRequest: handleRestoreRequest,
      onSchemaRequest: handleSchemaRequest,
      onDisableToggle: handleDisableToggle,
      onRationaleUpdate: handleRationaleUpdate,
    } : null,
    stacFileTreeProps: currentPlot ? {
      fs: mockFsAdapter,
      rootPath: '/local-store',
      currentItemPath: currentPlot
        ? `/local-store/${currentPlot.itemPath.replace('./', '').replace('/item.json', '')}`
        : undefined,
      highlightedPaths: highlightedFilePaths,
      onFileSelect: handleFileSelect,
      refreshKey: treeRefreshKey,
      className: 'web-shell__file-tree',
    } : null,
    chartProps: chartContextProps,
  }), [
    panelComponents, currentPlot, timeExtent, playback.currentTime,
    playback.playbackState, playback.speed, state.displayMode,
    tools, toolMatches, allFeatures, visibleFeatures, state.selection.featureIds,
    hiddenFeatureIds, handleActivityMessage,
    selectedIds, handleMapSelect, handleBackgroundClick,
    handleMapZoomChange, handleMapBoundsChange, storyboardPanelEnabled,
    drawingMode, handleDrawingModeChange,
    state.viewportLocked, handleViewportLockChange,
    handleShapeCreated, logEntries, featureNames,
    logViewMode, logSelectedEntryId, logFilterState, logNotification,
    handleLogMessage, handleTuneRequest, handleRestoreRequest,
    handleSchemaRequest, handleDisableToggle, handleRationaleUpdate,
    handleFileSelect, treeRefreshKey, chartContextProps, savedResultFiles, highlightedFilePaths,
  ]);

  // Context wrapper for the GoldenLayout bridge — wraps each panel in PanelContextProvider
  const contextWrapper = useCallback(
    (element: React.ReactElement) =>
      createElement(PanelContextProvider, { value: panelContextValue }, element),
    [panelContextValue]
  );

  // Dynamically add results panel when result data arrives (or after layout reset)
  useEffect(() => {
    if (resultTabs.length === 0) return;
    const el = document.querySelector('[data-testid="panel-workspace"]') as PanelWorkspaceElement | null;
    if (el?.__addPanel) {
      el.__addPanel(PANEL_CHART, 'Results');
    }
  }, [resultTabs.length > 0, layoutResetCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render welcome view
  if (view === 'welcome') {
    const highlightedItem = propertiesHighlightedPath
      ? catalogItems.find((i) => i.itemPath === propertiesHighlightedPath) ?? null
      : null;

    const highlightedFields: PropertiesFormField[] = highlightedItem
      ? [
          {
            key: 'title',
            label: 'Title',
            value: highlightedItem.title,
            spec: { kind: 'string' },
            derivation: 'user',
            required: true,
            error: null,
          },
          {
            key: 'datetime',
            label: 'Datetime',
            value: highlightedItem.datetime ?? null,
            spec: { kind: 'datetime' },
            derivation: 'auto-derived',
            required: false,
            error: null,
          },
          {
            key: 'start_datetime',
            label: 'Start datetime',
            value: highlightedItem.startDatetime ?? null,
            spec: { kind: 'datetime' },
            derivation: 'override',
            required: false,
            error: null,
          },
          {
            key: 'debrief:tags',
            label: 'Tags',
            value: highlightedItem.tags ?? [],
            spec: { kind: 'string-array' },
            derivation: 'user',
            required: false,
            error: null,
          },
          {
            key: 'debrief:platforms',
            label: 'Platforms (derived from features)',
            value: highlightedItem.platforms ?? [],
            spec: { kind: 'platform-array' },
            derivation: 'auto-derived',
            required: false,
            error: null,
            // Platforms are re-synthesised from the plot's features on every
            // save, so editing them from the Catalog Browser would be
            // silently overwritten. Long-term the editor should push writes
            // back into features.geojson; for now it's display-only.
            readOnly: true,
          },
        ]
      : [];

    const handleDemoCommit: PropertiesFormProps['onCommitField'] = (key, value) => {
      if (!highlightedItem) return;
      // Route through the mock service so the commit path matches what a
      // real host does: patch the in-memory item, rebuild its overview
      // row, notify subscribers. The onItemsChanged subscription above
      // then re-renders the catalog list so the edited row reflects the
      // new title/tags/etc. immediately.
      stacService.updateItemMetadata(highlightedItem.itemPath, {
        [key]: value,
      });
    };

    const propertiesSlot = (
      <div
        className="web-shell__properties-slot"
        style={{
          // Seed VS Code light-theme variables so the Properties form
          // renders with legible contrast on the web-shell's light
          // welcome surface (inside the extension, VS Code supplies
          // these for both light and dark themes automatically).
          colorScheme: 'light',
          ['--vscode-editor-background' as string]: '#ffffff',
          ['--vscode-editor-foreground' as string]: '#1f1f1f',
          ['--vscode-foreground' as string]: '#1f1f1f',
          ['--vscode-descriptionForeground' as string]: '#595959',
          ['--vscode-panel-border' as string]: '#d4d4d4',
          ['--vscode-input-background' as string]: '#ffffff',
          ['--vscode-input-foreground' as string]: '#1f1f1f',
          ['--vscode-input-border' as string]: '#cecece',
          ['--vscode-badge-background' as string]: '#616161',
          ['--vscode-badge-foreground' as string]: '#ffffff',
          ['--vscode-button-background' as string]: '#005fb8',
          ['--vscode-button-foreground' as string]: '#ffffff',
          ['--vscode-button-hoverBackground' as string]: '#0258a8',
          ['--vscode-editorWarning-foreground' as string]: '#bf8803',
          padding: '8px 12px',
          height: '100%',
          overflowY: 'auto',
          background: '#ffffff',
          color: '#1f1f1f',
          fontSize: 13,
        }}
        aria-label="Properties Panel demo"
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span>Properties</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>#193 demo</span>
        </div>
        {highlightedItem ? (
          <PropertiesForm
            fields={highlightedFields}
            onCommitField={handleDemoCommit}
            loading={false}
            readOnly={false}
            writeError={null}
          />
        ) : (
          <div
            style={{
              opacity: 0.65,
              fontStyle: 'italic',
              padding: '8px 0',
            }}
          >
            Hover an exercise to preview its metadata here.
          </div>
        )}
      </div>
    );

    return (
      <div className="web-shell web-shell--welcome">
        {plotLoadError !== null && (
          <div
            role="alert"
            data-testid="plot-load-error-banner"
            data-error-code={plotLoadError.code}
            style={{
              background: '#7f1d1d',
              color: '#fee2e2',
              padding: '12px 20px',
              borderBottom: '2px solid #fca5a5',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
          >
            <strong>Plot could not be loaded</strong> ({plotLoadError.code}):{' '}
            {plotLoadError.message}
          </div>
        )}
        <header className="web-shell__header">
          <h1 className="web-shell__title">Debrief Web Shell</h1>
          <p className="web-shell__subtitle">STAC Catalog Browser</p>
          <div className="web-shell__header-links">
            <a
              className="web-shell__header-link"
              href="https://debrief.github.io/debrief-future/components-storybook/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Component Storybook &rarr;
            </a>
            <a
              className="web-shell__header-link"
              href="https://debrief-future-main-c900643d7496.herokuapp.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              VS Code Preview &rarr;
            </a>
            <a
              className="web-shell__header-link"
              href="https://debrief.github.io/debrief-future/backlog-navigator/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open the Backlog Navigator to triage / edit BACKLOG.md"
            >
              ⚙ Edit Backlog &rarr;
            </a>
          </div>
        </header>
        <main className="web-shell__main">
          <StacBrowser
            items={catalogItems}
            taxonomy={VESSEL_TAXONOMY}
            onItemSelect={handlePlotSelect}
            onItemHighlight={setPropertiesHighlightedPath}
            propertiesSlot={propertiesSlot}
            className="web-shell__catalog"
          />
        </main>
      </div>
    );
  }

  // Render analysis view
  const showStoryboardRail =
    currentPlot !== null && !isMobile && storyboardPanelEnabled;
  return (
    <div
      className={
        showStoryboardRail
          ? 'web-shell web-shell--analysis web-shell--with-storyboard-rail'
          : 'web-shell web-shell--analysis'
      }
    >
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
        <button
          type="button"
          className="web-shell__back-button"
          onClick={() => {
            const el = document.querySelector('[data-testid="panel-workspace"]') as HTMLElement & { __resetLayout?: () => void };
            el?.__resetLayout?.();
          }}
          data-testid="reset-layout"
          aria-label="Reset panel layout"
        >
          Reset Layout
        </button>
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

      <main className="web-shell__main">
        {isMobile ? (
          <PanelContextProvider value={panelContextValue}>
            <MobileTabLayout
              hasResults={chartContextProps !== null}
              className="web-shell__panel-workspace"
            />
          </PanelContextProvider>
        ) : (
          <PanelWorkspace
            registry={panelRegistry}
            contextWrapper={contextWrapper}
            className="web-shell__panel-workspace"
            onLayoutReset={() => setLayoutResetCount(c => c + 1)}
          />
        )}
        {/* #235 Storyboard panel rail — rendered as a 2nd grid column
          * inside .web-shell__main. The CSS class
          * `.web-shell--with-storyboard-rail` switches main to display:
          * grid with template `1fr 360px`. Each cell becomes its own
          * sizing context, so GoldenLayout's panel-workspace and our
          * rail both get explicit height + width without the flex
          * collapse that we hit during initial integration. */}
        {showStoryboardRail && (
          <aside
            className="web-shell__storyboard-rail"
            data-testid="storyboard-panel-rail"
            aria-label="Storyboard panel"
          >
            <StoryboardPanelMount
              sessionStore={store}
              featureCollection={currentPlot!.features}
              setFeatureCollection={(fc) =>
                setCurrentPlot((p) =>
                  p === null ? p : { ...p, features: fc },
                )
              }
              getMapContainer={() =>
                document.querySelector(
                  '.leaflet-container',
                ) as HTMLElement | null
              }
            />
          </aside>
        )}
      </main>
    </div>
  );
}
