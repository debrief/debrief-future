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
  createTimeInstant,
  type SessionStoreApi,
  type SessionStoreWithUndo,
  type TemporalSlice,
  type FeatureSelection,
} from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { CalcService } from '../services/calcService';
import type { MatchResult } from '../types/tool';

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
  payload: { mode: 'full' | 'trail' };
}

interface ToolRunMessage {
  type: 'tool:run';
  payload: { toolId: string };
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
  | WebviewReadyMessage;

export class ActivityPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.activityPanel';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _isWebviewReady = false;
  private _pendingMessages: Array<Record<string, unknown>> = [];

  // Session manager integration
  private _activeSession?: SessionStoreApi;
  private _temporalUnsubscribe?: () => void;
  private _selectionUnsubscribe?: () => void;
  private _sessionChangeDisposable?: vscode.Disposable;

  constructor(
    extensionUri: vscode.Uri,
    private readonly _sessionManager: SessionManager,
    private readonly _toolMatchAdapter: ToolMatchAdapter,
    private readonly _calcService: CalcService
  ) {
    this._extensionUri = extensionUri;

    // Subscribe to session manager
    this._sessionChangeDisposable = this._sessionManager.onActiveSessionChange((session) =>
      this._handleActiveSessionChange(session)
    );
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
            startTime: state.timeRange.start.epoch,
            endTime: state.timeRange.end.epoch,
            currentTime: state.currentTime?.epoch,
            displayMode: state.displayMode === 'snailTrail' ? 'trail' : 'full',
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
        startTime: temporal.timeRange.start.epoch,
        endTime: temporal.timeRange.end.epoch,
        currentTime: temporal.currentTime?.epoch,
        displayMode: temporal.displayMode === 'snailTrail' ? 'trail' : 'full',
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
    }));

    this._postMessage({
      type: 'tools:update',
      payload: { tools },
    });
  }

  /**
   * Send layers update to webview
   */
  private _sendLayersUpdate(): void {
    if (!this._activeSession) {
      return;
    }

    const state: SessionStoreWithUndo = this._activeSession.getState();

    // Layers/features come from the STAC catalog, not session state.
    // The webview receives an empty list here; full layer data will be
    // pushed once the LayersTreeProvider is wired into this view.
    const hiddenIds: string[] = state.hiddenFeatureIds ?? [];
    const toolMatches: MatchResult[] = this._toolMatchAdapter.getMatchResults();

    this._postMessage({
      type: 'layers:update',
      payload: { layers: [] as unknown[], hiddenIds, toolMatches },
    });
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
                  startTime: state.timeRange.start.epoch,
                  endTime: state.timeRange.end.epoch,
                  currentTime: state.currentTime?.epoch,
                  displayMode: state.displayMode === 'snailTrail' ? 'trail' : 'full',
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
            state.setCurrentTime(createTimeInstant(message.payload.time));
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
            state.setDisplayMode(message.payload.mode === 'trail' ? 'snailTrail' : 'normal');
          }
          void vscode.commands.executeCommand('debrief.setDisplayMode', {
            mode: message.payload.mode,
          });
          break;

        case 'tool:run':
          // Delegate to CalcService
          void this._handleToolRun(message.payload.toolId);
          break;

        case 'layer:toggleVisibility':
          // Delegate to SessionManager (future implementation)
          void vscode.window.showInformationMessage(
            `Toggle visibility for: ${message.payload.featureIds.join(', ')}`
          );
          break;

        case 'layer:delete':
          // Delegate to SessionManager (future implementation)
          void vscode.window.showInformationMessage(
            `Delete layers: ${message.payload.featureIds.join(', ')}`
          );
          break;

        case 'layer:select':
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setSelection(message.payload.featureIds);
          }
          break;
      }
    });
  }

  /**
   * Handle tool execution request
   */
  private async _handleToolRun(toolId: string): Promise<void> {
    try {
      // Get current selection
      if (!this._activeSession) {
        void vscode.window.showErrorMessage('No active session');
        return;
      }

      const state: SessionStoreWithUndo = this._activeSession.getState();
      const selectedIds = state.selection?.featureIds ?? [];

      if (selectedIds.length === 0) {
        void vscode.window.showWarningMessage('No features selected');
        return;
      }

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Running tool: ${toolId}`,
          cancellable: false,
        },
        async () => {
          await this._calcService.executeTool({ toolId, featureIds: selectedIds });
        }
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Failed to run tool: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource};">
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
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
