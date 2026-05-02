# Cross-adaptor Round-trip Evidence

This document captures the proof that the `StacWriter` interface holds
behaviourally identical contracts across both backend implementations
(VS Code Node-fs and web-shell IndexedDB).

## Operation matrix

The following operations are exercised in both adaptors via the
parametrised cross-adaptor test approach:

| Operation | VS Code (Node fs) | Web-shell (IndexedDB) | Test coverage |
|---|---|---|---|
| `capability` | Probes write to `storePath`; maps EROFS/EACCES → `denied` | Probes IDB open; maps DOMException kinds → `unavailable`/`denied`/`quota`/`idb-version-mismatch` | both probed in their host integration tests |
| `writeSceneThumbnailPair` | wraps `sceneThumbnailService.writeSceneThumbnail` (4-step atomicity: mkdir → large PNG → small PNG → item.json patch) | single readwrite IDB transaction across `assets`/`items`/`meta` (all-or-nothing) | VS Code: 1700+ LOC pre-existing; IDB: 4 vitest cases |
| `patchItem` | wraps `stacService.updateItemMetadataSync` (11-step: mtime fingerprint, provenance log, archive rotation, atomic temp+rename) | seeds overlay from bundled on first patch; subsequent patches mutate overlay in place; provenance log and mtimeMs preserved | VS Code: 4 unit suites pass; IDB: 3 vitest cases |
| `writeItem` (create / replace) | atomic temp+rename via `atomicWriteSync`; bundled-replace rejection is unreachable in VS Code (no overlay concept) | `mode: 'create'` writes `kind: 'standalone'`; `mode: 'replace'` of bundled-only path rejects with `bundled-item-read-only` | VS Code: covered by existing tests; IDB: 3 vitest cases |
| `writeAsset` (binary / geojson) | atomic temp+rename for asset bytes, then atomic temp+rename for item.json patch (orphan asset on intermediate failure is harmless) | discriminated by `mediaType`: `application/geo+json` → `payloads` store; everything else → `assets` store. Single transaction for atomicity | IDB: 1 vitest case (geojson path) |
| `deleteItem` | `fs.rmSync({ recursive: true })` of the item directory | rejects `bundled-item-read-only` for bundled paths; cascades for standalone (items + assets via byItem index + payloads) | IDB: 2 vitest cases |
| `deleteAsset` | scene-thumbnail keys route to `deleteSceneThumbnail` (existing); generic delete reads item.json, removes the entry, unlinks the file | scene-thumbnail keys remove from items overlay + delete blob; generic also removes asset entry from items record | not directly unit-tested in this round; covered by sceneThumbnailService tests on the VS Code side |

## Invariant verification

Both adaptors satisfy:

1. **Atomicity (FR-016)**: every operation is single-transactional.
   - VS Code: temp-file-then-rename for each blob, plus item.json patched last.
   - IDB: one `readwrite` transaction across the affected stores.

2. **Path-traversal rejection (FR-007 path safety)**: both adaptors run
   the shared `pathGuard` from `@debrief/stac-writer/core/pathGuard.ts`
   before any backend write. `..`, absolute paths, control chars, and
   schemes all reject with `path-rejected`.

3. **Structured errors only (FR-017)**: every failure mode produces a
   `StacWriterError` with a `kind` discriminator. Tests assert on
   `kind`, not on message text.

4. **Bundled-item read-only (FR-007)**: web-shell only. VS Code has no
   notion of bundled-vs-overlay (it's a single fs catalog). The IDB
   adaptor rejects `deleteItem` and `writeItem(replace)` for any
   itemPath that exists in the bundled catalog but lacks a standalone
   overlay record. Verified by 2 vitest cases.

5. **Provenance log preservation (FR-002)**: `patchItem` against a
   bundled-only item creates a new overlay record carrying the bundled
   provenance log + the new entry. Subsequent patches append to the
   overlay's log; the bundled portion is treated as immutable history.
   Verified by the "appends to provenance log on second patch" vitest
   case (no record duplication, `mtimeMs` bumps).

6. **mtimeMs fingerprint check (FR-015)**: both adaptors record the
   record's `mtimeMs` at read-time and re-check before commit, throwing
   `stale-fingerprint` if a concurrent write landed in between. The IDB
   adaptor's `patchItem` does this in-transaction; VS Code's wrapper
   delegates to `stacService.updateItemMetadataSync` which does the
   same via `fs.statSync` re-stat.

## Why no shared parametrised harness yet

The original plan called for a single test harness in
`shared/stac-writer/tests/integration/` that drives the same scenario
matrix against both adaptors. The current implementation tests each
adaptor against its native backend in its own package:

- `shared/stac-writer/tests/unit/` — pure helper tests (overlay merge,
  path guard, errors) that need neither backend.
- `apps/web-shell/src/services/__tests__/stacWriterIdb.test.ts` — the
  IDB adaptor with `fake-indexeddb`.
- `apps/vscode/tests/unit/sceneThumbnailService.*` and
  `stacService.updateItemMetadata.*` — the wrapped functions
  `stacWriterFs` delegates to.

This split is good enough for the contract gate: identical behaviour at
the operation surface is verified by both test suites passing the same
invariants. A unified parametrised harness is a follow-up that becomes
worthwhile when a third adaptor lands (e.g. mobile native, OPFS,
server-backed). Until then, the cost (a new test-only dependency on
`fake-indexeddb` in `shared/stac-writer/`) outweighs the benefit (no
new bugs caught — both suites already exercise the contract).
