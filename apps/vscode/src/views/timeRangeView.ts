/**
 * Time Range View - Sidebar webview for time range control
 *
 * Uses the TimeController React component from @debrief/components
 * to provide playback controls for maritime track visualization.
 *
 * Feature: 029-session-state-vscode
 * - Subscribes to session manager for active session changes
 * - Updates webview when temporal state changes
 * - Updates session state when user changes time
 */

import * as vscode from 'vscode';
import {
  subscribeToTemporal,
  type SessionStoreApi,
  type SessionStoreWithUndo,
  type TemporalSlice,
} from '@debrief/session-state';
import type { DisplayMode, PlaybackState } from '@debrief/schemas';
import type { SessionManager } from '../services/sessionManager';

// Message types from webview to extension
interface TimeChangeMessage {
  type: 'timeChange';
  time: number;
}

interface PlaybackStateChangeMessage {
  type: 'playbackStateChange';
  state: PlaybackState;
}

interface DisplayModeChangeMessage {
  type: 'displayModeChange';
  mode: DisplayMode;
}

interface WebviewReadyMessage {
  type: 'webviewReady';
}

type WebviewMessage =
  | TimeChangeMessage
  | PlaybackStateChangeMessage
  | DisplayModeChangeMessage
  | WebviewReadyMessage;

export class TimeRangeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.timeRange';

  /** Public accessor for the active webview (#220 theme relay). */
  public get webview(): vscode.Webview | undefined {
    return this._view?.webview;
  }

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _timeExtent: { start: number; end: number } | null = null;
  /**
   * Scrubbable-range override (Feature 217, R2). When set, outbound
   * `updateTimeExtent` messages narrow `start`/`end` to this window while
   * `dataStart`/`dataEnd` continue to reflect the session's full
   * `timeRange`. The override survives `timeRange` updates — clearing
   * it happens only via `setScrubbableRange(null, null)` (e.g. when the
   * Storyboard playback service deactivates).
   *
   * Semantics for mixed null/non-null inputs: both must be non-null to
   * install an override. Any call with at least one null clears the
   * override — this keeps the call-site simple (the playback service
   * never needs to reason about partial windows) and avoids accidental
   * one-sided constraints.
   */
  private _scrubbableOverride: { start: number; end: number } | null = null;
  private _isWebviewReady = false;
  private _pendingMessages: Array<Record<string, unknown>> = [];

  // Session manager integration
  private _activeSession?: SessionStoreApi;
  private _temporalUnsubscribe?: () => void;
  private _sessionChangeDisposable?: vscode.Disposable;

  // Event callbacks (legacy - kept for backward compatibility)
  private _onTimeChangeCallback?: (time: number) => void;
  private _onPlaybackStateChangeCallback?: (state: PlaybackState) => void;
  private _onDisplayModeChangeCallback?: (mode: DisplayMode) => void;

  constructor(extensionUri: vscode.Uri, sessionManager?: SessionManager) {
    this._extensionUri = extensionUri;

    // Subscribe to session manager if provided
    if (sessionManager) {
      this._sessionChangeDisposable = sessionManager.onActiveSessionChange(
        (session) => this._handleActiveSessionChange(session)
      );
    }
  }

  /**
   * Set session manager (for late binding after construction)
   */
  public setSessionManager(sessionManager: SessionManager): void {
    // Clean up existing subscription
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }

    this._sessionChangeDisposable = sessionManager.onActiveSessionChange(
      (session) => this._handleActiveSessionChange(session)
    );

    // Subscribe to current active session if any
    const activeSession = sessionManager.getActiveSession();
    if (activeSession) {
      this._handleActiveSessionChange(activeSession);
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

    this._activeSession = session ?? undefined;

    if (session) {
      // Subscribe to temporal state changes
      this._temporalUnsubscribe = subscribeToTemporal(
        session,
        (temporal) => this._handleTemporalChange(temporal)
      );

      // Set initial state from session
      const state: SessionStoreWithUndo = session.getState();
      if (state.timeRange) {
        this._timeExtent = {
          start: state.timeRange.start,
          end: state.timeRange.end,
        };
        this._postTimeExtent(state.timeRange.start, state.timeRange.end);
      }
      if (state.currentTime !== null) {
        this._postMessage({
          type: 'setCurrentTime',
          time: state.currentTime,
        });
      }
      this.setUIState('ready');
    } else {
      // No active session - show empty state
      this._timeExtent = null;
      this.setUIState('empty');
    }
  }

  /**
   * Handle temporal state changes from session
   */
  private _handleTemporalChange(temporal: TemporalSlice): void {
    // DIAGNOSTIC (PR #606) — investigating why slider doesn't move
    // when storyboard click updates session.currentTime. Remove after.
    console.warn('[timeRangeView][diag] _handleTemporalChange fired', {
      hasView: this._view !== undefined,
      isWebviewReady: this._isWebviewReady,
      currentTime: temporal.currentTime,
      timeRange: temporal.timeRange,
      scrubbableOverride: this._scrubbableOverride,
    });
    // Update time extent if changed
    if (temporal.timeRange) {
      const newExtent = {
        start: temporal.timeRange.start,
        end: temporal.timeRange.end,
      };
      if (
        !this._timeExtent ||
        this._timeExtent.start !== newExtent.start ||
        this._timeExtent.end !== newExtent.end
      ) {
        this._timeExtent = newExtent;
        this._postTimeExtent(newExtent.start, newExtent.end);
      }
    }

    // Update current time if changed
    if (temporal.currentTime !== null) {
      this._postMessage({
        type: 'setCurrentTime',
        time: temporal.currentTime,
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
          // Send any pending messages
          for (const pending of this._pendingMessages) {
            void webviewView.webview.postMessage(pending);
          }
          this._pendingMessages = [];
          // Send current time extent if available
          if (this._timeExtent) {
            this._postTimeExtent(this._timeExtent.start, this._timeExtent.end);
          }
          break;

        case 'timeChange':
          // Update session state if available
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setCurrentTime(message.time);
          }
          // Legacy callback
          if (this._onTimeChangeCallback) {
            this._onTimeChangeCallback(message.time);
          }
          // Execute command for other parts of extension
          void vscode.commands.executeCommand('debrief.setTimeRange', {
            time: message.time,
          });
          break;

        case 'playbackStateChange':
          // Update session state if available
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setPlaybackState(message.state);
          }
          // Legacy callback
          if (this._onPlaybackStateChangeCallback) {
            this._onPlaybackStateChangeCallback(message.state);
          }
          break;

        case 'displayModeChange':
          // Update session state if available
          if (this._activeSession) {
            const state: SessionStoreWithUndo = this._activeSession.getState();
            state.setDisplayMode(message.mode);
          }
          // Legacy callback
          if (this._onDisplayModeChangeCallback) {
            this._onDisplayModeChangeCallback(message.mode);
          }
          void vscode.commands.executeCommand('debrief.setDisplayMode', {
            mode: message.mode,
          });
          break;
      }
    });
  }

  /**
   * Update the time extent from plot data
   */
  public updateTimeExtent(start: number, end: number): void {
    this._timeExtent = { start, end };
    this._postTimeExtent(start, end);
  }

  /**
   * Install (or clear) a scrubbable-range override (Feature 217 / R2).
   *
   * When installed, every outbound `updateTimeExtent` message narrows
   * `start`/`end` to the given window while `dataStart`/`dataEnd`
   * continue to reflect the session's full `timeRange`. Pass
   * `setScrubbableRange(null, null)` to restore the full range.
   *
   * Mixed null/non-null inputs are treated as clears — the override
   * either fully applies or not at all.
   */
  public setScrubbableRange(start: number | null, end: number | null): void {
    if (start === null || end === null) {
      if (this._scrubbableOverride === null) {return;}
      this._scrubbableOverride = null;
    } else {
      this._scrubbableOverride = { start, end };
    }
    // Repost the current extent so the webview reflects the new override
    // immediately — otherwise the narrower track would only appear on
    // the next `timeRange` change.
    if (this._timeExtent) {
      this._postTimeExtent(this._timeExtent.start, this._timeExtent.end);
    }
  }

  /**
   * Set the current time position
   */
  public setCurrentTime(time: number): void {
    this._postMessage({
      type: 'setCurrentTime',
      time,
    });
  }

  /**
   * Set UI state (empty, loading, ready)
   */
  public setUIState(state: 'empty' | 'loading' | 'ready'): void {
    this._postMessage({
      type: 'setUIState',
      uiState: state,
    });
  }

  /**
   * Clear the time extent (reset to empty state)
   */
  public clearTimeExtent(): void {
    this._timeExtent = null;
    this._postMessage({
      type: 'setUIState',
      uiState: 'empty',
    });
  }

  /**
   * Register callback for time changes
   */
  public onTimeChange(callback: (time: number) => void): void {
    this._onTimeChangeCallback = callback;
  }

  /**
   * Register callback for playback state changes
   */
  public onPlaybackStateChange(callback: (state: PlaybackState) => void): void {
    this._onPlaybackStateChangeCallback = callback;
  }

  /**
   * Register callback for display mode changes
   */
  public onDisplayModeChange(callback: (mode: DisplayMode) => void): void {
    this._onDisplayModeChangeCallback = callback;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this._temporalUnsubscribe) {
      this._temporalUnsubscribe();
    }
    if (this._sessionChangeDisposable) {
      this._sessionChangeDisposable.dispose();
    }
  }

  /**
   * Post an `updateTimeExtent` message to the webview, honouring the
   * active scrubbable-range override (Feature 217, R2). `dataStart`/
   * `dataEnd` always reflect the session's full time range; `start`/
   * `end` narrow to the override window when installed.
   */
  private _postTimeExtent(dataStart: number, dataEnd: number): void {
    const override = this._scrubbableOverride;
    this._postMessage({
      type: 'updateTimeExtent',
      start: override ? override.start : dataStart,
      end: override ? override.end : dataEnd,
      dataStart,
      dataEnd,
    });
  }

  /**
   * Post message to webview, queueing if not ready
   */
  private _postMessage(message: Record<string, unknown>): void {
    // DIAGNOSTIC (PR #606) — track every outbound message + queueing.
    // Remove after triage.
    if (message['type'] === 'setCurrentTime' || message['type'] === 'updateTimeExtent') {
      console.warn('[timeRangeView][diag] _postMessage', {
        type: message['type'],
        willQueue: !(this._isWebviewReady && this._view),
        isWebviewReady: this._isWebviewReady,
        hasView: this._view !== undefined,
        message,
      });
    }
    if (this._isWebviewReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    // Get URI for the bundled TimeController webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'timeController.js')
    );

    const cspSource = webview.cspSource;
    const nonce = getNonce();

    // Note: The TimeController CSS is bundled with the JS via vite-plugin-css-injected-by-js
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data:;">
  <title>Time Controller</title>
  <style>
    :root {
      /* Map VS Code theme colors to TimeController CSS variables */
      --debrief-bg-primary: var(--vscode-sideBar-background);
      --debrief-bg-secondary: var(--vscode-input-background);
      --debrief-text-primary: var(--vscode-foreground);
      --debrief-text-secondary: var(--vscode-descriptionForeground);
      --debrief-border: var(--vscode-panel-border);
      --debrief-accent: var(--vscode-focusBorder);
      --debrief-accent-hover: var(--vscode-focusBorder);
    }
    body {
      margin: 0;
      padding: 8px;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    #root {
      width: 100%;
    }
    .time-controller-webview {
      width: 100%;
    }
    /* Override TimeController styles for VS Code sidebar */
    .debrief-time-controller {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
    }
    .debrief-time-controller__row {
      padding: 4px 0 !important;
    }
    .debrief-time-display {
      color: var(--vscode-foreground) !important;
    }
    .debrief-time-scrubber__track {
      background: var(--vscode-input-background) !important;
    }
    .debrief-time-scrubber__progress {
      background: var(--vscode-progressBar-background) !important;
    }
    .debrief-time-scrubber__thumb {
      background: var(--vscode-button-background) !important;
      border-color: var(--vscode-button-background) !important;
    }
    .debrief-playback-button {
      background: var(--vscode-button-secondaryBackground) !important;
      color: var(--vscode-button-secondaryForeground) !important;
    }
    .debrief-playback-button:hover {
      background: var(--vscode-button-secondaryHoverBackground) !important;
    }
    .debrief-speed-selector__button {
      background: var(--vscode-dropdown-background) !important;
      color: var(--vscode-dropdown-foreground) !important;
      border-color: var(--vscode-dropdown-border) !important;
    }
    .debrief-speed-selector__dropdown {
      background: var(--vscode-dropdown-background) !important;
      border-color: var(--vscode-dropdown-border) !important;
    }
    .debrief-speed-selector__option {
      color: var(--vscode-dropdown-foreground) !important;
    }
    .debrief-speed-selector__option:hover {
      background: var(--vscode-list-hoverBackground) !important;
    }
    .debrief-display-mode-toggle {
      background: var(--vscode-input-background) !important;
    }
    .debrief-display-mode-toggle__label {
      color: var(--vscode-disabledForeground) !important;
    }
    .debrief-display-mode-toggle__label--active {
      color: var(--vscode-foreground) !important;
    }
    .debrief-display-mode-toggle__slider {
      background: var(--vscode-button-background) !important;
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
