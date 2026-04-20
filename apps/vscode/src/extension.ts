// Fix: track symbols/labels visibility preserved when running styling tools
// Data quality: sensor-only plots merged into track companions, timestamps fixed
import * as vscode from 'vscode';
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
import { ResultsPanelService } from './services/resultsPanelService';
import { MapPanel } from './webview/mapPanel';
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
