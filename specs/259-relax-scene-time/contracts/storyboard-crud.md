# Contract: Storyboard CRUD (post-#259)

**Module**: `@debrief/components` → `shared/components/src/storyboard/`
**Boundary**: Pure in-memory `Plot` → `Plot` transformations. No I/O, no persistence. Callers pipe the resulting plot through `stac-writer` for storage (unchanged).

---

## Public surface — exported symbols

```ts
// shared/components/src/storyboard/index.ts (post-#259 public surface)

// Operations (unchanged signatures unless noted)
export { createStoryboard } from './crud';
export { createScene } from './crud';                  // signature unchanged; behaviour: no longer throws on duplicate timestamp
export { updateScene } from './crud';                  // signature unchanged; behaviour: no longer throws on duplicate timestamp
export { deleteScene } from './crud';                  // signature unchanged; behaviour: leaves creation_order gap
export { duplicateScene } from './crud';               // signature unchanged; behaviour: no longer throws on duplicate timestamp
export { copySceneToOtherStoryboard } from './crud';   // signature unchanged; behaviour: no longer throws on duplicate timestamp
export { restoreScene } from './crud';                 // signature unchanged; behaviour: no longer throws on duplicate timestamp

// NEW operation (this feature)
export { reorderSceneInTiedGroup } from './crud';

// Ordering
export { listScenesOrdered } from './ordering';         // signature unchanged; sort key extended to (timestamp, creation_order)

// Errors — public list churn
// REMOVED:
//   export { DuplicateTimestampError } from './errors';
// ADDED:
export { DuplicateCreationOrderError } from './errors';
export { CreationOrderOutOfRangeError } from './errors';
export { MissingCreationOrderError } from './errors';
export { UnsupportedSchemaVersionError } from './errors';
```

---

## `createScene` — modified behaviour

```ts
function createScene(
  plot: Plot,
  args: {
    storyboardId: string;       // ULID
    timestamp: string;          // ISO-8601 instant
    viewport: Viewport;
    visibleFeatureIds: string[];
    title?: string;
    description?: string;
    thumbnailAssetRef: string;
    transitionDurationMs?: number;
    displayMode?: DisplayModeEnum;
  }
): { plot: Plot; sceneId: string };
```

**Pre-conditions** (unchanged from #215 except as noted):
- `plot` validates (no missing creation_order anywhere, no duplicate creation_order in the target Storyboard).
- `args.storyboardId` resolves to an existing Storyboard in `plot`.
- `args.timestamp` is a valid ISO-8601 instant.
- ~~`args.timestamp` is not equal to any existing Scene's timestamp in the same Storyboard.~~ **REMOVED.**

**Behaviour**:
- New Scene receives `creation_order = max(creation_order over existing Scenes in this Storyboard) + 1`. If the Storyboard has no Scenes, `creation_order = 0`.
- All other field assignment is unchanged from #215.

**Post-conditions**:
- The new Scene appears in `listScenesOrdered(returned_plot, storyboardId)` at the position determined by `(timestamp, creation_order)` ASC.
- When the new Scene's `timestamp` equals one or more existing Scenes' timestamps, the new Scene appears *last* in that tied group (FR-011).

**Throws**:
- ~~`DuplicateTimestampError`~~ — **never** thrown by this operation any more.
- `MissingCreationOrderError` — if `plot` itself fails the pre-condition (carries pre-#259 Scenes). Surfaced by the validator the caller invoked, not by `createScene` itself.

---

## `reorderSceneInTiedGroup` — NEW

```ts
function reorderSceneInTiedGroup(
  plot: Plot,
  args: {
    sceneId: string;
    newPositionInGroup: number;   // 0-based, within the tied-timestamp group
  }
): { plot: Plot };
```

**Pre-conditions**:
- `plot` validates.
- `args.sceneId` resolves to an existing Scene.
- `args.newPositionInGroup` is in `[0, tied_group_size)` where `tied_group_size` is the count of Scenes in the same Storyboard sharing the target's `timestamp` (always ≥ 1 — the target is one of them).

**Behaviour**:
- Computes the tied group: all Scenes in `plot` with the same `storyboard_id` and the same `timestamp` as the target.
- Sorts the tied group by current `creation_order` ASC → ordered list of size `G`.
- Removes the target from the list; inserts it at `newPositionInGroup`.
- Re-assigns `creation_order` across the tied group: the i-th member of the new list takes `creation_order = group_min_creation_order + i`, where `group_min_creation_order` is the minimum `creation_order` of the original tied group.
- Scenes outside the tied group are untouched.

**Post-conditions**:
- Target Scene now appears at index `newPositionInGroup` within its tied group (verifiable via `listScenesOrdered`).
- All other Scenes' positions in the Storyboard are unchanged.
- `creation_order` values remain unique within the Storyboard (FC-I4 preserved).

**Throws**:
- `CreationOrderOutOfRangeError` if `newPositionInGroup` is outside `[0, tied_group_size)`.
- `MissingCreationOrderError` if `plot` fails the pre-condition.

---

## `listScenesOrdered` — modified sort key

```ts
function listScenesOrdered(plot: Plot, storyboardId: string): SceneFeature[];
```

**Behaviour**:
- Returns all Scenes in `plot` belonging to the given `storyboardId`, sorted by:
  1. `properties.timestamp` ASC (lexicographic on ISO-8601 — equivalent to chronological for well-formed instants).
  2. `properties.creation_order` ASC.

**Throws**:
- `MissingCreationOrderError` if any matched Scene lacks `creation_order` (i.e., the caller skipped validation).

---

## Acceptance test contract (Vitest)

Each test below maps 1:1 to a spec FR. Tests live in `shared/components/src/storyboard/__tests__/`.

| Test ID | Spec FR | File | Assertion |
|---------|---------|------|-----------|
| AT-001 | FR-001 | `crud.test.ts` | `createScene` succeeds when a Scene already exists at the same timestamp; returned Storyboard has both Scenes; the new Scene is last in the tied group. |
| AT-002 | FR-002 | `crud.test.ts` | `createScene` continues to behave as today when the new timestamp is earlier than the latest (preserved behaviour test — does not introduce new regression). |
| AT-003 | FR-003 | `ordering.test.ts` | `listScenesOrdered` returns `[A, B]` for two Scenes at the same timestamp where A has `creation_order` 5 and B has 6. |
| AT-004 | FR-004 + FR-011 | `crud.test.ts` | Three sequential `createScene` calls at the same timestamp produce `creation_order` values `0, 1, 2` (or `N, N+1, N+2` if the Storyboard already has N Scenes). |
| AT-005 | FR-005 | `crud.test.ts` | After `createScene`, the returned Scene's `creation_order` is present, an integer, ≥ 0, and persisted on the Feature properties (not stashed in a sidecar). |
| AT-006 | FR-006 | `ordering.test.ts` | `listScenesOrdered` produces the same order for two arbitrary permutations of the same Scene set (sort key is deterministic). |
| AT-007 | FR-007 | `reorder.test.ts` | `reorderSceneInTiedGroup(target=B, newIdx=2)` on tied group `[A, B, C]` (creation_order 5,6,7) yields `[A, C, B]` with creation_order `5,6,7` (re-assigned). |
| AT-008 | FR-008 | `reorder.test.ts` | `deleteScene(B)` on tied group `[A,B,C]` (5,6,7) yields `[A,C]` with creation_order `5,7` (gap permitted, no renumber). |
| AT-009 | FR-009 | `reorder.test.ts` | `updateScene(B, viewport=...)` leaves B at its original position; creation_order unchanged. |
| AT-010 | FR-010 | `validate.test.ts` | Loading `storyboard-scene-missing-creation-order.json` throws `MissingCreationOrderError` whose payload names the offending Storyboard ID and Scene ID. |
| AT-011 | FR-011 | `crud.test.ts` | After appending a new Scene to a tied group of size 2, the new Scene appears at index 2 (i.e., last in the group). |
| AT-012 | FR-012 | (n/a — code review) | Public exports do not expose `creation_order` as a first-class user-facing field; user-facing APIs accept `newPositionInGroup`, not raw creation_order values. |
| AT-013 | FC-I4 | `validate.test.ts` | Loading `storyboard-scene-duplicate-creation-order.json` throws `DuplicateCreationOrderError`. |
| AT-014 | (defensive) | `reorder.test.ts` | `reorderSceneInTiedGroup(target=A, newIdx=99)` on a 3-Scene tied group throws `CreationOrderOutOfRangeError`. |
| AT-015 | R-007 | `validate.test.ts` | Loading a plot with `schema_version=1` throws `UnsupportedSchemaVersionError` before FC-I5 fires. |
