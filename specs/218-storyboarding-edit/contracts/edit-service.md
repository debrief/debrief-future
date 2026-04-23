# Contract: `StoryboardEditService`

**File**: `apps/vscode/src/services/storyboardEdit.ts`
**Runtime**: VS Code extension host (Node 20+)
**Status**: New in #218

This service owns every write path into Storyboard / Scene Features
from the edit suite. Every method delegates to #215's CRUD module
for the actual mutation; this service orchestrates the surrounding
concerns (undo buffer, thumbnail capture, stale detection, log-
service emission, user prompts on conflicts).

## Public API

```ts
export interface StoryboardEditService {
  // ── Lifecycle ────────────────────────────────────────────────
  activate(): vscode.Disposable;
  setLogService(logService: LogService | null): void;
  /** Bind the service to a plot (called on plot open). Runs the
      stale-detection pass (R4) and seeds the undo queue for this
      documentUri. **Early-returns when the plot has zero
      Storyboards** (review 11A) — no wasted Scene-iteration work
      on storyboard-free plots. Idempotent per documentUri. */
  onPlotOpened(documentUri: string, initialPlot: Plot): Promise<void>;
  /** Drop all per-plot state (undo buffer, stale flag cache, pending
      toast). Invokes `sceneThumbnailService.gcOrphanAssets(plot)`
      before dropping state (FR-EDIT-024). Called on plot close and
      extension deactivation. */
  onPlotClosed(documentUri: string, finalPlot: Plot): Promise<void>;

  // ── Scene edit ops ───────────────────────────────────────────
  renameScene(input: RenameSceneInput): Promise<SceneEditOutcome>;
  describeScene(input: DescribeSceneInput): Promise<SceneEditOutcome>;
  deleteScene(input: DeleteSceneInput): Promise<DeleteSceneOutcome>;
  undoDeleteScene(input: UndoDeleteInput): Promise<UndoDeleteOutcome>;
  updateSceneToCurrent(input: UpdateToCurrentInput): Promise<UpdateToCurrentResult>;
  duplicateScene(input: DuplicateSceneInput): Promise<DuplicateSceneResult>;
  copySceneToOtherStoryboard(
    input: CopySceneToOtherStoryboardInput,
  ): Promise<CopySceneResult>;
  refreshSceneThumbnail(input: RefreshThumbnailInput): Promise<RefreshThumbnailResult>;
  /** FR-EDIT-025 — Bulk refresh every stale-flagged Scene on the
      active Storyboard. Iterates; emits one per-Scene log card per
      refresh + one rollup log card on completion. */
  refreshAllStaleThumbnails(input: {
    readonly documentUri: string;
    readonly storyboardId: string;
    readonly actor: string;
  }): Promise<{
    readonly succeeded: readonly string[];  // sceneIds refreshed
    readonly failed: readonly { sceneId: string; error: Error }[];
  }>;

  // ── Storyboard edit ops ──────────────────────────────────────
  renameStoryboard(input: RenameStoryboardInput): Promise<StoryboardEditOutcome>;
  describeStoryboard(input: DescribeStoryboardInput): Promise<StoryboardEditOutcome>;

  // ── Missing-data routing ─────────────────────────────────────
  /** Registered as the `debrief.storyboard.editScene` command
      handler, replacing #217's `storyboardEditStub.ts`. Opens the
      edit form with missing-data details pre-filled. */
  openSceneForMissingDataEdit(input: { documentUri: string; sceneId: string }): Promise<void>;

  // ── Read-only views for the panel ────────────────────────────
  getStaleFlag(documentUri: string, sceneId: string): StaleFlag | null;
  getPendingDeletes(documentUri: string): readonly DeletedScene[];
  readonly onDidChangeStaleFlags: vscode.Event<{ documentUri: string; sceneIds: readonly string[] }>;
  readonly onDidChangeUndoQueue: vscode.Event<{ documentUri: string }>;
}
```

## Input / output types

All types use `readonly` on every field. No `any` / `unknown`.

```ts
export interface RenameSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly newTitle: string;     // may be empty ⇒ resets to DTG default
  readonly actor: string;
}

export interface DescribeSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly description: string | null;  // null clears description
  readonly actor: string;
}

export interface DeleteSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly actor: string;
}

export interface UndoDeleteInput {
  readonly documentUri: string;
  readonly sceneId: string;    // must match the DeletedScene at any position in the buffer
  readonly actor: string;
}

export interface UpdateToCurrentInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly currentView: {
    readonly viewport: Viewport;
    readonly timestamp: string;
    readonly visibleFeatureIds: readonly string[];
  };
  readonly actor: string;
}

export interface DuplicateSceneInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly newTimestamp: string;    // caller resolves the inline prompt default (source + 1 s)
  readonly actor: string;
}

export interface CopySceneToOtherStoryboardInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly destinationStoryboardId: string;
  readonly newTimestamp: string;    // caller resolves Replace / Offset default
  readonly actor: string;
}

export interface RefreshThumbnailInput {
  readonly documentUri: string;
  readonly sceneId: string;
  readonly actor: string;
}

export interface RenameStoryboardInput {
  readonly documentUri: string;
  readonly storyboardId: string;
  readonly newName: string;
  readonly actor: string;
}

export interface DescribeStoryboardInput {
  readonly documentUri: string;
  readonly storyboardId: string;
  readonly description: string | null;
  readonly actor: string;
}

// ── Results ─────────────────────────────────────────────────────

export interface SceneEditOutcome {
  readonly kind: "ok";
  readonly scene: SceneFeature;
  readonly logEntryActivityId: string | null;   // null if LogService unavailable
}

export interface StoryboardEditOutcome {
  readonly kind: "ok";
  readonly storyboard: StoryboardFeature;
  readonly logEntryActivityId: string | null;
}

export type DeleteSceneOutcome =
  | { readonly kind: "ok"; readonly deleted: DeletedScene; readonly logEntryActivityId: string | null }
  | { readonly kind: "unknown-scene"; readonly sceneId: string };

// Review 10H — undo must fail loudly if the Storyboard was
// externally removed between the delete and the undo click.
export type UndoDeleteOutcome =
  | { readonly kind: "ok"; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: "unrecoverable-scene"; readonly reason: "storyboard-gone" | "buffer-evicted" };

export type UpdateToCurrentResult =
  | { readonly kind: "ok"; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: "thumbnail-failed"; readonly error: Error }
  | { readonly kind: "duplicate-timestamp-collision";
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    };

export type DuplicateSceneResult =
  | { readonly kind: "ok"; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: "duplicate-timestamp-collision";
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    };

export type CopySceneResult =
  | { readonly kind: "ok"; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: "duplicate-timestamp-collision";
      readonly existingSceneId: string;
      readonly suggestedOffsetTimestamp: string;
    }
  | { readonly kind: "deep-copy-failed"; readonly error: Error };

export type RefreshThumbnailResult =
  | { readonly kind: "ok"; readonly scene: SceneFeature; readonly logEntryActivityId: string | null }
  | { readonly kind: "thumbnail-failed"; readonly error: Error };
```

## Behavioural contracts

### `renameScene`

- Trimmed `newTitle === ""` ⇒ `updateScene({ patch: { title:
  formatDtg(timestamp) } })` — rename clears to the DTG default
  (same behaviour as #215 create with unset title).
- Non-empty new title is written verbatim (no uniqueness check —
  Scene titles are not unique-constrained per spec).
- Stale cache: no invalidation (title changes don't affect hash).

### `describeScene`

- `description === null` ⇒ `updateScene({ patch: { description:
  undefined } })` via immutable spread — the property is cleared.
- Markdown is persisted verbatim (Assumption: CommonMark only).
- Stale cache: no invalidation.

### `deleteScene`

- Delegates to #215 `deleteScene`.
- On success: push a `DeletedScene` to the undo buffer (cap 50,
  FIFO eviction). Emit `UndoToastState` to the webview via
  `postMessage`.
- Stale cache: drops the Scene's entry.

### `undoDeleteScene`

**Revised per review decision 2A fold-in + 10H.**

1. Look up the `DeletedScene` by `sceneId` in the buffer for
   `documentUri`. Missing ⇒ return
   `{ kind: "unrecoverable-scene", reason: "buffer-evicted" }`.
2. Verify the destination Storyboard still exists via
   `getStoryboard(plot, deleted.storyboardId)`. If gone (deleted
   externally while the toast was visible), return
   `{ kind: "unrecoverable-scene", reason: "storyboard-gone" }`
   — the command handler surfaces a specific red toast (no silent
   failure per Article I.3 / review 10H).
3. Call #215's newly-exported `restoreScene(plot, {
   ...createSceneInput,
   idOverride: deleted.original.properties.id,
   preservedProvenance: deleted.original.properties.provenance,
   actor: input.actor,
   })`. `restoreScene` builds a Scene with
   `provenance = [...preservedProvenance, restoreEntry]`,
   guaranteeing byte-identical pre-delete tail + the new `restore`
   entry on top (FR-EDIT-004, SC-003).
4. Stale cache: re-insert the Scene's entry (recompute).

**Test gate 9A** — asserts the resulting Scene's `provenance[]`
equals `[...preDelete, deleteEntry, restoreEntry]` byte-identically
via `JSON.stringify` comparison (SC-003 via hash-equality per 9G).

### `updateSceneToCurrent`

**Revised per review decision 1A.** Sequence:

1. **Pre-flight collision check** via #215's newly-exported
   `checkSceneTimestamp(plot, storyboardId, viewState.timestamp,
   sceneId)`. On non-null conflict, return
   `{ kind: "duplicate-timestamp-collision", existingSceneId,
   suggestedOffsetTimestamp }` **without invoking #174** — no asset
   is written, no item.json entry is added, plot is byte-identical.
2. **Thumbnail capture** via `sceneThumbnailService.captureThumbnail`.
   On #174 failure ⇒ `{ kind: "thumbnail-failed", error }`. Plot
   stays byte-identical (captureThumbnail's header contract: on
   throw, no item.json entry is written and orphan PNGs stay
   uncommitted).
3. **#215 write** via `updateScene` with the full patch (viewport +
   timestamp + visibleFeatureIds + thumbnailAssetRef). #215
   recomputes `feature_set_hash` internally via
   `canonicaliseVisibleFeatureIds` + `computeFeatureSetHash`.
4. **Stale cache update**: set the Scene's entry to `stale: false,
   unresolvedFeatureIds: []`.

**Test gate 9B** — a spy on `captureThumbnail` asserts it is NOT
called when step 1 returns a conflict. This is the regression guard
for R5's orphan-asset window.

**Residual orphan case**: step 2 succeeds → step 3 throws
`UnknownSceneError` (Scene deleted externally between steps 1–3).
Rare; the orphan asset is reclaimed on plot close by
`sceneThumbnailService.gcOrphanAssets` (FR-EDIT-024).

### `duplicateScene`

- Delegates to #215 `duplicateScene` with the user-provided
  `newTimestamp`.
- On collision ⇒ return the existing id + a `suggestedOffset` (= user
  timestamp + 1 s), do NOT surface the prompt yourself — the caller
  (command handler) owns UX. Service is transport-agnostic.
- Thumbnail asset is **not** deep-copied — #215's
  `duplicateScene` shares the source's thumbnail_asset_ref by
  reference.  *(Spec FR-EDIT-007 does not require deep-copy for
  same-Storyboard duplicates; only `copySceneToOtherStoryboard` does.)*

### `copySceneToOtherStoryboard`

- Delegates to #215 `copySceneToOtherStoryboard`, passing
  `sceneThumbnailService.deepCopyAsset` as the `deepCopyThumbnail`
  callback.
- #215 rolls back atomically on deep-copy failure (per FR-MODULE-015
  + its `ThumbnailDeepCopyFailedError`). This service surfaces the
  failure as `{ kind: "deep-copy-failed", error }`.
- On success (revised per review decision 3A): **mint a fresh
  `pairActivityId` (UUID) and emit TWO `recordStoryboardEdit`
  calls with the same `pairActivityId`**:
  1. `{ op: "copy-out", storyboardId: sourceStoryboardId, sceneId:
      sourceSceneId, pairActivityId, ... }` — the source-side
      audit card.
  2. `{ op: "copy-in", storyboardId: destinationStoryboardId,
      sceneId: newSceneId, pairActivityId, ... }` — the
      destination-side audit card.
  The LogPanel (#176) renders the two cards with a link affordance
  using the shared `pairActivityId`. Provenance at #215 is
  unaffected (still one entry per Scene per copy-to-other
  invocation, as before).

**Test gate 9C** — asserts exactly two `recordStoryboardEdit` calls
with matching `pairActivityId`.

### `refreshSceneThumbnail`

- Calls #174 to re-capture; on failure returns
  `{ kind: "thumbnail-failed", error }` — plot unchanged, stale
  flag persists.
- On success: `updateScene` with `thumbnailAssetRef` only (+ triggers
  `feature_set_hash` recompute as a side-effect of #215 canonicalising).
  Stale cache: flip to `stale: false`, empty `unresolvedFeatureIds`.

### `renameStoryboard`

- Delegates to #215 `renameStoryboard` (which enforces uniqueness +
  empty-name rejection).
- On `DuplicateStoryboardNameError` ⇒ return `{ kind: "name-conflict",
  conflictStoryboardId }` (not in the API sketch above — omitted
  for brevity; actual implementation has this case). Caller re-
  prompts.

### `describeStoryboard`

- Delegates to #215 `updateScene`-like method on the Storyboard (in
  practice: a direct edit via the Storyboard entity API surface —
  #215 exposes this; if not, the service uses `produce` on the plot
  and appends a `describe` LogEntry via `buildStoryboardCrudLogEntry`).

## #215 module extensions shipped in this slice's diff

Per review fold-in (2A → folded into #218), the following **additive**
extensions to `shared/components/src/storyboard/` land inside #218's
diff, not as a separate #215 follow-up:

### `restoreScene` (new)

```ts
// shared/components/src/storyboard/crud.ts  (additive; ~40 LOC)
export interface RestoreSceneInput extends CreateSceneInput {
  readonly preservedProvenance: readonly LogEntry[];   // NEW
}

export async function restoreScene(
  plot: Plot,
  input: RestoreSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }>;
```

Strict superset of `createScene`: behaves identically when
`preservedProvenance` is empty, and is the **only** function
permitted to accept a pre-built `provenance[]`. The new entry is
still appended on top of the preserved tail, so
`provenance[last].timestamp ≥ provenance[second-last].timestamp`
remains the module's monotonicity invariant. Used exclusively by
`StoryboardEditService.undoDeleteScene`.

### `checkSceneTimestamp` (exported wrapper)

```ts
// shared/components/src/storyboard/crud.ts  (re-export + narrow wrapper)
export function checkSceneTimestamp(
  plot: Plot,
  storyboardId: string,
  timestamp: string,
  excludingSceneId: string | null,   // null for new-scene checks
): SceneFeature | null;
```

Thin wrapper over the existing internal
`findConflictingSceneTimestamp`. Exported for #218's
`updateSceneToCurrent` pre-flight collision check (review 1A).
Returns the conflicting Scene or `null`.

### `StoryboardOp` (re-export)

```ts
// shared/components/src/storyboard/index.ts  (additive export)
export type { StoryboardOp } from "./log-entries";  // relocated if needed
```

Exposes the internal op taxonomy so #218's `StoryboardEditOp` can
`extend` rather than `duplicate` it (review 6A). Schema-integrity
(Article II) consequence: new storyboard ops added by any future
#215 follow-up are automatically visible to #218's recorder without
a manual sync.

### `sceneThumbnailService.gcOrphanAssets` (new)

```ts
// apps/vscode/src/services/sceneThumbnailService.ts  (additive)
export async function gcOrphanAssets(
  plot: Plot,
): Promise<{ reclaimed: readonly string[] }>;
```

Scans `item.json` asset entries against live Scene
`thumbnail_asset_ref` values; unlinks PNGs whose Scene has been
removed (e.g. via `deleteScene`, or via a stale
`updateSceneToCurrent` residual); returns the list of reclaimed
asset hrefs. Invoked on plot close by
`StoryboardEditService.onPlotClosed` (FR-EDIT-024).

## Emission contract for LogService

After every successful #215 write, the service calls
`logService?.recordStoryboardEdit({...})` **once per affected
feature** (revised per review 3A — copy-to-other emits twice).
With:

- `op` ← the `StoryboardEditOp` name (one of 12).
- `summary` ← ≤ 120-char one-liner:
  - `rename "Old Title" → "New Title"`
  - `describe scene at 2025-08-12 14:30Z`
  - `delete scene "Scene 3 of 7"`
  - `restore scene "Scene 3 of 7"`
  - `update-to-current scene at 2025-08-12 14:30Z`
  - `duplicate scene → 2025-08-12 14:31Z`
  - `copy scene to Storyboard "Alt Narrative"`
  - `refresh thumbnail`
  - `storyboard rename "Old" → "New"`
  - `storyboard describe`
  - `storyboard delete (cascade 4 scenes)`
- `thumbnailAssetRef` ← current (post-op) thumbnail ref; `null` for
  delete + storyboard.delete-cascade.
- `actor` ← from input.
- `timestamp` ← the `now` passed to #215.
- `underlyingActivityId` ← from #215's returned LogEntry (read from
  `scene.properties.provenance[last].was_generated_by.activity_id`).
- `pairActivityId` ← non-null ONLY for copy-to-other's two calls
  (both share the same freshly-minted UUID per review 3A); null
  elsewhere.

LogService calls are awaited with `.catch` + output-channel log —
never surface a LogService error to the user (FR-EDIT-021).

## Disposal contract

`activate()` returns a `vscode.Disposable`. Disposal must:

- Clear every `Map` in-memory (`undoBuffer`, `staleFlagCache`).
- Unregister every `registerCommand` handler.
- Null out the `LogService` reference.
- Emit `onDidChangeStaleFlags` / `onDidChangeUndoQueue` for every
  known `documentUri` so the panel clears its UI.
