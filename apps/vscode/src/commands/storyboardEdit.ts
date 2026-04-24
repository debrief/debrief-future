/**
 * Storyboard edit command handlers (Feature 218).
 *
 * Registers 10 new commands + 1 replacement (editScene) that back
 * the Scene-row overflow menu actions. Every handler delegates to
 * `StoryboardEditService` and surfaces user prompts (input box,
 * quick pick, modal) + error toasts at the VS Code boundary.
 *
 * Phase 1: skeleton with no-op handlers. Real implementations land
 * alongside the service methods in Phase 3 (T033, T040, T045, T049,
 * T053) and Phase 4 (T075, T079).
 *
 * Contract: specs/218-storyboarding-edit/contracts/vscode-commands.md
 */

import * as vscode from 'vscode';
import type { StoryboardEditService } from '../services/storyboardEdit';

/**
 * Narrow SessionManager surface — enough for the command handlers
 * to resolve `documentUri` without pulling in the full constructor
 * graph. Mirrors the pattern from `storyboardTransport.ts`.
 */
export interface EditSessionManager {
  getActiveDocumentUri(): string | null;
}

type CommandFn = (...args: readonly unknown[]) => Promise<void> | void;

interface HandlerDeps {
  readonly service: StoryboardEditService;
  readonly sessionManager: EditSessionManager;
}

// ── Handlers (Phase 1 stubs — no-op until Phase 3/4) ─────────────────

export const renameSceneHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T033 — prompt via showInputBox, delegate to service.renameScene.
  };

export const describeSceneHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T033 — open edit form via postMessage, delegate to service.describeScene.
  };

export const deleteSceneHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T033 — delegate to service.deleteScene, toast undo.
  };

export const updateToCurrentHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T040 — read map view, delegate, pattern-match result.
  };

export const duplicateSceneHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T045 — prompt for new timestamp, delegate, collision modal.
  };

export const copyToOtherHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T049 — quick-pick sibling storyboard, delegate, collision modal.
  };

export const refreshThumbnailHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 4 T075 — delegate to service.refreshSceneThumbnail.
  };

export const refreshAllStaleHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 4 T079 — delegate to service.refreshAllStaleThumbnails.
  };

export const renameStoryboardHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T053 — showInputBox with uniqueness re-prompt loop.
  };

export const describeStoryboardHandler = (_deps: HandlerDeps): CommandFn =>
  async (_args): Promise<void> => {
    // Phase 3 T053 — open description editor in panel header via postMessage.
  };

export const editSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const documentUri = deps.sessionManager.getActiveDocumentUri();
    if (documentUri === null) {
      return;
    }
    const sceneId = extractSceneId(args);
    if (sceneId === null) {
      return;
    }
    await deps.service.openSceneForMissingDataEdit({ documentUri, sceneId });
  };

function extractSceneId(args: readonly unknown[]): string | null {
  // The hard-block modal (#217) passes either a bare sceneId string or an
  // object `{ sceneId }` (matching storyboardEditStub's historical shape).
  const arg = args[0];
  if (typeof arg === 'string') {
    return arg;
  }
  if (typeof arg === 'object' && arg !== null && 'sceneId' in arg) {
    const s = (arg as { sceneId?: unknown }).sceneId;
    if (typeof s === 'string') {
      return s;
    }
  }
  return null;
}

// ── Registration ────────────────────────────────────────────────────

interface CommandSpec {
  readonly id: string;
  readonly factory: (deps: HandlerDeps) => CommandFn;
}

const COMMAND_SPECS: readonly CommandSpec[] = [
  { id: 'debrief.storyboard.renameScene', factory: renameSceneHandler },
  { id: 'debrief.storyboard.describeScene', factory: describeSceneHandler },
  { id: 'debrief.storyboard.deleteScene', factory: deleteSceneHandler },
  { id: 'debrief.storyboard.updateSceneToCurrent', factory: updateToCurrentHandler },
  { id: 'debrief.storyboard.duplicateScene', factory: duplicateSceneHandler },
  { id: 'debrief.storyboard.copySceneToOtherStoryboard', factory: copyToOtherHandler },
  { id: 'debrief.storyboard.refreshSceneThumbnail', factory: refreshThumbnailHandler },
  { id: 'debrief.storyboard.refreshAllStaleThumbnails', factory: refreshAllStaleHandler },
  { id: 'debrief.storyboard.renameStoryboard', factory: renameStoryboardHandler },
  { id: 'debrief.storyboard.describeStoryboard', factory: describeStoryboardHandler },
  { id: 'debrief.storyboard.editScene', factory: editSceneHandler },
];

export function registerStoryboardEditCommands(
  context: vscode.ExtensionContext,
  deps: HandlerDeps,
): vscode.Disposable {
  const disposables = COMMAND_SPECS.map(({ id, factory }) =>
    vscode.commands.registerCommand(id, factory(deps)),
  );

  const composite: vscode.Disposable = {
    dispose(): void {
      for (const d of disposables) {d.dispose();}
    },
  };
  context.subscriptions.push(composite);
  return composite;
}
