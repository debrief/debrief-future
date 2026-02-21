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
  console.log('[Debrief] activate() called');

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

  console.log('[Debrief] services initialized');
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

  // Register all view providers — this is what makes views appear in the UI
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('debrief.stacExplorer', stacTreeProvider),
    vscode.window.registerWebviewViewProvider('debrief.activityPanel', activityPanelProvider),
    vscode.window.registerWebviewViewProvider('debrief.logPanel', logPanelProvider)
  );

  // Register outline provider for selection
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { scheme: 'stac' },
      outlineProvider
    )
  );

  console.log('[Debrief] view providers registered');
  outputChannel.appendLine('[startup] view providers registered');

  // ── Phase 3: Activity bar, context, filesystem, commands ───────────────

  // Initialize activity bar service (shows one-time prompt)
  try {
    const activityBarService = new ActivityBarService(context);
    await activityBarService.applyDefaults();

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

  // Set noStores context — positive flag so welcome is hidden before activation
  // (undefined = falsy = welcome hidden; true = no stores, show welcome)
  const updateNoStores = (): void => {
    void vscode.commands.executeCommand(
      'setContext',
      'debrief.noStores',
      configService.getStores().length === 0,
    );
  };
  await vscode.commands.executeCommand(
    'setContext',
    'debrief.noStores',
    configService.getStores().length === 0,
  );
  await vscode.commands.executeCommand('setContext', 'debrief.storesReady', true);
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
    resultIdRegistry
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

  console.log('[Debrief] activation complete');
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
