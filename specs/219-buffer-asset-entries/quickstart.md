# Quickstart: Buffer Scene-Thumbnail Asset Entries Until Save

**Feature**: 219 — Buffer Scene-Thumbnail Asset Entries Until Save

This quickstart walks a reviewer through verifying the feature locally. Because the change is internal (no UI surface), verification is via unit tests + a single end-to-end manual check that confirms the visible behaviour: discarding captured Scenes leaves `item.json` byte-identical.

---

## Prerequisites

```sh
# From repo root
pnpm install         # if you haven't already
uv sync              # ditto
```

You should be on the feature branch:

```sh
git status     # → 'On branch 219-buffer-asset-entries' (or 'claude/speckit-specify-219-r7BCW' in cloud sessions)
```

---

## 1. Run the new and migrated unit tests

```sh
# Buffer service contract
pnpm --filter @debrief/vscode test sceneThumbnailBuffer

# Refactored thumbnail service — assertions migrated from "item.json updated" to
# "PNGs written, item.json untouched, pending entries returned"
pnpm --filter @debrief/vscode test sceneThumbnailService

# Capture command — assertions migrated to "PNGs on disk, buffer enqueued,
# item.json byte-identical to pre-capture"
pnpm --filter @debrief/vscode test captureScene

# Save command — extended to assert buffer flushes into item.json on save success,
# and is preserved on save failure
pnpm --filter @debrief/vscode test saveSession
```

All four MUST pass.

---

## 2. Run the full extension test suite

```sh
pnpm --filter @debrief/vscode test
```

No regression in storyboard-edit, capture, save, or GC suites.

---

## 3. Run the project-wide CI bundle (matches the `task verify` gate)

```sh
task verify
# or equivalently:
uv run ruff check . && pnpm lint
uv run pyright && pnpm -r typecheck
uv run pytest && pnpm --filter '!@debrief/web-shell' test
cd apps/web-shell && node run-playwright.mjs && cd ../..
```

This is the same set of checks CI runs. All MUST pass before pushing.

---

## 4. Manual end-to-end verification (the headline behaviour change)

This is the visible payoff of the feature — the discard-leaves-no-trace acceptance scenario from spec User Story 1.

### Setup

1. Open a plot in the VS Code extension (use any sample plot from `preview/workspace/samples/local-store/`).
2. Note the plot's STAC item directory — call it `$ITEM_DIR`. Locate `$ITEM_DIR/item.json`.
3. Take a snapshot of the asset keys today:
   ```sh
   jq -S '.assets | keys' "$ITEM_DIR/item.json" > /tmp/before.json
   ```

### Capture-then-discard

4. Capture three Scenes (any timestamps — use the Storyboard panel's capture button or the `Debrief: Capture Scene` command three times).
5. Verify each Scene's thumbnail renders in the Storyboard panel. **All three thumbnails MUST be visible** (this confirms FR-004 — the Storyboard panel resolves PNGs by path, no buffer-awareness needed).
6. While the session is dirty, snapshot `item.json` again:
   ```sh
   jq -S '.assets | keys' "$ITEM_DIR/item.json" > /tmp/after-capture.json
   diff /tmp/before.json /tmp/after-capture.json
   ```
   **Expected**: `diff` exits with status 0 — `item.json.assets` keys are identical pre-capture and post-capture. *(Today, you would see three new `scene-thumbnail-*` pairs added.)*
7. Close the plot **without** saving. Confirm the discard prompt appears; click "Discard Changes".
8. Snapshot `item.json` once more:
   ```sh
   jq -S '.assets | keys' "$ITEM_DIR/item.json" > /tmp/after-discard.json
   diff /tmp/before.json /tmp/after-discard.json
   ```
   **Expected**: `diff` exits with status 0 — `item.json` is byte-identical to its pre-session state. **This is the architectural fix in action.**

### Capture-then-save

9. Reopen the same plot. Capture two Scenes. Save the session (Ctrl+S / `Debrief: Save Session`).
10. Snapshot `item.json`:
    ```sh
    jq -S '.assets | keys' "$ITEM_DIR/item.json" > /tmp/after-save.json
    diff /tmp/before.json /tmp/after-save.json
    ```
    **Expected**: four new keys appear (`scene-thumbnail-{id1}`, `scene-thumbnail-{id1}-sm`, `scene-thumbnail-{id2}`, `scene-thumbnail-{id2}-sm`). All pre-existing keys preserved.

### Capture-then-undo-then-save

11. Reopen the plot. Capture one Scene, then undo (Ctrl+Z) until the Scene is gone. Save the session.
12. Snapshot `item.json`:
    ```sh
    jq -S '.assets | keys' "$ITEM_DIR/item.json" > /tmp/after-undo-save.json
    diff /tmp/after-save.json /tmp/after-undo-save.json
    ```
    **Expected**: `diff` exits with status 0 — no new asset keys (the captured-then-undone Scene's buffered entries were filtered out at flush; PNGs on disk are orphans awaiting next GC pass).

### Reset for next reviewer

13. Either revert your sample-data changes (`git checkout preview/workspace/samples/`) or run the standard sample-data regenerator to restore the catalogue.

---

## 5. What to look for in the diff

When reviewing `apps/vscode/src/services/sceneThumbnailService.ts`:
- `writeSceneThumbnail` no longer reads `item.json` (no `readItemJson` call inside the function body).
- `writeSceneThumbnail` no longer writes `item.json` (no atomic rewrite of `itemJsonPath`).
- The function returns `pendingEntries` describing the two asset entries the buffer will hold.
- Error taxonomy narrowed: `item-json-unreadable` and `item-json-malformed` no longer thrown by `writeSceneThumbnail` (still produced by `gcOrphanAssets` and `deleteSceneThumbnail`).

When reviewing `apps/vscode/src/services/sceneThumbnailBuffer.ts` (NEW):
- Concrete `class SceneThumbnailBuffer` with private `Map<string, Map<string, PendingAssetEntry>>` state.
- Public methods match the contract in `contracts/scene-thumbnail-buffer.md` §3.
- Zero filesystem imports — purely a metadata buffer.

When reviewing `apps/vscode/src/commands/saveSession.ts`:
- `storeThumbnails` accepts a fifth parameter `pendingSceneEntries`.
- The save command call-site reads `buffer.peekLive(stacItemPath, livePredicate)` before invoking `storeThumbnails`, then calls `buffer.commit(...)` on success.
- A failed save path leaves `buffer.commit(...)` uncalled.

When reviewing `apps/vscode/src/extension.ts`:
- A single `SceneThumbnailBuffer` instance is constructed at activation.
- It is passed through to `createSaveSessionCommand` and to the `captureThumbnail` port.
- A `buffer.clear(stacItemPath)` call appears alongside the existing `gcOrphanAssets` plot-close hook.

---

## 6. Smoke-test the success criteria

| SC | Verification |
|----|--------------|
| SC-001 (discard leaves item.json byte-identical) | Step 8 above — `diff /tmp/before.json /tmp/after-discard.json` empty. |
| SC-002 (item.json rewrites per save = 1) | `git grep -n 'JSON.stringify(.*nextItem' apps/vscode/src/` should show only one save-time write site for asset entries (in `saveSession.ts`); no per-capture rewrite remains. |
| SC-003 (thumbnails render uniformly for buffered + saved) | Step 5 above — three buffered thumbnails visible in Storyboard panel. |
| SC-004 (no new orphan-asset class) | Existing `gcOrphanAssets` test suite still passes; no new GC code added. |
| SC-005 (existing tests pass without weakening) | `pnpm --filter @debrief/vscode test` green. |
| SC-006 (buffer survives save failure) | Test in `saveSession.test.ts` — inject failure on item.json write, assert buffer state unchanged, retry succeeds. |
