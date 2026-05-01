# IndexedDB Schema: web-shell `StacWriter` adaptor

**Feature**: `236-web-shell-stac-writes`
**Database**: `debrief-stac-writer-v1`
**Version**: `1`

This contract defines the IndexedDB schema the web-shell's `StacWriter` adaptor uses. It is the persistent-state contract for the browser side of the writer — once a user has captures in IndexedDB, this schema's shape is durable. Breaking it requires a fresh database name (e.g. `debrief-stac-writer-v2`), not an in-place migration. (Pre-release freedom under Article XIV permits this.)

---

## Database

| Property | Value |
|---|---|
| Name | `debrief-stac-writer-v1` |
| Version | `1` |
| Object stores | `items`, `assets`, `payloads`, `meta` |
| Created at | First successful capability check that finds IndexedDB available. |

The version is baked into the name so a future schema change ships under a different database (`-v2`, `-v3`, …). The old database is left intact for forensics; user-visible behaviour treats the previous database as "fresh start" content (analyst captures from old version are not auto-migrated).

---

## Object store: `items`

Stores the per-item record — either an overlay on a bundled item or a standalone IndexedDB-only item.

| Property | Value |
|---|---|
| Key path | (none — explicit key supplied per `put`) |
| Key type | `string` (e.g. `exercise-alpha/item.json`) |
| Indexes | none |

Value shape:

```ts
interface StoredItem {
  kind: 'overlay' | 'standalone';
  record: StacItem;          // overlay: only the user's edits + asset additions; standalone: full document
  baseRevision?: string;     // RESERVED — always undefined in v1; reserved for future drift detection
  mtimeMs: number;           // monotonic mtime; bumped on every write
}
```

**Key examples**:
- `exercise-alpha/item.json` — overlay against the bundled `exercise-alpha` item
- `user/2026-05-01-track-foo/item.json` — standalone IndexedDB-only item under the `user/` directory prefix

**Standalone-item path convention**: standalone items live under `user/<id>/item.json` where `<id>` is a ULID-like identifier. This keeps standalone items visually distinct from bundled items (which live under `<exercise-name>/item.json`) without requiring a separate object store. The `user/` prefix is reserved — bundled items MUST NOT use it.

---

## Object store: `assets`

Stores binary asset blobs (PNG thumbnails, future OPFS-eligible blobs).

| Property | Value |
|---|---|
| Key path | (none — explicit key supplied per `put`) |
| Key type | `[itemPath: string, assetKey: string]` (compound) |
| Indexes | `byItem` on `itemPath` (`unique: false`) |

Value shape:

```ts
interface StoredAsset {
  blob: Blob;
  mediaType: string;          // mirrors StacAsset.type
  byteLength: number;         // for quota-warning UX
  mtimeMs: number;
}
```

**Key examples**:
- `["exercise-alpha/item.json", "scene-thumbnail-01HFA8..."]`
- `["user/2026-05-01-track-foo/item.json", "thumbnail"]`

The `byItem` index supports `deleteItem`'s cascade delete (`tx.objectStore('assets').index('byItem').openCursor(IDBKeyRange.only(itemPath))`).

---

## Object store: `payloads`

Stores GeoJSON FeatureCollection payloads. Separate from `assets` because (a) they're typically much larger than thumbnails (≈ 100 KB–10 MB) and (b) the lookup pattern is one-payload-per-item, which simplifies the schema.

| Property | Value |
|---|---|
| Key path | (none — explicit key supplied per `put`) |
| Key type | `string` (the owning `itemPath`) |
| Indexes | none |

Value shape:

```ts
interface StoredPayload {
  payload: string;            // UTF-8 JSON text of the FeatureCollection
  mediaType: 'application/geo+json';
  byteLength: number;
  mtimeMs: number;
}
```

**Note on size**: at typical operational scale, GeoJSON payloads run to ~1 MB. IndexedDB stores them efficiently as compressed strings under modern browsers' implementations. Phase 2+ may move to gzip-encoded `Uint8Array` payloads if profiling reveals memory pressure; the schema's `mediaType` field already accommodates that without a migration.

---

## Object store: `meta`

A small key/value bag for capability flags and one-shot signals.

| Property | Value |
|---|---|
| Key path | (none — explicit key supplied per `put`) |
| Key type | `string` |
| Indexes | none |

Value shape: `{ value: unknown }`.

**Reserved keys**:

| Key | Type of `.value` | Purpose |
|---|---|---|
| `schemaVersion` | `string` | Currently `'1'`. Future migrations check this. |
| `firstWriteAt` | `string` (ISO timestamp) | Set on first successful write. Used by `requestPersistAfterFirstWrite` to time the `navigator.storage.persist()` call. |
| `persistGranted` | `boolean` | Last response from `navigator.storage.persist()`. `null` if never asked. Drives the "your captures may be evicted" banner. |
| `creatorTabId` | `string` | Opaque ID of the tab that first wrote to the database. Used only for telemetry; never displayed. |

Other keys are forbidden in v1; the writer rejects unknown reserved-namespace keys at write time.

---

## Transaction shapes

Every write operation is one transaction across the affected stores. IndexedDB's per-transaction atomicity is the writer's primary atomicity primitive (FR-016).

| Operation | Stores in transaction | Mode |
|---|---|---|
| `capability` | none (just feature-detect + database-open) | n/a |
| `writeItem` | `items`, `meta` | `readwrite` |
| `patchItem` | `items`, `meta` | `readwrite` |
| `writeAsset` (binary) | `assets`, `items`, `meta` | `readwrite` |
| `writeAsset` (`application/geo+json`) | `payloads`, `items`, `meta` | `readwrite` |
| `writeSceneThumbnailPair` | `assets`, `items`, `meta` | `readwrite` |
| `deleteItem` | `items`, `assets`, `payloads`, `meta` | `readwrite` |
| `deleteAsset` | `assets`, `items`, `meta` | `readwrite` |
| Catalog list (read) | `items` | `readonly` |
| Catalog get-one (read) | `items`, `assets`, `payloads` | `readonly` |

The same-transaction pattern guarantees that a failed write (network panel disconnects mid-transaction, IndexedDB aborts on quota, browser tab crashed) leaves the database in a consistent prior state — readers never observe a half-committed compound op.

---

## Read path: bundled-overlay merge

When a UI consumer requests an item, the catalog read view performs:

```text
   itemPath
     │
     ├──────────────────────────────► fetch /stac-store/<itemPath> (bundled GET) ────┐
     │                                                                               │
     ├──────────────────────────────► IDB get items[itemPath] ────┐                  │
     │                                                            │                  │
     ▼                                                            ▼                  ▼
   bundledItem                                              storedItem        (parallel)
                                                                  │                  │
                                                                  └─── mergeOverlay ─┘
                                                                            │
                                                                            ▼
                                                                       mergedItem (UI)
```

For the catalog *list* view, the read view fetches `/stac-store/catalog.json` once and `getAll(items)` once, then merges in memory:
- For each bundled itemPath: emit `mergeOverlay(bundled, stored?)`.
- For each storedItem with `kind: 'standalone'` whose itemPath has no bundled counterpart: emit `stored.record`.

Sort order is preserved from the bundled catalog where applicable; standalone items append after bundled items, sorted by `mtimeMs` descending (newest first).

### Asset href synthesis (read-time)

When the read view surfaces a merged item:
- Bundled-only assets keep their relative `href` (`./scene-thumbnails/scene-X.png`). UI resolves them against `/stac-store/<itemDir>/`.
- Overlay-added assets get a synthesised `href` of the form `idb:<itemPath>::<assetKey>`. The read view holds an LRU of `URL.createObjectURL(blob)` results; UI consumers see actual blob URLs that work in `<img src>` and `fetch`.
- LRU cap: 200 entries. On eviction, `URL.revokeObjectURL` is called; if a UI element still has the URL in its DOM, it stops loading. Empirically harmless — the eviction floor (200 entries) is far above any single panel's working set.

---

## Migration policy (forward-looking)

Pre-v4.0.0 (Article XIV in force): a breaking schema change ships under a new database name (`debrief-stac-writer-v2`). The old database is left intact; the new database starts empty. This is acceptable because:
- Bundled-catalog items are unaffected (they live in static files, not IndexedDB).
- IndexedDB-only standalone items are user-visible loss; the migration ship-note explicitly warns analysts and recommends the (Phase 2+) zip export to preserve them.
- Overlay edits against bundled items are recoverable: the user re-applies the edit. This is acceptable churn for pre-release.

Post-v4.0.0: forward-only migrations within `debrief-stac-writer-v1` via IndexedDB's `onupgradeneeded`. No backwards migrations. Article II.3 (schema versioning) starts being strictly enforced at v4.0.0.

---

## Capacity & quota

IndexedDB's per-origin quota is browser-controlled:

| Browser | Typical quota |
|---|---|
| Chrome / Edge | ≈ 80% of free disk |
| Firefox | 50% of free disk, capped at 10 GB |
| Safari (macOS) | 1 GB initial, prompt for more |
| Safari (iOS) | 1 GB total |

Phase 1 does not introduce explicit quota management. `QuotaExceededError` surfaces via the `quota-exceeded` writer error variant; the UI shows a clear "browser storage full — clear unused captures or use a different browser" message. Quota-management UX is a Phase 2 concern.

The writer requests `navigator.storage.persist()` on the first successful write (timed via the `firstWriteAt` flag). The granted-or-not response is recorded in `meta` and informs a one-shot UI banner.

---

## What lives where (quick reference)

| User action | Bundled file | IndexedDB store(s) touched |
|---|---|---|
| Capture scene on bundled item | (none — bundled `item.json` untouched) | `assets` (×2 PNGs), `items` (overlay), `meta` |
| Edit description on bundled item | (none) | `items` (overlay), `meta` |
| Edit description on standalone item | (none) | `items`, `meta` |
| Draw new track + save | (none) | `items` (standalone), `payloads`, `meta` |
| Edit existing track's geometry on bundled item | (none) | `payloads` (overlay), `items` (overlay), `meta` |
| Delete a bundled item | rejected with `bundled-item-read-only` | n/a |
| Delete a standalone item | (none) | `items`, `assets` (cascade via `byItem` index), `payloads`, `meta` |
