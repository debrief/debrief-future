/**
 * SessionManager - Manages document sessions for the Debrief VS Code Extension
 *
 * This service manages Zustand-based session state stores for open plot documents.
 * Each document has its own session store, and the manager tracks which session
 * is active (follows VS Code's active editor).
 *
 * Feature: 029-session-state-vscode
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager();
 *
 * // Create session when plot is opened
 * sessionManager.createSession(documentUri, plotData);
 *
 * // Subscribe to active session changes
 * sessionManager.onActiveSessionChange((session) => {
 *   if (session) {
 *     subscribeToTemporal(session, (temporal) => {
 *       // Handle temporal state changes
 *     });
 *   }
 * });
 *
 * // Switch active document when editor changes
 * sessionManager.setActiveDocument(newUri);
 * ```
 */

import * as vscode from 'vscode';
import * as os from 'os';
import {
  createSessionStore,
  startServer,
  type SessionStoreApi,
  type SessionStoreWithUndo,
  type ServerOptions,
  isoToEpoch,
  type TimeRange,
} from '@debrief/session-state';
import type { Express } from 'express';
import type { Plot } from '../types/plot';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

/**
 * Fallback actor written to provenance when `os.userInfo()` throws (e.g. in
 * sandboxed code-server environments where `/etc/passwd` is not readable).
 */
export const ACTOR_FALLBACK = 'vscode-user';

/**
 * Resolve the current OS username, falling back to `ACTOR_FALLBACK` on any
 * error. Extracted so tests can spy on the fallback path (T211).
 */
export function resolveActor(
  userInfo: () => { username: string } = os.userInfo,
): string {
  try {
    const info = userInfo();
    const name = info.username;
    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }
    return ACTOR_FALLBACK;
  } catch {
    return ACTOR_FALLBACK;
  }
}

/**
 * Data needed to initialize a session with defaults derived from plot data.
 */
export interface PlotSessionData {
  /** Plot metadata */
  plot: Plot;
  /** Track data for time range calculation */
  tracks: TrackFeature[];
  /** Location data */
  locations: ReferenceLocation[];
  /** URI to the feature collection */
  featureCollectionUri: string;
}

/**
 * SessionManager - Singleton managing document sessions.
 *
 * Responsibilities:
 * - Create session stores per document URI (FR-002)
 * - Initialize state from plot data (FR-003)
 * - Track active document (FR-004)
 * - Cache sessions by URI for instant switching (FR-005)
 * - Dispose sessions when documents close (FR-006)
 * - Emit events on active session change (FR-010)
 */
export class SessionManager implements vscode.Disposable {
  /** Session stores keyed by document URI */
  private sessions: Map<string, SessionStoreApi> = new Map();

  /** Currently active document URI */
  private activeDocumentUri: string | null = null;

  /** Subscriptions for cleanup */
  private disposables: vscode.Disposable[] = [];

  /** Event emitter for active session changes */
  private _onActiveSessionChange = new vscode.EventEmitter<SessionStoreApi | null>();

  /** Event fired when the active session changes */
  readonly onActiveSessionChange = this._onActiveSessionChange.event;

  /** MCP server instance (Feature: 029 - Phase 5) */
  private mcpServer: { app: Express; close: () => void } | null = null;

  /** MCP server port (defaults to 3001, configurable via settings) */
  private mcpPort: number = 3001;

  /**
   * Cached OS username (falls back to `ACTOR_FALLBACK` if `os.userInfo` throws).
   * Used by Feature 216 capture to stamp provenance on newly-created Scene /
   * Storyboard Features.
   */
  public readonly actor: string = resolveActor();

  /**
   * Create a new session for a document.
   *
   * Initializes the session state with defaults derived from the plot data:
   * - timeRange from track timestamps (FR-003)
   * - viewport could be derived from bbox (done in MapPanel)
   * - featureCollectionUri set for MCP tools
   *
   * @param documentUri - The document URI (typically stac:// URI)
   * @param data - Plot data for deriving default state
   * @returns The created session store
   */
  createSession(documentUri: string, data: PlotSessionData): SessionStoreApi {
    // Check if session already exists
    const existing = this.sessions.get(documentUri);
    if (existing) {
      return existing;
    }

    // Create new Zustand store
    const store = createSessionStore();

    // Initialize state from plot data
    const state: SessionStoreWithUndo = store.getState();

    // Set feature collection URI
    state.setFeatureCollectionUri(data.featureCollectionUri);

    // Derive time range from plot extent
    if (data.plot.timeExtent !== undefined && data.plot.timeExtent.length === 2) {
      const [startIso, endIso] = data.plot.timeExtent;
      const timeRange: TimeRange = {
        start: isoToEpoch(startIso),
        end: isoToEpoch(endIso),
      };
      state.setTimeRange(timeRange);

      // Set current time to start of range
      state.setCurrentTime(timeRange.start);
    }

    // Cache the session
    this.sessions.set(documentUri, store);

    // If no active document, set this one as active
    if (this.activeDocumentUri === null) {
      this.setActiveDocument(documentUri);
    }

    return store;
  }

  /**
   * Get the currently active session.
   *
   * @returns The active session store, or null if no session is active
   */
  getActiveSession(): SessionStoreApi | null {
    if (this.activeDocumentUri === null) {
      return null;
    }
    return this.sessions.get(this.activeDocumentUri) ?? null;
  }

  /**
   * Get a session by document URI.
   *
   * @param uri - The document URI
   * @returns The session store, or undefined if not found
   */
  getSession(uri: string): SessionStoreApi | undefined {
    return this.sessions.get(uri);
  }

  /**
   * Check if a session exists for a document.
   *
   * @param uri - The document URI
   * @returns True if session exists
   */
  hasSession(uri: string): boolean {
    return this.sessions.has(uri);
  }

  /**
   * Set the active document.
   *
   * Called when VS Code's active editor changes.
   * Emits onActiveSessionChange event.
   *
   * @param uri - The document URI, or null if no document is active
   */
  setActiveDocument(uri: string | null): void {
    // No change
    if (uri === this.activeDocumentUri) {
      return;
    }

    this.activeDocumentUri = uri;

    // Emit event with new active session
    const session = uri ? this.sessions.get(uri) ?? null : null;
    this._onActiveSessionChange.fire(session);

    // Update MCP server to use new session (Feature: 029 - Phase 5)
    if (session && this.mcpServer) {
      this.restartMcpServer(session);
    } else if (!session) {
      this.stopMcpServer();
    }
  }

  /**
   * Get the currently active document URI.
   *
   * @returns The active document URI, or null
   */
  getActiveDocumentUri(): string | null {
    return this.activeDocumentUri;
  }

  /**
   * Dispose a session for a document.
   *
   * Called when a document is closed.
   *
   * @param documentUri - The document URI
   */
  disposeSession(documentUri: string): void {
    const session = this.sessions.get(documentUri);
    if (!session) {
      return;
    }

    // Remove from cache
    this.sessions.delete(documentUri);

    // If this was the active session, clear active
    if (this.activeDocumentUri === documentUri) {
      this.activeDocumentUri = null;
      this._onActiveSessionChange.fire(null);
    }

    // Note: Zustand stores don't need explicit cleanup,
    // but we could call session.destroy() if available
  }

  /**
   * Get the number of active sessions.
   *
   * @returns The session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all session URIs.
   *
   * @returns Array of document URIs with active sessions
   */
  getSessionUris(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if any session has unsaved changes.
   *
   * @returns True if at least one session is dirty
   */
  hasDirtySessions(): boolean {
    for (const session of this.sessions.values()) {
      const state: SessionStoreWithUndo = session.getState();
      if (state.dirty) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get count of dirty sessions.
   *
   * @returns Number of sessions with unsaved changes
   */
  getDirtySessionCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      const state: SessionStoreWithUndo = session.getState();
      if (state.dirty) {
        count++;
      }
    }
    return count;
  }

  /**
   * Dispose all sessions with optional save prompt (Feature: 029 - T058).
   *
   * Shows a prompt if any session has unsaved changes.
   *
   * @param promptOnDirty - Whether to show save prompt for dirty sessions
   * @returns True if disposed, false if user cancelled
   */
  async disposeAllSessionsWithPrompt(promptOnDirty: boolean = true): Promise<boolean> {
    // Check for dirty sessions
    if (promptOnDirty && this.hasDirtySessions()) {
      const dirtyCount = this.getDirtySessionCount();
      const message = dirtyCount === 1
        ? 'You have unsaved session changes. Do you want to save before closing?'
        : `You have ${dirtyCount} sessions with unsaved changes. Do you want to save before closing?`;

      const result = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        'Save All',
        'Discard',
        'Cancel'
      );

      if (result === 'Cancel' || result === undefined) {
        return false; // User cancelled
      }

      if (result === 'Save All') {
        // Save all dirty sessions
        await vscode.commands.executeCommand('debrief.saveSession');
      }
      // 'Discard' falls through to dispose
    }

    // Dispose all sessions
    this.disposeAllSessions();
    return true;
  }

  /**
   * Dispose all sessions.
   *
   * Called when the map panel is closed, since sessions are meaningless
   * without a panel to display them.
   */
  disposeAllSessions(): void {
    this.sessions.clear();
    if (this.activeDocumentUri !== null) {
      this.activeDocumentUri = null;
      this._onActiveSessionChange.fire(null);
    }
  }

  // ============================================================================
  // MCP Server Management (Feature: 029 - Phase 5)
  // ============================================================================

  /**
   * Set the MCP server port.
   *
   * @param port - The port number for the MCP server
   */
  setMcpPort(port: number): void {
    this.mcpPort = port;
    // If server is running, restart with new port
    if (this.mcpServer) {
      const activeSession = this.getActiveSession();
      if (activeSession) {
        this.restartMcpServer(activeSession);
      }
    }
  }

  /**
   * Get the MCP server port.
   *
   * @returns The configured MCP port
   */
  getMcpPort(): number {
    return this.mcpPort;
  }

  /**
   * Start the MCP server for the given session.
   *
   * The server provides HTTP endpoints for Python tools to read/write
   * session state via the MCP protocol.
   *
   * @param session - The session store to expose via MCP
   */
  startMcpServer(session: SessionStoreApi): void {
    // Stop existing server if running
    this.stopMcpServer();

    try {
      const options: ServerOptions = {
        port: this.mcpPort,
        host: '127.0.0.1', // Localhost only for security
      };

      this.mcpServer = startServer(session, options);
      console.warn(`[SessionManager] MCP server started on port ${this.mcpPort}`);
    } catch (error) {
      console.error('[SessionManager] Failed to start MCP server:', error);
      // Don't throw - MCP is optional functionality
    }
  }

  /**
   * Stop the MCP server.
   */
  stopMcpServer(): void {
    if (this.mcpServer) {
      try {
        this.mcpServer.close();
        console.warn('[SessionManager] MCP server stopped');
      } catch (error) {
        console.error('[SessionManager] Error stopping MCP server:', error);
      }
      this.mcpServer = null;
    }
  }

  /**
   * Restart the MCP server with a new session store.
   *
   * Called when the active session changes to ensure Python tools
   * access the correct session state.
   *
   * @param session - The new session store
   */
  restartMcpServer(session: SessionStoreApi): void {
    this.stopMcpServer();
    this.startMcpServer(session);
  }

  /**
   * Check if the MCP server is running.
   *
   * @returns True if the server is running
   */
  isMcpServerRunning(): boolean {
    return this.mcpServer !== null;
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    // Stop MCP server
    this.stopMcpServer();

    // Clear all sessions
    this.sessions.clear();
    this.activeDocumentUri = null;

    // Dispose event emitter
    this._onActiveSessionChange.dispose();

    // Dispose subscriptions
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
