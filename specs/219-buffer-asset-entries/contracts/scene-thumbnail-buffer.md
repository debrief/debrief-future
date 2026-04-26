# Contract: Scene-Thumbnail Buffer Service & Refactored Capture API

**Feature**: 219 — Buffer Scene-Thumbnail Asset Entries Until Save
**Date**: 2026-04-25

This contract defines the public TypeScript surface of:
1. The new `SceneThumbnailBuffer` service.
2. The refactored `sceneThumbnailService.writeSceneThumbnail` function.
3. The save-path integration point in `saveSession`'s `storeThumbnails` helper.

REST/GraphQL contracts are not applicable — this is a VS Code extension internal API. The contract is expressed as TypeScript signatures with behavioural guarantees.

---

## 1. `SceneThumbnailBuffer` (NEW)

**Module**: `apps/vscode/src/services/sceneThumbnailBuffer.ts`

### Type definitions

```ts
/** Mirror of a single STAC asset entry, awaiting save-time persistence. */
export interface PendingAssetEntry {
  readonly key: string;                          // 'scene-thumbnail-{ulid}' | 'scene-thumbnail-{ulid}-sm'
  readonly href: string;                         // './scene-thumbnails/scene-{ulid}.png' (or '-sm.png')
  readonly type: 'image/png';
  readonly title: string;
  readonly roles: readonly ['thumbnail'];
}

/** Predicate used at flush time to test whether a buffered key still has a live Scene. */
export type LivePredicate = (assetKey: string) => boolean;
```

### Public class / functional API

```ts
export class SceneThumbnailBuffer {
  /**
   * Add one or more pending entries for a plot. Idempotent on entry.key —
   * a re-enqueue of the same key replaces the previous entry. Order is
   * not significant.
   */
  enqueue(stacItemPath: string, entries: readonly PendingAssetEntry[]): void;

  /**
   * Snapshot of the entries currently pending for `stacItemPath`. Returns
   * an empty array (never throws, never undefined) when there is no buffer
   * for that plot.
   */
  pending(stacItemPath: string): readonly PendingAssetEntry[];

  /** Drops the buffer for `stacItemPath`. No-op if the plot has no buffer. */
  clear(stacItemPath: string): void;

  /** Drops every buffer. Used on extension deactivation and in test cleanup. */
  clearAll(): void;

  /**
   * Returns the entries that should be committed into item.json (those whose
   * `key` passes `live`). Removes them from the buffer. Non-live entries are
   * also removed silently — they will never be persisted.
   *
   * After this call, `pending(stacItemPath)` returns []. The buffer is
   * drained whether or not the caller subsequently writes item.json
   * successfully — see "Save failure" below.
   */
  flush(stacItemPath: string, live: LivePredicate): readonly PendingAssetEntry[];
}
```

### Behavioural guarantees

| Property | Guarantee |
|----------|-----------|
| Per-plot isolation | `clear(A)` MUST NOT affect `pending(B)`. `flush(A, live)` MUST NOT touch buffer entries under any other `stacItemPath`. |
| Deterministic ordering | `pending()` and `flush()` MUST return entries in insertion order. Tests rely on this for stable assertions. |
| Idempotency | `enqueue(P, [e])` followed by `enqueue(P, [e])` MUST yield exactly one entry under `e.key` (the second). |
| No filesystem effects | The buffer MUST NOT touch the filesystem. It deals exclusively with metadata. |
| No PNG bytes retained | The buffer MUST NOT hold PNG byte buffers. (Avoid memory pressure; PNG bytes are on disk.) |
| Save-failure recovery | Spec FR-007 mandates that a failed save preserve the buffer. Therefore `flush()` MUST return the would-be-committed entries WITHOUT removing them; the caller (`storeThumbnails`) MUST call a separate `commit(stacItemPath, committedKeys)` after a successful `item.json` rewrite. **See revision in §3 below.** |

> **Revision note**: To satisfy FR-007 cleanly, the API actually adopts a two-phase pattern. The `flush` method as described above is replaced by `peekPending` (read-only snapshot of currently pending live entries) + `commit` (drop the entries that were successfully written). See §3 for the final API.

### Final API (after FR-007 revision)

```ts
export class SceneThumbnailBuffer {
  enqueue(stacItemPath: string, entries: readonly PendingAssetEntry[]): void;
  pending(stacItemPath: string): readonly PendingAssetEntry[];

  /**
   * Returns the live subset of pending entries (those whose key passes
   * `live`) WITHOUT removing them. Caller writes item.json with these
   * entries merged in, then — on success — calls `commit` to drop them.
   */
  peekLive(stacItemPath: string, live: LivePredicate): readonly PendingAssetEntry[];

  /**
   * Drops the entries with the given keys from the per-plot buffer.
   * Called by the save path after a successful item.json rewrite.
   * Non-live entries (those filtered out at peek time) MAY also be passed —
   * the call is forgiving of missing keys.
   */
  commit(stacItemPath: string, committedKeys: readonly string[]): void;

  /** Drops the buffer for `stacItemPath`. */
  clear(stacItemPath: string): void;

  /** Drops every buffer. */
  clearAll(): void;
}
```

> Note on the non-live drop: when a Scene was undone/deleted, its buffered entry is filtered out of `peekLive` but **also** dropped from the buffer at the next `commit` (since the caller does not pass its key in `committedKeys`, but the buffer can detect the orphan and clean up — alternative: a separate `discardOrphans(stacItemPath, live)` step called inside `commit`). The simplest implementation drops orphans during `peekLive` (since they will never be live again — the predicate is monotonic over a save-cycle). **Final choice**: `peekLive` drops non-live entries from the buffer as a side-effect; `commit` drops the keys it is given. This keeps the API surface to two phases without an `discardOrphans` step.

---

## 2. Refactored `sceneThumbnailService.writeSceneThumbnail`

**Module**: `apps/vscode/src/services/sceneThumbnailService.ts`

### Today

```ts
export interface WriteSceneThumbnailResult {
  readonly assetKey: string;
  readonly largePath: string;
  readonly smallPath: string;
}

export async function writeSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
  largePngBase64: string,
  smallPngBase64: string,
  deps?: SceneThumbnailServiceDeps,
): Promise<WriteSceneThumbnailResult>;
// Side effect: writes two PNGs AND merges item.json.assets atomically.
```

### After

```ts
export interface WriteSceneThumbnailResult {
  readonly assetKey: string;
  readonly largePath: string;
  readonly smallPath: string;
  /**
   * The two pending asset entries (large + small). Caller is expected to
   * enqueue these into SceneThumbnailBuffer. Returned (rather than enqueued
   * by this function) so the service stays free of DI on the buffer
   * singleton — keeps it pure and easily testable.
   */
  readonly pendingEntries: readonly [PendingAssetEntry, PendingAssetEntry];
}

export async function writeSceneThumbnail(
  stacItemPath: string,
  sceneId: string,
  largePngBase64: string,
  smallPngBase64: string,
  deps?: SceneThumbnailServiceDeps,
): Promise<WriteSceneThumbnailResult>;
// Side effect: writes two PNGs atomically. NO LONGER reads or mutates item.json.
```

### Behavioural changes

| Property | Today | After |
|----------|-------|-------|
| PNGs on disk after success | Yes, atomic | Yes, atomic — unchanged |
| `item.json` read | Yes | **No** — function no longer touches `item.json` |
| `item.json` mutated | Yes (assets merged + atomic rewrite) | **No** |
| Error taxonomy | `invalid-scene-id`, `empty-png`, `stac-item-not-found`, `item-json-unreadable`, `item-json-malformed`, `write-failed`, `rename-failed` | Same minus `item-json-unreadable`, `item-json-malformed`, and the rename-failed-on-item.json variant. PNG-write failures (`write-failed`, `rename-failed` for PNG paths) are preserved. |
| Atomicity contract | If `item.json` rewrite fails, `item.json` is unchanged but PNGs may already be on disk (orphan). | If a PNG write fails, no `item.json` mutation has happened (because there is none in this function), and any tmp file is cleaned up. The first PNG may be on disk if the second fails — same partial-failure shape as today (orphans handled by GC). |

### Atomicity boundary (FR-012)

The save-time `item.json` rewrite (in `storeThumbnails`, see §3) preserves the existing all-or-nothing guarantee by reusing the same tmp + fsync + rename helper that today's `writeSceneThumbnail` uses internally. Failure during the rewrite leaves `item.json` byte-identical to its pre-save state.

---

## 3. Save-path integration: `storeThumbnails` in `saveSession.ts`

**Module**: `apps/vscode/src/commands/saveSession.ts`

### Today

```ts
function storeThumbnails(
  storePath: string,
  plotUri: string,
  largePngBase64: string,
  smallPngBase64: string,
): void;
// Reads item.json, sets assets.thumbnail and assets.thumbnail-sm, writes back.
```

### After

```ts
function storeThumbnails(
  storePath: string,
  plotUri: string,
  largePngBase64: string,
  smallPngBase64: string,
  pendingSceneEntries: readonly PendingAssetEntry[],   // NEW
): void;
// Reads item.json, sets assets.thumbnail / assets.thumbnail-sm,
// merges in every entry from pendingSceneEntries, writes back atomically.
```

The factory `createSaveSessionCommand` is extended to also accept the `SceneThumbnailBuffer` singleton:

```ts
export function createSaveSessionCommand(
  sessionManager: SessionManager,
  getStorePath: (storeId: string) => string | undefined,
  getMapPanel?: () => MapPanel | undefined,
  buffer?: SceneThumbnailBuffer,                       // NEW (optional for tests; required at runtime)
): () => Promise<void>;
```

### Save command order of operations (after change)

1. Read active session + plot URI; abort if absent (unchanged).
2. Check dirty flag; abort if clean (unchanged).
3. Resolve save path (unchanged).
4. Persist session state via `saveSession(...)` (unchanged).
5. Capture plot thumbnail via `MapPanel.requestThumbnailCapture(5000)` (unchanged).
6. **NEW**: Resolve `stacItemPath` from `parseStacUri` + `getStorePath`. Build `livePredicate` from current in-memory features (the `MapPanel.getCurrentFeatures()` result). Call `buffer.peekLive(stacItemPath, live)` to obtain the live pending entries.
7. Call `storeThumbnails(storePath, plotUri, largeBase64, smallBase64, peekedEntries)` — single atomic `item.json` rewrite, merging plot thumbnails AND buffered scene-thumbnail entries.
8. **NEW**: On success, call `buffer.commit(stacItemPath, peekedEntries.map(e => e.key))` to drain the committed entries from the buffer.
9. **NEW**: On failure of step 7, the buffer is left intact (FR-007). Subsequent save retries re-peek and re-attempt.

### Atomicity

Single `item.json` rewrite per save. If step 7 fails:
- `item.json` is byte-identical to pre-save (existing tmp + fsync + rename guarantee).
- Buffer is unchanged — `commit` is only called on success.
- Plot thumbnail PNG files written by `storeThumbnails` may already be on disk; this is the same partial-failure shape as today, accepted by spec (orphan cleanup via GC).

---

## 4. Capture path integration: `captureScene` command

**Module**: `apps/vscode/src/commands/captureScene.ts`

### Change at line 256–271 (today: `await deps.writeSceneThumbnail(stacItemPath, sceneId, large, small)`)

After change: the same call is made, the returned `pendingEntries` are enqueued into the buffer:

```ts
const result = await deps.writeSceneThumbnail(
  stacItemPath, sceneId, thumbnails.largePngBase64, thumbnails.smallPngBase64,
);
deps.buffer.enqueue(stacItemPath, result.pendingEntries);
```

`CaptureCommandDeps` gains a `buffer: SceneThumbnailBuffer` field; tests inject a real or fake buffer. The `extension.ts` wiring (around line 269 — `setThumbnailService({ captureThumbnail })`) is updated to pass the singleton through to the capture port.

The `EditThumbnailService.captureThumbnail` port shape (which returns `{ assetKey }`) is unchanged — the port implementation in `extension.ts` enqueues into the buffer immediately after the PNG write, before returning the asset key.

---

## 5. Plot-close hook (no public API change)

When a plot closes (existing `mapPanel` lifecycle / `StoryboardEditService.onPlotClosed`), the buffer for that `stacItemPath` is cleared:

```ts
buffer.clear(stacItemPath);
```

This is wired in `extension.ts` alongside the existing `gcOrphanAssets` call on plot close. The order is: clear buffer → run `gcOrphanAssets`. The buffer clear is necessary because (a) any captured-but-unsaved entries are no longer reachable, (b) without the clear, a re-open of the same plot would inherit stale buffer state.

---

## 6. Type-safety notes (Constitution Article XV)

- All new types are concrete; no `any`.
- `PendingAssetEntry.type` and `.roles` are literal types (`'image/png'`, `readonly ['thumbnail']`) — narrower than the on-disk shape, but a strict subset, so the merge into `item.json.assets` is type-safe.
- `LivePredicate` is a named type alias for clarity at the call site.

---

## 7. Failure-mode summary (audit table)

| Scenario | Before this change | After this change |
|----------|--------------------|-------------------|
| Capture succeeds, save succeeds | `item.json` rewritten on capture, then again on save | `item.json` rewritten once on save |
| Capture succeeds, save fails | `item.json` already updated on capture; save failure leaves it inconsistent (asset entries committed but session not saved) | `item.json` untouched on capture; save failure leaves both `item.json` and session unsaved (consistent) |
| Capture succeeds, user discards | `item.json` already updated on capture; discard leaves stale asset entries pointing at PNGs that never get a Scene reference | `item.json` byte-identical to pre-session state; PNGs orphan, GC reclaims |
| Capture succeeds, Scene undone, save | `item.json` has stale asset entries from the captured-then-undone Scene; orphan-asset GC cleans up on plot close | Buffered entries filtered out at save (filter-on-flush); `item.json` never sees them |
| Capture fails (PNG write fails) | Throw `SceneThumbnailError(write-failed)`; `item.json` unchanged (failure happens before merge) | Same — throw `SceneThumbnailError(write-failed)`; `item.json` unchanged |
| Capture succeeds, capture fails on second PNG | First PNG orphaned, throw; `item.json` unchanged | Same — first PNG orphaned, throw; `item.json` unchanged. Buffer not enqueued (caller only enqueues on full success). |
