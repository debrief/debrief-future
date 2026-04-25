// Fix: track symbols/labels visibility preserved when running styling tools
// Data quality: sensor-only plots merged into track companions, timestamps fixed
import * as vscode from 'vscode';
import * as path from 'path';
import {
  subscribeToDirty,
  subscribeToSelection,
  createResultIdRegistry,
  type SessionStoreApi,
  type FeatureSelection,
} from '@debrief/session-state';
import { StacTreeProvider } from './providers/stacTreeProvider';
import { StacFileSystemProvider } from './providers/stacFileSystemProvider';
import { ToolsTreeProvider } from './providers/toolsTreeProvider';
import { LayersTreeProvider } from './providers/layersTreeProvider';
import { OutlineProvider } from './providers/outlineProvider';
import { TimeRangeViewProvider } from './views/timeRangeView';
import { ActivityPanelViewProvider } from './views/activityPanelView';
import { LogPanelViewProvider } from './views/logPanelView';
import { ResultsPanelViewProvider } from './views/resultsPanelView';
import { StoryboardPanelViewProvider } from './views/storyboardPanelView';
import { ResultsPanelService } from './services/resultsPanelService';
import { MapPanel } from './webview/mapPanel';
import { startThemeRelay, type PostableWebview } from './host/themeRelay';
import { CatalogOverviewPanel } from './panels/catalogOverviewPanel';
import {
  captureScene,
  type CaptureCommandContext,
} from './commands/captureScene';
import { StacService } from './services/stacService';
import { ConfigService } from './services/configService';
import { CalcService } from './services/calcService';
import { RecentPlotsService } from './services/recentPlotsService';
import { OpenPlotsService } from './services/openPlotsService';
import { ActivityBarService } from './services/activityBarService';
import { IoService } from './services/ioService';
import { SessionManager } from './services/sessionManager';
import { ToolMatchAdapter } from './services/toolMatchAdapter';
import { registerCommands } from './commands';
import { createRestoreActivitiesCommand } from './commands/restoreActivities';
import { registerStoryboardTransportCommands } from './commands/storyboardTransport';
import { registerStoryboardManagementCommands } from './commands/storyboardManagement';
import { registerStoryboardEditCommands } from './commands/storyboardEdit';
import { registerNlSearchCommands } from './commands/nlSearchCommands';
import { StoryboardEditService } from './services/storyboardEdit';
import { plotFromFeatures } from './services/plotFromFeatures';
import {
  gcOrphanAssets as sceneThumbnailGcOrphanAssets,
  writeSceneThumbnail,
} from './services/sceneThumbnailService';
import {
  StoryboardPlaybackService,
  type ModalPromptPort,
  type VisibilityPort,
  type PlaybackMapPanel,
  type PlaybackSessionManager,
  type PlaybackPanelView,
  type PlaybackTimeRangeView,
} from './services/storyboardPlayback';
import { formatDtg } from '@debrief/components';
import { calculateViewportCenter } from '@debrief/utils';
import type { DebriefFeature } from '@debrief/components';

let mapPanel: MapPanel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Diagnostic: log to console so it's visible in browser Developer Tools (F12)
  console.warn('[Debrief] activate() called');

  // Create shared output channel for cross-ecosystem diagnostics (ARCHITECTURE.md)
  const outputChannel = vscode.window.createOutputChannel('Debrief');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine(`Debrief extension activating — ${new Date().toISOString()}`);

  // Create Python status bar indicator (cross-ecosystem monitoring)
  const pythonStatus = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    50
  );
  pythonStatus.command = 'debrief.showOutput';
  context.subscriptions.push(pythonStatus);

  // Register command to reveal the output channel
  context.subscriptions.push(
    vscode.commands.registerCommand('debrief.showOutput', () => {
      outputChannel.show(true);
    })
  );

  // ── Phase 1: Initialize services (with resilience) ─────────────────────
  // Services are wrapped in try-catch so a failure in one doesn't prevent
  // view providers from registering (Phase 2). This is critical for
  // code-server where the filesystem environment may differ from desktop.

  let configService: ConfigService;
  try {
    configService = new ConfigService();
  } catch (err) {
    console.error('[Debrief] ConfigService failed to initialize:', err);
    outputChannel.appendLine(`[startup] ConfigService init failed: ${err instanceof Error ? err.message : String(err)}`);
    // Create a minimal fallback so extension can still show views
    configService = Object.create(ConfigService.prototype) as ConfigService;
    Object.assign(configService, {
      config: { stores: [], preferences: {} },
      configWatcher: null,
      changeListeners: [],
      getStores: () => [],
      getStore: () => undefined,
      getRecentPlots: () => [],
      onConfigChange: () => () => {},
      dispose: () => {},
    });
  }

  const stacService = new StacService();
  const calcService = new CalcService(context, () => mapPanel);
  const recentPlotsService = new RecentPlotsService(context);
  const openPlotsService = new OpenPlotsService(context);
  const ioService = new IoService(context.extensionPath);
  const sessionManager = new SessionManager();
  context.subscriptions.push(sessionManager);

  // Create Result ID Registry for tracking logical result IDs (Feature: 087)
  const resultIdRegistry = createResultIdRegistry();

  // Wire output channel to services for cross-ecosystem diagnostics
  calcService.setOutputChannel(outputChannel);
  ioService.setOutputChannel(outputChannel);
  // #230 FR-051 — structured loadPlot diagnostics so `Failed to load
  // plot` failures attribute to a specific null-return branch.
  stacService.setDiagnosticSink(outputChannel);

  console.warn('[Debrief] services initialized');
  outputChannel.appendLine('[startup] services initialized');

  // ── Phase 2: Register view providers EARLY ─────────────────────────────
  // This must happen before any async work that could fail, so the Debrief
  // activity bar icons and views always appear in the UI.

  // Initialize ToolMatchAdapter with feature kind lookup (Feature: 038)
  const getFeatureKind = (featureId: string): string | undefined => {
    const panel = mapPanel;
    if (!panel) {
      return undefined;
    }
    return panel.getFeatureKind(featureId);
  };
  const toolMatchAdapter = new ToolMatchAdapter([], getFeatureKind);

  const stacTreeProvider = new StacTreeProvider(configService, stacService);
  const toolsTreeProvider = new ToolsTreeProvider(calcService, toolMatchAdapter);
  const layersTreeProvider = new LayersTreeProvider(sessionManager);
  const outlineProvider = new OutlineProvider();
  const timeRangeProvider = new TimeRangeViewProvider(context.extensionUri, sessionManager);

  const activityPanelProvider = new ActivityPanelViewProvider(
    context.extensionUri,
    sessionManager,
    toolMatchAdapter,
    calcService
  );

  const logPanelProvider = new LogPanelViewProvider(
    context.extensionUri,
    context,
    sessionManager
  );
  logPanelProvider.setResultIdRegistry(resultIdRegistry);
  logPanelProvider.setCalcService(calcService);

  // Storyboard panel (Features: 216 capture + 217 playback)
  const storyboardPanelProvider = new StoryboardPanelViewProvider(
    context.extensionUri,
    sessionManager,
  );
  storyboardPanelProvider.setMapPanelResolver(() => mapPanel);

  // Storyboard playback service (#217) — owns transport state per plot.
  // Constructed lazily after the panel + time-range providers exist so
  // the service can wire the ports it needs. `modalPromptPort` uses
  // vscode.window.showInformationMessage with the modal flag. The
  // visibility port is keyed to the Storyboard panel's onDidChangeVisibility.
  const visibilityEmitter = new vscode.EventEmitter<boolean>();
  const visibilityPort: VisibilityPort = {
    onDidChangeVisibility: visibilityEmitter.event,
  };
  const modalPromptPort: ModalPromptPort = {
    showInformationMessage: (message, options, ...items): Thenable<string | undefined> =>
      vscode.window.showInformationMessage(message, options, ...items),
  };
  // Mini-adapter so the service sees only the surface it needs from MapPanel.
  const playbackMapPanel: PlaybackMapPanel = {
    getCurrentFeatures: (): DebriefFeature[] => mapPanel?.getCurrentFeatures?.() ?? [],
    setFeatures: (features): void => mapPanel?.setFeatures?.([...features]),
    flyToViewport: (viewport, durationMs): number =>
      mapPanel?.flyToViewport?.(viewport, durationMs) ?? -1,
    setSceneRectangles: (scenes, activeId, currentId): void =>
      mapPanel?.setSceneRectangles?.(scenes, activeId, currentId),
    onFlyToComplete: (listener): vscode.Disposable =>
      mapPanel
        ? mapPanel.onFlyToComplete(listener)
        : { dispose: (): void => undefined },
    onSceneRectangleClick: (listener): vscode.Disposable =>
      mapPanel
        ? mapPanel.onSceneRectangleClick(listener)
        : { dispose: (): void => undefined },
    onFeaturesChanged: (listener): vscode.Disposable =>
      mapPanel
        ? mapPanel.onFeaturesChanged(listener)
        : { dispose: (): void => undefined },
  };
  const playbackSessionManager: PlaybackSessionManager = {
    getActiveDocumentUri: (): string | null => sessionManager.getActiveDocumentUri(),
    getSession: (uri): SessionStoreApi | undefined => sessionManager.getSession(uri),
    getActiveSession: (): SessionStoreApi | null => sessionManager.getActiveSession(),
    onActiveSessionChange: sessionManager.onActiveSessionChange,
  };
  const playbackPanelView: PlaybackPanelView = {
    applySnapshot: (snap): void => storyboardPanelProvider.applySnapshot(snap),
  };
  const playbackTimeRangeView: PlaybackTimeRangeView = {
    setScrubbableRange: (start, end): void =>
      timeRangeProvider.setScrubbableRange(start, end),
  };
  const storyboardPlaybackService = new StoryboardPlaybackService({
    sessionManager: playbackSessionManager,
    mapPanel: playbackMapPanel,
    panelView: playbackPanelView,
    timeRangeView: playbackTimeRangeView,
    modalPromptPort,
    visibilityPort,
    formatDtg,
  });
  context.subscriptions.push({ dispose: (): void => storyboardPlaybackService.dispose() });

  // #217 Phase 4 — the panel needs the service reference so it can
  // call setActiveStoryboard synchronously on dropdown-change messages.
  storyboardPanelProvider.setPlaybackService(storyboardPlaybackService);

  // #218 — Storyboard edit orchestration service. Phase 3 wires the
  // panel view as the edit sink so inbound messages (scene-edit-form-
  // open, scene-undo-toast-shown) flow back to the webview. The
  // remaining ports (mapPanel, sessionManager, thumbnailService,
  // logService) are wired via setters below.
  const storyboardEditService = new StoryboardEditService();
  context.subscriptions.push(storyboardEditService.activate());
  storyboardPanelProvider.setEditService(storyboardEditService);

  // #218 Phase 4/5 — wire the runtime ports for stale detection, refresh,
  // and orphan-asset GC on plot close.
  storyboardEditService.setMapPanel({
    getCurrentFeatures: (): DebriefFeature[] =>
      mapPanel?.getCurrentFeatures?.() ?? [],
    setFeatures: (features): void => {
      mapPanel?.setFeatures?.([...features]);
    },
  });
  storyboardEditService.setSessionManager({
    getActiveDocumentUri: (): string | null =>
      sessionManager.getActiveDocumentUri(),
    resolveStoreContext: (_documentUri: string) => {
      const store = mapPanel?.getCurrentStore?.();
      const plot = mapPanel?.getCurrentPlot?.();
      if (!store?.path || !plot?.itemPath) {return null;}
      return {
        storePath: store.path,
        itemPath: path.join(store.path, plot.itemPath),
      };
    },
  });
  storyboardEditService.setThumbnailService({
    captureThumbnail: async ({ stacItemPath, sceneId }) => {
      const panel = mapPanel;
      if (!panel) {
        throw new Error('captureThumbnail: mapPanel not initialised');
      }
      const pair = await panel.requestThumbnailCapture();
      if (!pair.largePngBase64 || !pair.smallPngBase64) {
        throw new Error('captureThumbnail: mapPanel returned empty PNG pair');
      }
      const res = await writeSceneThumbnail(
        stacItemPath,
        sceneId,
        pair.largePngBase64,
        pair.smallPngBase64,
      );
      return { assetKey: res.assetKey };
    },
    deepCopyAsset: (
      sourceAssetRef: string,
      destStoryboardId: string,
    ): Promise<string> => {
      // Minimal safe fallback: returns a DIFFERENT ref (contract
      // requires distinctness per FR-MODULE-015). Full deep-copy
      // (tmp+fsync+rename of PNG pair + new asset entry) lands with
      // the #216/#174 integration follow-up.
      return Promise.resolve(`${sourceAssetRef}-copy-${destStoryboardId}`);
    },
    gcOrphanAssets: sceneThumbnailGcOrphanAssets,
  });
  // LogService binds dynamically — the per-plot LogService is owned by
  // MapPanel (same pattern as ResultsPanelService).
  //
  // Note on typing: the service's port declares `op: string` (loose;
  // the service internally uses a closed set of op names matching
  // StoryboardEditOp). We narrow at this boundary by reshaping the
  // payload rather than with an `as unknown as` cast.
  const syncLogService = (): void => {
    const svc = mapPanel?.getLogService?.();
    if (svc) {
      storyboardEditService.setLogService({
        recordStoryboardEdit: (input) => {
          type SvcInput = Parameters<typeof svc.recordStoryboardEdit>[0];
          type SvcOp = SvcInput['op'];
          const narrowed: SvcInput = {
            storePath: input.storePath,
            itemPath: input.itemPath,
            op: input.op as SvcOp,
            storyboardId: input.storyboardId,
            sceneId: input.sceneId,
            thumbnailAssetRef: input.thumbnailAssetRef,
            actor: input.actor,
            summary: input.summary,
            timestamp: input.timestamp,
            underlyingActivityId: input.underlyingActivityId,
            pairActivityId: input.pairActivityId,
          };
          return svc.recordStoryboardEdit(narrowed);
        },
      });
    } else {
      storyboardEditService.setLogService(null);
    }
  };
  syncLogService();
  registerStoryboardEditCommands(context, {
    service: storyboardEditService,
    sessionManager: {
      getActiveDocumentUri: (): string | null => sessionManager.getActiveDocumentUri(),
    },
    readCurrentMapView: (): {
      viewport: { center: number[]; zoom: number; bearing: number };
      timestamp: string;
      visibleFeatureIds: readonly string[];
    } | null => {
      const panel = mapPanel;
      if (!panel) {return null;}
      const docUri = sessionManager.getActiveDocumentUri();
      if (docUri === null) {return null;}
      const session = sessionManager.getSession(docUri);
      const state = session?.getState();
      const viewport = state?.viewport ?? null;
      const currentTime = state?.currentTime ?? null;
      if (!viewport || viewport.zoom === undefined || currentTime === null) {
        return null;
      }
      const centerObj = calculateViewportCenter(viewport);
      const features = panel.getCurrentFeatures();
      const hiddenIds = new Set(state?.hiddenFeatureIds ?? []);
      const visibleFeatureIds: string[] = [];
      for (const f of features) {
        const props = f.properties as { id?: string | null } | null;
        const id = props?.id;
        if (typeof id !== 'string' || id.length === 0) {continue;}
        if (hiddenIds.has(id)) {continue;}
        visibleFeatureIds.push(id);
      }
      return {
        viewport: {
          center: [centerObj.longitude, centerObj.latitude],
          zoom: viewport.zoom,
          bearing: 0,
        },
        timestamp: new Date(currentTime).toISOString(),
        visibleFeatureIds,
      };
    },
    listSiblingStoryboards: (
      _documentUri: string,
      sourceStoryboardId: string,
    ): readonly { id: string; name: string; sceneCount: number }[] => {
      const features = mapPanel?.getCurrentFeatures() ?? [];
      const sceneCountById = new Map<string, number>();
      for (const f of features) {
        const props = f.properties as { kind?: string; storyboard_id?: string } | null;
        if (props?.kind === 'STORYBOARD_SCENE' && typeof props.storyboard_id === 'string') {
          sceneCountById.set(
            props.storyboard_id,
            (sceneCountById.get(props.storyboard_id) ?? 0) + 1,
          );
        }
      }
      const result: { id: string; name: string; sceneCount: number }[] = [];
      for (const f of features) {
        const props = f.properties as { kind?: string; id?: string; name?: string } | null;
        if (
          props?.kind === 'STORYBOARD' &&
          typeof props.id === 'string' &&
          typeof props.name === 'string' &&
          props.id !== sourceStoryboardId
        ) {
          result.push({
            id: props.id,
            name: props.name,
            sceneCount: sceneCountById.get(props.id) ?? 0,
          });
        }
      }
      return result;
    },
    resolveSceneStoryboard: (
      _documentUri: string,
      sceneId: string,
    ): string | null => {
      const features = mapPanel?.getCurrentFeatures() ?? [];
      for (const f of features) {
        const props = f.properties as
          | { kind?: string; id?: string; storyboard_id?: string }
          | null;
        if (
          props?.kind === 'STORYBOARD_SCENE' &&
          props.id === sceneId &&
          typeof props.storyboard_id === 'string'
        ) {
          return props.storyboard_id;
        }
      }
      return null;
    },
  });

  // Results panel (Feature: 178-vscode-tabular-results)
  const resultsPanelProvider = new ResultsPanelViewProvider(context.extensionUri);
  resultsPanelProvider.setOutputChannel(outputChannel);
  const resultsPanelService = new ResultsPanelService({
    stacService,
    // Per-plot LogService is owned by MapPanel — resolve dynamically.
    getLogService: () => mapPanel?.getLogService?.() ?? undefined,
    panelView: resultsPanelProvider,
    activityPanelView: activityPanelProvider,
    sessionManager,
  });
  resultsPanelProvider.setService(resultsPanelService);
  resultsPanelService.setOutputChannel(outputChannel);
  context.subscriptions.push({ dispose: () => resultsPanelService.dispose() });

  // Feature: 178 — Test-only commands for E2E regression coverage.
  //
  // Registered unconditionally (not gated by NODE_ENV) because the
  // VSIX is built once and installed into both dev and E2E user-data
  // dirs.  The commands are undocumented and prefixed `debrief.__test`
  // so they never surface in the command palette (no title in
  // package.json means the UI search filter hides them).
  //
  // 1. `debrief.__test.pushDatasetResult`  — fast path: routes a
  //    pre-built dataset payload through `ResultsPanelService` only.
  //    Exercises the panel bootstrap / reveal / render chain but
  //    skips CalcService + MCP entirely.
  //
  // 2. `debrief.__test.runRealTool`  — full path: runs the REAL
  //    Python tool via `CalcService.executeToolDirect()`, parses
  //    the real MCP response, filters dataset carriers, and routes
  //    them through `ResultsPanelService.addDatasetsForToolResult()`.
  //    This is the end-to-end regression for the user-reported bug:
  //    it exercises the exact code path a real tool invocation
  //    takes (minus the UI selection step), so if the chart fails
  //    to render here it would fail in production too.
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'debrief.__test.pushDatasetResult',
      (payload: { toolId: string; datasets: Array<Record<string, unknown>> }) => {
        const store = mapPanel?.getCurrentStore?.();
        const plot = mapPanel?.getCurrentPlot?.();
        const plotKey = {
          storePath: store?.path ?? '/tmp/e2e-store',
          itemPath: plot?.itemPath ?? 'e2e/item.json',
        };
        resultsPanelService.addDatasetsForToolResult({
          plotKey,
          toolId: payload.toolId,
          result: {
            features: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  id: `e2e-${Date.now()}`,
                  geometry: { type: 'Point', coordinates: [0, 0] },
                  properties: { __datasets: payload.datasets },
                },
                // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
              ] as unknown as Array<import('@debrief/utils').SafeFeature>,
            },
          },
          sourceFeatureIds: ['e2e-track-1', 'e2e-track-2'],
          parentActivityId: `e2e-activity-${Date.now()}`,
        });
      },
    ),
    // `debrief.__test.runExerciseAlphaRangeBearing`
    //
    // Self-contained test command: reads the Exercise Alpha GeoJSON
    // from disk, extracts the two TRACK features, runs the REAL
    // range-bearing Python tool via CalcService, routes the result
    // through ResultsPanelService (exactly as a real tool invocation
    // would) — then the Results panel should reveal and the chart
    // should render.
    //
    // This command takes NO arguments so it can be invoked directly
    // from the Playwright command palette.  It has a title so it's
    // visible in the palette.
    vscode.commands.registerCommand(
      'debrief.__test.runExerciseAlphaRangeBearing',
      async (): Promise<void> => {
        try {
          // Resolve the test workspace path — walk up from the
          // workspace folder to find tests/e2e/test-workspace.
          const folders = vscode.workspace.workspaceFolders;
          if (!folders || folders.length === 0) {
            void vscode.window.showErrorMessage(
              '[__test] No workspace folder open',
            );
            return;
          }
          // Load the plot GeoJSON directly from the workspace
          const fs = await import('fs');
          const path = await import('path');
          const workspacePath = folders[0]!.uri.fsPath;
          const geojsonPath = path.join(
            workspacePath,
            'local-store',
            'exercise-alpha',
            'exercise-alpha.geojson',
          );
          if (!fs.existsSync(geojsonPath)) {
            void vscode.window.showErrorMessage(
              `[__test] exercise-alpha.geojson not found at ${geojsonPath}`,
            );
            return;
          }
          const raw = fs.readFileSync(geojsonPath, 'utf-8');
          const fc = JSON.parse(raw) as {
            features: Array<{
              type: 'Feature';
              id?: string | number;
              geometry: unknown;
              properties: Record<string, unknown> | null;
            }>;
          };
          const tracks = fc.features
            .filter((f) => f.properties?.['kind'] === 'TRACK')
            .slice(0, 2);
          if (tracks.length < 2) {
            void vscode.window.showErrorMessage(
              `[__test] expected at least 2 TRACK features, got ${tracks.length}`,
            );
            return;
          }

          // Run the REAL Python tool via CalcService.
          const toolResult = await calcService.executeToolDirect(
            'range-bearing',
            tracks,
            {},
          );
          if (!toolResult.success) {
            void vscode.window.showErrorMessage(
              '[__test] range-bearing tool failed',
            );
            return;
          }

          // Filter dataset carriers out of the returned features.
          const allFeatures = toolResult.features?.features ?? [];
          const datasetCarriers: typeof allFeatures = [];
          for (const feature of allFeatures) {
            const props = (feature as { properties?: unknown } | null)?.properties;
            if (props !== null && typeof props === 'object') {
              // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
              const propsMap = props as Record<string, unknown>;
              const hasDatasets =
                Array.isArray(propsMap['__datasets']) &&
                (propsMap['__datasets'] as unknown[]).length > 0;
              if (hasDatasets) {
                datasetCarriers.push(feature);
              }
            }
          }

          if (datasetCarriers.length === 0) {
            void vscode.window.showErrorMessage(
              '[__test] tool ran but produced no dataset carriers — the CalcService parser bug is still present',
            );
            return;
          }

          // Route through the REAL ResultsPanelService — this will
          // fire reveal() → focus command → resolveWebviewView →
          // bundle mount → webviewReady → flush messages → chart
          // renders in the real iframe.
          const plotKey = {
            storePath: path.join(workspacePath, 'local-store'),
            itemPath: 'exercise-alpha/item.json',
          };
          resultsPanelService.addDatasetsForToolResult({
            plotKey,
            toolId: 'range-bearing',
            result: {
              features: {
                type: 'FeatureCollection',
                features: datasetCarriers,
              },
            },
            sourceFeatureIds: tracks.map((f) => String(f.id ?? '')).filter(Boolean),
            parameters: {},
            parentActivityId: `e2e-activity-${Date.now()}`,
          });

          void vscode.window.showInformationMessage(
            `[__test] range-bearing produced ${datasetCarriers.length} dataset carriers — Results panel should now be visible`,
          );
        } catch (err) {
          void vscode.window.showErrorMessage(
            `[__test] runExerciseAlphaRangeBearing failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
    vscode.commands.registerCommand(
      'debrief.__test.runRealTool',
      async (payload: {
        toolId: string;
        features: Array<{
          type: 'Feature';
          id?: string | number;
          geometry: unknown;
          properties: Record<string, unknown> | null;
        }>;
        plotKey?: { storePath: string; itemPath: string };
      }): Promise<{ ok: boolean; error?: string; carrierCount?: number }> => {
        // Run the REAL Python MCP tool via CalcService.executeToolDirect,
        // which spawns `debrief_calc.cli` with stdin JSON, parses the MCP
        // response, and returns the features.  For dataset tools this
        // returns the carrier feature in result.features.features
        // (with the fix in 047a468 applied to executeToolDirect too).
        try {
          const toolResult = await calcService.executeToolDirect(
            payload.toolId,
            payload.features,
            {},
          );
          if (!toolResult.success) {
            return { ok: false, error: 'tool execution failed' };
          }

          // Filter the returned features into map-only vs dataset carriers,
          // mirroring the real executeTool.ts logic.
          const allFeatures = toolResult.features?.features ?? [];
          const datasetCarriers: typeof allFeatures = [];
          for (const feature of allFeatures) {
            const props = (feature as { properties?: unknown } | null)?.properties;
            if (props !== null && typeof props === 'object') {
              // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-011, unrelated to #214
              const propsMap = props as Record<string, unknown>;
              const hasDatasets =
                Array.isArray(propsMap['__datasets']) &&
                (propsMap['__datasets'] as unknown[]).length > 0;
              const hasStatistics =
                propsMap['statistics'] !== null &&
                typeof propsMap['statistics'] === 'object';
              if (hasDatasets || hasStatistics) {
                datasetCarriers.push(feature);
              }
            }
          }

          if (datasetCarriers.length === 0) {
            return { ok: true, carrierCount: 0 };
          }

          // Route to the Results panel via the REAL service.  This will
          // fire reveal() → focus command → resolveWebviewView → bundle
          // mount → webviewReady → flush messages → chart renders.
          const plotKey = payload.plotKey ?? {
            storePath: '/tmp/e2e-store',
            itemPath: 'e2e/item.json',
          };
          resultsPanelService.addDatasetsForToolResult({
            plotKey,
            toolId: payload.toolId,
            result: {
              features: {
                type: 'FeatureCollection',
                features: datasetCarriers,
              },
            },
            sourceFeatureIds: payload.features
              .map((f) => (f.id !== undefined ? String(f.id) : ''))
              .filter(Boolean),
            parameters: {},
            parentActivityId: `e2e-activity-${Date.now()}`,
          });
          return { ok: true, carrierCount: datasetCarriers.length };
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
    ),
  );

  // Wire the Associated Files dropdown action handler (Feature: 178)
  activityPanelProvider.setFileActionServices(
    stacService,
    resultsPanelService,
    () => {
      const store = mapPanel?.getCurrentStore?.();
      const plot = mapPanel?.getCurrentPlot?.();
      if (store?.path && plot?.itemPath) {
        return { storePath: store.path, itemPath: plot.itemPath };
      }
      return undefined;
    },
  );

  // Register all view providers — this is what makes views appear in the UI
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('debrief.stacExplorer', stacTreeProvider),
    vscode.window.registerWebviewViewProvider('debrief.activityPanel', activityPanelProvider),
    vscode.window.registerWebviewViewProvider('debrief.logPanel', logPanelProvider),
    // Feature 178: retainContextWhenHidden=true keeps the webview
    // alive across panel dock collapse/expand.  Without this, VS
    // Code disposes the webview on collapse, the cached `_view`
    // reference in ResultsPanelViewProvider becomes stale, and the
    // next `postMessage` silently drops the message into a dead
    // webview — the user-reported "tool completed but no graph" bug.
    vscode.window.registerWebviewViewProvider(
      'debrief.resultsPanel',
      resultsPanelProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
    vscode.window.registerWebviewViewProvider(
      'debrief.storyboardPanel',
      storyboardPanelProvider,
    )
  );

  // Register outline provider for selection
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'stac' },
      outlineProvider
    )
  );

  console.warn('[Debrief] view providers registered');
  outputChannel.appendLine('[startup] view providers registered');

  // ── #220 — Theme relay ─────────────────────────────────────────────
  // Forward `vscode.window.onDidChangeActiveColorTheme` to every active
  // panel/view as a `vscode-theme-changed` postMessage. The webview's
  // `vsCodeBodyClassSource` adapter consumes it and re-resolves the
  // variant from the body class.
  startThemeRelay(context, () => {
    const panels: PostableWebview[] = [];

    const pushIfWebview = (
      provider: { webview?: vscode.Webview | undefined } | undefined,
    ): void => {
      const wv = provider?.webview;
      if (wv) panels.push({ webview: wv });
    };

    pushIfWebview(activityPanelProvider);
    pushIfWebview(logPanelProvider);
    pushIfWebview(resultsPanelProvider);
    pushIfWebview(storyboardPanelProvider);
    pushIfWebview(timeRangeProvider);

    // MapPanel — per-document panels created via createWebviewPanel.
    const mp = mapPanel?.getPanel?.();
    if (mp) panels.push({ webview: mp.webview });

    // CatalogOverviewPanel — per-store popup panels.
    for (const overview of CatalogOverviewPanel.getActivePanels()) {
      panels.push({ webview: overview.webview });
    }

    return panels;
  });

  // Set storesReady context immediately so the "Loading stores…" welcome
  // view is dismissed as soon as views are registered — don't defer until
  // Phase 3 which can be blocked by async work.
  await vscode.commands.executeCommand('setContext', 'debrief.storesReady', true);
  await vscode.commands.executeCommand(
    'setContext',
    'debrief.noStores',
    configService.getStores().length === 0,
  );

  // ── Phase 3: Activity bar, context, filesystem, commands ───────────────

  // Initialize activity bar service (shows one-time prompt).
  // applyDefaults() awaits showInformationMessage which can block
  // activation indefinitely in web VS Code — fire-and-forget instead.
  try {
    const activityBarService = new ActivityBarService(context);
    void activityBarService.applyDefaults();

    // Register activity bar restore command
    context.subscriptions.push(createRestoreActivitiesCommand(activityBarService));

    // #191 T062 — NL search set/clear API key commands.
    for (const cmd of registerNlSearchCommands(context)) {
      context.subscriptions.push(cmd);
    }
  } catch (err) {
    console.error('[Debrief] ActivityBarService failed:', err);
    outputChannel.appendLine(`[startup] ActivityBarService failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Configure MCP server port from settings (Feature: 029 - Phase 5)
  const mcpConfig = vscode.workspace.getConfiguration('debrief');
  const mcpPort = mcpConfig.get<number>('mcp.port', 3001);
  sessionManager.setMcpPort(mcpPort);

  // Start MCP server when first session becomes active
  const mcpServerStarter = sessionManager.onActiveSessionChange((session) => {
    if (session && !sessionManager.isMcpServerRunning()) {
      sessionManager.startMcpServer(session);
    }
  });
  context.subscriptions.push(mcpServerStarter);

  // Create dirty indicator in status bar (Feature: 029 - T057)
  const dirtyIndicator = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  dirtyIndicator.text = '$(circle-filled) Unsaved Session';
  dirtyIndicator.tooltip = 'Session has unsaved changes. Press Ctrl+S to save.';
  dirtyIndicator.command = 'debrief.saveSession';
  context.subscriptions.push(dirtyIndicator);

  // Track dirty subscription for cleanup when session changes
  let dirtyUnsubscribe: (() => void) | undefined;

  // Subscribe to dirty changes on active session
  const dirtyWatcher = sessionManager.onActiveSessionChange((session: SessionStoreApi | null) => {
    // Cleanup previous subscription
    if (dirtyUnsubscribe) {
      dirtyUnsubscribe();
      dirtyUnsubscribe = undefined;
    }
    dirtyIndicator.hide();

    if (session) {
      // Show indicator if already dirty
      const state = session.getState();
      if (state.dirty) {
        dirtyIndicator.show();
      }

      // Subscribe to dirty changes
      dirtyUnsubscribe = subscribeToDirty(session, (dirty: boolean) => {
        if (dirty) {
          dirtyIndicator.show();
        } else {
          dirtyIndicator.hide();
        }
      });
    }
  });
  context.subscriptions.push(dirtyWatcher);

  // Register file system provider for stac:// URIs
  const stacFileSystemProvider = new StacFileSystemProvider(stacService);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('stac', stacFileSystemProvider, {
      isCaseSensitive: true,
      isReadonly: true,
    })
  );

  // Keep noStores context in sync when config changes (storesReady + initial
  // noStores are now set in Phase 2 to avoid blocking on Phase 3 async work).
  const updateNoStores = (): void => {
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.noStores',
      configService.getStores().length === 0,
    );
  };
  configService.onConfigChange(() => updateNoStores());

  // Track selection subscription for cleanup when session changes (Feature: 038)
  let selectionUnsubscribe: (() => void) | undefined;

  // Subscribe to selection changes on active session (FR-005, FR-006)
  const selectionWatcher = sessionManager.onActiveSessionChange((session: SessionStoreApi | null) => {
    // Cleanup previous subscription
    if (selectionUnsubscribe) {
      selectionUnsubscribe();
      selectionUnsubscribe = undefined;
    }

    // Clear selection when no session
    if (!session) {
      toolMatchAdapter.clearSelection();
      toolsTreeProvider.refresh();
      void vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
      return;
    }

    // Get initial selection
    const state = session.getState();
    toolMatchAdapter.updateSelection(state.selection);
    toolsTreeProvider.refresh();
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.hasSelection',
      state.selection.featureIds.length > 0
    );

    // Subscribe to selection changes
    selectionUnsubscribe = subscribeToSelection(
      session,
      (selection: FeatureSelection) => {
        toolMatchAdapter.updateSelection(selection);
        toolsTreeProvider.refresh();
        void vscode.commands.executeCommand(
          'setContext',
          'debrief.hasSelection',
          selection.featureIds.length > 0
        );

        // Update context values for tool commands (FR-019, FR-020)
        void updateToolContextValues(toolMatchAdapter, calcService);
      }
    );
  });
  context.subscriptions.push(selectionWatcher);

  // Register commands
  const commands = registerCommands(
    context,
    configService,
    stacService,
    calcService,
    recentPlotsService,
    openPlotsService,
    ioService,
    sessionManager,
    stacTreeProvider,
    toolsTreeProvider,
    layersTreeProvider,
    timeRangeProvider,
    activityPanelProvider,
    toolMatchAdapter,
    () => mapPanel,
    (panel) => {
      mapPanel = panel;
    },
    resultIdRegistry,
    logPanelProvider,
    resultsPanelService
  );
  context.subscriptions.push(...commands);

  // Feature 217 — register storyboard transport commands (forward,
  // backward, clickScene, jumpPast). Must run AFTER the service is
  // constructed and BEFORE any user interaction can reach the commands.
  registerStoryboardTransportCommands(
    context,
    storyboardPlaybackService,
    sessionManager,
  );

  // Feature 217 Phase 4 — register management commands (create,
  // rename, delete). These drive the overflow-menu flow from the
  // Storyboard panel.
  registerStoryboardManagementCommands(
    context,
    storyboardPlaybackService,
    sessionManager,
  );

  // Subscribe the Storyboard panel provider to the service's snapshot
  // stream so every transport step / CRUD op / lifecycle transition
  // refreshes the panel view.
  context.subscriptions.push(
    storyboardPlaybackService.onSnapshotChange((snap) => {
      storyboardPanelProvider.applySnapshot(snap);
    }),
  );

  // Feature 217 — wire the service's lifecycle + transport surface.
  // Plot open: run validatePlot + seed active + install scrub override.
  // Plot close / switch: restore scrub + drop state.
  // #218 T089 — track the previously-active URI so we can fire
  // onPlotClosed (→ gcOrphanAssets) when the session changes away.
  // Features are read live from mapPanel at close time; if empty
  // (plot already unloaded), gcOrphanAssets no-ops safely.
  let previousActiveUri: string | null = null;
  context.subscriptions.push(
    sessionManager.onActiveSessionChange((session) => {
      const activeUri = sessionManager.getActiveDocumentUri();
      if (
        previousActiveUri !== null &&
        previousActiveUri !== activeUri
      ) {
        const finalFeatures = mapPanel?.getCurrentFeatures() ?? [];
        if (finalFeatures.length > 0) {
          void storyboardEditService.onPlotClosed(
            previousActiveUri,
            plotFromFeatures(finalFeatures),
          );
        }
      }
      if (session && activeUri) {
        storyboardPlaybackService.onPlotOpened(activeUri);
        // #218 T070 — kick off the stale-detection pass (early-returns
        // on zero-storyboard plots per review 11A).
        void storyboardEditService.onPlotOpened(
          activeUri,
          plotFromFeatures(mapPanel?.getCurrentFeatures() ?? []),
        );
        previousActiveUri = activeUri;
      } else {
        previousActiveUri = null;
      }
    }),
  );

  // Feature 217 — subscribe the service to map-panel event streams.
  // These are set up lazily because mapPanel is mutated by the commands
  // module when a plot is first opened.
  let mapPanelEventsWired = false;
  const wireMapPanelEvents = (): void => {
    if (mapPanelEventsWired || !mapPanel) {return;}
    mapPanelEventsWired = true;
    mapPanel.onFeaturesChanged(() => {
      const uri = sessionManager.getActiveDocumentUri();
      if (uri) {storyboardPlaybackService.onPlotFeaturesChanged(uri);}
    });
    mapPanel.onSceneRectangleClick((sceneId) => {
      const uri = sessionManager.getActiveDocumentUri();
      if (uri) {void storyboardPlaybackService.goToScene(uri, sceneId);}
    });
  };
  // Poll on session-change — by then MapPanel should exist.
  context.subscriptions.push(
    sessionManager.onActiveSessionChange(() => wireMapPanelEvents()),
  );

  // Feature 216 — register the capture-scene command. We construct the
  // CaptureCommandContext at invoke time so every capture sees the current
  // mapPanel / active session / actor — no stale closures.
  context.subscriptions.push(
    vscode.commands.registerCommand('debrief.captureScene', async () => {
      const panel = mapPanel;
      const session = sessionManager.getActiveSession();
      if (!panel || !session) {
        void vscode.window.showErrorMessage(
          'Capture failed — no plot is currently open.',
        );
        return;
      }
      const store = panel.getCurrentStore();
      const plot = panel.getCurrentPlot();
      if (!store?.path || !plot?.itemPath) {
        void vscode.window.showErrorMessage(
          'Capture failed — plot is missing STAC item metadata.',
        );
        return;
      }
      const path = await import('path');
      const stacItemPath = path.dirname(path.join(store.path, plot.itemPath));
      const ctx: CaptureCommandContext = {
        mapPanel: panel,
        sessionStore: session,
        stacItemPath,
        actor: sessionManager.actor,
        trigger: { source: 'programmatic' },
      };
      await captureScene(ctx, {
        setCaptureInFlight: (inFlight: boolean) =>
          storyboardPanelProvider.setCaptureInFlight(inFlight),
      });
      storyboardPanelProvider.refresh();
    }),
  );

  // Set initial context
  await vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);
  await vscode.commands.executeCommand('setContext', 'debrief.mapFocused', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasResultLayers', false);
  await vscode.commands.executeCommand('setContext', 'debrief.calcAvailable', false);

  // Restore previously-open plots (Feature: 052)
  void openPlotsService.restoreOpenPlots();

  // ── Phase 4: Background Python service checks ──────────────────────────

  // Check Python service availability and update status indicator
  pythonStatus.text = '$(sync~spin) Python';
  pythonStatus.tooltip = 'Checking Python services…';
  pythonStatus.show();

  // Check debrief-io availability (Feature: 077 diagnostics)
  ioService.checkAvailability().then((ioAvailable) => {
    outputChannel.appendLine(
      ioAvailable
        ? '[startup] debrief-io: available'
        : '[startup] debrief-io: unavailable — REP file import will not work'
    );
  }).catch(() => {
    outputChannel.appendLine('[startup] debrief-io: check failed');
  });

  // Check debrief-calc availability and load tools (Feature: 038)
  calcService.checkAvailability().then(async (available) => {
    void vscode.commands.executeCommand('setContext', 'debrief.calcAvailable', available);

    if (available) {
      // Load tools into adapter (FR-001, FR-002)
      try {
        const tools = await calcService.listTools();
        toolMatchAdapter.updateTools(tools);
        toolsTreeProvider.setCalcAvailable(true);
        toolsTreeProvider.refresh();
        // Notify activity panel so its webview shows tools (Fix: 077)
        activityPanelProvider.refreshTools();

        pythonStatus.text = '$(check) Python';
        pythonStatus.tooltip = `debrief-calc connected — ${tools.length} tools loaded`;
        outputChannel.appendLine(`[startup] debrief-calc: ${tools.length} analysis tools loaded`);
      } catch (err) {
        // Graceful degradation - tools won't be available
        toolsTreeProvider.setCalcAvailable(false);
        activityPanelProvider.notifyCalcUnavailable();
        pythonStatus.text = '$(warning) Python';
        pythonStatus.tooltip = 'debrief-calc connected but tools failed to load';
        outputChannel.appendLine(`[startup] debrief-calc: tool loading failed — ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      activityPanelProvider.notifyCalcUnavailable();
      pythonStatus.text = '$(error) Python';
      pythonStatus.tooltip = 'debrief-calc unavailable — click for details';
      outputChannel.appendLine('[startup] debrief-calc: unavailable — analysis tools disabled');
    }
  }).catch((err) => {
    // Graceful degradation - tools won't be available but extension works
    toolsTreeProvider.setCalcAvailable(false);
    activityPanelProvider.notifyCalcUnavailable();
    pythonStatus.text = '$(error) Python';
    pythonStatus.tooltip = 'debrief-calc unavailable — click for details';
    outputChannel.appendLine(`[startup] debrief-calc: check failed — ${err instanceof Error ? err.message : String(err)}`);
  });

  console.warn('[Debrief] activation complete');
  outputChannel.appendLine('[startup] activation complete');
}

/**
 * Update context values for tool commands based on current selection (T008).
 *
 * This enables/disables tool commands in the command palette and context menu.
 */
async function updateToolContextValues(
  adapter: ToolMatchAdapter,
  calcService: CalcService
): Promise<void> {
  try {
    const tools = await calcService.listTools();

    // Set context value for each tool based on whether it's active
    for (const tool of tools) {
      const isActive = adapter.isToolActive(tool);
      await vscode.commands.executeCommand(
        'setContext',
        `debrief.tool.${tool.id}.active`,
        isActive
      );
    }
  } catch {
    // Ignore errors - tool context won't be updated
  }
}

export function deactivate(): void {
  // Extension deactivation
}
