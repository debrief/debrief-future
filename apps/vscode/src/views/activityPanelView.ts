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
import type { Track, ReferenceLocation } from '../types/plot';
import type { AssociatedFile } from '../services/stacService';

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

  // Feature data from MapPanel
  private _tracks: Track[] = [];
  private _locations: ReferenceLocation[] = [];

  // Result files for Associated Files dropdown
  private _resultFiles: AssociatedFile[] = [];
  private _resultsChanged = false;

  // Whether the calc service availability check has completed
  // undefined = not checked yet (loading), true = available, false = unavailable
  private _calcAvailable: boolean | undefined = undefined;

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

    // Transform tracks and locations to DebriefFeature format
    const features = [
      ...this._tracks.map((track) => ({
        type: 'Feature' as const,
        id: track.id,
        geometry: track.geometry,
        properties: {
          kind: 'TRACK' as const,
          platform_name: track.name,
          platform_id: track.id,
          track_type: track.platformType ?? 'CONTACT',
          start_time: track.startTime,
          end_time: track.endTime,
          positions: track.times ?? [],
          style: { line: { color: track.color ?? '#0066cc' } },
        },
      })),
      ...this._locations.map((loc) => ({
        type: 'Feature' as const,
        id: loc.id,
        geometry: loc.geometry,
        properties: {
          kind: 'POINT' as const,
          name: loc.name,
          location_type: loc.locationType ?? 'REFERENCE',
        },
      })),
    ];

    this._postMessage({
      type: 'layers:update',
      payload: {
        layers: features,
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
  public setFeatures(tracks: Track[], locations: ReferenceLocation[]): void {
    this._tracks = tracks;
    this._locations = locations;
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
   * Handle tool execution request - delegates to registered command
   */
  private async _handleToolRun(toolId: string): Promise<void> {
    // Delegate to the registered executeTool command which handles
    // result layer creation, map updates, STAC persistence, and notifications
    await vscode.commands.executeCommand('debrief.executeTool', toolId);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource} data:;">
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
