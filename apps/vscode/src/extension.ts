import * as vscode from 'vscode';
import {
  subscribeToDirty,
  subscribeToSelection,
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
  // Extension activation begins

  // Initialize activity bar service early (before tree providers)
  // This hides non-essential activities on first activation
  const activityBarService = new ActivityBarService(context);
  await activityBarService.applyDefaults();

  // Initialize services
  const configService = new ConfigService();
  const stacService = new StacService();
  const calcService = new CalcService(context, () => mapPanel);
  const recentPlotsService = new RecentPlotsService(context);
  const openPlotsService = new OpenPlotsService(context);
  const ioService = new IoService(context.extensionPath);
  const sessionManager = new SessionManager();
  context.subscriptions.push(sessionManager);

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

  // Initialize ToolMatchAdapter with feature kind lookup (Feature: 038)
  // This function looks up the 'kind' property of features from the map panel
  const getFeatureKind = (featureId: string): string | undefined => {
    const panel = mapPanel;
    if (!panel) {
      return undefined;
    }
    return panel.getFeatureKind(featureId);
  };

  // Create ToolMatchAdapter - tools will be loaded when calcService connects
  const toolMatchAdapter = new ToolMatchAdapter([], getFeatureKind);

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

  // Register tree providers
  const stacTreeProvider = new StacTreeProvider(configService, stacService);
  const toolsTreeProvider = new ToolsTreeProvider(calcService, toolMatchAdapter);
  const layersTreeProvider = new LayersTreeProvider(sessionManager);
  const outlineProvider = new OutlineProvider();
  const timeRangeProvider = new TimeRangeViewProvider(context.extensionUri, sessionManager);

  // Register unified activity panel (Feature: 047)
  const activityPanelProvider = new ActivityPanelViewProvider(
    context.extensionUri,
    sessionManager,
    toolMatchAdapter,
    calcService
  );

  // Register Log Panel (Feature: 072-log-panel)
  const logPanelProvider = new LogPanelViewProvider(
    context.extensionUri,
    context,
    sessionManager
  );

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
    }
  );
  context.subscriptions.push(...commands);

  // Register activity bar restore command
  context.subscriptions.push(createRestoreActivitiesCommand(activityBarService));

  // Set initial context
  await vscode.commands.executeCommand('setContext', 'debrief.plotOpen', false);
  await vscode.commands.executeCommand('setContext', 'debrief.mapFocused', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasSelection', false);
  await vscode.commands.executeCommand('setContext', 'debrief.hasResultLayers', false);
  await vscode.commands.executeCommand('setContext', 'debrief.calcAvailable', false);

  // Restore previously-open plots (Feature: 052)
  void openPlotsService.restoreOpenPlots();

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
      } catch {
        // Graceful degradation - tools won't be available
        toolsTreeProvider.setCalcAvailable(false);
      }
    }
  }).catch(() => {
    // Graceful degradation - tools won't be available but extension works
    toolsTreeProvider.setCalcAvailable(false);
  });

  // Extension activation complete
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
