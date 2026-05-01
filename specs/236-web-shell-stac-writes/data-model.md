# Data Model: Web-shell STAC write path (IndexedDB-only)

**Feature**: `236-web-shell-stac-writes`

This document defines the data shapes for the `StacWriter` interface, the IndexedDB schema that backs the web-shell adaptor, and the overlay-merge semantics that present a single unified catalog view to the UI.

> **Note** — supersedes the earlier draft that was Vite-middleware shaped. Types are normative; `contracts/stac-writer.ts` derives from these definitions.

---

## Layer 1 — Interface I/O types (browser-safe, both adaptors)

These types live in `shared/stac-writer/src/interface.ts`. They are the only types the rest of the system depends on. Both VS Code and web-shell adaptors implement against them.

### `StoreContext`

| Field | Type | VS Code interpretation | Web-shell interpretation |
|---|---|---|---|
| `kind` | `'fs' \| 'idb'` | `'fs'` | `'idb'` |
| `nowMs` | `() => number` | overrideable for tests; defaults to `Date.now` | same |
| `randomId` | `() => string` | provenance/ULID generator; overrideable for tests | same |

**No fs paths or db handles** at the interface surface. Each adaptor carries its own backend handle internally. Constructed once at host wire-up and threaded through every operation.

### `StacItem`

Opaque-with-known-keys view. Each adaptor preserves unknown keys through read-merge-write.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Required. STAC-spec id. |
| `properties` | `Record<string, unknown>` | Patched by `patchItem`. Contains `debrief:*` extension keys (provenance log, overrides, platforms, tags). |
| `assets` | `Record<string, StacAsset>` (optional) | Asset map keyed by role (`thumbnail`, `data`, `scene-thumbnail-<sceneId>`). |
| `links` | `Array<{ rel: string; href: string }>` (optional) | STAC-spec links. Pass-through. |
| `[k: string]` | `unknown` | Pass-through. |

### `StacAsset`

| Field | Type | Notes |
|---|---|---|
| `href` | `string` | Always relative to the item directory. The web-shell adaptor synthesises `idb:` pseudo-hrefs at read time for IndexedDB-backed assets (see Layer 3). |
| `type` | `string` (optional) | MIME type. |
| `roles` | `string[]` (optional) | STAC-spec roles. |
| `title` | `string` (optional) | Display name. |
| `[k: string]` | `unknown` | Pass-through. |

### `CapabilityReport`

Returned by `StacWriter.capability()`. Drives the "Session-only" badge and the `navigator.storage.persist()` request decision.

| Field | Type | Notes |
|---|---|---|
| `available` | `boolean` | `true` iff the writer can persist. False in private mode, denied browser policy, IndexedDB missing. |
| `persistent` | `boolean` | `true` iff `navigator.storage.persisted()` returns true (storage won't be auto-evicted). VS Code: always `true`. |
| `reason` | `'unavailable' \| 'quota' \| 'denied' \| 'idb-version-mismatch' \| undefined` | Set when `available` is `false`. Drives the structured error message. |

### `StacWriterError`

Discriminated union; every operation rejects with this shape on failure.

| `kind` | When it fires | Notes |
|---|---|---|
| `path-rejected` | (Node fs) path traversal, absolute path, symlink escape; (IndexedDB) `itemPath` shape rejection. | |
| `stac-item-not-found` | Target item absent when the operation requires it. | Bundled-fallback miss for the web-shell adaptor counts as not-found. |
| `bundled-item-read-only` | Operation that would mutate a bundled-only item (no overlay). Fires for `deleteItem` against a bundled `itemPath`, or for `writeItem(mode: 'replace')` without a prior overlay. | Web-shell only. |
| `item-json-malformed` | Stored item record fails structural validation on read. | |
| `stale-fingerprint` | mtime / mtimeMs check failed: another write landed between read and write. | |
| `validation-failed` | Operation input fails structural validation (empty patch, missing provenance fields, invalid scene ID). | |
| `write-failed` | Underlying backend rejected the write (fs error or IndexedDB transaction abort). Cause attached. | |
| `read-only-fs` | (Node fs) catalog dir mounted read-only. (IndexedDB) database refused write — capability change. | |
| `quota-exceeded` | (IndexedDB) `QuotaExceededError`. | Web-shell only. |
| `indexeddb-unavailable` | Capability check returned `available: false`. | Web-shell only. |
| `empty-png` | Base64 PNG payload empty or undecodable. | |

Every variant carries: `kind` (literal), `message` (human-readable), `cause?` (the underlying `Error`), `path?` (the offending path, if applicable). The `cause` chain is always preserved — never swallowed.

---

## Layer 2 — Operation inputs and results

### `capability(): Promise<CapabilityReport>`

Probes whether the adaptor can persist. Idempotent. Cheap. Called at startup and may be re-called when storage state changes.

### `writeItem` — create or replace whole item record

| Field | Type | Notes |
|---|---|---|
| `ctx` | `StoreContext` | |
| `itemPath` | `string` | E.g. `exercise-alpha/item.json`. Catalog-relative. |
| `item` | `StacItem` | The whole document. |
| `mode` | `'create' \| 'replace'` | `create` rejects with `stac-item-not-found` (well, `parent-missing` in fs) if the parent doesn't exist; `replace` requires the item to exist. |

**Web-shell adaptor**: `replace` against a bundled-only item rejects with `bundled-item-read-only` — bundled items are immutable (FR-007). To "replace" a bundled item's content, the caller goes through `patchItem` instead (which lands as an overlay).

**Result**: `{ writtenPath: string }`.

### `patchItem` — partial update with provenance (preserves #193 semantics)

| Field | Type | Notes |
|---|---|---|
| `ctx` | `StoreContext` | |
| `itemPath` | `string` | |
| `patch` | `Record<string, unknown>` | Merged into `item.properties`. Empty patch rejects with `validation-failed`. |
| `overrideFields` | `string[]` | Merged into `item.properties["debrief:overrides"]`, deduped, sorted. |
| `provenance` | `{ tool: string; fields: string[] }` | Provenance record fields. Empty `fields` rejects. |
| `packageVersion` | `string` | Used to construct the provenance entry's `method`. |

**Web-shell adaptor**: a patch against a bundled-only item creates a new overlay record with `kind: 'overlay'`. Subsequent patches mutate the existing overlay.

**Result**: `{ updatedProperties: Record<string, unknown>; overrides: string[]; activityId: string }`.

**Invariants** (preserved from #193):
- mtime fingerprint check protects against concurrent writes; throws `stale-fingerprint` on miss.
- Provenance log capped at `PROVENANCE_LOG_CAP`; overflow archived (web-shell: appended to a `provenance-archive` blob asset; VS Code: appended to `provenance_log_archive.jsonl`).
- Atomicity: VS Code uses temp+rename; web-shell uses a single IndexedDB transaction across `items` and `meta` stores.

### `writeAsset` — write a single binary or JSON asset

| Field | Type | Notes |
|---|---|---|
| `ctx` | `StoreContext` | |
| `itemPath` | `string` | The owning item, e.g. `training-run-1/item.json`. Validated for existence. |
| `assetHref` | `string` | The new asset's href, relative to the item directory. E.g. `./training-run-1.geojson`. Rejected if absolute. |
| `body` | `Uint8Array \| string` | Asset bytes (binary) or text (JSON/GeoJSON). |
| `mediaType` | `string` | MIME type. Drives the asset entry's `type`. |
| `assetEntry` | `{ key: string; roles?: string[]; title?: string; extra?: Record<string, unknown> }` | The asset map entry to merge into `item.assets[key]`. |

**Result**: `{ assetPath: string; assetKey: string }`.

**Atomicity** (FR-016):
- VS Code: asset bytes land first (temp+rename), THEN `item.json` is patched (temp+rename). Failure between leaves orphan PNGs that aren't referenced from `item.json`.
- Web-shell: single IndexedDB transaction across `assets` (or `payloads`) + `items` stores. Failure rolls the transaction; readers never observe an `item.assets` entry pointing at a missing blob.

### `writeSceneThumbnailPair` — atomic two-PNG capture (the storyboard hot path)

Body shape extracted verbatim from `sceneThumbnailService.writeSceneThumbnail`. The most-used code path on the web-shell.

| Field | Type | Notes |
|---|---|---|
| `ctx` | `StoreContext` | |
| `stacItemPath` | `string` | E.g. `exercise-alpha`. |
| `sceneId` | `string` (ULID) | Validated against `^[0-9A-HJKMNP-TV-Z]{26}$`. |
| `largePngBase64` | `string` | 800×600 PNG. |
| `smallPngBase64` | `string` | 200×150 PNG. |

**Result**: `{ assetKey: string; largePath: string; smallPath: string }` (matches existing `WriteSceneThumbnailResult`).

**Atomicity** (preserved from #174):
- VS Code: ensure dir → write large PNG → write small PNG → patch `item.json`. Atomicity = "patch is last; orphan PNGs harmless".
- Web-shell: one IndexedDB transaction stages two `assets` entries + the `items` overlay update + `meta` mtime bump. All or nothing.

### `deleteItem` — remove a whole item

| Field | Type |
|---|---|
| `ctx` | `StoreContext` |
| `itemPath` | `string` |

**Web-shell adaptor**: rejects with `bundled-item-read-only` for any `itemPath` that exists in the bundled catalog but not as a `kind: 'standalone'` overlay (FR-007). Standalone IndexedDB-only items delete cleanly across `items` + `assets` (filtered by `itemPath` index) + `payloads`.

**Result**: `{ removedPath: string }`.

### `deleteAsset` — remove an asset and its entry

| Field | Type |
|---|---|
| `ctx` | `StoreContext` |
| `itemPath` | `string` |
| `assetKey` | `string` |

**Web-shell adaptor**: removing a bundled-baseline asset (i.e. one that exists in the bundled `item.json` and was not overwritten in IndexedDB) is rejected with `bundled-item-read-only`. Removing an overlay-added asset deletes the IndexedDB asset record + drops the asset entry from the overlay's item record.

**Result**: `{ removedAssetPath: string \| null }` (null when the entry existed in the overlay but the underlying blob was already absent).

---

## Layer 3 — IndexedDB schema (web-shell adaptor only)

Database: `debrief-stac-writer-v1` (version `1`).

### Object store: `items`

- **Key**: `itemPath` (string, e.g. `exercise-alpha/item.json`).
- **Value**:
  ```ts
  {
    kind: 'overlay' | 'standalone';
    record: StacItem;          // the overlay (overlay) or the full item (standalone)
    baseRevision?: string;     // RESERVED for future use; not populated in Phase 1
    mtimeMs: number;           // monotonic mtime fingerprint; bumped on every write
  }
  ```
- **Indexes**: none.

### Object store: `assets`

- **Key**: compound `[itemPath, assetKey]`.
- **Value**:
  ```ts
  {
    blob: Blob;
    mediaType: string;         // mirrors StacAsset.type
    byteLength: number;        // for quota-warning UX
    mtimeMs: number;
  }
  ```
- **Indexes**: `byItem` on `itemPath` (for `deleteItem` cascade).

### Object store: `payloads`

GeoJSON FeatureCollections live here, not in `assets`, because they're typically much larger than thumbnails (≈ 100 KB–10 MB) and benefit from being looked up by item-path alone (one-payload-per-item is the common case).

- **Key**: `itemPath`.
- **Value**:
  ```ts
  {
    payload: string;           // UTF-8 serialised GeoJSON
    mediaType: 'application/geo+json';
    byteLength: number;
    mtimeMs: number;
  }
  ```
- **Indexes**: none.

### Object store: `meta`

- **Key**: `key` (string).
- **Value**: `{ value: unknown }`.
- **Reserved keys**:
  - `schemaVersion`: `'1'` — for future migrations.
  - `firstWriteAt`: ISO timestamp of the first successful write (used to time the persistence-grant request).
  - `persistGranted`: `boolean` — last response from `navigator.storage.persist()`.
  - `creatorTabId`: `string` — opaque ID of the tab that created the database (for telemetry).

### Transaction shapes

| Operation | Stores in transaction | Mode |
|---|---|---|
| `capability` | none (just feature-detect) | n/a |
| `writeItem` | `items`, `meta` | `readwrite` |
| `patchItem` | `items`, `meta` | `readwrite` |
| `writeAsset` (binary) | `assets`, `items`, `meta` | `readwrite` |
| `writeAsset` (GeoJSON) | `payloads`, `items`, `meta` | `readwrite` |
| `writeSceneThumbnailPair` | `assets`, `items`, `meta` | `readwrite` |
| `deleteItem` | `items`, `assets`, `payloads`, `meta` | `readwrite` |
| `deleteAsset` | `assets` (and `items`, `meta` for the patch) | `readwrite` |

Every read operation is its own `readonly` transaction. Catalog-list reads (called frequently by the UI) `getAll` on `items` once and merge with the bundled catalog in memory.

### Asset href synthesis

When the read view returns an item to the UI, it rewrites IndexedDB-backed asset hrefs to a stable pseudo-URL the UI's `<img>` tags can consume:

- Bundled-only asset → unchanged: `./scene-thumbnails/scene-...png` resolved against the `/stac-store/` GET prefix. Browser-native URL — no resolution step needed.
- IndexedDB-overlay asset → synthesised: `idb:<itemPath>::<assetKey>` (e.g. `idb:exercise-alpha/item.json::scene-thumbnail-01HFA8...`). The browser doesn't know this URL scheme; resolution is **deferred to the consumer** (review 4A).

**Resolution: lazy via `useResolvedAssetHref` hook (review 4A)**.

The catalog read view returns hrefs untouched — `idb:` synthetic for IndexedDB-backed assets, ordinary relative URLs for bundled-only assets. Consumers (typically `<img>` wrappers) call a small React hook:

```ts
function useResolvedAssetHref(href: string): string | null;
```

The hook:
- Returns the input verbatim for non-`idb:` hrefs.
- For `idb:` hrefs, consults a module-level LRU (cap 200). On hit, returns the cached blob URL. On miss, opens a `readonly` transaction against `assets`, reads the blob, calls `URL.createObjectURL(blob)`, inserts into the LRU, and returns the new URL.
- Tracks reference counts via React's effect cleanup: when a consumer unmounts, the hook decrements the count; when it drops to zero AND the LRU is at capacity AND a newer entry needs the slot, the cached URL is `URL.revokeObjectURL`'d.

**Why deferred**: catalog list re-renders fire on scroll, filter, sort. Eager resolution at list-build time means O(catalog) `getAll` + N `createObjectURL` calls per render. Deferred resolution makes render cost O(visible items) — bounded by viewport, not catalog size. At spec.md's operational ceiling (≤ 500 items) the difference is the gap between sub-100 ms p95 and noticeable jank.

**LRU sizing**: cap of 200 entries. Empirically the active working set for a single open plot's panels is ≤ 50 entries; 200 covers two-three plot switches without churn. On eviction, `URL.revokeObjectURL` is called. If a `<img src>` element still holds a revoked URL, the browser shows a broken-image icon until React re-renders (which `useResolvedAssetHref` triggers via state update on revoke). Empirically harmless — the eviction floor is far above any single panel's working set, and the ≤ 1-frame broken-image flicker is invisible.

---

## Layer 4 — Overlay merge semantics

`mergeOverlay(bundled: StacItem | null, overlay: StoredItem | null): StacItem | null` is a **pure function** in `shared/stac-writer/src/overlay.ts`. Both adaptors and the catalog read view depend on it.

```text
                     ┌─────────────────────────────┐
       bundled       │                             │
       overlay       │       mergeOverlay          │      mergedItem
       ───────────►  │                             │  ──────────────►
                     └─────────────────────────────┘

       Cases:
         (bundled, null)            → bundled                          (no overlay; return as-is)
         (null, overlay-standalone) → overlay.record                   (IndexedDB-only item)
         (bundled, overlay-overlay) → shallow-merge per the rule below (the interesting case)
         (null, null)               → null                             (item not found)
         (bundled, overlay-standalone) → THROW                         (logically impossible; signals a bug)
```

**Shallow-merge rule** (the `(bundled, overlay-overlay)` case):

```ts
{
  ...bundled,
  ...overlay.record,                                         // overlay scalars win
  properties: { ...bundled.properties, ...overlay.record.properties },
  assets: { ...(bundled.assets ?? {}), ...(overlay.record.assets ?? {}) },
  links: overlay.record.links ?? bundled.links,              // links replace, don't merge
}
```

- **Top level**: spread overlay over bundled, so `id`, `bbox`, etc. from the overlay win if set.
- **`properties`**: shallow-merge field-by-field, overlay-wins. Fields the user touched override bundled; fields they didn't touch pick up upstream changes.
- **`assets`**: shallow-merge by key. Overlay-added assets layer in; bundled-only assets remain visible. Overlay assets with the same key as bundled assets win.
- **`links`**: replace wholesale if overlay sets it, else pass through. Links are rare and small; merging them adds complexity without benefit.

**Provenance log** is not specially handled by the merge — it lives inside `properties["debrief:provenance_log"]` and is overwritten whole by the overlay. Each `patchItem` call appends to the *overlay's* log; the bundled log entries are preserved by the first patch (which copies them into the overlay before appending), and from then on the overlay owns the log entirely.

---

## State transitions

The writer is stateless across operations — every operation is a self-contained transaction. Within an operation, the sequence is:

```text
                ┌─────────────────────────────┐
                │  pathGuard / validateInput  │   →   rejects with path-rejected,
                │                             │       validation-failed, etc.
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  capabilityCheck (idb only) │   →   rejects with indexeddb-unavailable,
                │                             │       quota-exceeded
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  read existing record /     │   →   rejects with stac-item-not-found,
                │  stat target (where needed) │       item-json-malformed,
                │  + record mtime fingerprint │       bundled-item-read-only
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  open transaction (idb) /   │   →   rejects with write-failed,
                │  begin temp-write (fs)      │       read-only-fs
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  re-stat / re-read,         │   →   rejects with stale-fingerprint
                │  compare to fingerprint     │       (idb: in-transaction read; fs: re-stat)
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  commit: temp+rename (fs)   │   →   rejects with write-failed
                │  or transaction.commit (idb)│
                └────────────┬────────────────┘
                             ▼
                ┌─────────────────────────────┐
                │  broadcast item-changed     │   web-shell only; best-effort
                │  (idb only)                 │
                └────────────┬────────────────┘
                             ▼
                          success
```

Every "rejects with X" arrow returns a `StacWriterError` whose `kind` is the named variant. Successful asset writes that occur before a later rejection are best-effort cleaned up:
- Web-shell: IndexedDB transaction abort discards pending writes automatically — no cleanup needed.
- VS Code: the existing temp-file cleanup in `sceneThumbnailService.writeAtomic` continues to apply.
