/**
 * ActivityPanel View - Unified sidebar panel for time control, tools, and layers
 *
 * Composes TimeController, ToolsPanel, and LayersToolbar + FeatureList into a
 * single collapsible webview panel.
 *
 * Feature: 047-unified-activity-panel
 * - Subscribes to session manager for temporal and selection changes
 * - Updates webview when state changes
 * - Delegates tool execution to CalcService
 * - Delegates layer operations to SessionManager
 */

import * as vscode from 'vscode';
import {
  subscribeToTemporal,
  subscribeToSelection,
  type SessionStoreApi,
  type SessionStoreWithUndo,
  type TemporalSlice,
  type FeatureSelection,
} from '@debrief/session-state';
import type { DisplayMode } from '@debrief/schemas';
import type { SessionManager } from '../services/sessionManager';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { CalcService } from '../services/calcService';
import type { MatchResult } from '../types/tool';
import type { DebriefFeature } from '@debrief/components';
import type { AssociatedFile, StacService } from '../services/stacService';
import type { ResultsPanelService } from '../services/resultsPanelService';
import { AUTO_DERIVED_FIELDS } from '@debrief/components/PropertiesPanel/autoDerivedFields';

// Message types from webview
interface TemporalSeekMessage {
  type: 'temporal:seek';
  payload: { time: number };
}

interface TemporalPlayMessage {
  type: 'temporal:play';
  payload: { rate: number };
}

interface TemporalPauseMessage {
  type: 'temporal:pause';
}

interface TemporalDisplayModeMessage {
  type: 'temporal:displayMode';
  payload: { mode: DisplayMode };
}

interface ToolRunMessage {
  type: 'tool:run';
  payload: { toolId: string; params?: Record<string, unknown> };
}

interface LayerToggleVisibilityMessage {
  type: 'layer:toggleVisibility';
  payload: { featureIds: string[] };
}

interface LayerDeleteMessage {
  type: 'layer:delete';
  payload: { featureIds: string[] };
}

interface LayerSelectMessage {
  type: 'layer:select';
  payload: { featureIds: string[] };
}

interface LayerFormatMessage {
  type: 'layer:format';
  payload: { featureIds: string[]; property: string; value: string | number | boolean };
}

interface FileActionMessage {
  type: 'file:action';
  payload: {
    file: AssociatedFile;
    action: 'open' | 'openWith' | 'reveal' | 'delete';
  };
}

interface PropertiesCommitMessage {
  type: 'properties:commit';
  storePath: string;
  itemPath: string;
  patch: Record<string, unknown>;
}

interface WebviewReadyMessage {
  type: 'webviewReady';
}

type WebviewMessage =
  | TemporalSeekMessage
  | TemporalPlayMessage
  | TemporalPauseMessage
  | TemporalDisplayModeMessage
  | ToolRunMessage
  | LayerToggleVisibilityMessage
  | LayerDeleteMessage
  | LayerSelectMessage
  | LayerFormatMessage
  | FileActionMessage
  | PropertiesCommitMessage
  | WebviewReadyMessage;

export class ActivityPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.activityPanel';

  /**
   * Public accessor to the active webview, if any. Used by the theme
   * relay (#220) to broadcast `vscode-theme-changed` to every panel.
   */
  public get webview(): vscode.Webview | undefined {
    return this._view?.webview;
  }

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _isWebviewReady = false;
  private _pendingMessages: Array<Record<string, unknown>> = [];

  // Session manager integration
  private _activeSession?: SessionStoreApi;
  private _temporalUnsubscribe?: () => void;
  private _selectionUnsubscribe?: () => void;
  private _sessionChangeDisposable?: vscode.Disposable;

  // Feature data from MapPanel
  private _features: DebriefFeature[] = [];

  // Result files for Associated Files dropdown
  private _resultFiles: AssociatedFile[] = [];
  private _resultsChanged = false;

  // Whether the calc service availability check has completed
  // undefined = not checked yet (loading), true = available, false = unavailable
  private _calcAvailable: boolean | undefined = undefined;

  // Feature: 178-vscode-tabular-results — lazy-wired references used by
  // the Associated Files dropdown file-action handler.  These are set via
  // `setFileActionServices` after construction to avoid a circular dep.
  private _stacService?: StacService;
  private _resultsPanelService?: ResultsPanelService;
  private _getCurrentPlotKey?: () => { storePath: string; itemPath: string } | undefined;

  // UX-review flatten: the Storyboard renders as a section inside this
  // webview. The Storyboard provider attaches to our webview (it posts +
  // listens on it) rather than owning its own view.
  private _storyboardProvider?: {
    attachWebview(webview: vscode.Webview): void;
    detachWebview(): void;
  };

  constructor(
    extensionUri: vscode.Uri,
    private readonly _sessionManager: SessionManager,
    private readonly _toolMatchAdapter: ToolMatchAdapter,
    _calcService: CalcService // Kept for API compatibility, tool execution delegated to command
  ) {
    this._extensionUri = extensionUri;

    // Subscribe to session manager
    this._sessionChangeDisposable = this._sessionManager.onActiveSessionChange((session) =>
      this._handleActiveSessionChange(session)
    );
  }

  /**
   * Wire the services needed by the Associated Files dropdown action
   * handler (Feature: 178-vscode-tabular-results — FR-015 … FR-018).
   *
   * Called from `extension.ts` after the ResultsPanelService is created.
   */
  public setFileActionServices(
    stacService: StacService,
    resultsPanelService: ResultsPanelService,
    getCurrentPlotKey: () => { storePath: string; itemPath: string } | undefined,
  ): void {
    this._stacService = stacService;
    this._resultsPanelService = resultsPanelService;
    this._getCurrentPlotKey = getCurrentPlotKey;
  }

  /**
   * Register the Storyboard provider so it can attach to this webview when
   * the Activity view resolves (UX-review flatten — the Storyboard renders
   * as the 5th section of the Activity panel).
   */
  public setStoryboardProvider(provider: {
    attachWebview(webview: vscode.Webview): void;
    detachWebview(): void;
  }): void {
    this._storyboardProvider = provider;
    // If the view is already live, attach immediately.
    if (this._view) {
      provider.attachWebview(this._view.webview);
    }
  }

  /**
   * Handle active session change from SessionManager
   */
  private _handleActiveSessionChange(session: SessionStoreApi | null): void {
    // Unsubscribe from previous session
    if (this._temporalUnsubscribe) {
      this._temporalUnsubscribe();
      this._temporalUnsubscribe = undefined;
    }
    if (this._selectionUnsubscribe) {
      this._selectionUnsubscribe();
      this._selectionUnsubscribe = undefined;
    }

    this._activeSession = session ?? undefined;

    if (session) {
      // Subscribe to temporal state changes
      this._temporalUnsubscribe = subscribeToTemporal(session, (temporal: TemporalSlice) =>
        this._handleTemporalChange(temporal)
      );

      // Subscribe to selection changes
      this._selectionUnsubscribe = subscribeToSelection(session, (selection: FeatureSelection) =>
        this._handleSelectionChange(selection)
      );

      // Set initial state from session
      const state: SessionStoreWithUndo = session.getState();

      // Send temporal update
      if (state.timeRange) {
        this._postMessage({
          type: 'temporal:update',
          payload: {
            startTime: state.timeRange.start,
            endTime: state.timeRange.end,
            currentTime: state.currentTime,
            displayMode: state.displayMode,
          },
        });
      }

      // Send layers update
      this._sendLayersUpdate();

      // Send selection update
      if (state.selection !== undefined && state.selection !== null) {
        this._postMessage({
          type: 'selection:update',
          payload: {
            selectedIds: state.selection.featureIds,
          },
        });
      }

      // Send tools update
      this._sendToolsUpdate();

      this._postMessage({ type: 'setUIState', uiState: 'ready' });
    } else {
      // No active session - show empty state
      this._postMessage({ type: 'setUIState', uiState: 'empty' });
    }
  }

  /**
   * Handle temporal state changes from session
   */
  private _handleTemporalChange(temporal: TemporalSlice): void {
    if (!temporal.timeRange) {
      return;
    }

    this._postMessage({
      type: 'temporal:update',
      payload: {
        startTime: temporal.timeRange.start,
        endTime: temporal.timeRange.end,
        currentTime: temporal.currentTime,
        displayMode: temporal.displayMode,
      },
    });
  }

  /**
   * Handle selection changes from session
   */
  private _handleSelectionChange(selection: FeatureSelection): void {
    this._postMessage({
      type: 'selection:update',
      payload: {
        selectedIds: selection.featureIds,
      },
    });

    // Update tool match adapter and send new tools list
    this._toolMatchAdapter.updateSelection(selection);
    this._sendToolsUpdate();
    // Also update layers with new toolMatches for LayersToolbar
    this._sendLayersUpdate();
  }

  /**
   * Send tools update to webview
   */
  private _sendToolsUpdate(): void {
    const matches = this._toolMatchAdapter.getMatchResults();
    const tools = matches.map((match: MatchResult) => ({
      id: match.tool.id,
      name: match.tool.name,
      description: match.tool.description,
      applicable: match.isActive,
      explanation: match.isActive ? undefined : match.explanation,
      ...(match.tool.parameters ? { parameters: match.tool.parameters } : {}),
    }));

    // hasToolInventory: undefined = still checking (show loading),
    // false = unavailable, true = tools loaded
    const hasToolInventory = this._calcAvailable === undefined
      ? undefined
      : this._calcAvailable && this._toolMatchAdapter.getAllTools().length > 0;

    this._postMessage({
      type: 'tools:update',
      payload: {
        tools,
        hasToolInventory,
        hasSelection: this._toolMatchAdapter.hasSelection(),
      },
    });
  }

  /**
   * Send layers update to webview
   */
  private _sendLayersUpdate(): void {
    const hiddenIds: string[] = this._activeSession?.getState().hiddenFeatureIds ?? [];
    const toolMatches: MatchResult[] = this._toolMatchAdapter.getMatchResults();

    this._postMessage({
      type: 'layers:update',
      payload: {
        layers: this._features,
        hiddenIds,
        toolMatches,
        resultFiles: this._resultFiles,
        resultsChanged: this._resultsChanged,
      },
    });

    // Clear resultsChanged flag after sending
    this._resultsChanged = false;
  }

  /**
   * Refresh the tools display.
   * Called when the tool inventory changes (e.g., calcService finishes loading).
   */
  public refreshTools(): void {
    this._calcAvailable = true;
    this._sendToolsUpdate();
  }

  /**
   * Notify the panel that the calc service is unavailable.
   * Transitions the tools display from "loading" to "unavailable".
   */
  public notifyCalcUnavailable(): void {
    this._calcAvailable = false;
    this._sendToolsUpdate();
  }

  /**
   * Set features to display in the layers panel.
   * Called by MapPanel when plot data is loaded/updated.
   */
  public setFeatures(features: DebriefFeature[]): void {
    this._features = features;
    this._sendLayersUpdate();
  }

  /**
   * Add a result file to the Associated Files dropdown.
   * Called after tool execution completes.
   */
  public addResultFile(name: string, filePath: string): void {
    // Check for duplicates before adding
    const exists = this._resultFiles.some((rf) => rf.path === filePath);
    if (!exists) {
      this._resultFiles.push({ name, path: filePath, category: 'result' });
      this._resultsChanged = true;
      this._sendLayersUpdate();
    }
  }

  /**
   * Set result files loaded from a STAC item.
   * Called when a plot is opened to restore previously-saved result files.
   * Feature: 051-load-result-attachments
   *
   * @param resultFiles Array of AssociatedFile objects extracted from STAC item
   */
  public setResultFiles(resultFiles: AssociatedFile[]): void {
    // Merge with any existing runtime-added results (deduplication)
    const existingPaths = new Set(resultFiles.map((rf) => rf.path));
    const runtimeResults = this._resultFiles.filter((rf) => !existingPaths.has(rf.path));

    // Merge loaded and runtime results, then sort by mtime descending (most recent first)
    const merged = [...resultFiles, ...runtimeResults];
    merged.sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0));
    this._resultFiles = merged;
    this._resultsChanged = resultFiles.length > 0;
    this._sendLayersUpdate();
  }

  /**
   * Clear result files (e.g., when plot is closed).
   */
  public clearResultFiles(): void {
    this._resultFiles = [];
    this._resultsChanged = false;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    this._isWebviewReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist'),
        vscode.Uri.joinPath(this._extensionUri, 'node_modules'),
      ],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      switch (message.type) {
        case 'webviewReady':
          this._isWebviewReady = true;
          // Send any pending messages
          for (const pending of this._pendingMessages) {
            void webviewView.webview.postMessage(pending);
          }
          this._pendingMessages = [];
          // Send initial state if available
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            if (state.timeRange) {
              this._postMessage({
                type: 'temporal:update',
                payload: {
                  startTime: state.timeRange.start,
                  endTime: state.timeRange.end,
                  currentTime: state.currentTime,
                  displayMode: state.displayMode,
                },
              });
            }
            this._sendLayersUpdate();
            this._sendToolsUpdate();
          }
          break;

        case 'temporal:seek':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setCurrentTime(message.payload.time);
          }
          break;

        case 'temporal:play':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setPlaybackState('playing');
          }
          break;

        case 'temporal:pause':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setPlaybackState('paused');
          }
          break;

        case 'temporal:displayMode':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setDisplayMode(message.payload.mode);
          }
          void vscode.commands.executeCommand('debrief.setDisplayMode', {
            mode: message.payload.mode,
          });
          break;

        case 'tool:run':
          // Delegate to CalcService (pass params collected by webview ParameterCollector)
          void this._handleToolRun(message.payload.toolId, message.payload.params);
          break;

        case 'layer:toggleVisibility':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            const hiddenSet = new Set(state.hiddenFeatureIds);
            const featureIds = message.payload.featureIds;

            // Check if all selected features are currently hidden
            const allHidden = featureIds.every((id: string) => hiddenSet.has(id));

            if (allHidden) {
              // Show all selected features
              state.showFeatures(featureIds);
            } else {
              // Hide all selected features
              state.hideFeatures(featureIds);
            }

            // Update the layers panel with new hidden state
            this._sendLayersUpdate();
          }
          break;

        case 'layer:delete':
          if (this._activeSession) {
            const deleteState: SessionStoreWithUndo = this._activeSession.getState();
            deleteState.setSelection(message.payload.featureIds);
            void vscode.commands.executeCommand('debrief.deleteSelection');
          }
          break;

        case 'layer:select':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setSelection(message.payload.featureIds);
          }
          break;

        case 'layer:format':
          // Apply style change to features via formatService
          // For now, delegate to a command that the extension host can handle
          void vscode.commands.executeCommand('debrief.applyFormat', {
            featureIds: message.payload.featureIds,
            property: message.payload.property,
            value: message.payload.value,
          });
          break;

        case 'file:action':
          // Feature: 178-vscode-tabular-results — Open / Reveal / OpenWith / Delete
          void this._handleFileAction(
            message.payload.file,
            message.payload.action,
          );
          break;

        case 'properties:commit':
          // Feature: 193-properties-panel — direct-write item metadata
          void this._handlePropertiesCommit(message);
          break;
      }
    });

    // UX-review flatten: let the Storyboard provider attach to this webview
    // so the Storyboard section posts + receives on the same channel. The
    // attach registers its own message listener; unknown message types are
    // ignored by both switches, so there is no cross-talk.
    this._storyboardProvider?.attachWebview(webviewView.webview);

    webviewView.onDidDispose(() => {
      this._storyboardProvider?.detachWebview();
    });
  }

  /**
   * Handle a Properties Panel commit from the webview.
   *
   * Invokes stacService.updateItemMetadata (single-writer) and replies with
   * a 'properties:committed' on success or 'properties:error' on failure.
   */
  private async _handlePropertiesCommit(
    message: PropertiesCommitMessage,
  ): Promise<void> {
    if (!this._stacService) {
      this._postMessage({
        type: 'properties:error',
        itemPath: message.itemPath,
        errorName: 'ServiceUnavailable',
        message: 'Properties write service not wired',
      });
      return;
    }

    try {
      const pkgJson = vscode.extensions.getExtension('debrief.debrief-vscode')
        ?.packageJSON as { version?: string } | undefined;
      const packageVersion = pkgJson?.version ?? '0.0.0';
      const fields = Object.keys(message.patch).sort();
      // T077: only auto-derived fields go into debrief:overrides — non-derived
      // fields are plain user values and don't need a skip-list entry.
      const overrideFields = fields.filter((k) =>
        AUTO_DERIVED_FIELDS.includes(k as (typeof AUTO_DERIVED_FIELDS)[number]),
      );
      const result = await this._stacService.updateItemMetadata({
        storePath: message.storePath,
        itemPath: message.itemPath,
        patch: message.patch,
        overrideFields,
        provenance: {
          tool: 'debrief.propertiesPanel',
          fields,
        },
        packageVersion: String(packageVersion),
      });
      this._postMessage({
        type: 'properties:committed',
        itemPath: message.itemPath,
        updatedProperties: result.updatedProperties,
        overrides: result.overrides,
        // eslint-disable-next-line no-restricted-syntax -- pre-existing ADR-010, unrelated to #214
        activityId: result.activityId,
      });
    } catch (err) {
      const e = err as Error & { name?: string };
      this._postMessage({
        type: 'properties:error',
        itemPath: message.itemPath,
        errorName: e.name ?? 'Error',
        message: e.message ?? 'Properties commit failed',
      });
    }
  }

  /**
   * Handle an Associated Files dropdown action.
   *
   * - `open`     — reopen a saved CSV as a new tab in the Results panel
   * - `reveal`   — reveal the file in VS Code's Explorer view
   * - `openWith` — show VS Code's editor picker
   * - `delete`   — confirm, then unregister the STAC asset and delete the file
   */
  private async _handleFileAction(
    file: AssociatedFile,
    action: 'open' | 'openWith' | 'reveal' | 'delete',
  ): Promise<void> {
    const plotKey = this._getCurrentPlotKey?.();
    if (!plotKey) {
      return;
    }

    // All four actions reference the file via the fully-resolved filesystem path.
    const absolutePath = `${plotKey.storePath}/${plotKey.itemPath.replace(/[^/]+$/, '')}${file.path}`;

    switch (action) {
      case 'open': {
        // Reopen the CSV as a Results panel tab via the service.
        if (this._resultsPanelService) {
          const lastSlash = file.path.lastIndexOf('/');
          const filename = lastSlash >= 0 ? file.path.slice(lastSlash + 1) : file.path;
          await this._resultsPanelService.openSavedFile({
            plotKey,
            assetFilename: filename,
          });
        }
        break;
      }
      case 'reveal': {
        try {
          await vscode.commands.executeCommand(
            'revealInExplorer',
            vscode.Uri.file(absolutePath),
          );
        } catch {
          // `revealInExplorer` is the desktop name; code-server uses
          // `revealFileInOS`.  Fall through and let VS Code surface the
          // built-in error.
        }
        break;
      }
      case 'openWith': {
        try {
          await vscode.commands.executeCommand(
            'explorer.openWith',
            vscode.Uri.file(absolutePath),
          );
        } catch {
          // Non-fatal — user can retry via the tree view.
        }
        break;
      }
      case 'delete': {
        const answer = await vscode.window.showWarningMessage(
          `Delete ${file.name}?`,
          { modal: true },
          'Delete',
        );
        if (answer !== 'Delete') {return;}

        if (this._stacService) {
          const lastSlash = file.path.lastIndexOf('/');
          const filename = lastSlash >= 0 ? file.path.slice(lastSlash + 1) : file.path;
          try {
            await this._stacService.deleteResultAsset(
              plotKey.storePath,
              plotKey.itemPath,
              filename,
            );
            // Remove from the dropdown state.
            this._resultFiles = this._resultFiles.filter(
              (f) => f.path !== file.path,
            );
            this._resultsChanged = true;
            this._sendLayersUpdate();
          } catch (err) {
            void vscode.window.showErrorMessage(
              `Failed to delete ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
        break;
      }
    }
  }

  /**
   * Handle tool execution request - delegates to registered command
   */
  private async _handleToolRun(toolId: string, params?: Record<string, unknown>): Promise<void> {
    // Delegate to the registered executeTool command which handles
    // result layer creation, map updates, STAC persistence, and notifications
    await vscode.commands.executeCommand('debrief.executeTool',
      params ? { toolId, params } : toolId);
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this._temporalUnsubscribe) {
      this._temporalUnsubscribe();
    }
    if (this._selectionUnsubscribe) {
      this._selectionUnsubscribe();
    }
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }
  }

  /**
   * Post message to webview, queueing if not ready
   */
  private _postMessage(message: Record<string, unknown>): void {
    if (this._isWebviewReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    // Get URI for the bundled ActivityPanel webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'activityPanel.js')
    );

    const cspSource = webview.cspSource;
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data:;">
  <title>Activity Panel</title>
  <style>
    :root {
      /* Map VS Code theme colors to component CSS variables */
      --debrief-bg-primary: var(--vscode-sideBar-background);
      --debrief-bg-secondary: var(--vscode-input-background);
      --debrief-bg-tertiary: var(--vscode-list-hoverBackground);
      --debrief-text-primary: var(--vscode-foreground);
      --debrief-text-secondary: var(--vscode-descriptionForeground);
      --debrief-border-color: var(--vscode-panel-border);
      --debrief-border-color-focus: var(--vscode-focusBorder);
      --debrief-accent: var(--vscode-focusBorder);
      --debrief-accent-hover: var(--vscode-focusBorder);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
    .activity-panel-webview {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
