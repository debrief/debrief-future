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
import {
  createSessionStore,
  type SessionStoreApi,
  createTimeInstantFromISO,
  type TimeRange,
} from '@debrief/session-state';
import type { Plot, Track, ReferenceLocation } from '../types/plot';

/**
 * Data needed to initialize a session with defaults derived from plot data.
 */
export interface PlotSessionData {
  /** Plot metadata */
  plot: Plot;
  /** Track data for time range calculation */
  tracks: Track[];
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
    const state = store.getState();

    // Set feature collection URI
    state.setFeatureCollectionUri(data.featureCollectionUri);

    // Derive time range from plot extent
    if (data.plot.timeExtent && data.plot.timeExtent.length === 2) {
      const [startIso, endIso] = data.plot.timeExtent;
      const timeRange: TimeRange = {
        start: createTimeInstantFromISO(startIso),
        end: createTimeInstantFromISO(endIso),
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
   * Dispose all resources.
   */
  dispose(): void {
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
