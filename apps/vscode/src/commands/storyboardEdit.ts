/**
 * Storyboard edit command handlers (Feature 218).
 *
 * Backs the 11 commands contributed by apps/vscode/package.json. The
 * webview panel dispatches most edit ops directly to
 * StoryboardEditService (since the message payload carries all the
 * inputs — new title, description, etc.). These command handlers are
 * used for:
 *   1. Palette-invoked ops that take args (via the dispatcher's
 *      vscode.commands.executeCommand('...', { sceneId }) route).
 *   2. Palette-invoked ops without args (show a toast asking the
 *      analyst to select a scene first).
 *   3. Ops that need native prompts the webview can't carry in its
 *      postMessage (showInputBox for timestamp, showQuickPick for
 *      destination storyboard).
 *
 * Contract: specs/218-storyboarding-edit/contracts/vscode-commands.md
 */

import * as vscode from 'vscode';
import type { StoryboardEditService } from '../services/storyboardEdit';
import { storyboardEdit as messages } from '../messages/storyboardEdit';

const ACTOR = 'vscode-user';

export interface EditSessionManager {
  getActiveDocumentUri(): string | null;
}

/**
 * Live map-state snapshot for `updateSceneToCurrent`. Returned by the
 * `readCurrentMapView` port, built from `mapPanel` viewport + session
 * store state at the moment the user clicks.
 *
 * `viewport.center` is a mutable `number[]` — matches the shape
 * `Viewport` declares in `@debrief/schemas`; the service forwards it
 * straight to #215's `updateScene` without re-typing.
 */
export interface CurrentMapView {
  readonly viewport: {
    readonly center: number[];
    readonly zoom: number;
    readonly bearing: number;
  };
  readonly timestamp: string;
  readonly visibleFeatureIds: readonly string[];
}

/** Sibling storyboard for the copy-to-other quick-pick. */
export interface SiblingStoryboard {
  readonly id: string;
  readonly name: string;
  readonly sceneCount: number;
}

type CommandFn = (...args: readonly unknown[]) => Promise<void> | void;

export interface HandlerDeps {
  readonly service: StoryboardEditService;
  readonly sessionManager: EditSessionManager;
  /** Optional: read the live map view for `updateSceneToCurrent`. Null
   *  return means the map hasn't reported state yet (viewport unset /
   *  time slider uninitialised). */
  readonly readCurrentMapView?: () => CurrentMapView | null;
  /** Optional: list sibling storyboards (excluding the source) for the
   *  copy-to-other quick-pick. */
  readonly listSiblingStoryboards?: (
    documentUri: string,
    sourceStoryboardId: string,
  ) => readonly SiblingStoryboard[];
  /** Optional: resolve a Scene's source storyboard id (used by
   *  copy-to-other to exclude the source from the quick-pick). */
  readonly resolveSceneStoryboard?: (
    documentUri: string,
    sceneId: string,
  ) => string | null;
}

// ── Arg extraction helpers ───────────────────────────────────────────

function extractSceneId(args: readonly unknown[]): string | null {
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

function extractStoryboardId(args: readonly unknown[]): string | null {
  const arg = args[0];
  if (typeof arg === 'string') {
    return arg;
  }
  if (typeof arg === 'object' && arg !== null && 'storyboardId' in arg) {
    const s = (arg as { storyboardId?: unknown }).storyboardId;
    if (typeof s === 'string') {
      return s;
    }
  }
  return null;
}

async function withUriAndScene(
  deps: HandlerDeps,
  args: readonly unknown[],
): Promise<{ documentUri: string; sceneId: string } | null> {
  const documentUri = deps.sessionManager.getActiveDocumentUri();
  if (documentUri === null) {
    return null;
  }
  const sceneId = extractSceneId(args);
  if (sceneId === null) {
    await vscode.window.showInformationMessage(
      'Select a scene in the Storyboard panel first.',
    );
    return null;
  }
  return { documentUri, sceneId };
}

async function withUriAndStoryboard(
  deps: HandlerDeps,
  args: readonly unknown[],
): Promise<{ documentUri: string; storyboardId: string } | null> {
  const documentUri = deps.sessionManager.getActiveDocumentUri();
  if (documentUri === null) {
    return null;
  }
  const storyboardId = extractStoryboardId(args);
  if (storyboardId === null) {
    await vscode.window.showInformationMessage(
      'Select a storyboard in the panel first.',
    );
    return null;
  }
  return { documentUri, storyboardId };
}

// ── Handlers ─────────────────────────────────────────────────────────

export const renameSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    // Palette fallback — prompt for the new title via showInputBox.
    const newTitle = await vscode.window.showInputBox({
      prompt: 'Rename scene',
      value: '',
    });
    if (newTitle === undefined) {
      return;
    }
    try {
      await deps.service.renameScene({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        newTitle,
        actor: ACTOR,
      });
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const describeSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    // Description editing happens in the panel's edit form — the
    // palette path just opens the form.
    await deps.service.openSceneForMissingDataEdit({
      documentUri: ctx.documentUri,
      sceneId: ctx.sceneId,
    });
  };

export const deleteSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    try {
      const result = await deps.service.deleteScene({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        actor: ACTOR,
      });
      if (result.kind === 'unknown-scene') {
        void vscode.window.showErrorMessage(
          `Scene ${ctx.sceneId} not found.`,
        );
      }
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const undoDeleteSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    try {
      const result = await deps.service.undoDeleteScene({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        actor: ACTOR,
      });
      if (result.kind === 'unrecoverable-scene') {
        if (result.reason === 'storyboard-gone') {
          void vscode.window.showErrorMessage(messages.undoStoryboardGone());
        } else {
          void vscode.window.showErrorMessage(messages.undoBufferEvicted());
        }
      }
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const updateToCurrentHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    if (!deps.readCurrentMapView) {
      void vscode.window.showErrorMessage(
        'Update failed — map-state port not wired. Reopen the plot.',
      );
      return;
    }
    const view = deps.readCurrentMapView();
    if (view === null) {
      void vscode.window.showErrorMessage(
        'Update failed — map has not reported a viewport or time yet. Pan / zoom, set the time slider, and retry.',
      );
      return;
    }
    try {
      const result = await deps.service.updateSceneToCurrent({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        currentView: view,
        actor: ACTOR,
      });
      if (result.kind === 'thumbnail-failed') {
        void vscode.window.showErrorMessage(
          messages.updateToCurrentThumbnailFailed(),
        );
      }
      // #259 — duplicate-timestamp-collision result is no longer produced.
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const duplicateSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    // Default offset = now + 1s. A follow-up will read the source
    // scene's timestamp and suggest source + 1s instead.
    const defaultTs = new Date(Date.now() + 1000).toISOString();
    const input = await vscode.window.showInputBox({
      prompt: 'Timestamp for duplicate (ISO-8601)',
      value: defaultTs,
      validateInput: isoValidator,
    });
    if (input === undefined) {
      return;
    }
    try {
      await deps.service.duplicateScene({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        newTimestamp: input,
        actor: ACTOR,
      });
      // #259 — duplicate-timestamp-collision result is no longer produced.
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const copyToOtherHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    if (!deps.listSiblingStoryboards || !deps.resolveSceneStoryboard) {
      void vscode.window.showErrorMessage(
        'Copy failed — sibling-storyboards port not wired.',
      );
      return;
    }
    const sourceStoryboardId = deps.resolveSceneStoryboard(
      ctx.documentUri,
      ctx.sceneId,
    );
    if (sourceStoryboardId === null) {
      void vscode.window.showErrorMessage(
        `Scene ${ctx.sceneId} not found.`,
      );
      return;
    }
    const siblings = deps.listSiblingStoryboards(
      ctx.documentUri,
      sourceStoryboardId,
    );
    if (siblings.length === 0) {
      void vscode.window.showInformationMessage(
        'No other storyboards on this plot — create one first.',
      );
      return;
    }
    const pick = await vscode.window.showQuickPick(
      siblings.map((sb) => ({
        label: sb.name,
        description: `${sb.sceneCount} scene${sb.sceneCount === 1 ? '' : 's'}`,
        id: sb.id,
      })),
      { placeHolder: 'Destination storyboard' },
    );
    if (!pick) {
      return;
    }
    // Default to "now" + 1s — the destination may have a colliding
    // timestamp; we handle that reactively.
    const tsInput = await vscode.window.showInputBox({
      prompt: 'Timestamp on destination storyboard (ISO-8601)',
      value: new Date(Date.now() + 1000).toISOString(),
      validateInput: isoValidator,
    });
    if (tsInput === undefined) {
      return;
    }
    try {
      const result = await deps.service.copySceneToOtherStoryboard({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        destinationStoryboardId: pick.id,
        newTimestamp: tsInput,
        actor: ACTOR,
      });
      if (result.kind === 'deep-copy-failed') {
        void vscode.window.showErrorMessage(messages.deepCopyFailed());
      }
      // #259 — duplicate-timestamp-collision result is no longer produced.
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const refreshThumbnailHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    try {
      const result = await deps.service.refreshSceneThumbnail({
        documentUri: ctx.documentUri,
        sceneId: ctx.sceneId,
        actor: ACTOR,
      });
      if (result.kind === 'thumbnail-failed') {
        void vscode.window.showErrorMessage(messages.refreshThumbnailFailed());
      }
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const refreshAllStaleHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndStoryboard(deps, args);
    if (!ctx) {
      return;
    }
    try {
      const result = await deps.service.refreshAllStaleThumbnails({
        documentUri: ctx.documentUri,
        storyboardId: ctx.storyboardId,
        actor: ACTOR,
      });
      if (result.succeeded.length === 0 && result.failed.length === 0) {
        void vscode.window.showInformationMessage(messages.refreshAllStaleNone());
      } else if (result.failed.length === 0) {
        void vscode.window.showInformationMessage(
          messages.refreshAllStaleSuccess(result.succeeded.length),
        );
      } else {
        void vscode.window.showWarningMessage(
          messages.refreshAllStalePartial(
            result.succeeded.length,
            result.failed.length,
          ),
        );
      }
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const renameStoryboardHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndStoryboard(deps, args);
    if (!ctx) {
      return;
    }
    const newName = await vscode.window.showInputBox({
      prompt: 'Rename storyboard',
      validateInput: (v): string | null =>
        v.trim() === '' ? 'Name cannot be empty' : null,
    });
    if (newName === undefined) {
      return;
    }
    try {
      const result = await deps.service.renameStoryboard({
        documentUri: ctx.documentUri,
        storyboardId: ctx.storyboardId,
        newName,
        actor: ACTOR,
      });
      if (result.kind === 'name-conflict') {
        void vscode.window.showErrorMessage(
          messages.storyboardNameConflict(newName),
        );
      }
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const describeStoryboardHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndStoryboard(deps, args);
    if (!ctx) {
      return;
    }
    const description = await vscode.window.showInputBox({
      prompt: 'Edit storyboard description (markdown)',
    });
    if (description === undefined) {
      return;
    }
    try {
      await deps.service.describeStoryboard({
        documentUri: ctx.documentUri,
        storyboardId: ctx.storyboardId,
        description: description === '' ? null : description,
        actor: ACTOR,
      });
    } catch (err) {
      void vscode.window.showErrorMessage(messages.unexpectedError(err));
    }
  };

export const editSceneHandler = (deps: HandlerDeps): CommandFn =>
  async (...args): Promise<void> => {
    const ctx = await withUriAndScene(deps, args);
    if (!ctx) {
      return;
    }
    await deps.service.openSceneForMissingDataEdit({
      documentUri: ctx.documentUri,
      sceneId: ctx.sceneId,
    });
  };

// ── Shared prompts ──────────────────────────────────────────────────

function isoValidator(value: string): string | null {
  return Number.isNaN(Date.parse(value))
    ? 'Timestamp must be ISO-8601 (e.g. 2026-04-20T10:00:00Z)'
    : null;
}

// #259 — handleTimestampCollision was used by the duplicate-timestamp
// conflict dialog; deleted along with the rest of that flow.

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
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
  context.subscriptions.push(composite);
  return composite;
}
