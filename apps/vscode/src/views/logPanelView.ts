/**
 * LogPanel View - Sidebar panel for viewing analytical history (provenance log)
 *
 * Implements WebviewViewProvider pattern matching ActivityPanelViewProvider.
 * Subscribes to SessionManager for active session changes.
 * Calls logService.getTimeline() to fetch timeline entries.
 * Routes messages between webview and extension.
 * Handles Phase 6 replay/tune/revert operations.
 *
 * Feature: 072-log-panel (E02, Phase 2)
 * Updated: 076-replay-tune (E02, Phase 6)
 */

import * as vscode from 'vscode';
import {
  type SessionStoreApi,
  type LogService,
  type LogEntry,
  type ReplayResult,
  type ResultIdRegistry,
  type SnapshotService,
} from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type { CalcService } from '../services/calcService';
import type { ToolParameter } from '../types/tool';

// Locally-defined types matching @debrief/components LogPanel types.
// Defined here to avoid ESM-from-CJS import issues with @debrief/components.
type OperationCategory = 'calculation' | 'import' | 'property-edit' | 'export';
interface LogParameterValue {
  value: unknown;
  default: boolean;
  tunable: boolean;
}
interface TimelineEntry {
  activityId: string;
  timestamp: string;
  toolName: string;
  toolVersion: string;
  parameters: Record<string, LogParameterValue>;
  usedFeatureIds: string[];
  generatedFeatureIds: string[];
  executionDuration: string;
  generatedResultId: string | null;
  operationCategory: OperationCategory;
  deleted?: boolean;
  disabled?: boolean;
  rationale?: string | null;
  tuneAnnotation?: { parameter: string; previousValue: unknown; newValue: unknown } | null;
}

// Locally-defined ParameterSchemaEntry matching @debrief/components LogPanel types.
interface ParameterSchemaEntry {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'enum' | 'object' | 'array';
  description: string | null;
  tunable: boolean;
  defaultValue: unknown;
  minimum: number | null;
  maximum: number | null;
  step: number | null;
  choices: ReadonlyArray<unknown> | null;
  paramType: string | null;
}

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
  payload: { viewMode: string };
}

interface WebviewReadyMessage {
  type: 'webviewReady';
}

// Phase 6 messages (Feature: 076-replay-tune)
interface TuneRequestMessage {
  type: 'tune:request';
  payload: { activityId: string; parameter: string; newValue: unknown };
}

interface RevertToRequestMessage {
  type: 'revert-to:request';
  payload: { activityId: string };
}

interface RevertThisRequestMessage {
  type: 'revert-this:request';
  payload: { activityId: string };
}

interface RestoreRequestMessage {
  type: 'restore:request';
  payload: { activityId: string };
}

interface ReplayCancelMessage {
  type: 'replay:cancel';
}

// Feature 113: flip-card edit messages
interface DisableToggleMessage {
  type: 'disable:toggle';
  payload: { activityId: string; disabled: boolean };
}

interface RationaleUpdateMessage {
  type: 'rationale:update';
  payload: { activityId: string; rationale: string };
}

interface SchemaRequestMessage {
  type: 'schema:request';
  payload: { toolId: string };
}

type WebviewMessage =
  | EntrySelectMessage
  | EntryDeselectMessage
  | ActionInvokeMessage
  | ModeChangeMessage
  | WebviewReadyMessage
  | TuneRequestMessage
  | RevertToRequestMessage
  | RevertThisRequestMessage
  | RestoreRequestMessage
  | ReplayCancelMessage
  | DisableToggleMessage
  | RationaleUpdateMessage
  | SchemaRequestMessage;

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
    parameters: entry.wasGeneratedBy.parameters as { [k: string]: LogParameterValue },
    usedFeatureIds: entry.used,
    generatedFeatureIds: entry.generated,
    executionDuration: entry.executionDuration,
    generatedResultId: entry.generatedResultId ?? null,
    operationCategory: classifyOperation(entry.wasGeneratedBy.tool),
    deleted: entry.deleted === true,
    disabled: entry.disabled === true,
    rationale: entry.rationale ?? null,
    tuneAnnotation: entry.tune
      ? { parameter: entry.tune.parameter, previousValue: entry.tune.previousValue, newValue: entry.tune.newValue }
      : null,
  };
}


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

  // Phase 6: active replay abort controller
  private _replayAbortController?: AbortController;

  // Result ID Registry for tracking replay artifacts (Feature: 087)
  private _resultIdRegistry?: ResultIdRegistry;

  // Callback to refresh MapPanel features after replay (Feature: 076)
  private _onFeaturesChanged?: () => void;

  // CalcService for resolving tool parameter schemas
  private _calcService?: CalcService;

  // SnapshotService for creating snapshot checkpoints (Feature: 074)
  private _snapshotService?: SnapshotService;

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
   * Set the Result ID Registry for tracking replay artifacts (Feature: 087).
   */
  public setResultIdRegistry(registry: ResultIdRegistry): void {
    this._resultIdRegistry = registry;
  }

  /**
   * Set callback to refresh MapPanel features after replay/tune operations.
   */
  public setOnFeaturesChanged(callback: () => void): void {
    this._onFeaturesChanged = callback;
  }

  /**
   * Set the CalcService for resolving tool parameter schemas in flip-card edit mode.
   */
  public setCalcService(calcService: CalcService): void {
    this._calcService = calcService;
  }

  /**
   * Set the SnapshotService for creating snapshot checkpoints from the action bar.
   */
  public setSnapshotService(snapshotService: SnapshotService): void {
    this._snapshotService = snapshotService;
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
      console.warn('[debrief] LogPanel: timeline update skipped — logService or path resolvers not wired');
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
      console.error('[debrief] LogPanel: timeline update failed:', err);
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

          // Send initial view mode from globalState (with migration from legacy key)
          {
            const VALID_VIEW_MODES = ['timeline', 'by-feature', 'compact', 'detailed'];
            // Try new key first, then migrate from legacy key
            let savedMode = this._context.globalState.get<string>(
              'debrief.logPanel.viewMode'
            );
            if (!savedMode) {
              // Migration: read legacy presentationMode and map to ViewMode
              const legacyMode = this._context.globalState.get<string>(
                'debrief.logPanel.presentationMode'
              );
              if (legacyMode === 'compact') savedMode = 'compact';
              else if (legacyMode === 'detailed') savedMode = 'detailed';
              else savedMode = 'timeline'; // 'normal' maps to default 'timeline'
              // Persist migration so it only happens once
              void this._context.globalState.update('debrief.logPanel.viewMode', savedMode);
              void this._context.globalState.update('debrief.logPanel.presentationMode', undefined);
            }
            // Validate against known values (Gap 2: stale globalState protection)
            if (!VALID_VIEW_MODES.includes(savedMode)) {
              savedMode = 'timeline';
            }
            this._postMessage({
              type: 'mode:init',
              payload: { viewMode: savedMode },
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
          {
            const actionType = message.payload.actionType;
            if (actionType === 'tune' || actionType === 'revertTo' || actionType === 'revertThis') {
              // These are handled via dedicated Phase 6 messages from the webview.
              this._postMessage({
                type: 'action:result',
                payload: {
                  actionType,
                  available: false,
                  message: 'Use the inline parameter editor or revert buttons.',
                },
              });
            } else if (actionType === 'snapshot') {
              void this._handleSnapshotAction();
            } else {
              // rationale is handled via flip-card rationale:update message;
              // any unknown action type gets a clear message.
              this._postMessage({
                type: 'action:result',
                payload: {
                  actionType,
                  available: false,
                  message: `Action "${actionType}" is not supported from the action bar.`,
                },
              });
            }
          }
          break;

        // Phase 6: tune/revert/restore operations (Feature: 076-replay-tune)
        case 'tune:request':
          void this._handleTuneRequest(message.payload);
          break;

        case 'revert-to:request':
          void this._handleRevertToRequest(message.payload);
          break;

        case 'revert-this:request':
          void this._handleRevertThisRequest(message.payload);
          break;

        case 'restore:request':
          void this._handleRestoreRequest(message.payload);
          break;

        case 'replay:cancel':
          if (this._replayAbortController) {
            this._replayAbortController.abort();
            this._replayAbortController = undefined;
          }
          break;

        case 'mode:change':
          // Persist view mode to globalState (Feature 176: unified ViewMode)
          void this._context.globalState.update(
            'debrief.logPanel.viewMode',
            message.payload.viewMode
          );
          break;

        // Feature 113: flip-card edit messages
        case 'disable:toggle':
          void this._handleDisableToggle(message.payload);
          break;

        case 'rationale:update':
          void this._handleRationaleUpdate(message.payload);
          break;

        case 'schema:request':
          void this._handleSchemaRequest(message.payload);
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

  // ─── Service wiring guard ────────────────────────────────────────

  /**
   * Check that logService and path resolvers are wired. If not, send an
   * error to the webview so the user sees feedback instead of nothing.
   * Returns true if services are ready, false otherwise.
   */
  private _assertLogServiceReady(action: string): boolean {
    if (this._logService && this._getStorePath && this._getItemPath) {
      return true;
    }
    const missing: string[] = [];
    if (!this._logService) { missing.push('logService'); }
    if (!this._getStorePath) { missing.push('storePath resolver'); }
    if (!this._getItemPath) { missing.push('itemPath resolver'); }
    console.warn(`[debrief] LogPanel: ${action} skipped — missing ${missing.join(', ')}. Reopen the plot to reconnect.`);
    this._postMessage({
      type: 'replay:error',
      payload: { message: `Log service not connected. Please reopen the plot. (missing: ${missing.join(', ')})` },
    });
    return false;
  }

  // ─── Phase 6 handlers (Feature: 076-replay-tune) ──────────────────

  private async _handleTuneRequest(payload: {
    activityId: string;
    parameter: string;
    newValue: unknown;
  }): Promise<void> {
    if (!this._assertLogServiceReady('tune:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.tuneEntry(
        storePath, itemPath,
        payload.activityId, payload.parameter, payload.newValue
      );
      this._sendReplayResult(result);
      await this._sendTimelineUpdate();
      // Refresh MapPanel with updated features from disk
      this._onFeaturesChanged?.();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async _handleRevertToRequest(payload: {
    activityId: string;
  }): Promise<void> {
    if (!this._assertLogServiceReady('revert-to:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.revertTo(storePath, itemPath, payload.activityId);
      this._postMessage({
        type: 'action:result',
        payload: {
          actionType: 'revertTo',
          available: false,
          message: 'Reverted successfully. Operations after the selected point have been removed.',
        },
      });
      await this._sendTimelineUpdate();
      this._onFeaturesChanged?.();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async _handleRevertThisRequest(payload: {
    activityId: string;
  }): Promise<void> {
    if (!this._assertLogServiceReady('revert-this:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.revertThis(
        storePath, itemPath, payload.activityId
      );
      this._sendReplayResult(result);
      await this._sendTimelineUpdate();
      this._onFeaturesChanged?.();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async _handleRestoreRequest(payload: {
    activityId: string;
  }): Promise<void> {
    if (!this._assertLogServiceReady('restore:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.restoreEntry(
        storePath, itemPath, payload.activityId
      );
      this._sendReplayResult(result);
      await this._sendTimelineUpdate();
      this._onFeaturesChanged?.();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private _sendReplayResult(result: ReplayResult): void {
    // Update Result ID Registry from replay artifacts (Feature: 087)
    if (this._resultIdRegistry && result.artifactsCreated.length > 0) {
      this._resultIdRegistry.registerFromReplayResult(result.artifactsCreated);
    }

    this._postMessage({
      type: 'replay:result',
      payload: { ...result },
    });
  }

  // ─── Snapshot action (Feature: 074) ─────────────────────────────────

  private async _handleSnapshotAction(): Promise<void> {
    if (!this._snapshotService) {
      this._postMessage({
        type: 'action:result',
        payload: {
          actionType: 'snapshot',
          available: false,
          message: 'Snapshot service not connected. Please reopen the plot.',
        },
      });
      return;
    }

    if (!this._assertLogServiceReady('snapshot')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) { return; }

    try {
      const result = await this._snapshotService.createSnapshot(storePath, itemPath);
      this._postMessage({
        type: 'action:result',
        payload: {
          actionType: 'snapshot',
          available: false,
          message: `Snapshot created: ${result.snapshotAsset} (${result.entriesCaptured} entries captured).`,
        },
      });
      await this._sendTimelineUpdate();
    } catch (err) {
      this._postMessage({
        type: 'action:result',
        payload: {
          actionType: 'snapshot',
          available: false,
          message: `Snapshot failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
    }
  }

  // ─── End Phase 6 handlers ────────────────────────────────────────

  // ─── Feature 113: Flip-card edit handlers ──────────────────────────

  private async _handleDisableToggle(payload: {
    activityId: string;
    disabled: boolean;
  }): Promise<void> {
    if (!this._assertLogServiceReady('disable:toggle')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.disableEntry(
        storePath, itemPath,
        payload.activityId, payload.disabled
      );
      await this._sendTimelineUpdate();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async _handleRationaleUpdate(payload: {
    activityId: string;
    rationale: string;
  }): Promise<void> {
    if (!this._assertLogServiceReady('rationale:update')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.setRationale(
        storePath, itemPath,
        payload.activityId, payload.rationale
      );
      // No timeline update needed — rationale is metadata only
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private _handleSchemaRequest(payload: {
    toolId: string;
  }): void {
    if (!this._calcService) {
      // No CalcService — return empty schema (fallback to text inputs)
      this._postMessage({
        type: 'schema:response',
        payload: { toolId: payload.toolId, schema: [], error: null },
      });
      return;
    }

    // Build schema from cached tool list (no async fetch — uses already-cached tools)
    const tools = this._calcService.getCurrentTools?.() ?? [];
    const tool = tools.find((t) => t.id === payload.toolId || t.name === payload.toolId);

    if (!tool || !tool.parameters || tool.parameters.length === 0) {
      this._postMessage({
        type: 'schema:response',
        payload: { toolId: payload.toolId, schema: [], error: null },
      });
      return;
    }

    const schema: ParameterSchemaEntry[] = tool.parameters.map(
      (p: ToolParameter): ParameterSchemaEntry => ({
        name: p.name,
        type: p.valueType === 'enum' ? 'enum' : p.valueType,
        description: p.description ?? null,
        tunable: true,
        defaultValue: p.defaultValue ?? null,
        minimum: null,
        maximum: null,
        step: null,
        choices: p.choices ?? null,
        paramType: p.paramType ?? null,
      })
    );

    this._postMessage({
      type: 'schema:response',
      payload: { toolId: payload.toolId, schema, error: null },
    });
  }

  // ─── End Feature 113 handlers ──────────────────────────────────────

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
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data:;">
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
