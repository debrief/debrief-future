# Research: Atomic (Transactional) Plot Save

**Feature**: 268-save-atomicity · **Phase 0** · **Date**: 2026-06-01

This document resolves the one decision the spec deliberately deferred (the commit mechanism) plus the supporting design choices, grounded in the current code paths.

## Current state (grounding)

| Concern | Where | Finding |
|---------|-------|---------|
| VS Code save — feature collection | `apps/vscode/src/commands/saveSession.ts:50` | Raw `fs.writeFileSync` of `features.geojson` — **non-atomic and bypasses the writer boundary**. |
| VS Code save — thumbnails | `saveSession.ts:72` → `writer.writePlotThumbnailPair` | Atomic *per file*, but a separate step from the FC write. |
| VS Code save — success reporting | `saveSession.ts:133-134` | `markClean()` + "Plot saved" fire **before** the thumbnail write (FR-005 violation). |
| VS Code open | `apps/vscode/src/commands/openPlot.ts:155` (`loadPlotData`) → `:182` (`hydrateStoreFromFeatures`) | Natural reconcile slot is **before** the read at :155. Notifications via `vscode.window.showWarningMessage`. |
| Web-shell save | `apps/web-shell/src/mocks/stacService.ts:449-457` | `writeItem()` then `writeAsset()` in **two separate IndexedDB transactions** (not atomic as a pair). Bundled-plot edits use `patchItem` (already one transaction). No thumbnail write (`stacWriterIdb.ts:642` throws "not supported"). |
| Web-shell open | `apps/web-shell/src/services/catalogReadView.ts:94,123` (`readStoredItem`/`readPayload`) | Reconcile slot before the read; toast surface via App/Zustand. |
| FS atomic primitive | `apps/vscode/src/services/stacWriterFs.ts:527-555` (`atomicWriteSync`) | `temp file → renameSync`, per file. **No multi-file grouping / journal exists.** |
| IDB atomicity | `apps/web-shell/src/services/stacWriterIdb.ts` | Each writer method opens its **own** `readwrite` transaction over the relevant stores (`items`/`payloads`/`assets`/`meta`) and `await tx.done`. IndexedDB transactions are atomic and discard uncommitted work on abort/kill. |
| Article IV.4 ESLint | `shared/eslint-rules/no-direct-persistence-in-frontend.cjs` | **web-shell-scoped only**; the VS Code raw `fs.writeFileSync` is *not* flagged (Node host). So FR-004 is an Article IV.2 *consistency* fix, not the closing of an existing suppression. |
| Fault-injection test patterns | `apps/vscode/tests/unit/saveSession.createSaveSessionCommand.test.ts`, `apps/web-shell/src/services/__tests__/stacWriterIdb.test.ts` (fake-indexeddb), `shared/components/src/PropertiesPanel/__tests__/saveSession-integration.test.ts` (`ReadOnlyFilesystemError` sim) | Mock-writer-throws-on-Nth-call and `fake-indexeddb` factories already exist and are reusable. |

## Decision 1 — One boundary operation for the whole save unit

**Decision**: Add a single host-agnostic operation to the `StacWriter` interface — `commitPlotSave(input)` — that takes *all* artefacts of a save (the feature collection, plus the optional thumbnail pair) and commits them atomically. Add a companion `reconcilePlotSave(input)` called on open. Each host implements both once against its native backend.

**Rationale**: The spec's "save unit" is exactly `features.geojson` + STAC `item.json` + thumbnail PNGs (FR-002). Atomicity must be enforced *at the boundary* (FR-009) so neither host can regress it and the feature-collection write stops bypassing the boundary (FR-004, Article IV.2/IV.4). A single operation that receives the whole unit is the only place both hosts can guarantee all-or-nothing — a caller orchestrating several writer calls cannot.

**Alternatives rejected**:
- *Keep separate `writeFeatureCollection` + `writePlotThumbnailPair` and wrap them in a caller-side "transaction"* — the caller (frontend) cannot make multiple FS renames or IDB transactions atomic; this just moves the seam to the wrong layer (violates FR-009).
- *Expose raw FS/IDB transaction handles to callers* — leaks backend specifics across the boundary, breaks Article IV.4's "implement once against native backend".

## Decision 2 — FS commit mechanism: a write-ahead intent journal as the atomic commit point

**Decision**: In `stacWriterFs`, `commitPlotSave` proceeds in four phases:
1. **Stage** — write every new artefact to a temp file (`<name>.<token>.tmp`) using the existing `atomicWriteSync` temp step. Nothing in place yet.
2. **Commit point** — atomically write a single **save journal** (`.save-journal.json`, itself via temp→rename) listing the pending `temp → final` renames for this save. *The atomic creation of the journal is the commit point.*
3. **Apply** — rename each temp → final (POSIX `rename` is atomic per file).
4. **Clear** — delete the journal. Save complete.

**Reconcile-on-open** (`reconcilePlotSave`):
- *No journal, no stray temps* → clean, no-op.
- *Stray temps but no journal* → interrupted **before** the commit point → delete the temps, keep the originals = **last-good** (FR-008, satisfies Q2 "auto-restore last good").
- *Journal present* → interrupted **after** the commit point → **roll forward**: for each `temp → final` still pending, rename it (idempotent — a missing temp means that final already landed), then delete the journal = the **new coherent version** (FR-007 "the new version if it had committed").

**Rationale**: A multi-file FS save has no single atomic syscall, so we need an explicit commit marker. Anchoring "committed" to the atomic journal write gives a crisp boundary: reconcile rolls **back** before it and **forward** after it, and *every* interruption point yields a coherent plot (FR-001/FR-007). It reuses the existing `atomicWriteSync` primitive (no new low-level primitive — matches the spec assumption) and needs no fsync/durability guarantee (Decision 7).

**Alternatives rejected**:
- *Sequential temp→rename with no journal* — a crash mid-rename leaves new `features.geojson` + old `item.json` = incoherent, and rename has already destroyed the original so it can't be rolled back. **Unsafe** — this is the core bug.
- *Backup-originals-then-overwrite, roll back on open* — doubles I/O for every save and still needs a marker to know a save was in flight; the journal+roll-forward is simpler and cheaper.
- *Whole-item shadow directory + atomic dir swap* — item dirs have stable paths referenced elsewhere (catalog, assets); swapping directories is disruptive and heavier than a per-file journal.

## Decision 3 — Web-shell commit mechanism: a single multi-store IndexedDB transaction

**Decision**: In `stacWriterIdb`, `commitPlotSave` opens **one** `readwrite` transaction spanning `items` + `payloads` + `assets` + `meta`, enqueues all puts (item record, geojson payload, any binary assets), then `await tx.done`. `reconcilePlotSave` is effectively a no-op (optionally prunes orphaned overlay-only records).

**Rationale**: IndexedDB transactions are already atomic and durable — an error aborts the whole transaction, and a tab/browser kill discards an uncommitted transaction, leaving the store at the last committed state. Grouping the save's writes into one transaction gives true all-or-nothing for free and satisfies the "coherent fallback" (Q3) with no journal. The current gap is purely that `writeItem` and `writeAsset` run in *separate* transactions (`mocks/stacService.ts:449-457`); `commitPlotSave` closes that.

**Alternatives rejected**:
- *Replicate the FS journal in the browser* — unnecessary; IDB already provides transactional atomicity. Adding a journal would be redundant complexity.

## Decision 4 — Reconcile runs *before* the read on open

**Decision**: `reconcilePlotSave` is invoked **before** the plot data is read (VS Code: before `loadPlotData` at `openPlot.ts:155`; web-shell: before `catalogReadView` read). If it reports `recovered: true`, the host shows a **non-blocking** notice (`showWarningMessage` / web-shell toast).

**Rationale**: Reconcile can change what is on disk (roll forward applies pending renames; roll back deletes temps). It must run first so the subsequent read sees the reconciled, coherent state. The non-blocking notice (no prompt) implements Q2/FR-008 and keeps this a non-UI feature.

## Decision 5 — Report success only after commit

**Decision**: In `saveSession.ts`, replace `storeFeatureCollection` + `storeThumbnails` with a single `await writer.commitPlotSave({ featureCollection, thumbnails })`. Move `markClean()` and the "Plot saved" message to **after** it resolves; on rejection, surface the error and leave the dirty flag set (FR-005/FR-006). Thumbnail *capture* stays best-effort: a capture failure simply omits `thumbnails` from the commit; a capture *write* that begins is part of the atomic unit.

## Decision 6 — Boundary types are derived (Article IV.5)

**Decision**: `CommitPlotSaveInput.thumbnails` is `Pick<WritePlotThumbnailPairInput, 'largePngBase64' | 'smallPngBase64'>`; the feature-collection field reuses the generated `FeatureCollection` type from `@debrief/schemas`. No fields are re-listed by name. The internal `SaveJournal` record (FS-only) is a new typed shape (no existing source to derive from) and is validated on read.

## Decision 7 — No new durability guarantee, no new dependencies

Per Q3, the guarantee is atomicity/coherence, not power-loss durability of the newest save, so we do **not** add fsync requirements (the existing best-effort `temp→rename` is sufficient). No new runtime dependencies: FS uses `node:fs`/`node:crypto` (already used by `stacWriterFs`), web-shell uses the existing `idb` transactions.

## Decision 8 — Validation strategy (fault injection)

- **Unit/integration (primary, covers SC-001/002/003/005)**: reuse the mock-writer-throws-on-Nth-call pattern and `fake-indexeddb` factory. For FS, drive `commitPlotSave` against a real temp dir (`fs.mkdtempSync`), inject failures at each phase (stage / journal / apply), and assert: (a) no observable partial via a follow-up read, (b) for pre-commit failures the originals are intact, (c) `reconcilePlotSave` heals each leftover condition, (d) no stray `.tmp`/journal remain after reconcile. For web-shell, spy on `db.transaction` to assert a save uses exactly one transaction and that an aborted transaction leaves the store unchanged.
- **E2E (smoke, regression)**: one web-shell Playwright happy-path save → reopen coherence check (no fault injection — that lives in unit/integration).

## Open items handed to `/speckit.tasks`

1. Confirm the exact web-shell *live* save entrypoint that should call `commitPlotSave` (the `mocks/stacService.ts` create path vs. the `patchItem` overlay path for bundled-plot edits — the overlay path is already single-transaction; the standalone create path is the two-transaction gap).
2. Decide whether `writeFeatureCollection` should remain a thin public method delegating to `commitPlotSave` for non-thumbnail callers (e.g. `captureScene.ts:474` writes a FeatureCollection without thumbnails).
3. Add an ADR recording the journal/commit-marker decision (Article VIII.3).
