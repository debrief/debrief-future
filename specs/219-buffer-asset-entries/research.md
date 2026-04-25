# Research: Buffer Scene-Thumbnail Asset Entries Until Save

**Feature**: 219 — Buffer Scene-Thumbnail Asset Entries Until Save
**Date**: 2026-04-25
**Status**: Phase 0 complete — no `[NEEDS CLARIFICATION]` markers carried over from spec.

This document records the small set of design decisions taken before any code was written. Each entry follows the standard Decision / Rationale / Alternatives shape.

---

## R-1. Where the buffer lives

**Decision**: A new singleton service `SceneThumbnailBuffer` colocated with the existing `sceneThumbnailService` in `apps/vscode/src/services/sceneThumbnailBuffer.ts`. Instantiated once in `extension.ts` and injected into both the capture path (via the `captureThumbnail` port already wired into `StoryboardEditService`) and the save path (via the `createSaveSessionCommand` factory).

**Rationale**:
- The buffer has its own lifecycle (per-extension-activation) and its own state (per-plot pending entries). Co-locating it with `sceneThumbnailService` would either force that module to become stateful (regression — it is currently a pure functional façade) or split its API across instance/static surfaces (regression — internal cognitive cost).
- The buffer is consumed by two unrelated callers — capture and save. A peer service serves both without creating an awkward "import sceneThumbnailService from saveSession" coupling.
- Singleton state is acceptable here because the extension host is a single-process / single-window context. The same pattern is used elsewhere in the extension (e.g. `ResultsPanelService`, `StoryboardEditService`).

**Alternatives considered**:
- **Attach to per-plot session state (`SessionStoreWithUndo`)**. Rejected — would couple session-state, which is generic and reused by other surfaces, to an asset-entry concern that only the VS Code extension cares about. Spec FR-008 (discard drops the buffer) and FR-011 (per-plot isolation) are easy to satisfy without dragging session-state into it.
- **Stateful method on `sceneThumbnailService`**. Rejected — the service is a deliberately stateless functional façade and the surrounding tests rely on that. Adding state would force a constructor / DI rework everywhere it is currently called.
- **Inline state in `MapPanel`**. Rejected — the buffer is plot-scoped, not panel-scoped. Multi-plot sessions need independent buffers; tying to `MapPanel` would require us to invent a way for the save path to find the right `MapPanel` instance from the save command.

---

## R-2. What the buffer key is

**Decision**: Buffer entries are keyed by `stacItemPath` (outer map) and `assetKey` (inner map). `stacItemPath` is the absolute path of the STAC item directory — exactly the value the existing `sceneThumbnailService.writeSceneThumbnail` already accepts.

**Rationale**:
- `stacItemPath` is the canonical handle the capture path already passes to the thumbnail service. Reusing it keeps the buffer API symmetrical with the existing service surface.
- The save path can derive the same `stacItemPath` from `parseStacUri(plotUri)` + the store path resolver — both already available in `saveSession.ts`. No new lookup machinery required.
- `assetKey` (inner key) — `scene-thumbnail-{id}` and `scene-thumbnail-{id}-sm` — gives the buffer a natural dedup unit and trivial collision-free insert.

**Alternatives considered**:
- **Key by `documentUri`**. Rejected — `documentUri` is a `stac://store/catalog/item.json` URI in the editor. Going from a URI to a filesystem path requires `parseStacUri` + the store-path lookup, which only exists where it's already needed (save path). Capture path has `stacItemPath` directly. Choosing `stacItemPath` minimises coordination cost.
- **Key by Scene ID**. Rejected — a Scene produces *two* asset entries (large + small). Keying by Scene ID forces the buffer to wrap pairs into a record, which is just a stylistic choice that doesn't simplify add/remove logic.

---

## R-3. How the buffer handles undo / scene-delete

**Decision**: The buffer is treated as **append-on-capture, filter-on-flush**. At save time we only commit a buffered entry if some Scene Feature in the current in-memory plot still has `thumbnail_asset_ref` matching that entry's `assetKey`. Discarded entries are dropped silently; the corresponding PNG remains on disk and is reclaimed by the existing `gcOrphanAssets` pass on next plot close.

**Rationale**:
- Avoids plumbing buffer-awareness into the storyboardEdit undo / delete-scene paths (which today are concerned only with the in-memory plot, not with on-disk assets).
- Matches the existing `gcOrphanAssets` model — the same liveness predicate (`feature.properties.thumbnail_asset_ref === assetKey || === assetKey + '-sm'`) is reused, just applied pre-save against the buffer rather than post-save against `item.json.assets`.
- Satisfies FR-010 ("system MUST remove its corresponding entry from the buffer so save does not register an orphan asset") via filter-on-flush: a buffered entry whose Scene was undone is silently skipped.

**Alternatives considered**:
- **Explicit `buffer.remove(sceneId)` calls from undo / delete-scene**. Rejected — would require touching `storyboardEditService.deleteScene`, the undo machinery (Zustand undo stack), and the `update-to-current` and `duplicate` paths. Filter-on-flush keeps the buffer one-way (write-only on capture, drained on save) and ignorant of all those code paths.
- **Eager remove via a lifecycle event on plot mutation**. Rejected — would couple the buffer to the in-memory plot mutation cadence (every `mapPanel.setFeatures`). Filter-on-flush is observed once per save, regardless of how many intermediate edits happened.

---

## R-4. Where the save-time merge happens

**Decision**: The buffer flushes through the existing `storeThumbnails(...)` helper in `apps/vscode/src/commands/saveSession.ts`, augmented to also accept the buffer's pending entries and merge them in the same `item.json` rewrite that already sets the plot-level `thumbnail` / `thumbnail-sm` assets.

**Rationale**:
- `storeThumbnails` already does the precise pattern we need: read `item.json`, mutate `assets`, write atomically. Adding the buffer's entries to that mutate step means save commits exactly one `item.json` rewrite — directly satisfies SC-002 ("rewrites drop from N to 1").
- Save success / failure semantics fall out for free: the existing function already writes once at the end; if we clear the buffer only after the write returns successfully, FR-006 (clear on success) and FR-007 (preserve on failure) are satisfied without new control flow.
- Avoids introducing a separate "flush buffer" step that could race with or duplicate the plot-thumbnail rewrite.

**Alternatives considered**:
- **Separate buffer-flush phase before/after `storeThumbnails`**. Rejected — would double the `item.json` write count per save and risk inconsistent state between the two writes.
- **Inline into `sceneThumbnailService` as a new "commit" function**. Rejected — would split the save-path orchestration across two files. Saved-here and discarded-here logic is easier to reason about as a single helper in `saveSession.ts`.

---

## R-5. PNG write timing — eager or also deferred?

**Decision**: PNG writes stay **eager**, exactly as today. Only the `item.json` asset-entry registration is deferred. PNGs that are captured-then-discarded become orphans and are reclaimed by the existing `gcOrphanAssets` pass.

**Rationale**:
- The Storyboard panel renders Scene thumbnails by file-path convention: `webview.asWebviewUri(file://{stacItemPath}/scene-thumbnails/scene-{id}.png)`. The renderer never reads `item.json.assets`. So eager PNG writes are sufficient to satisfy FR-004 ("expose buffered entries to in-process consumers") — the consumer already sees them by virtue of the file existing on disk.
- `stacService` only consumes the plot-level `thumbnail` / `thumbnail-sm` keys (not `scene-thumbnail-*`). So scene-thumbnail asset entries in `item.json` are exclusively a declarative record consumed by `gcOrphanAssets`.
- Deferring the PNG write would require a memory-resident buffer of base64 PNG bytes for every captured Scene (50 captures × ~50 KB/large + ~10 KB/small ≈ 3 MB). Manageable, but unnecessary.
- Discarded captures becoming orphan PNGs is **already a tolerated state** in the codebase — `sceneThumbnailService.writeSceneThumbnail` documents that on partial-failure paths "any already-renamed PNGs are orphaned (harmless — the Scene is never created when this service throws, and orphan PNGs have no item.json asset entry pointing at them)" (sceneThumbnailService.ts:18-20). The existing `gcOrphanAssets` pass handles them.

**Alternatives considered**:
- **Defer PNG writes too (full in-memory capture buffer)**. Rejected on the trade-off above. The marginal cleanness gain — no orphan PNGs from discarded captures — is outweighed by (a) the new memory residency of base64 bytes, (b) the consumer-side complexity (Storyboard panel would need a buffer-aware resolver), (c) the brand-new failure mode of "PNG write fails at save time, after the user thought their captures were committed".

---

## R-6. Test migration strategy

**Decision**: Existing tests in `sceneThumbnailService.test.ts` and `captureScene.test.ts` that assert "after capture, `item.json.assets` contains the new keys" are migrated to the new model:

| Today | After |
|-------|-------|
| `writeSceneThumbnail(...)` → assert `item.json.assets` has the new keys | `writeSceneThumbnail(...)` → assert PNGs on disk and **not** in `item.json.assets`; assert buffer holds the pending entry |
| Capture command → assert `item.json.assets` has scene entries post-capture | Capture command → assert PNGs on disk; assert buffer holds the entries; assert `item.json` byte-identical to pre-capture |

A new `sceneThumbnailBuffer.test.ts` covers the buffer's own contract (add / list pending / clear / per-plot isolation / filter-by-live-refs).

`saveSession.test.ts` is extended to assert (a) buffer entries flush into `item.json` on save, (b) buffer cleared on save success, (c) buffer preserved on save failure.

**Rationale**:
- Spec FR-013 explicitly mandates that existing tests pass without weakening their assertions; tests that asserted the old contract are migrated to assert the new contract verbatim.
- Per Constitution Article VI, no service code is merged without tests — the buffer service gets its own unit suite from day one.

**Alternatives considered**:
- **Leave old `writeSceneThumbnail` alongside a new `writeSceneThumbnailDeferred`**. Rejected — duplicate code paths multiply test surface and invite drift. A single rewritten function with migrated tests is cleaner.

---

## Summary

No `[NEEDS CLARIFICATION]` markers remain. The five decisions above commit a narrow, low-risk refactor that uses existing infrastructure (eager PNG writes, the save-time `item.json` rewrite, the `gcOrphanAssets` pass) and adds exactly one new module (the buffer service) with a small, testable surface.
