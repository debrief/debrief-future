/**
 * US2 Storyboard management command handlers (Feature 217, Phase 4.4).
 *
 * Registers:
 *   - `debrief.storyboard.create` — prompts for name, calls service.createStoryboard
 *   - `debrief.storyboard.rename` — prompts pre-populated with current name,
 *     calls service.renameStoryboard on change
 *   - `debrief.storyboard.delete` — confirms via modal (with Scene count),
 *     calls service.deleteStoryboard on confirmation
 *
 * All three handlers look up `sessionManager.getActiveDocumentUri()` and
 * skip silently when null. Name validation lives in the pure
 * `validateStoryboardName` helper — exported so the panel can call it
 * for client-side feedback in future iterations.
 */

import * as vscode from 'vscode';
import type { StoryboardOptionViewModel } from '@debrief/components';

export interface ManagementSessionManager {
  getActiveDocumentUri(): string | null;
}

export interface ManagementSnapshot {
  readonly storyboards: readonly StoryboardOptionViewModel[];
  readonly activeStoryboardId: string | null;
  readonly scenes: readonly { readonly sceneId: string }[];
}

export interface ManagementPlaybackService {
  getSnapshot(documentUri: string): ManagementSnapshot;
  createStoryboard(
    documentUri: string,
    name: string,
    description?: string,
  ): Promise<void>;
  renameStoryboard(
    documentUri: string,
    storyboardId: string,
    newName: string,
  ): Promise<void>;
  deleteStoryboard(documentUri: string, storyboardId: string): Promise<void>;
}

const MAX_NAME_LENGTH = 120;

/**
 * Validate a candidate Storyboard name. Pure — no VS Code imports.
 *
 * @param candidate raw input from the user (whitespace allowed — trimmed here)
 * @param existing the current Storyboards on the plot
 * @param ignoreId optional — when renaming, the Storyboard being renamed;
 *   its own name does NOT count as a collision.
 * @returns `null` for valid, else a human-readable error string
 */
export function validateStoryboardName(
  candidate: string,
  existing: readonly StoryboardOptionViewModel[],
  ignoreId?: string,
): string | null {
  const trimmed = candidate.trim();
  if (trimmed === '') {return 'Name cannot be empty';}
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name is too long (max ${MAX_NAME_LENGTH} characters)`;
  }
  const collision = existing.find(
    (sb) => sb.storyboardId !== ignoreId && sb.name === trimmed,
  );
  if (collision) {return 'A Storyboard with this name already exists';}
  return null;
}

export function registerStoryboardManagementCommands(
  context: vscode.ExtensionContext,
  service: ManagementPlaybackService,
  sessionManager: ManagementSessionManager,
): vscode.Disposable {
  const disposables: vscode.Disposable[] = [
    // "Storyboard: Show Panel" — the Storyboard now renders as a section
    // inside the Activity panel (UX-review flatten), so revealing it means
    // focusing the Activity view. (Previously this command id was declared
    // in package.json but never registered.)
    vscode.commands.registerCommand('debrief.storyboard.openPanel', () => {
      void vscode.commands.executeCommand('debrief.activityPanel.focus');
    }),
    vscode.commands.registerCommand('debrief.storyboard.create', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) {return;}
      const snapshot = service.getSnapshot(documentUri);
      const name = await vscode.window.showInputBox({
        prompt: 'Name for the new Storyboard',
        placeHolder: 'e.g. Commander\'s view',
        validateInput: (value): string | null =>
          validateStoryboardName(value, snapshot.storyboards, undefined),
      });
      if (typeof name !== 'string') {return;}
      const trimmed = name.trim();
      if (trimmed === '') {return;}
      await service.createStoryboard(documentUri, trimmed);
    }),

    vscode.commands.registerCommand('debrief.storyboard.rename', async () => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) {return;}
      const snapshot = service.getSnapshot(documentUri);
      const activeId = snapshot.activeStoryboardId;
      if (activeId === null) {return;}
      const current = snapshot.storyboards.find(
        (sb) => sb.storyboardId === activeId,
      );
      if (!current) {return;}
      const newName = await vscode.window.showInputBox({
        prompt: 'Rename Storyboard',
        value: current.name,
        validateInput: (value): string | null =>
          validateStoryboardName(value, snapshot.storyboards, activeId),
      });
      if (typeof newName !== 'string') {return;}
      const trimmed = newName.trim();
      if (trimmed === '' || trimmed === current.name) {return;}
      await service.renameStoryboard(documentUri, activeId, trimmed);
    }),

    vscode.commands.registerCommand('debrief.storyboard.delete', async (arg?: { skipConfirm?: boolean }) => {
      const documentUri = sessionManager.getActiveDocumentUri();
      if (!documentUri) {return;}
      const snapshot = service.getSnapshot(documentUri);
      const activeId = snapshot.activeStoryboardId;
      if (activeId === null) {return;}
      const active = snapshot.storyboards.find(
        (sb) => sb.storyboardId === activeId,
      );
      if (!active) {return;}
      const sceneCount = snapshot.scenes.length;

      // The Storyboard panel header confirms inline before sending the
      // request, so it passes `skipConfirm` to avoid a redundant modal.
      // Command-palette invocation (no arg) still confirms via modal.
      if (sceneCount > 0 && arg?.skipConfirm !== true) {
        const pluralise = sceneCount === 1 ? 'Scene' : 'Scenes';
        const message = `Delete Storyboard "${active.name}" and its ${sceneCount} ${pluralise}?`;
        const choice = await vscode.window.showWarningMessage(
          message,
          { modal: true },
          'Delete',
        );
        if (choice !== 'Delete') {return;}
      }

      await service.deleteStoryboard(documentUri, activeId);
    }),
  ];

  const composite = {
    dispose(): void {
      for (const d of disposables) {d.dispose();}
    },
  };
  context.subscriptions.push(composite);
  return composite;
}
