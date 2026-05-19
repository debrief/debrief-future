/**
 * Storyboard edit orchestration service (Feature 218).
 *
 * Owns every write path from the edit suite into Storyboard / Scene
 * Features. Every method delegates to #215's CRUD module for the
 * actual mutation. This service orchestrates surrounding concerns:
 * session-scoped undo buffer, thumbnail capture, stale detection,
 * LogService emission, user prompts on conflicts.
 *
 * Contract: specs/218-storyboarding-edit/contracts/edit-service.md
 */

import * as vscode from 'vscode';
import {
  computeFeatureSetHash,
  copySceneToOtherStoryboard as crudCopyScene,
  deleteScene as crudDeleteScene,
  describeStoryboard as crudDescribeStoryboard,
  duplicateScene as crudDuplicateScene,
  getScene,
  getStoryboard,
  isSceneFeature,
  isStoryboardFeature,
  readSceneWithStaleness,
  renameStoryboard as crudRenameStoryboard,
  restoreScene as crudRestoreScene,
  updateScene as crudUpdateScene,
  DuplicateStoryboardNameError,
  ThumbnailDeepCopyFailedError,
  UnknownSceneError,
  UnknownStoryboardError,
  type DebriefFeature,
  type SceneFeature,
  type StoryboardFeature,
  type StoryboardPlot,
} from '@debrief/components';
import type {
  ExtensionToStoryboardPanelMessage,
  SceneUndoToastDescriptor,
} from '../types/storyboardPanelMessages';
import { plotFromFeatures, featuresFromPlot } from './plotFromFeatures';

// ── View-model + transient-state types (data-model.md §1, §2, §5) ────

/**
 * Undo buffer record (data-model.md §1). The Scene Feature stored here
 * is byte-identical to its pre-delete state; the `{op:'delete'}`
 * provenance entry is already appended by #215 before removal
 * (crud.ts:685-688), so `deleteActivityIdOf(d)` reads it without
 * duplication (review 7A — no stored field).
 */
export interface DeletedScene {
  readonly original: SceneFeature;
  readonly storyboardId: string;
  readonly deletedAt: string;
}

export const deleteActivityIdOf = (d: DeletedScene): string => {
  const prov = d.original.properties.provenance;
  const last = prov && prov[prov.length - 1];
  if (!last) {
    throw new Error(
      `DeletedScene ${d.original.properties.id} has empty provenance — invariant violation`,
    );
  }
  return last.activity_id;
};

/** Stale-thumbnail detection result (data-model.md §2). */
export interface StaleFlag {
  readonly sceneId: string;
  readonly stale: boolean;
  readonly unresolvedFeatureIds: readonly string[];
  readonly computedAt: string;
}

export type StaleFlagCache = ReadonlyMap<string /* sceneId */, StaleFlag>;

// ── Input types ──────────────────────────────────────────────────────

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
    readonly viewport: SceneFeature['properties']['viewport'];
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

// ── Result types ─────────────────────────────────────────────────────

export interface SceneEditOutcome {
  readonly kind: 'ok';
  readonly scene: SceneFeature;
  readonly logEntryActivityId: string | null;
}

export interface StoryboardEditOutcome {
  readonly kind: 'ok';
  readonly storyboard: StoryboardFeature;
  readonly logEntryActivityId: string | null;
}

export type DeleteSceneOutcome =
  | { readonly kind: 'ok'; readonly deleted: DeletedScene; readonly logEntryActivityId: string | null }
  | { readonly kind: 'unknown-scene'; readonly sceneId: string };

export type UndoDeleteOutcome =
  | { readonly kind: 'ok'; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: 'unrecoverable-scene'; readonly reason: 'storyboard-gone' | 'buffer-evicted' };

// #259 — duplicate-timestamp-collision results removed. updateScene /
// duplicateScene / copySceneToOtherStoryboard now accept tied timestamps
// unconditionally, so these branches are no longer reachable.

export type UpdateToCurrentResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: 'thumbnail-failed'; readonly error: Error };

export type DuplicateSceneResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeature; readonly logEntryActivityId: string | null };

export type CopySceneResult =
  | {
      readonly kind: 'ok';
      readonly scene: SceneFeature;
      readonly logEntryActivityId: string | null;
      readonly pairActivityId: string;
    }
  | { readonly kind: 'deep-copy-failed'; readonly error: Error };

export type RefreshThumbnailResult =
  | { readonly kind: 'ok'; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: 'thumbnail-failed'; readonly error: Error };

export interface RefreshAllStaleResult {
  readonly succeeded: readonly string[];
  readonly failed: readonly { readonly sceneId: string; readonly error: Error }[];
}

export type RenameStoryboardOutcome =
  | StoryboardEditOutcome
  | { readonly kind: 'name-conflict'; readonly conflictStoryboardId: string };

// ── Ports ────────────────────────────────────────────────────────────

export interface EditMapPanel {
  readonly getCurrentFeatures: () => readonly DebriefFeature[];
  readonly setFeatures: (features: readonly DebriefFeature[]) => void;
}

export interface StoreContext {
  readonly storePath: string;
  readonly itemPath: string;
}

export interface EditSessionManager {
  readonly getActiveDocumentUri: () => string | null;
  /** Resolve per-plot STAC storage so the service can attach LogEntries
   *  via LogService. Returns null when the plot is not backed by STAC
   *  (e.g., preview-only). */
  readonly resolveStoreContext: (documentUri: string) => StoreContext | null;
}

export interface EditLogService {
  readonly recordStoryboardEdit: (input: {
    readonly storePath: string;
    readonly itemPath: string;
    readonly op: string;
    readonly storyboardId: string;
    readonly sceneId: string | null;
    readonly thumbnailAssetRef: string | null;
    readonly actor: string;
    readonly summary: string;
    readonly timestamp: string;
    readonly underlyingActivityId: string;
    readonly pairActivityId: string | null;
  }) => Promise<{ readonly activity_id: string }>;
}

export interface EditThumbnailService {
  /** For update-to-current + refresh-thumbnail: capture a PNG pair for
   *  the current map state and write the STAC assets. */
  readonly captureThumbnail?: (input: {
    readonly stacItemPath: string;
    readonly sceneId: string;
  }) => Promise<{ readonly assetKey: string }>;
  /** For copy-to-other-storyboard: deep-copy the source thumbnail PNGs
   *  under a new asset key on the same STAC item. */
  readonly deepCopyAsset?: (
    sourceAssetRef: string,
    destStoryboardId: string,
  ) => Promise<string>;
  /** For plot close: unlink orphan thumbnail assets (FR-EDIT-024). */
  readonly gcOrphanAssets?: (
    stacItemPath: string,
    plot: StoryboardPlot,
  ) => Promise<{ readonly reclaimed: readonly string[] }>;
}

export interface EditPanelSink {
  readonly postMessage: (message: ExtensionToStoryboardPanelMessage) => void;
}

export interface StoryboardEditServiceOptions {
  readonly mapPanel?: EditMapPanel;
  readonly sessionManager?: EditSessionManager;
  readonly logService?: EditLogService | null;
  readonly thumbnailService?: EditThumbnailService;
  readonly panelSink?: EditPanelSink;
  readonly outputChannel?: { readonly appendLine: (line: string) => void };
  /** Undo buffer cap per plot (research.md R1). */
  readonly undoBufferCap?: number;
}

// ── Service ──────────────────────────────────────────────────────────

const DEFAULT_UNDO_CAP = 50;

const summaryLimit = 120;
const truncate = (s: string): string =>
  s.length > summaryLimit ? `${s.slice(0, summaryLimit - 1)}…` : s;

export class StoryboardEditService implements vscode.Disposable {
  private mapPanel: EditMapPanel | null;
  private sessionManager: EditSessionManager | null;
  private logService: EditLogService | null;
  private thumbnailService: EditThumbnailService | null;
  private panelSink: EditPanelSink | null;
  private readonly outputChannel: { readonly appendLine: (line: string) => void };
  private readonly undoBufferCap: number;
  private disposed = false;

  private readonly undoBuffer = new Map<string, DeletedScene[]>();
  private readonly staleCache = new Map<string, Map<string, StaleFlag>>();

  private readonly _onDidChangeStaleFlags =
    new vscode.EventEmitter<{ readonly documentUri: string; readonly sceneIds: readonly string[] }>();
  public readonly onDidChangeStaleFlags = this._onDidChangeStaleFlags.event;
  private readonly _onDidChangeUndoQueue =
    new vscode.EventEmitter<{ readonly documentUri: string }>();
  public readonly onDidChangeUndoQueue = this._onDidChangeUndoQueue.event;

  constructor(options: StoryboardEditServiceOptions = {}) {
    this.mapPanel = options.mapPanel ?? null;
    this.sessionManager = options.sessionManager ?? null;
    this.logService = options.logService ?? null;
    this.thumbnailService = options.thumbnailService ?? null;
    this.panelSink = options.panelSink ?? null;
    this.outputChannel = options.outputChannel ?? { appendLine: (): void => undefined };
    this.undoBufferCap = options.undoBufferCap ?? DEFAULT_UNDO_CAP;
  }

  activate(): vscode.Disposable {
    return { dispose: (): void => this.dispose() };
  }

  setLogService(logService: EditLogService | null): void {
    this.logService = logService;
  }

  getLogService(): EditLogService | null {
    return this.logService;
  }

  setMapPanel(mapPanel: EditMapPanel | null): void {
    this.mapPanel = mapPanel;
  }

  setSessionManager(sessionManager: EditSessionManager | null): void {
    this.sessionManager = sessionManager;
  }

  setThumbnailService(ts: EditThumbnailService | null): void {
    this.thumbnailService = ts;
  }

  setPanelSink(sink: EditPanelSink | null): void {
    this.panelSink = sink;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  /**
   * On plot open, run the stale-detection pass over every Scene and
   * populate the per-plot `StaleFlagCache`. Review 11A: early-return
   * when the plot has zero Storyboards — non-storyboard plots pay
   * zero Scene-iteration cost.
   *
   * Pass composes #215's `readSceneWithStaleness` with
   * `computeFeatureSetHash` (review 5A) — no direct reads of
   * `scene.properties.feature_set_hash`.
   */
  async onPlotOpened(documentUri: string, initialPlot: StoryboardPlot): Promise<void> {
    if (!plotHasAnyStoryboard(initialPlot)) {
      this.staleCache.delete(documentUri);
      return;
    }
    const resolvable = collectResolvableFeatureIds(initialPlot);
    const sceneIds: string[] = [];
    for (const f of initialPlot.features) {
      if (isSceneFeature(f)) {
        sceneIds.push(f.properties.id);
      }
    }
    const flags = new Map<string, StaleFlag>();
    const now = new Date().toISOString();
    for (const sceneId of sceneIds) {
      const read = readSceneWithStaleness(initialPlot, sceneId);
      if (!read) {continue;}
      const recomputed = await computeFeatureSetHash(read.canonicalVisibleIds);
      const unresolved = read.canonicalVisibleIds.filter(
        (id) => !resolvable.has(id),
      );
      const hashMismatch = recomputed !== read.storedHash;
      const stale = hashMismatch || unresolved.length > 0;
      flags.set(sceneId, {
        sceneId,
        stale,
        unresolvedFeatureIds: unresolved,
        computedAt: now,
      });
    }
    this.staleCache.set(documentUri, flags);
    this.postToPanel({
      type: 'scene-stale-flags-updated',
      flags: Array.from(flags.values()).map((f) => ({
        sceneId: f.sceneId,
        stale: f.stale,
        unresolvedFeatureIds: f.unresolvedFeatureIds,
      })),
    });
    this._onDidChangeStaleFlags.fire({
      documentUri,
      sceneIds: Array.from(flags.keys()),
    });
  }

  async onPlotClosed(documentUri: string, finalPlot: StoryboardPlot): Promise<void> {
    // FR-EDIT-024 — garbage-collect orphan thumbnail assets.
    const ctx = this.sessionManager?.resolveStoreContext(documentUri) ?? null;
    const gc = this.thumbnailService?.gcOrphanAssets;
    if (ctx && gc) {
      try {
        await gc(ctx.itemPath, finalPlot);
      } catch (err) {
        this.outputChannel.appendLine(
          `[StoryboardEditService] gcOrphanAssets failed: ${stringifyErr(err)}`,
        );
      }
    }
    this.undoBuffer.delete(documentUri);
    this.staleCache.delete(documentUri);
    this._onDidChangeUndoQueue.fire({ documentUri });
    this._onDidChangeStaleFlags.fire({ documentUri, sceneIds: [] });
  }

  // ── Internal plot accessor ─────────────────────────────────────────

  private readPlot(_documentUri: string): StoryboardPlot {
    const mapPanel = this.mapPanel;
    if (!mapPanel) {
      throw new Error('StoryboardEditService: mapPanel port not wired');
    }
    return plotFromFeatures(mapPanel.getCurrentFeatures());
  }

  private writePlot(_documentUri: string, plot: StoryboardPlot): void {
    const mapPanel = this.mapPanel;
    if (!mapPanel) {
      throw new Error('StoryboardEditService: mapPanel port not wired');
    }
    mapPanel.setFeatures(featuresFromPlot(plot));
  }

  private async emitLogEntry(
    documentUri: string,
    op: string,
    storyboardId: string,
    sceneId: string | null,
    thumbnailAssetRef: string | null,
    actor: string,
    summary: string,
    timestamp: string,
    underlyingActivityId: string,
    pairActivityId: string | null = null,
  ): Promise<string | null> {
    const log = this.logService;
    const ctx = this.sessionManager?.resolveStoreContext(documentUri) ?? null;
    if (!log || !ctx) {
      return null;
    }
    try {
      const result = await log.recordStoryboardEdit({
        storePath: ctx.storePath,
        itemPath: ctx.itemPath,
        op,
        storyboardId,
        sceneId,
        thumbnailAssetRef,
        actor,
        summary: truncate(summary),
        timestamp,
        underlyingActivityId,
        pairActivityId,
      });
      return result.activity_id || null;
    } catch (err) {
      // FR-EDIT-021 — never surface LogService errors to the user.
      this.outputChannel.appendLine(
        `[StoryboardEditService] recordStoryboardEdit(${op}) failed: ${stringifyErr(err)}`,
      );
      return null;
    }
  }

  private readLastActivityId(feat: { readonly properties: { readonly provenance?: readonly { readonly activity_id: string }[] } }): string {
    const prov = feat.properties.provenance ?? [];
    return prov[prov.length - 1]?.activity_id ?? '';
  }

  // ── Scene edit ops (Story 1) ───────────────────────────────────────

  async renameScene(input: EditRenameSceneInput): Promise<SceneEditOutcome> {
    const plot = this.readPlot(input.documentUri);
    const existing = getScene(plot, input.sceneId);
    if (!existing) {
      throw new UnknownSceneError(input.sceneId);
    }
    const now = new Date().toISOString();
    const { plot: nextPlot, scene } = await crudUpdateScene(plot, {
      sceneId: input.sceneId,
      patch: { title: input.newTitle.trim() },
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'rename',
      scene.properties.storyboard_id,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `rename "${existing.properties.title}" → "${scene.properties.title}"`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  async describeScene(input: EditDescribeSceneInput): Promise<SceneEditOutcome> {
    const plot = this.readPlot(input.documentUri);
    const existing = getScene(plot, input.sceneId);
    if (!existing) {
      throw new UnknownSceneError(input.sceneId);
    }
    const now = new Date().toISOString();
    // #215's updateScene uses `patch.description === undefined` ⇒ untouched.
    // We want `null` ⇒ clear. Pass empty string as a placeholder; #215
    // accepts string. When the user wants to clear, we send "".
    const description = input.description ?? '';
    const { plot: nextPlot, scene } = await crudUpdateScene(plot, {
      sceneId: input.sceneId,
      patch: { description },
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'describe',
      scene.properties.storyboard_id,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `describe scene at ${scene.properties.timestamp}`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  async deleteScene(input: EditDeleteSceneInput): Promise<DeleteSceneOutcome> {
    const plot = this.readPlot(input.documentUri);
    const existing = getScene(plot, input.sceneId);
    if (!existing) {
      return { kind: 'unknown-scene', sceneId: input.sceneId };
    }
    const now = new Date().toISOString();
    // Pre-mint the delete entry's activity_id so the undo buffer's
    // reconstructed entry matches #215's output byte-for-byte (SC-003
    // hash-equality depends on this).
    const deleteActivityId = mintUuid();
    const { plot: nextPlot } = await crudDeleteScene(plot, {
      sceneId: input.sceneId,
      actor: input.actor,
      now,
      activityIdOverride: deleteActivityId,
    });
    this.writePlot(input.documentUri, nextPlot);

    // Reconstruct the delete entry exactly as #215's
    // buildStoryboardCrudLogEntry would produce. See
    // shared/components/src/storyboard/provenance.ts.
    const deleteEntry = {
      activity_id: deleteActivityId,
      timestamp: now,
      was_generated_by: {
        tool: 'storyboard-crud',
        tool_version: '1.0.0',
        parameters: [
          { value: 'delete' },
          { value: truncate(`delete scene ${input.sceneId}`) },
        ],
      },
      used: [],
      generated: [input.sceneId],
      execution_duration: 'PT0S',
      agent: input.actor,
    };
    const preservedProvenance = [
      ...(existing.properties.provenance ?? []),
      deleteEntry,
    ];
    const originalWithDelete: SceneFeature = {
      ...existing,
      properties: {
        ...existing.properties,
        provenance: preservedProvenance,
      },
    };

    const deleted: DeletedScene = {
      original: originalWithDelete,
      storyboardId: existing.properties.storyboard_id,
      deletedAt: now,
    };

    const queue = this.undoBuffer.get(input.documentUri) ?? [];
    queue.push(deleted);
    // FIFO cap
    while (queue.length > this.undoBufferCap) {
      queue.shift();
    }
    this.undoBuffer.set(input.documentUri, queue);
    this._onDidChangeUndoQueue.fire({ documentUri: input.documentUri });
    this.postToPanel({
      type: 'scene-undo-toast-shown',
      toast: toastOf(deleted, existing.properties.title),
    });
    // T071 — drop the stale cache entry; the Scene no longer exists.
    this.dropStaleFlag(input.documentUri, input.sceneId);

    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'delete',
      existing.properties.storyboard_id,
      input.sceneId,
      null,
      input.actor,
      `delete scene "${existing.properties.title}"`,
      now,
      deleteEntry.activity_id,
    );
    return { kind: 'ok', deleted, logEntryActivityId };
  }

  async undoDeleteScene(input: EditUndoDeleteInput): Promise<UndoDeleteOutcome> {
    const queue = this.undoBuffer.get(input.documentUri) ?? [];
    const idx = queue.findIndex(
      (d) => d.original.properties.id === input.sceneId,
    );
    if (idx === -1) {
      return { kind: 'unrecoverable-scene', reason: 'buffer-evicted' };
    }
    const deleted = queue[idx]!;

    // Review 10H — Storyboard must still exist.
    const plot = this.readPlot(input.documentUri);
    if (!getStoryboard(plot, deleted.storyboardId)) {
      // Drop the buffer entry so repeated clicks don't redisplay a
      // doomed toast; mirrors research.md R1 finalisation semantics.
      queue.splice(idx, 1);
      this._onDidChangeUndoQueue.fire({ documentUri: input.documentUri });
      return { kind: 'unrecoverable-scene', reason: 'storyboard-gone' };
    }

    const now = new Date().toISOString();
    const orig = deleted.original.properties;
    const { plot: nextPlot, scene } = await crudRestoreScene(plot, {
      storyboardId: deleted.storyboardId,
      title: orig.title,
      description: orig.description,
      viewport: orig.viewport,
      timestamp: orig.timestamp,
      visibleFeatureIds: [...orig.visible_feature_ids],
      thumbnailAssetRef: orig.thumbnail_asset_ref,
      transitionDurationMs: orig.transition_duration_ms,
      actor: input.actor,
      now,
      idOverride: orig.id,
      preservedProvenance: orig.provenance ?? [],
    });
    this.writePlot(input.documentUri, nextPlot);

    // Remove the undo buffer entry; dismiss the toast.
    queue.splice(idx, 1);
    this._onDidChangeUndoQueue.fire({ documentUri: input.documentUri });
    this.postToPanel({ type: 'scene-undo-toast-shown', toast: null });
    // T071 — re-insert the restored Scene's stale flag.
    await this.recomputeStaleFlagFor(
      input.documentUri,
      nextPlot,
      scene.properties.id,
    );

    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'restore',
      deleted.storyboardId,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `restore scene "${scene.properties.title}"`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  // ── Update-to-current (review 1A pre-flight) ───────────────────────

  async updateSceneToCurrent(input: EditUpdateToCurrentInput): Promise<UpdateToCurrentResult> {
    const plot = this.readPlot(input.documentUri);
    const existing = getScene(plot, input.sceneId);
    if (!existing) {
      throw new UnknownSceneError(input.sceneId);
    }

    // #259 — duplicate-timestamp pre-flight removed. Multiple Scenes can
    // share a timestamp; updateScene unconditionally preserves the existing
    // creation_order so no collision is possible here.

    // Capture thumbnail (may be mocked in tests — if no port, reuse
    // the existing ref; tests that rely on capture failure inject a
    // port that throws).
    let thumbnailAssetRef = existing.properties.thumbnail_asset_ref;
    const capture = this.thumbnailService?.captureThumbnail;
    const ctx = this.sessionManager?.resolveStoreContext(input.documentUri) ?? null;
    if (capture && ctx) {
      try {
        const captured = await capture({
          stacItemPath: ctx.itemPath,
          sceneId: input.sceneId,
        });
        thumbnailAssetRef = captured.assetKey;
      } catch (err) {
        return { kind: 'thumbnail-failed', error: coerceError(err) };
      }
    }

    const now = new Date().toISOString();
    const { plot: nextPlot, scene } = await crudUpdateScene(plot, {
      sceneId: input.sceneId,
      patch: {
        viewport: input.currentView.viewport,
        timestamp: input.currentView.timestamp,
        visibleFeatureIds: [...input.currentView.visibleFeatureIds],
        thumbnailAssetRef,
      },
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    // T071 — update-to-current re-snapshots everything; the flag
    // normalises to { stale: false, unresolvedFeatureIds: [] }.
    await this.recomputeStaleFlagFor(
      input.documentUri,
      nextPlot,
      scene.properties.id,
    );

    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'update-to-current',
      scene.properties.storyboard_id,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `update-to-current scene at ${scene.properties.timestamp}`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  // ── Duplicate ──────────────────────────────────────────────────────

  async duplicateScene(input: EditDuplicateSceneInput): Promise<DuplicateSceneResult> {
    const plot = this.readPlot(input.documentUri);
    const source = getScene(plot, input.sceneId);
    if (!source) {
      throw new UnknownSceneError(input.sceneId);
    }
    const now = new Date().toISOString();
    // #259 — duplicateScene no longer throws DuplicateTimestampError; tied
    // timestamps are accepted and the duplicate receives a fresh
    // creation_order. Any unexpected error propagates naturally without a
    // catch wrapper.
    const { plot: nextPlot, scene } = await crudDuplicateScene(plot, {
      sceneId: input.sceneId,
      newTimestamp: input.newTimestamp,
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    // T071 — insert a stale flag for the duplicated Scene.
    await this.recomputeStaleFlagFor(
      input.documentUri,
      nextPlot,
      scene.properties.id,
    );
    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'duplicate',
      scene.properties.storyboard_id,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `duplicate scene → ${scene.properties.timestamp}`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  // ── Copy-to-other-storyboard (review 3A two-card emission) ─────────

  async copySceneToOtherStoryboard(input: EditCopySceneInput): Promise<CopySceneResult> {
    const plot = this.readPlot(input.documentUri);
    const source = getScene(plot, input.sceneId);
    if (!source) {
      throw new UnknownSceneError(input.sceneId);
    }
    if (!getStoryboard(plot, input.destinationStoryboardId)) {
      throw new UnknownStoryboardError(input.destinationStoryboardId);
    }
    const deepCopy =
      this.thumbnailService?.deepCopyAsset ??
      ((ref: string): Promise<string> => Promise.resolve(`${ref}-copy`));

    const now = new Date().toISOString();
    try {
      const { plot: nextPlot, scene } = await crudCopyScene(plot, {
        sceneId: input.sceneId,
        destinationStoryboardId: input.destinationStoryboardId,
        newTimestamp: input.newTimestamp,
        deepCopyThumbnail: deepCopy,
        actor: input.actor,
        now,
      });
      this.writePlot(input.documentUri, nextPlot);
      // T071 — insert a stale flag for the new destination Scene.
      await this.recomputeStaleFlagFor(
        input.documentUri,
        nextPlot,
        scene.properties.id,
      );

      // Review 3A — two log cards sharing a freshly-minted pairActivityId.
      const pairActivityId = mintUuid();
      const logEntryActivityId = await this.emitLogEntry(
        input.documentUri,
        'copy-out',
        source.properties.storyboard_id,
        source.properties.id,
        source.properties.thumbnail_asset_ref,
        input.actor,
        `copy scene to Storyboard ${input.destinationStoryboardId}`,
        now,
        this.readLastActivityId(scene),
        pairActivityId,
      );
      await this.emitLogEntry(
        input.documentUri,
        'copy-in',
        input.destinationStoryboardId,
        scene.properties.id,
        scene.properties.thumbnail_asset_ref,
        input.actor,
        `copy scene to Storyboard ${input.destinationStoryboardId}`,
        now,
        this.readLastActivityId(scene),
        pairActivityId,
      );
      return { kind: 'ok', scene, logEntryActivityId, pairActivityId };
    } catch (err) {
      if (err instanceof ThumbnailDeepCopyFailedError) {
        return { kind: 'deep-copy-failed', error: err };
      }
      // #259 — copySceneToOtherStoryboard no longer throws
      // DuplicateTimestampError; unexpected errors are re-thrown.
      throw err;
    }
  }

  // ── Refresh thumbnail (FR-EDIT-018/019, SC-005) ────────────────────

  async refreshSceneThumbnail(
    input: EditRefreshThumbnailInput,
  ): Promise<RefreshThumbnailResult> {
    const plot = this.readPlot(input.documentUri);
    const existing = getScene(plot, input.sceneId);
    if (!existing) {
      throw new UnknownSceneError(input.sceneId);
    }
    const capture = this.thumbnailService?.captureThumbnail;
    const ctx = this.sessionManager?.resolveStoreContext(input.documentUri) ?? null;
    if (!capture || !ctx) {
      return {
        kind: 'thumbnail-failed',
        error: new Error(
          'Refresh failed — thumbnail service or STAC context not wired.',
        ),
      };
    }
    let newAssetRef: string;
    try {
      const captured = await capture({
        stacItemPath: ctx.itemPath,
        sceneId: input.sceneId,
      });
      newAssetRef = captured.assetKey;
    } catch (err) {
      // SC-005 — plot is byte-identical; stale flag persists.
      return { kind: 'thumbnail-failed', error: coerceError(err) };
    }
    const now = new Date().toISOString();
    const { plot: nextPlot, scene } = await crudUpdateScene(plot, {
      sceneId: input.sceneId,
      patch: {
        thumbnailAssetRef: newAssetRef,
        // Re-canonicalise the current visible ids so #215 recomputes
        // the hash (hash drift from non-id sources clears).
        visibleFeatureIds: [...existing.properties.visible_feature_ids],
      },
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    await this.recomputeStaleFlagFor(
      input.documentUri,
      nextPlot,
      input.sceneId,
    );
    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'refresh-thumbnail',
      scene.properties.storyboard_id,
      scene.properties.id,
      scene.properties.thumbnail_asset_ref,
      input.actor,
      `refresh thumbnail`,
      now,
      this.readLastActivityId(scene),
    );
    return { kind: 'ok', scene, logEntryActivityId };
  }

  /**
   * Bulk refresh every stale-flagged Scene on the active Storyboard
   * (FR-EDIT-025). Iterates sequentially, emits one per-Scene log
   * card, then one rollup card. Does not abort on per-Scene failures.
   */
  async refreshAllStaleThumbnails(
    input: EditRefreshAllStaleInput,
  ): Promise<RefreshAllStaleResult> {
    const plot = this.readPlot(input.documentUri);
    // Find stale Scenes on the target Storyboard.
    const bucket = this.staleCache.get(input.documentUri);
    const staleSceneIds: string[] = [];
    if (bucket) {
      for (const f of plot.features) {
        if (!isSceneFeature(f)) {continue;}
        if (f.properties.storyboard_id !== input.storyboardId) {continue;}
        const flag = bucket.get(f.properties.id);
        if (flag?.stale) {
          staleSceneIds.push(f.properties.id);
        }
      }
    }
    const succeeded: string[] = [];
    const failed: { readonly sceneId: string; readonly error: Error }[] = [];
    for (const sceneId of staleSceneIds) {
      try {
        const r = await this.refreshSceneThumbnail({
          documentUri: input.documentUri,
          sceneId,
          actor: input.actor,
        });
        if (r.kind === 'ok') {
          succeeded.push(sceneId);
        } else {
          failed.push({ sceneId, error: r.error });
        }
      } catch (err) {
        failed.push({ sceneId, error: coerceError(err) });
      }
    }
    // Rollup card — even when no stale scenes (informative zero-row).
    const now = new Date().toISOString();
    const summary = `refresh-all-stale: ${succeeded.length} succeeded, ${failed.length} failed`;
    await this.emitLogEntry(
      input.documentUri,
      'refresh-all-stale',
      input.storyboardId,
      null,
      null,
      input.actor,
      summary,
      now,
      '',
    );
    return { succeeded, failed };
  }

  // ── Storyboard-level edits ─────────────────────────────────────────

  async renameStoryboard(input: EditRenameStoryboardInput): Promise<RenameStoryboardOutcome> {
    const plot = this.readPlot(input.documentUri);
    const existing = getStoryboard(plot, input.storyboardId);
    if (!existing) {
      throw new UnknownStoryboardError(input.storyboardId);
    }
    const now = new Date().toISOString();
    try {
      const { plot: nextPlot, storyboard } = await crudRenameStoryboard(plot, {
        storyboardId: input.storyboardId,
        newName: input.newName,
        actor: input.actor,
        now,
      });
      this.writePlot(input.documentUri, nextPlot);
      const logEntryActivityId = await this.emitLogEntry(
        input.documentUri,
        'rename',
        storyboard.properties.id,
        null,
        null,
        input.actor,
        `storyboard rename "${existing.properties.name}" → "${storyboard.properties.name}"`,
        now,
        this.readLastActivityId(storyboard),
      );
      return { kind: 'ok', storyboard, logEntryActivityId };
    } catch (err) {
      if (err instanceof DuplicateStoryboardNameError) {
        return {
          kind: 'name-conflict',
          conflictStoryboardId: err.conflictingStoryboardId,
        };
      }
      throw err;
    }
  }

  async describeStoryboard(input: EditDescribeStoryboardInput): Promise<StoryboardEditOutcome> {
    const plot = this.readPlot(input.documentUri);
    const existing = getStoryboard(plot, input.storyboardId);
    if (!existing) {
      throw new UnknownStoryboardError(input.storyboardId);
    }
    const now = new Date().toISOString();
    const { plot: nextPlot, storyboard } = await crudDescribeStoryboard(plot, {
      storyboardId: input.storyboardId,
      description: input.description,
      actor: input.actor,
      now,
    });
    this.writePlot(input.documentUri, nextPlot);
    const logEntryActivityId = await this.emitLogEntry(
      input.documentUri,
      'describe',
      storyboard.properties.id,
      null,
      null,
      input.actor,
      `storyboard describe`,
      now,
      this.readLastActivityId(storyboard),
    );
    return { kind: 'ok', storyboard, logEntryActivityId };
  }

  // ── Missing-data routing ───────────────────────────────────────────

  openSceneForMissingDataEdit(input: {
    readonly documentUri: string;
    readonly sceneId: string;
  }): Promise<void> {
    this.postToPanel({ type: 'scene-edit-form-open', sceneId: input.sceneId });
    return Promise.resolve();
  }

  // ── Read-only views ────────────────────────────────────────────────

  getStaleFlag(documentUri: string, sceneId: string): StaleFlag | null {
    return this.staleCache.get(documentUri)?.get(sceneId) ?? null;
  }

  getPendingDeletes(documentUri: string): readonly DeletedScene[] {
    return this.undoBuffer.get(documentUri) ?? [];
  }

  // ── Stale-cache invalidation helpers (T071) ────────────────────────

  /**
   * Recompute and store the stale flag for one Scene (reuses the same
   * pass as `onPlotOpened`). Fires `scene-stale-flags-updated` with
   * only the affected sceneId for minimal webview churn.
   */
  private async recomputeStaleFlagFor(
    documentUri: string,
    plot: StoryboardPlot,
    sceneId: string,
  ): Promise<void> {
    const read = readSceneWithStaleness(plot, sceneId);
    if (!read) {
      this.dropStaleFlag(documentUri, sceneId);
      return;
    }
    const resolvable = collectResolvableFeatureIds(plot);
    const recomputed = await computeFeatureSetHash(read.canonicalVisibleIds);
    const unresolved = read.canonicalVisibleIds.filter((id) => !resolvable.has(id));
    const flag: StaleFlag = {
      sceneId,
      stale: recomputed !== read.storedHash || unresolved.length > 0,
      unresolvedFeatureIds: unresolved,
      computedAt: new Date().toISOString(),
    };
    let bucket = this.staleCache.get(documentUri);
    if (!bucket) {
      bucket = new Map();
      this.staleCache.set(documentUri, bucket);
    }
    bucket.set(sceneId, flag);
    this.postToPanel({
      type: 'scene-stale-flags-updated',
      flags: [
        {
          sceneId,
          stale: flag.stale,
          unresolvedFeatureIds: flag.unresolvedFeatureIds,
        },
      ],
    });
    this._onDidChangeStaleFlags.fire({
      documentUri,
      sceneIds: [sceneId],
    });
  }

  /** Drop the cache entry for a deleted Scene. */
  private dropStaleFlag(documentUri: string, sceneId: string): void {
    const bucket = this.staleCache.get(documentUri);
    if (!bucket) {return;}
    if (bucket.delete(sceneId)) {
      this._onDidChangeStaleFlags.fire({ documentUri, sceneIds: [sceneId] });
    }
  }

  // ── Internals ──────────────────────────────────────────────────────

  private postToPanel(message: ExtensionToStoryboardPanelMessage): void {
    if (this.panelSink) {
      this.panelSink.postMessage(message);
    }
  }

  // ── Disposal ───────────────────────────────────────────────────────

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.logService = null;
    this.undoBuffer.clear();
    this.staleCache.clear();
    this._onDidChangeStaleFlags.dispose();
    this._onDidChangeUndoQueue.dispose();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function toastOf(deleted: DeletedScene, title: string): SceneUndoToastDescriptor {
  return {
    sceneId: deleted.original.properties.id,
    sceneTitle: title,
    deletedAt: deleted.deletedAt,
    canUndo: true,
  };
}

function plotHasAnyStoryboard(plot: StoryboardPlot): boolean {
  for (const f of plot.features) {
    if (isStoryboardFeature(f)) {
      return true;
    }
  }
  return false;
}

/**
 * Collect IDs of plot features that can RESOLVE a scene's
 * `visible_feature_ids` entry. Excludes Storyboard and Scene features
 * (those carry their own provenance / structure, never the underlying
 * plot data a Scene references). Uses `properties.id` as the canonical
 * id (matches #216/#217 capture behaviour — Scene's visibleFeatureIds
 * come from `props.id` on each iterated feature).
 */
function collectResolvableFeatureIds(plot: StoryboardPlot): Set<string> {
  const set = new Set<string>();
  for (const f of plot.features) {
    if (isStoryboardFeature(f) || isSceneFeature(f)) {continue;}
    const props = (f as { properties?: { id?: unknown } | null }).properties;
    const id = props?.id;
    if (typeof id === 'string' && id.length > 0) {
      set.add(id);
    }
  }
  return set;
}

// #259 — offsetTimestampBy1s was used by the now-removed
// duplicate-timestamp-collision suggestion paths.

function coerceError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function stringifyErr(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function mintUuid(): string {
  const g = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (g && typeof g.randomUUID === 'function') {
    return g.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
}

