# Phase 1 — Data Model: Storyboarding — Edit Suite + Housekeeping

**Feature**: 218-storyboarding-edit
**Date**: 2026-04-23
**Schema deltas**: **None.** Every mutation round-trips through
#215's already-shipped `StoryboardFeature` / `SceneFeature` /
`LogEntry` types.

This document enumerates the **view-model** and **extension-side
transient-state** types introduced by this slice. None of them are
persisted to disk; none of them enter the plot FeatureCollection.

---

## 1. `DeletedScene` (undo buffer record)

**Owner**: `apps/vscode/src/services/storyboardEdit.ts`.
**Lifetime**: from `deleteScene` call until either the undo toast is
actioned, the buffer cap evicts it, the plot closes, or the VS Code
window closes.
**Persistence**: none — pure extension memory (R1).

```ts
export interface DeletedScene {
  /** The original Scene Feature, byte-identical to its pre-delete state
      (same id, same visibleFeatureIds, same pre-delete provenance[]).
      The pre-delete provenance already includes the {op:"delete"}
      entry because #215 appends it before removing the feature
      (crud.ts:686-688). */
  readonly original: SceneFeature;
  /** The Storyboard this Scene belonged to (used for the restore
      quick-path — restore goes back to the same storyboardId). */
  readonly storyboardId: string;
  /** When the delete happened, for toast-ordering + telemetry. */
  readonly deletedAt: string; // ISO-8601
}

/** Derived accessor — the delete activity_id lives in the last
 *  entry of original.properties.provenance[] (appended by #215
 *  before removal). Expose via a getter, not as a stored field,
 *  to avoid drift (review 7A). */
export const deleteActivityIdOf = (d: DeletedScene): string =>
  d.original.properties.provenance[
    d.original.properties.provenance.length - 1
  ].was_generated_by.activity_id;
```

**Invariants**:

- `original.properties.id` is unique within the buffer (duplicate
  entries mean the Scene was resurrected then re-deleted; only the
  most recent record is kept).
- `original.properties.storyboard_id === storyboardId` (redundant
  field kept for typed ergonomics at the toast surface).
- `original.properties.provenance[last].op === "delete"` — the
  pre-delete provenance already includes the delete entry, because
  #215 appends it before removing the feature (per
  `crud.ts:686-688`). `deleteActivityIdOf(d)` reads this entry's
  `activity_id` without duplication.

**Cap behaviour**: buffer is a `SceneFeature[]` used as a FIFO of
length ≤ 50. On `push` with `length === 50`, drop index 0 (the
oldest delete is finalised — its toast, if still visible, is
dismissed silently).

**Memory estimate (revised per review 12A)**: a fresh Scene carries
a single-entry `provenance[]` (~500 B–1 KB including the ULID, actor,
`used`/`generated` fields, and timestamp). A Scene that has been
edited 50 times carries ~50 entries. Worst case:
50 buffer entries × 50 provenance entries × 1 KB ≈ **2.5 MB per
plot**, not the ~100 KB estimated pre-review. Still acceptable in
absolute terms — documented here so future contributors size
expectations correctly, and captured in a BACKLOG entry
(*Storyboard undo-stack capacity setting*) for a configurable cap.

---

## 2. `StaleFlagCache` (stale-thumbnail detection results)

**Owner**: `apps/vscode/src/services/storyboardEdit.ts`.
**Lifetime**: from plot open until plot close. Invalidated per-Scene
on successful `updateScene`, `deleteScene`, or `createScene`
(including restore).
**Source of truth for the read**: composes #215's
`readSceneWithStaleness(plot, sceneId)` (from
`shared/components/src/storyboard/queries.ts`) with
`computeFeatureSetHash` (from `shared/components/src/storyboard/hash.ts`).
The stale-pass does not re-read `scene.properties.{feature_set_hash,
visible_feature_ids}` directly — review decision 5A.

```ts
export interface StaleFlag {
  /** The Scene whose hash mismatch was detected. */
  readonly sceneId: string;
  /** True when recomputed feature_set_hash ≠ stored feature_set_hash. */
  readonly stale: boolean;
  /** feature_ids from the stored visible_feature_ids that do not
      resolve in the current plot's non-Scene feature set. Non-empty
      implies `stale` regardless of hash (a partial-resolve is always
      stale). May be empty when the hash mismatch is caused by an
      attribute drift rather than id absence. */
  readonly unresolvedFeatureIds: readonly string[];
  /** When the pass ran — for telemetry; not user-visible. */
  readonly computedAt: string; // ISO-8601
}

export type StaleFlagCache = ReadonlyMap<string /* sceneId */, StaleFlag>;
```

**Invariants**:

- Every Scene on the currently-open plot has exactly one entry in
  the cache after the on-plot-open pass completes.
- `stale === true` ⟹ the badge renders in the panel with the
  tooltip enumerating `unresolvedFeatureIds` (per FR-EDIT-017).
- `stale === false && unresolvedFeatureIds.length === 0` — the
  steady state.
- `stale === true && unresolvedFeatureIds.length === 0` — hash drift
  without ID absence (e.g., the analyst reordered
  `visible_feature_ids` outside the canonical ordering; rare because
  #215 canonicalises on write, but possible on hand-edited fixtures).

---

## 3. `SceneEditViewModel` (per-Scene row view model)

**Owner**: `shared/components/src/panels/StoryboardPanel/types.ts`.
**Lifetime**: per render; derived from the plot FeatureCollection +
the extension-side `StaleFlagCache` + per-row UI state (edit form
open/closed).

```ts
export interface SceneEditViewModel {
  readonly sceneId: string;
  readonly title: string;
  readonly description: string | null;
  readonly timestamp: string;              // ISO-8601
  readonly titleIsEditing: boolean;        // inline rename in progress
  readonly editFormOpen: boolean;          // expanded edit form visible
  readonly pendingDelete: boolean;         // toast undo window active
  readonly stale: boolean;                 // from StaleFlagCache
  readonly unresolvedFeatureIds: readonly string[];
  readonly missingData:                    // from #215's detectMissingDataForScene
    | { kind: "ok" }
    | { kind: "missing-features"; ids: readonly string[] }
    | { kind: "out-of-range"; scenario: "before-start" | "after-end" };
}
```

**Derivation** (done extension-side; webview consumes ready-made
view model):

- `sceneId` ← `scene.properties.id`
- `title` ← `scene.properties.title` (never `null`; #215 defaults to
  `formatDtg(timestamp)` on create if unset)
- `description` ← `scene.properties.description ?? null`
- `timestamp` ← `scene.properties.timestamp`
- `titleIsEditing` / `editFormOpen` / `pendingDelete` ← per-row UI
  state, owned by the panel React tree
- `stale` / `unresolvedFeatureIds` ← from `StaleFlagCache`
- `missingData` ← from `detectMissingDataForScene(plot, scene,
  currentTimeRange)` (#215)

**Rendering rules**:

- `missingData.kind !== "ok"` ⟹ the edit form (when opened) shows the
  missing-data details panel with remediation buttons.
- `stale === true` ⟹ render `StaleBadge` on the row.
- `pendingDelete === true` ⟹ row hidden from the scrolling list
  (moved into the undo toast's "pending" list); render restores it.
- `editFormOpen === true` ⟹ row is expanded to full `SceneEditForm`
  height.

---

## 4. `StoryboardEditViewModel` (Storyboard-level view model)

**Owner**: `shared/components/src/panels/StoryboardPanel/types.ts`.
**Lifetime**: per render; derived from the plot FeatureCollection +
per-panel UI state.

```ts
export interface StoryboardEditViewModel {
  readonly storyboardId: string;
  readonly name: string;
  readonly description: string | null;
  readonly nameIsEditing: boolean;         // inline rename in progress
  readonly descriptionExpanded: boolean;   // collapsed by default
  readonly sceneCount: number;             // cached for delete-cascade confirm
}
```

---

## 5. `UndoToastState` (pending-delete UI state)

**Owner**: `apps/vscode/src/services/storyboardEdit.ts` for the
host-side (native VS Code notification), and
`shared/components/src/panels/StoryboardPanel/UndoToast.tsx` for the
reusable presentational variant (used in Storybook + web-shell where
no VS Code host is available).

```ts
export interface UndoToastState {
  readonly sceneId: string;
  readonly sceneTitle: string;
  readonly deletedAt: string;              // ISO-8601 — for the "deleted 3s ago" copy
  readonly canUndo: boolean;               // false once finalised (buffer eviction)
}
```

**Lifecycle**:

- Enter: `deleteScene` succeeds → toast mounts with `canUndo = true`.
- Exit via Undo: `canUndo = true` → click → service calls
  `createScene({ idOverride, ..., provenance: [...original.provenance,
  restoreEntry] })` → toast dismisses; row reappears byte-identically.
- Exit via dismissal: analyst closes the toast manually → buffer
  entry stays until cap eviction or plot close.
- Exit via cap eviction: buffer overflow drops the oldest → toast (if
  still visible) dismisses silently; `canUndo` would have been
  toggled to `false` had the toast been re-rendered.

---

## 6. `RefreshThumbnailResult` (service return type)

**Owner**: `apps/vscode/src/services/storyboardEdit.ts`.

```ts
export type RefreshThumbnailResult =
  | { kind: "ok"; scene: SceneFeature }
  | { kind: "thumbnail-failed"; error: Error };
```

Callers pattern-match: `"ok"` ⟹ silent success + stale flag clears;
`"thumbnail-failed"` ⟹ red toast + stale flag persists.

---

## 7. `UpdateToCurrentInput` / `UpdateToCurrentResult`

**Owner**: `apps/vscode/src/services/storyboardEdit.ts`.

```ts
export interface UpdateToCurrentInput {
  readonly sceneId: string;
  /** View state captured from the map at the moment the user clicked. */
  readonly currentView: {
    readonly viewport: Viewport;
    readonly timestamp: string;
    readonly visibleFeatureIds: readonly string[];
  };
  readonly actor: string;
}

export type UpdateToCurrentResult =
  | { kind: "ok"; scene: SceneFeature }
  | { kind: "thumbnail-failed"; error: Error }
  | { kind: "duplicate-timestamp-collision";
      existingSceneId: string;
      resolution: "replace" | "offset" | "cancel"; // chosen by user
    };
```

---

## 8. `StoryboardEditOp` (LogService discriminator)

**Owner**: `services/session-state/src/log/types.ts`.
**Consumers**: `LogService.recordStoryboardEdit`, #176 card renderer.

```ts
// StoryboardOp — re-exported from @debrief/components/storyboard
// (added to #215's index.ts in this slice's diff per review 6A).
// This is the canonical op taxonomy used by #215's internal
// buildStoryboardCrudLogEntry.
export type StoryboardOp =
  | "create"
  | "insert-middle"
  | "rename"
  | "describe"
  | "delete"
  | "update-to-current"
  | "duplicate"
  | "copy-in"
  | "storyboard.rename"
  | "storyboard.describe"
  | "storyboard.delete-cascade";

// StoryboardEditOp — #218's log-recorder discriminator. EXTENDS
// StoryboardOp rather than duplicating it; new ops only added for
// concerns that live entirely in #218's orchestration layer.
export type StoryboardEditOp =
  | StoryboardOp
  | "restore"                     // undoDeleteScene only — #218-only
  | "copy-out"                    // source-side log card for copy-to-other pair
  | "refresh-thumbnail"           // #218-only; #215 has no refresh op
  | "refresh-all-stale";          // bulk refresh rollup; FR-EDIT-025
```

Notes:

- `copy-to-other-storyboard` produces **two** `LogEntries` in
  `item.json`'s timeline (per review 3A): one `copy-out` on the
  source, one `copy-in` on the destination. Both carry the same
  `pairActivityId` (see §9 below) so the LogPanel can render them
  as visually linked cards. This mirrors #215's provenance where
  `copy-to-other-storyboard` appends one entry per affected
  Scene.
- `storyboard.delete-cascade` is used when deletion removes Scenes;
  emits a single log card showing the count (cascade is atomic at
  the #215 level, so one card is faithful).
- `insert-middle` stays inside #215's internal classification —
  `createScene` emits either `create` or `insert-middle` depending
  on timestamp position. #218 emits the outer op (`duplicate`,
  `restore`) — the inner classifier stays on the provenance tail.
- `refresh-all-stale` (FR-EDIT-025) is emitted as a **rollup log
  card** after the bulk action completes, in addition to the
  per-Scene `refresh-thumbnail` cards. The rollup card shows
  `{ succeeded, failed }` tallies; individual cards carry
  per-Scene detail.

---

## 9. `StoryboardEditLogEntryPayload`

**Owner**: `services/session-state/src/log/types.ts`.
**Wire format**: the payload passed to `recordStoryboardEdit`, which
`entryBuilder.ts` shapes into a `LogEntry` with
`was_generated_by.tool = STORYBOARD_EDIT_TOOL_SENTINEL` and
`was_generated_by.tool_args = { op, sceneId, storyboardId }`.

```ts
export interface StoryboardEditLogEntryPayload {
  readonly op: StoryboardEditOp;
  readonly storyboardId: string;
  /** null for Storyboard-level ops. */
  readonly sceneId: string | null;
  /** null when the Scene has been deleted (cannot carry a thumbnail
      URL after the asset is unreferenced) — the card renders a
      placeholder in that case. */
  readonly thumbnailAssetRef: string | null;
  readonly actor: string;
  /** One-line human summary, ≤ 120 chars. */
  readonly summary: string;
  /** ISO-8601 timestamp of the edit. */
  readonly timestamp: string;
  /** activity_id of the #215 LogEntry produced by the same edit —
      lets the #176 card cross-link to the feature's provenance. */
  readonly underlyingActivityId: string;
  /** Non-null only for paired ops (currently copy-out + copy-in
      pair for copy-to-other). Both halves carry the SAME
      pairActivityId so #176 can render them as visually linked
      cards with a link affordance. Review decision 3A. */
  readonly pairActivityId: string | null;
}
```

---

## Entity relationships (textual)

```
Plot (from #215)
├─ Storyboard Feature ──┐
│   └─ provenance[] ◄──── #215 CRUD module (write)
│   └─ has-many Scene Features ──┐
│                                │
│                                ├─ provenance[] ◄──── #215 CRUD module (write)
│                                └─ thumbnail_asset_ref → sceneThumbnailService (#174)
│
└─ (rest of plot features)

Extension-side (ephemeral)
├─ StoryboardEditService
│   ├─ undoBuffer: Map<documentUri, DeletedScene[]>
│   ├─ staleFlagCache: Map<documentUri, Map<sceneId, StaleFlag>>
│   └─ logService: LogService | null
│       └─ recordStoryboardEdit ──→ LogPanel (#176) timeline

Panel-side (per render)
├─ StoryboardEditViewModel (per Storyboard)
└─ SceneEditViewModel[] (per Scene in active Storyboard)
```

## State transitions: Scene lifecycle under the edit suite

```
                         ┌────────────────────────── rename ───────────────┐
                         │                                                 ▼
created (via #216/#218) ─┼── describe ────────► "published"                ┃
                         │                      ▲    │   │                 ┃
                         │                      │   update-to-current      ┃
                         │                      │    │   │                 ┃
                         │                      │    ▼   ▼                 ┃
                         │                      │   [re-snapshot]          ┃
                         │                      │    │                     ┃
                         │                      │    ▼                     ┃
                         │                   refresh-thumbnail → "fresh"   ┃
                         │                      │                          ┃
                         │                 (feature hash drift)            ┃
                         │                      │                          ┃
                         │                      ▼                          ┃
                         │                   "stale"                       ┃
                         │                      │                          ┃
                         │             ┌────────┼────────┐                 ┃
                         │             ▼        ▼        ▼                 ┃
                         │      duplicate  copy-out  delete                ┃
                         │             │        │        │                 ┃
                         │             ▼        ▼        ▼                 ┃
                         └── new Scene  new Scene  (pending delete)        ┃
                             on same    on dest     │                      ┃
                             sb         sb          ├── undo → back to ────┘
                                                    │   "published" (restored
                                                    │    byte-identically)
                                                    │
                                                    └── session ends → finalised
```

**Provenance accretion per op** (all via #215):

| Edit op | provenance entries added |
|---------|--------------------------|
| rename | 1 × `{ op: 'rename' }` on Scene |
| describe | 1 × `{ op: 'describe' }` on Scene |
| delete (pending) | 1 × `{ op: 'delete' }` on Scene (pre-removal; required for the restore replay) |
| restore | 1 × `{ op: 'create' }` on the new-same-id Scene, whose provenance `= [...preDelete, deleteEntry, restoreEntry]` |
| update-to-current | 1 × `{ op: 'update-to-current' }` on Scene |
| duplicate | 1 × `{ op: 'duplicate' }` on the new Scene (not on source) |
| copy-to-other | 1 × `{ op: 'copy-out' }` on source Scene, 1 × `{ op: 'copy-in' }` on new Scene |
| refresh-thumbnail | 1 × `{ op: 'refresh-thumbnail' }` on Scene |
| storyboard.rename | 1 × `{ op: 'rename' }` on Storyboard |
| storyboard.describe | 1 × `{ op: 'describe' }` on Storyboard |
| storyboard.delete-cascade | 1 × `{ op: 'delete' }` on Storyboard (captures cascaded Scene ids in `used[]`) |

**LogService entries** (per review 3A): exactly one per provenance
entry. `copy-to-other-storyboard` writes **two** provenance entries
(one per affected Scene) and so emits **two** `recordStoryboardEdit`
calls: one with `op: "copy-out"` referencing the source Scene, and
one with `op: "copy-in"` referencing the new destination Scene.
Both calls share a freshly-minted `pairActivityId` (UUID minted in
`StoryboardEditService.copySceneToOtherStoryboard` before the first
recorder call). The LogPanel consumes `pairActivityId` to render a
visual link between the two cards; absent a linked renderer, they
still appear as two chronologically-adjacent cards with identical
`pairActivityId`.

All other ops emit a single entry with `pairActivityId: null`.
`refresh-all-stale` emits one rollup card + N per-Scene
`refresh-thumbnail` cards (no pair relationship; the rollup is
identified by its own `op`).
