# Data Model: saveSession STAC Service Migration (242)

**Date**: 2026-05-05  
**Branch**: `242-savesession-stac-writes`

This is a refactoring feature — no new data entities are introduced. The STAC catalog shape produced by the new code path is **identical** to the shape produced by the shim being replaced.

---

## Entities Involved

### PlotThumbnailPair

A pair of PNG images captured from the map viewport after a session save. Not a STAC entity itself — it is the input to the write operation that produces two STAC assets on an existing STAC Item.

| Field | Type | Description |
|-------|------|-------------|
| `stacItemPath` | `string` | Relative path to `item.json` within the store root |
| `largePngBase64` | `string` | Base64-encoded PNG, resized to 800×600 |
| `smallPngBase64` | `string` | Base64-encoded PNG, resized to 200×150 |

### STAC Item (existing — assets updated)

The existing `item.json` on disk. After `writePlotThumbnailPair` completes, the `assets` map gains two entries (or replaces them if they exist):

**`thumbnail` asset**:
```json
{
  "href": "./thumbnail.png",
  "type": "image/png",
  "roles": ["thumbnail"],
  "proj:shape": [150, 200],
  "file:size": <bytes>,
  "file:checksum": "<multihash-sha256>"
}
```

**`overview` asset**:
```json
{
  "href": "./overview.png",
  "type": "image/png",
  "roles": ["overview"],
  "proj:shape": [600, 800],
  "file:size": <bytes>,
  "file:checksum": "<multihash-sha256>"
}
```

Note: The legacy `thumbnail-sm` key is removed if present (idempotent cleanup carried over from the shim).

---

## New Interface Contracts

### WritePlotThumbnailPairInput

Added to `StacWriter` interface alongside the existing `WriteSceneThumbnailPairInput`:

| Field | Type | Description |
|-------|------|-------------|
| `ctx` | `StoreContext` | Host context (provides `nowMs`, `randomId`; `kind` is `'fs'` for VS Code) |
| `stacItemPath` | `string` | Relative path to `item.json` within the store root |
| `largePngBase64` | `string` | Base64-encoded large PNG (800×600) |
| `smallPngBase64` | `string` | Base64-encoded small PNG (200×150) |

### WritePlotThumbnailPairResult

| Field | Type | Description |
|-------|------|-------------|
| `thumbnailPath` | `string` | Absolute filesystem path where `thumbnail.png` was written |
| `overviewPath` | `string` | Absolute filesystem path where `overview.png` was written |

---

## State Transitions

No new state machine. The write is a direct mutation:

```
STAC Item (no thumbnail assets)
  → writePlotThumbnailPair() →
STAC Item (thumbnail + overview assets present)
```

Or idempotently replacing existing assets:

```
STAC Item (thumbnail + overview assets present)
  → writePlotThumbnailPair() →
STAC Item (thumbnail + overview assets replaced with new content)
```

---

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| `stacItemPath` must be relative (no leading `/`) | `pathGuard()` — already used in all other writer methods |
| `stacItemPath` must not contain `..` | `pathGuard()` |
| `largePngBase64` must decode to non-empty bytes | Check before write; throw `StacWriterError('empty-png')` |
| `smallPngBase64` must decode to non-empty bytes | Check before write; throw `StacWriterError('empty-png')` |
| `item.json` must exist at the resolved path | Throw `StacWriterError('stac-item-not-found')` if missing |
| `item.json` must be valid JSON with expected shape | Throw `StacWriterError('item-json-malformed')` if not |
