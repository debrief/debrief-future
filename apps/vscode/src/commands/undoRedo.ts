/**
 * Undo/Redo Commands - Session state undo/redo for Debrief
 *
 * Feature: 029-session-state-vscode (Phase 6)
 *
 * These commands restore previous view state (viewport, selection, time).
 * They only apply when a Debrief plot is open and focused.
 */

import * as vscode from 'vscode';
import type { SessionStoreWithUndo } from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';

/**
 * Create the undo command handler.
 *
 * Reverts the current session state to the previous state in history.
 * Only available when a plot is open and has undo history.
 *
 * @param sessionManager - The session manager service
 * @returns The command handler function
 */
export function createUndoCommand(
  sessionManager: SessionManager
): () => void {
  return () => {
    const session = sessionManager.getActiveSession();
    if (!session) {
      return;
    }

    const state: SessionStoreWithUndo = session.getState();
    if (state.canUndo()) {
      state.undo();
    }
  };
}

/**
 * Create the redo command handler.
 *
 * Restores the next state in the redo history.
 * Only available when a plot is open and has redo history.
 *
 * @param sessionManager - The session manager service
 * @returns The command handler function
 */
export function createRedoCommand(
  sessionManager: SessionManager
): () => void {
  return () => {
    const session = sessionManager.getActiveSession();
    if (!session) {
      return;
    }

    const state: SessionStoreWithUndo = session.getState();
    if (state.canRedo()) {
      state.redo();
      // Optionally show status bar message
      // vscode.window.setStatusBarMessage('Redo', 2000);
    }
  };
}

/**
 * Register undo/redo commands with VS Code.
 *
 * @param _context - Extension context (unused, kept for API consistency)
 * @param sessionManager - The session manager service
 * @returns Array of disposables for cleanup
 */
export function registerUndoRedoCommands(
  _context: vscode.ExtensionContext,
  sessionManager: SessionManager
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.undo',
      createUndoCommand(sessionManager)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.redo',
      createRedoCommand(sessionManager)
    )
  );

  return disposables;
}
