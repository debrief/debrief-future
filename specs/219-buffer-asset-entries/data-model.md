# Data Model: Buffer Scene-Thumbnail Asset Entries Until Save

**Feature**: 219 — Buffer Scene-Thumbnail Asset Entries Until Save
**Date**: 2026-04-25

This feature does **not** introduce or modify any LinkML schema. The model below describes only the in-memory data structures added to the VS Code extension. All on-disk shapes (`item.json` STAC Item, `Scene` Feature, `Storyboard` Feature) are unchanged.

---

## Entities

### `PendingAssetEntry` (in-memory)

A single STAC asset entry awaiting persistence into `item.json.assets`. Fields mirror the on-disk shape exactly so save-time merge is a verbatim copy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | Yes | Asset key, e.g. `scene-thumbnail-{ulid}` or `scene-thumbnail-{ulid}-sm`. Used as the unique identifier within a plot's buffer. |
| `href` | `string` | Yes | Relative href from the STAC item directory, e.g. `./scene-thumbnails/scene-{ulid}.png`. |
| `type` | `string` | Yes | MIME type. Always `image/png` for this feature. |
| `title` | `string` | Yes | Human-readable label (e.g. `Scene thumbnail`, `Scene thumbnail (small)`). |
| `roles` | `readonly string[]` | Yes | STAC roles. Always `['thumbnail']` for this feature. |

**Validation**:
- `key` MUST match `^scene-thumbnail-[0-9A-HJKMNP-TV-Z]{26}(-sm)?$` (ULID + optional `-sm` suffix).
- `href` MUST start with `./scene-thumbnails/` and end with `.png`.
- `type` MUST equal `image/png`.

**Lifecycle**:
- Created on capture (immediately after the PNG file is written atomically).
- Held in the per-plot buffer.
- Either committed into `item.json` at save or dropped on plot close / discard.
- Filtered out at save time if no Scene Feature in the in-memory plot has `thumbnail_asset_ref` matching its `key` (or `key + '-sm'`).

---

### `SceneThumbnailBuffer` (singleton in-memory service)

The container for pending entries. One per extension activation, holding entries for any number of currently-open plots.

**Internal state** (conceptual — not part of the public API):

```text
buffers: Map<stacItemPath, Map<assetKey, PendingAssetEntry>>
```

The outer key (`stacItemPath`) is the absolute filesystem path of the STAC item directory. The inner key (`assetKey`) is `PendingAssetEntry.key`.

**Public surface** (full interface contract in [contracts/scene-thumbnail-buffer.md](./contracts/scene-thumbnail-buffer.md)):

- `enqueue(stacItemPath, entries)` — adds one or more entries to the per-plot buffer. Idempotent on `assetKey`.
- `pending(stacItemPath)` — returns a snapshot of the current buffer for one plot.
- `clear(stacItemPath)` — drops the buffer for one plot. Called on save success and on plot close.
- `clearAll()` — drops every buffer. Used in test cleanup and on extension deactivation.
- `flush(stacItemPath, livePredicate)` — returns the entries that should be merged into `item.json` (those whose `key` passes `livePredicate`), and drops them from the buffer; non-live entries are also dropped silently. Mutating; called by `saveSession`.

**Invariants**:
- An entry's presence in the buffer means: "the PNG is already on disk; the `item.json` registration is pending."
- The buffer is the **only** in-memory record of pending registrations. Once flushed (or discarded), there is no shadow state.
- Per-plot isolation: a `clear(plotA)` MUST NOT affect `plotB`.
- The buffer does **not** retain PNG bytes. It retains only the asset-entry metadata.

---

### Scene Feature (unchanged)

For reference only — this feature does not modify `Scene.properties.thumbnail_asset_ref`. The buffer's filter-on-flush logic uses this property at save time:

```text
livePredicate(assetKey) :=
  any feature in current in-memory plot has
    feature.properties.kind == 'scene' AND
    (feature.properties.thumbnail_asset_ref == assetKey OR
     feature.properties.thumbnail_asset_ref + '-sm' == assetKey)
```

Identical predicate to the one in `gcOrphanAssets` (`sceneThumbnailService.ts:373-380`), reused at the new flush site.

---

### `item.json` (on-disk STAC Item, unchanged)

Stays exactly as today: a JSON object with an `assets: Record<string, AssetEntry>` field. Saved by atomic write (tmp + fsync + rename) — that helper is preserved verbatim. The only change is *who* mutates this record and *when*: post-Phase-1, the capture path is no longer a writer; the save path is the sole writer for all asset-entry mutations (plot-level `thumbnail` / `thumbnail-sm` PLUS buffered scene-thumbnail entries).

---

## State Transitions

```text
[no buffer entry]   ──capture──▶  [buffer entry; PNG on disk; item.json untouched]
                                                │
                                                ├──save success──▶  [no buffer entry; PNG on disk; item.json contains entry]
                                                │
                                                ├──save fail──▶     [buffer entry preserved; PNG on disk; item.json untouched]
                                                │                                  │
                                                │                                  └──save retry──▶  [no buffer entry; entry committed]
                                                │
                                                ├──scene undone / deleted──▶
                                                │      [buffer entry still present (filter-on-flush); PNG on disk]
                                                │      │
                                                │      └──save──▶  [entry dropped silently; PNG orphan; item.json unchanged]
                                                │                                       │
                                                │                                       └──gcOrphanAssets pass──▶  [PNG removed]
                                                │
                                                └──plot close (no save)──▶  [buffer cleared; PNG orphan]
                                                                                           │
                                                                                           └──gcOrphanAssets pass──▶  [PNG removed]
```

The two terminal states for a captured-then-discarded Scene — orphan PNG awaiting GC — are **identical to today's behaviour** for partial-failure orphans. No new GC class is required (FR-009).

---

## Multi-plot scope

Each open plot has its own buffer entry under `buffers[stacItemPath]`. Operations on plot A do not touch plot B's buffer. The `saveSession` command flushes only the active plot's buffer (FR-011).

---

## Lifetime / persistence

The buffer is **in-memory only**. A crash, hard close, or extension restart discards it. Spec assumption: this matches the existing behaviour of unsaved features (`features.geojson` is not flushed until save either). PNG files captured before a crash become orphans and are reclaimed on next plot open / close by the existing `gcOrphanAssets` pass.
