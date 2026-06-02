# Data Model: Atomic (Transactional) Plot Save

**Feature**: 268-save-atomicity · **Phase 1** · **Date**: 2026-06-01

This feature introduces **no LinkML/schema change**. The "save unit" is composed of artefacts that already have canonical types (`FeatureCollection`, `StacItem`, thumbnail PNG assets). The new types below are boundary DTOs and one internal FS record. All derive from existing types where a source exists (Article IV.5 / XV).

## Entities

### 1. Save unit (conceptual)

The complete set of artefacts written by one save of one plot — the granularity at which atomicity is guaranteed (FR-002).

| Artefact | Backing type | VS Code (fs) | Web-shell (idb) |
|----------|--------------|--------------|-----------------|
| Feature collection | `FeatureCollection` (`@debrief/schemas`) | `features.geojson` | `payloads` store, keyed by item path |
| STAC item metadata | `StacItem` (`@debrief/schemas`) | `item.json` | `items` store |
| Thumbnail (large/overview) | PNG asset | `*.png` files | *not written* (unsupported) |
| Thumbnail (small) | PNG asset | `*.png` file | *not written* |

The unit is **not** a stored object; it is the commit grouping. No new persisted shape for the unit itself.

### 2. `CommitPlotSaveInput` (boundary DTO — new)

Argument to the new `StacWriter.commitPlotSave` operation.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ctx` | `StoreContext` | yes | Existing writer context (`kind`, `nowMs`, `randomId`). |
| `stacItemPath` | `string` | yes | Catalog-relative item path (e.g. `core--boat1/item.json`). Same convention as `WritePlotThumbnailPairInput.stacItemPath`. |
| `featureCollection` | `FeatureCollection` | yes | The full FC to persist as `features.geojson` / the geojson payload. Reuses the generated type — not re-listed. |
| `thumbnails` | `Pick<WritePlotThumbnailPairInput, 'largePngBase64' \| 'smallPngBase64'>` | no | Omitted when thumbnail capture was skipped or unsupported (web-shell). **Derived** from the existing input type. |

**Validation**: `stacItemPath` passes the existing `pathGuard`; `featureCollection.type === 'FeatureCollection'`; when `thumbnails` present, both PNGs decode to > 0 bytes (mirrors `stacWriterFs.ts:158-165`).

### 3. `CommitPlotSaveResult` (boundary DTO — new)

| Field | Type | Notes |
|-------|------|-------|
| `featuresPath` | `string` | Catalog-relative path written for the feature collection. |
| `thumbnailPath` | `string \| null` | Null when no thumbnails were committed. |
| `overviewPath` | `string \| null` | Null when no thumbnails were committed. |

### 4. `SaveJournal` (internal, FS-only — new)

The write-ahead intent record that marks the FS commit point (Decision 2). Lives at `<item-dir>/.save-journal.json`, written atomically, removed on success. Never crosses the public interface; browser host does not use it.

| Field | Type | Notes |
|-------|------|-------|
| `version` | `1` | Journal format version (forward-compat guard). |
| `stacItemPath` | `string` | Item this save belongs to. |
| `createdAtMs` | `number` | `ctx.nowMs()` at commit-point write. |
| `renames` | `Array<{ temp: string; final: string }>` | Pending `temp → final` renames, in apply order. Paths are item-dir-relative. |

**Lifecycle / state transitions** (FS save unit):

```
        stage temps            write journal (commit point)        apply renames        delete journal
[clean] ───────────────▶ [staged] ──────────────────────────▶ [committed] ───────────▶ [applied] ─────────▶ [clean]
   │                         │                                      │                       │
   │ interrupt               │ interrupt (no journal)               │ interrupt (journal)   │ interrupt (journal, temps gone)
   ▼                         ▼                                      ▼                       ▼
 reconcile:               reconcile: delete temps,             reconcile: roll FORWARD  reconcile: delete
 nothing to do            keep originals  = LAST-GOOD           (apply pending) = NEW    stale journal = NEW
```

Invariant: **before** the journal exists → reconcile yields last-good; **after** → reconcile yields the new version. Either way the result is coherent (FR-001/FR-007/FR-008).

### 5. `ReconcileResult` (boundary DTO — new)

Returned by `StacWriter.reconcilePlotSave`, consumed by the open path to decide whether to notify.

| Field | Type | Notes |
|-------|------|-------|
| `recovered` | `boolean` | True iff any leftover state was acted on. Drives the non-blocking notice. |
| `outcome` | `'clean' \| 'rolled-back' \| 'rolled-forward'` | `clean` = nothing found; `rolled-back` = pre-commit temps discarded (last-good kept); `rolled-forward` = post-commit renames completed (new version). Web-shell returns `clean` (or `rolled-back` if it prunes an orphan). |

## Type-derivation compliance (Article IV.5 / XV)

- `thumbnails` is `Pick<WritePlotThumbnailPairInput, …>` — not re-listed.
- `featureCollection` reuses `@debrief/schemas` `FeatureCollection`.
- `CommitPlotSaveResult` mirrors the path-returning shape of `WritePlotThumbnailPairResult`; if it grows to mirror that type's fields, derive via `Pick`/`&` rather than re-listing.
- `SaveJournal` has no upstream source (it is a new internal record); it is validated through a typed parse on read (Article XV.5) — no `any`.
