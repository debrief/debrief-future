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
import type {
  WebviewMessage,
  ExtensionMessage,
  TuneRequestMessage,
  RevertToRequestMessage,
  RevertThisRequestMessage,
  RestoreRequestMessage,
  DisableToggleMessage,
  RationaleUpdateMessage,
  SchemaRequestMessage,
} from '../webview/logPanelMessages';

// Type-only imports from @debrief/components — erased at compile time so the
// extension does not pull the runtime ESM bundle.
import type {
  TimelineEntry,
  TimelineEntryKind,
  LogParameterValue,
  OperationCategory,
  ParameterSchemaEntry,
  ViewMode,
} from '@debrief/components';
import { VALID_VIEW_MODES } from '@debrief/components';

// `ActivityType` is the source-of-truth discriminator on LogEntry (LinkML);
// this file projects it onto the UI-side `TimelineEntry.kind` union.
// Imported as a value (not type-only) so case clauses can compare against
// enum members — eslint `@typescript-eslint/no-unsafe-enum-comparison`
// rejects comparing an enum-typed switch predicate to plain string literals.
// Feature: 208-timeline-entry-kind.
import { ActivityType } from '@debrief/schemas';

// Webview ↔ Extension message types are imported from `../webview/logPanelMessages`
// (shared with the webview side to enforce a single contract).

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
 * Project the PROV-side `activity_type` signal onto the UI-side
 * `TimelineEntryKind` discriminator. Total, non-throwing, reads only the
 * schema field (no tool-name heuristics — FR-005 / SC-005). Absent, null,
 * or unrecognised values fall back to `'tool'` (FR-006).
 * Feature: 208-timeline-entry-kind.
 */
export function kindFromActivityType(
  activityType: ActivityType | undefined | null
): TimelineEntryKind {
  switch (activityType) {
    case ActivityType.snapshot:
      return 'snapshot';
    case ActivityType.tune:
      return 'tune';
    case ActivityType.tool:
      return 'tool';
    case undefined:
    case null:
      return 'tool';
    default:
      return 'tool';
  }
}

/**
 * Convert a LogEntry from the log service to a display-oriented TimelineEntry.
 *
 * Exported for unit testing of the `kind` projection; not part of the module's
 * public API otherwise. Feature: 208-timeline-entry-kind.
 */
export function toTimelineEntry(entry: LogEntry): TimelineEntry {
  return {
    activity_id: entry.activity_id,
    timestamp: entry.timestamp,
    toolName: entry.was_generated_by.tool,
    tool_version: entry.was_generated_by.tool_version,
    parameters: entry.was_generated_by.parameters as { [k: string]: LogParameterValue },
    usedFeatureIds: entry.used,
    generatedFeatureIds: entry.generated,
    execution_duration: entry.execution_duration,
    generated_result_id: entry.generated_result_id ?? null,
    operationCategory: classifyOperation(entry.was_generated_by.tool),
    deleted: entry.deleted === true,
    disabled: entry.disabled === true,
    rationale: entry.rationale ?? null,
    tuneAnnotation: entry.tune
      ? { parameter: entry.tune.parameter, previous_value: entry.tune.previous_value, new_value: entry.tune.new_value }
      : null,
    kind: kindFromActivityType(entry.activity_type),
  };
}


export class LogPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.logPanel';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _isWebviewReady = false;
  private _pendingMessages: ExtensionMessage[] = [];

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

          // Send initial view mode from globalState
          {
            const savedMode = this._context.globalState.get<string>(
              'debrief.logPanel.viewMode',
              'timeline'
            );
            // SAFETY: `VALID_VIEW_MODES` is `readonly ViewMode[]` and
            // TypeScript's `.includes()` signature on a narrow readonly
            // array rejects a plain string. Widening to `readonly string[]`
            // is a safe upcast (ViewMode is a string literal subtype) and
            // the `isViewMode` type guard narrows the result back to
            // `ViewMode` through the return type.
            const isViewMode = (value: string): value is ViewMode =>
              (VALID_VIEW_MODES as readonly string[]).includes(value);
            const viewMode: ViewMode = isViewMode(savedMode) ? savedMode : 'timeline';
            this._postMessage({
              type: 'mode:init',
              payload: { viewMode },
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

          // Feature 207: push tool-category manifest for icon rendering.
          // Fire-and-forget — failure falls back to neutral-grey icons.
          void this._sendToolsManifest();
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
            if (actionType === 'revertTo' || actionType === 'revertThis') {
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
   *
   * Typed against `ExtensionMessage` so that any payload shape mismatch
   * (e.g. an outgoing field renamed without updating the contract) is a
   * compile error rather than a silent runtime `undefined` on the webview.
   */
  private _postMessage(message: ExtensionMessage): void {
    if (this._isWebviewReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  /**
   * Feature 207: push the latest tool-category map to the webview.
   *
   * Triggers a `listTools()` fetch if the cache is cold, then projects
   * the result into `{toolId: categoryOrNull}`. Failures are swallowed —
   * the Log Panel falls back to neutral grey for every card rather than
   * surfacing a connection error (consistent with how the panel already
   * handles missing services elsewhere).
   */
  private async _sendToolsManifest(): Promise<void> {
    if (!this._calcService) {
      return;
    }
    try {
      // Warm the cache so `getToolCategoryMap()` has data to project.
      await this._calcService.listTools();
    } catch {
      // Connection issues or MCP unavailability → stay silent. Webview
      // already handles undefined-manifest state (renders grey fallback).
      return;
    }
    const categories = this._calcService.getToolCategoryMap();
    this._postMessage({
      type: 'tools:manifest',
      payload: { categories },
    });
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

  private async _handleTuneRequest(payload: TuneRequestMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('tune:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.tuneEntry(
        storePath, itemPath,
        payload.activity_id, payload.parameter, payload.new_value
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

  private async _handleRevertToRequest(payload: RevertToRequestMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('revert-to:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.revertTo(storePath, itemPath, payload.activity_id);
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

  private async _handleRevertThisRequest(payload: RevertThisRequestMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('revert-this:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.revertThis(
        storePath, itemPath, payload.activity_id
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

  private async _handleRestoreRequest(payload: RestoreRequestMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('restore:request')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      const result = await this._logService!.restoreEntry(
        storePath, itemPath, payload.activity_id
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
    if (this._resultIdRegistry && result.artifacts_created.length > 0) {
      this._resultIdRegistry.registerFromReplayResult(result.artifacts_created);
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
          message: `Snapshot created: ${result.snapshot_asset} (${result.entries_captured} entries captured).`,
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

  private async _handleDisableToggle(payload: DisableToggleMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('disable:toggle')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.disableEntry(
        storePath, itemPath,
        payload.activity_id, payload.disabled
      );
      await this._sendTimelineUpdate();
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async _handleRationaleUpdate(payload: RationaleUpdateMessage['payload']): Promise<void> {
    if (!this._assertLogServiceReady('rationale:update')) { return; }
    const storePath = this._getStorePath!();
    const itemPath = this._getItemPath!();
    if (!storePath || !itemPath) {
      return;
    }

    try {
      await this._logService!.setRationale(
        storePath, itemPath,
        payload.activity_id, payload.rationale
      );
      // No timeline update needed — rationale is metadata only
    } catch (err) {
      this._postMessage({
        type: 'replay:error',
        payload: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private _handleSchemaRequest(payload: SchemaRequestMessage['payload']): void {
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
