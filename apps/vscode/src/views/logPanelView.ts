/**
 * LogPanel View - Sidebar panel for viewing analytical history (provenance log)
 *
 * Implements WebviewViewProvider pattern matching ActivityPanelViewProvider.
 * Subscribes to SessionManager for active session changes.
 * Calls logService.getTimeline() to fetch timeline entries.
 * Routes messages between webview and extension.
 *
 * Feature: 072-log-panel (E02, Phase 2)
 */

import * as vscode from 'vscode';
import {
  type SessionStoreApi,
  type LogService,
  type LogEntry,
} from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type {
  TimelineEntry,
  OperationCategory,
  LogParameterValue,
  PresentationMode,
} from '@debrief/components';

// Webview → Extension messages
interface EntrySelectMessage {
  type: 'entry:select';
  payload: { activityId: string; featureIds: string[] };
}

interface EntryDeselectMessage {
  type: 'entry:deselect';
}

interface ActionInvokeMessage {
  type: 'action:invoke';
  payload: { actionType: string; activityId: string };
}

interface ModeChangeMessage {
  type: 'mode:change';
  payload: { presentationMode: PresentationMode };
}

interface WebviewReadyMessage {
  type: 'webviewReady';
}

type WebviewMessage =
  | EntrySelectMessage
  | EntryDeselectMessage
  | ActionInvokeMessage
  | ModeChangeMessage
  | WebviewReadyMessage;

// Tool category mapping for operation classification
const TOOL_CATEGORY_MAP: Record<string, OperationCategory> = {
  'import-rep': 'import',
  'import-csv': 'import',
  'load-rep': 'import',
  'export-png': 'export',
  'export-csv': 'export',
  'export-geojson': 'export',
  'change-color': 'property-edit',
  'change-track-color': 'property-edit',
  'set-display-mode': 'property-edit',
  'delete-features': 'property-edit',
};

function classifyOperation(toolId: string): OperationCategory {
  return TOOL_CATEGORY_MAP[toolId] ?? 'calculation';
}

/**
 * Convert a LogEntry from the log service to a display-oriented TimelineEntry.
 */
function toTimelineEntry(entry: LogEntry): TimelineEntry {
  return {
    activityId: entry.activityId,
    timestamp: entry.timestamp,
    toolName: entry.wasGeneratedBy.tool,
    toolVersion: entry.wasGeneratedBy.toolVersion,
    parameters: entry.wasGeneratedBy.parameters as Record<string, LogParameterValue>,
    usedFeatureIds: entry.used,
    generatedFeatureIds: entry.generated,
    executionDuration: entry.executionDuration,
    generatedResultId: entry.generatedResultId ?? null,
    operationCategory: classifyOperation(entry.wasGeneratedBy.tool),
  };
}

// Phase/action availability messages
const ACTION_MESSAGES: Record<string, string> = {
  tune: 'Parameter tuning is planned for Phase 6.',
  revertTo: 'Revert to Here is planned for Phase 4.',
  revertThis: 'Revert This is planned for Phase 4.',
  snapshot: 'Snapshot creation is planned for Phase 4.',
  rationale: 'Rationale annotations are planned for Phase 6.',
};

export class LogPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.logPanel';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _isWebviewReady = false;
  private _pendingMessages: Array<Record<string, unknown>> = [];

  // Session integration
  private _activeSession?: SessionStoreApi;
  private _sessionChangeDisposable?: vscode.Disposable;
  private _storeSubscriptionDisposable?: () => void;

  // Log service for fetching timeline
  private _logService?: LogService;
  private _getStorePath?: () => string | undefined;
  private _getItemPath?: () => string | undefined;

  // Feature name resolution
  private _featureNames: Record<string, string> = {};

  constructor(
    extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _sessionManager: SessionManager
  ) {
    this._extensionUri = extensionUri;

    // Subscribe to session manager
    this._sessionChangeDisposable = this._sessionManager.onActiveSessionChange((session) =>
      this._handleActiveSessionChange(session)
    );
  }

  /**
   * Set the log service for fetching timeline data.
   */
  public setLogService(logService: LogService): void {
    this._logService = logService;
  }

  /**
   * Set path resolvers for store and item paths.
   */
  public setPathResolvers(
    getStorePath: () => string | undefined,
    getItemPath: () => string | undefined
  ): void {
    this._getStorePath = getStorePath;
    this._getItemPath = getItemPath;
  }

  /**
   * Update feature names for display resolution.
   * Called by MapPanel when features are loaded/updated.
   */
  public setFeatureNames(featureNames: Record<string, string>): void {
    this._featureNames = featureNames;
  }

  /**
   * Notify that a tool execution completed — refresh timeline.
   */
  public async refreshTimeline(): Promise<void> {
    await this._sendTimelineUpdate();
  }

  /**
   * Handle active session change from SessionManager.
   */
  private _handleActiveSessionChange(session: SessionStoreApi | null): void {
    // Cleanup previous store subscription
    if (this._storeSubscriptionDisposable) {
      this._storeSubscriptionDisposable();
      this._storeSubscriptionDisposable = undefined;
    }

    this._activeSession = session ?? undefined;

    if (session) {
      // Notify webview of session change
      this._postMessage({
        type: 'session:change',
        payload: {
          hasActiveSession: true,
          plotName: null, // Will be resolved via path
        },
      });

      // Fetch and send timeline
      void this._sendTimelineUpdate();
    } else {
      // No session — show empty state
      this._postMessage({
        type: 'session:change',
        payload: {
          hasActiveSession: false,
          plotName: null,
        },
      });
    }
  }

  /**
   * Fetch timeline from log service and send to webview.
   */
  private async _sendTimelineUpdate(): Promise<void> {
    if (!this._logService || !this._getStorePath || !this._getItemPath) {
      return;
    }

    const storePath = this._getStorePath();
    const itemPath = this._getItemPath();

    if (!storePath || !itemPath) {
      return;
    }

    try {
      const logEntries: LogEntry[] = await this._logService.getTimeline(storePath, itemPath);
      const entries: TimelineEntry[] = logEntries.map(toTimelineEntry);

      this._postMessage({
        type: 'timeline:update',
        payload: {
          entries,
          featureNames: this._featureNames,
        },
      });
    } catch (err) {
      // Graceful degradation — send empty timeline
      this._postMessage({
        type: 'timeline:update',
        payload: {
          entries: [],
          featureNames: this._featureNames,
        },
      });
    }
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
          // Send pending messages
          for (const pending of this._pendingMessages) {
            void webviewView.webview.postMessage(pending);
          }
          this._pendingMessages = [];

          // Send initial presentation mode from globalState
          {
            const savedMode = this._context.globalState.get<PresentationMode>(
              'debrief.logPanel.presentationMode',
              'normal'
            );
            this._postMessage({
              type: 'mode:init',
              payload: { presentationMode: savedMode },
            });
          }

          // Send initial state
          if (this._activeSession) {
            this._postMessage({
              type: 'session:change',
              payload: { hasActiveSession: true, plotName: null },
            });
            void this._sendTimelineUpdate();
          } else {
            this._postMessage({
              type: 'session:change',
              payload: { hasActiveSession: false, plotName: null },
            });
          }
          break;

        case 'entry:select':
          // Set map selection to the entry's affected features
          if (this._activeSession) {
            const state = this._activeSession.getState();
            state.setSelection(message.payload.featureIds);
          }
          break;

        case 'entry:deselect':
          // Clear map selection
          if (this._activeSession) {
            const state = this._activeSession.getState();
            state.setSelection([]);
          }
          break;

        case 'action:invoke':
          // All actions return "not available" in Phase 2
          {
            const actionMsg =
              ACTION_MESSAGES[message.payload.actionType] ??
              'This action is not yet available.';
            this._postMessage({
              type: 'action:result',
              payload: {
                actionType: message.payload.actionType,
                available: false,
                message: actionMsg,
              },
            });
          }
          break;

        case 'mode:change':
          // Persist presentation mode to globalState
          void this._context.globalState.update(
            'debrief.logPanel.presentationMode',
            message.payload.presentationMode
          );
          break;
      }
    });
  }

  /**
   * Post message to webview, queueing if not ready.
   */
  private _postMessage(message: Record<string, unknown>): void {
    if (this._isWebviewReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  /**
   * Dispose resources.
   */
  public dispose(): void {
    if (this._storeSubscriptionDisposable) {
      this._storeSubscriptionDisposable();
    }
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'logPanel.js')
    );

    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource} data:;">
  <title>Log Panel</title>
  <style>
    :root {
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
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
