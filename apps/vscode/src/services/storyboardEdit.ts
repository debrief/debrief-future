/**
 * Storyboard edit orchestration service (Feature 218).
 *
 * Owns every write path from the edit suite into Storyboard / Scene
 * Features; every method delegates to #215's CRUD module for the
 * actual mutation. This service orchestrates surrounding concerns:
 * undo buffer, thumbnail capture, stale detection, LogService
 * emission, user prompts on conflicts.
 *
 * Phase 1: skeleton only — methods throw until real implementations
 * land in Phase 2 (primitives) and Phase 3 (edit ops).
 *
 * Contract: specs/218-storyboarding-edit/contracts/edit-service.md
 */

import * as vscode from 'vscode';

const notImplemented = <T>(method: string, phase: string): Promise<T> =>
  Promise.reject(
    new Error(`StoryboardEditService.${method}: not implemented (${phase})`),
  );

// ── View-model + transient-state types (data-model.md §1, §2, §5) ────

/**
 * Undo buffer record (data-model.md §1). The Scene Feature stored
 * here is byte-identical to its pre-delete state; the `{op:'delete'}`
 * provenance entry is already appended by #215 before removal
 * (crud.ts:686-688), so `deleteActivityIdOf(d)` reads it without
 * duplication.
 */
export interface DeletedScene {
  readonly original: SceneFeatureLike;
  readonly storyboardId: string;
  readonly deletedAt: string;
}

/** Derived accessor — the delete activity_id lives in the last entry
 *  of original.properties.provenance[] (review 7A — no stored field). */
export const deleteActivityIdOf = (d: DeletedScene): string => {
  const provenance = d.original.properties.provenance;
  const last = provenance[provenance.length - 1];
  if (!last) {
    throw new Error(
      `DeletedScene ${d.original.properties.id} has empty provenance — invariant violation`,
    );
  }
  return last.was_generated_by.activity_id;
};

/** Stale-thumbnail detection result (data-model.md §2). */
export interface StaleFlag {
  readonly sceneId: string;
  readonly stale: boolean;
  readonly unresolvedFeatureIds: readonly string[];
  readonly computedAt: string;
}

export type StaleFlagCache = ReadonlyMap<string /* sceneId */, StaleFlag>;

// ── Structural type placeholders ────────────────────────────────────
//
// These minimal shapes let the skeleton compile without a hard
// dependency on #215's generated types. Phase 2 replaces them with
// imports from `@debrief/components/storyboard` + `@debrief/schemas`.

interface LogEntryLike {
  readonly was_generated_by: { readonly activity_id: string };
}

interface SceneFeatureLike {
  readonly properties: {
    readonly id: string;
    readonly provenance: readonly LogEntryLike[];
  };
}

interface StoryboardFeatureLike {
  readonly properties: { readonly id: string };
}

interface PlotLike {
  readonly features: readonly unknown[];
}

interface ViewportLike {
  readonly kind: string;
}

// ── Input types (edit-service.md) ────────────────────────────────────
//
// Type names are prefixed with `Edit` where a same-named type already
// lives in `@debrief/components/storyboard` (the CRUD module's input
// shape). The drift-guard lint rule forbids redeclaring the CRUD names
// outside that module. Service inputs carry an extra `documentUri`
// that CRUD inputs don't — they're not identical to the CRUD shapes.

export interface EditRenameSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly newTitle: string;
  readonly actor: string;
}

export interface EditDescribeSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly description: string | null;
  readonly actor: string;
}

export interface EditDeleteSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly actor: string;
}

export interface EditUndoDeleteInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly actor: string;
}

export interface EditUpdateToCurrentInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly currentView: {
    readonly viewport: ViewportLike;
    readonly timestamp: string;
    readonly visibleFeatureIds: readonly string[];
  };
  readonly actor: string;
}

export interface EditDuplicateSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly newTimestamp: string;
  readonly actor: string;
}

export interface EditCopySceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly destinationStoryboardId: string;
  readonly newTimestamp: string;
  readonly actor: string;
}

export interface EditRefreshThumbnailInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly actor: string;
}

export interface EditRefreshAllStaleInput {
  readonly documentUri: string;
  readonly storyboardId: string;
  readonly actor: string;
}

export interface EditRenameStoryboardInput {
  readonly documentUri: string;
  readonly storyboardId: string;
  readonly newName: string;
  readonly actor: string;
}

export interface EditDescribeStoryboardInput {
  readonly documentUri: string;
  readonly storyboardId: string;
  readonly description: string | null;
  readonly actor: string;
}

// ── Result types (edit-service.md) ───────────────────────────────────

export interface SceneEditOutcome {
  readonly kind: 'ok';
  readonly scene: SceneFeatureLike;
  readonly logEntryActivityId: string | null;
}

export interface StoryboardEditOutcome {
  readonly kind: 'ok';
  readonly storyboard: StoryboardFeatureLike;
  readonly logEntryActivityId: string | null;
}

export type DeleteSceneOutcome =
  | { readonly kind: 'ok'; readonly deleted: DeletedScene; readonly logEntryActivityId: string | null }
  | { readonly kind: 'unknown-scene'; readonly sceneId: string };

export type UndoDeleteOutcome =
  | { readonly kind: 'ok'; readonly scene: SceneFeatureLike; readonly logEntryActivityId: string | null }
  | { readonly kind: 'unrecoverable-scene'; readonly reason: 'storyboard-gone' | 'buffer-evicted' };

export type UpdateToCurrentResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeatureLike; readonly logEntryActivityId: string | null }
  | { readonly kind: 'thumbnail-failed'; readonly error: Error }
  | {
      readonly kind: 'duplicate-timestamp-collision';
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    };

export type DuplicateSceneResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeatureLike; readonly logEntryActivityId: string | null }
  | {
      readonly kind: 'duplicate-timestamp-collision';
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    };

export type CopySceneResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeatureLike; readonly logEntryActivityId: string | null }
  | {
      readonly kind: 'duplicate-timestamp-collision';
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    }
  | { readonly kind: 'deep-copy-failed'; readonly error: Error };

export type RefreshThumbnailResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeatureLike; readonly logEntryActivityId: string | null }
  | { readonly kind: 'thumbnail-failed'; readonly error: Error };

export interface RefreshAllStaleResult {
  readonly succeeded: readonly string[];
  readonly failed: readonly { readonly sceneId: string; readonly error: Error }[];
}

// ── Narrow port interfaces (filled in during Phase 3 wiring) ─────────

/**
 * Minimal LogService surface the edit service uses. Defined locally
 * as a structural shape until T021-T023 wire in the real interface
 * from `@debrief/session-state`.
 */
export interface LogServiceLike {
  readonly recordStoryboardEdit: (
    input: unknown,
  ) => Promise<{ readonly activity_id: string }>;
}

// ── Service ──────────────────────────────────────────────────────────

export interface StoryboardEditServiceOptions {
  // Ports filled in during Phase 3 wiring.
  readonly reserved?: never;
}

export class StoryboardEditService implements vscode.Disposable {
  private logService: LogServiceLike | null = null;
  private disposed = false;
  private readonly _onDidChangeStaleFlags =
    new vscode.EventEmitter<{ readonly documentUri: string; readonly sceneIds: readonly string[] }>();
  public readonly onDidChangeStaleFlags = this._onDidChangeStaleFlags.event;
  private readonly _onDidChangeUndoQueue =
    new vscode.EventEmitter<{ readonly documentUri: string }>();
  public readonly onDidChangeUndoQueue = this._onDidChangeUndoQueue.event;

  constructor(_options: StoryboardEditServiceOptions = {}) {
    // Ports will be wired in Phase 3 — the service is instantiable
    // today so the extension can register it early.
  }

  /** Returns a composite Disposable so extension.ts can push into
   *  context.subscriptions. */
  activate(): vscode.Disposable {
    return {
      dispose: (): void => this.dispose(),
    };
  }

  setLogService(logService: LogServiceLike | null): void {
    this.logService = logService;
  }

  /** Read accessor — primarily for tests to verify binding. */
  getLogService(): LogServiceLike | null {
    return this.logService;
  }

  // ── Lifecycle (filled in during Phase 4 / Phase 5) ─────────────────

  onPlotOpened(_documentUri: string, _initialPlot: PlotLike): Promise<void> {
    // Phase 4 T069 — stale-detection pass.
    return Promise.resolve();
  }

  onPlotClosed(_documentUri: string, _finalPlot: PlotLike): Promise<void> {
    // Phase 5 T088 — invokes sceneThumbnailService.gcOrphanAssets.
    return Promise.resolve();
  }

  // ── Scene edit ops (Phase 3) ───────────────────────────────────────

  renameScene(_input: EditRenameSceneInput): Promise<SceneEditOutcome> {
    return notImplemented('renameScene', 'Phase 3 T029');
  }

  describeScene(_input: EditDescribeSceneInput): Promise<SceneEditOutcome> {
    return notImplemented('describeScene', 'Phase 3 T030');
  }

  deleteScene(_input: EditDeleteSceneInput): Promise<DeleteSceneOutcome> {
    return notImplemented('deleteScene', 'Phase 3 T031');
  }

  undoDeleteScene(_input: EditUndoDeleteInput): Promise<UndoDeleteOutcome> {
    return notImplemented('undoDeleteScene', 'Phase 3 T032');
  }

  updateSceneToCurrent(_input: EditUpdateToCurrentInput): Promise<UpdateToCurrentResult> {
    return notImplemented('updateSceneToCurrent', 'Phase 3 T039');
  }

  duplicateScene(_input: EditDuplicateSceneInput): Promise<DuplicateSceneResult> {
    return notImplemented('duplicateScene', 'Phase 3 T044');
  }

  copySceneToOtherStoryboard(_input: EditCopySceneInput): Promise<CopySceneResult> {
    return notImplemented('copySceneToOtherStoryboard', 'Phase 3 T047');
  }

  refreshSceneThumbnail(_input: EditRefreshThumbnailInput): Promise<RefreshThumbnailResult> {
    return notImplemented('refreshSceneThumbnail', 'Phase 4 T074');
  }

  refreshAllStaleThumbnails(_input: EditRefreshAllStaleInput): Promise<RefreshAllStaleResult> {
    return notImplemented('refreshAllStaleThumbnails', 'Phase 4 T078');
  }

  // ── Storyboard edit ops (Phase 3) ──────────────────────────────────

  renameStoryboard(_input: EditRenameStoryboardInput): Promise<StoryboardEditOutcome> {
    return notImplemented('renameStoryboard', 'Phase 3 T052');
  }

  describeStoryboard(_input: EditDescribeStoryboardInput): Promise<StoryboardEditOutcome> {
    return notImplemented('describeStoryboard', 'Phase 3 T052');
  }

  // ── Missing-data routing (Phase 3 T055-T056) ───────────────────────

  openSceneForMissingDataEdit(_input: {
    readonly documentUri: string;
    readonly sceneId: string;
  }): Promise<void> {
    return notImplemented('openSceneForMissingDataEdit', 'Phase 3 T055');
  }

  // ── Read-only views for the panel ─────────────────────────────────

  getStaleFlag(_documentUri: string, _sceneId: string): StaleFlag | null {
    return null;
  }

  getPendingDeletes(_documentUri: string): readonly DeletedScene[] {
    return [];
  }

  // ── Disposal ──────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) {return;}
    this.disposed = true;
    this.logService = null;
    this._onDidChangeStaleFlags.dispose();
    this._onDidChangeUndoQueue.dispose();
  }
}
