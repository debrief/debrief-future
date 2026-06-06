# Fault-Injection Matrix — Atomic Plot Save (#268)

Every distinct write step of a save is driven to failure (or interruption) on
both hosts, and the plot is asserted to resolve to exactly one **coherent**
version — never a torn or mismatched mixture. This table is the credibility
artifact for SC-001 / SC-002 / SC-003 / SC-005.

Legend: **roll-back** = previous version preserved (last-good); **roll-forward**
= new version completed; **clean** = nothing to do.

## VS Code — filesystem host (`stacWriterFs`)

The commit runs **stage → journal (commit point) → apply → clear**. The atomic
creation of the journal is the boundary: a failure *before* it rolls back; a
failure *after* it rolls forward on the next open.

| # | Injected failure point | Phase (vs. commit point) | `commitPlotSave` result | On-disk after failure | Reconcile-on-open outcome | Coherent? | Proven by |
|---|------------------------|--------------------------|-------------------------|-----------------------|---------------------------|-----------|-----------|
| 1 | `writeFileSync` of a staged temp | stage — pre-commit | rejects | originals byte-identical, no temps, no journal | n/a (clean) | ✅ previous | `stacWriterFs.commitPlotSave.test.ts` |
| 2 | `renameSync` of the journal into place | journal write — pre-commit | rejects | originals byte-identical, no temps, no journal | n/a (clean) | ✅ previous | `stacWriterFs.commitPlotSave.test.ts` |
| 3 | `renameSync` of `item.json` (apply) | apply — **post-commit** | rejects | journal remains, listing pending renames | **roll-forward** → new version | ✅ new | `stacWriterFs.commitPlotSave.test.ts` + `stacWriterFs.reconcile.test.ts` |
| 4 | interruption: temps staged, **no** journal | pre-commit | (process killed) | stray temps + originals | **roll-back** → temps discarded, originals kept | ✅ previous | `stacWriterFs.reconcile.test.ts` |
| 5 | interruption: journal + pending renames | post-commit | (process killed) | temps + journal | **roll-forward** → renames applied, journal dropped | ✅ new | `stacWriterFs.reconcile.test.ts` |
| 6 | interruption: journal + some renames applied | post-commit (partial) | (process killed) | one temp consumed, one pending | **roll-forward** (idempotent — skips missing temp) | ✅ new | `stacWriterFs.reconcile.test.ts` |
| 7 | malformed / unknown-version journal | corrupt commit marker | (n/a) | bad journal + temps | **roll-back** → discard bad journal + temps, keep originals | ✅ previous | `stacWriterFs.reconcile.test.ts` |
| 8 | clean store (no leftovers) | — | — | unchanged | **clean** no-op (idempotent) | ✅ | `stacWriterFs.reconcile.test.ts` |

## Web-shell — IndexedDB host (`stacWriterIdb`)

The commit is **one multi-store transaction** over `items` + `payloads`
(+ `meta`). IndexedDB transactions are atomic and discard uncommitted work on
abort / tab-kill, so there is never a partial save to reconcile.

| # | Injected failure point | Mechanism | `commitPlotSave` result | Store after failure | Reconcile-on-open outcome | Coherent? | Proven by |
|---|------------------------|-----------|-------------------------|---------------------|---------------------------|-----------|-----------|
| 1 | abort mid-commit (items put) | `tx.abort()` on the `items` put | rejects | **byte-identical** to before (payload put rolled back too) | n/a | ✅ previous | `stacWriterIdb.commitPlotSave.test.ts` |
| 2 | invalid payload (not a FeatureCollection) | runtime type check | rejects before any write | nothing written | n/a | ✅ previous | `stacWriterIdb.commitPlotSave.test.ts` |
| 3 | tab/browser kill during commit | IndexedDB transaction discard | (killed) | uncommitted transaction discarded → last committed state | **clean** (no partial exists) | ✅ | by IndexedDB semantics; reconcile no-op proven in `stacWriterIdb.reconcile.test.ts` |
| 4 | clean / committed store | — | — | unchanged | **clean** no-op (idempotent) | ✅ | `stacWriterIdb.reconcile.test.ts` |

## Single-transaction proof (SC-005)

`stacWriterIdb.commitPlotSave.test.ts` spies on `IDBDatabase.prototype.transaction`
and asserts a save opens **exactly one** `readwrite` transaction, and that the
one transaction spans both `items` and `payloads` — the item record and the
geojson payload land together or not at all.

## Honest-reporting proof (SC-003)

`saveSession.reporting.test.ts` asserts (via mock `invocationCallOrder`) that
`markClean()` and the "Plot saved" message fire **strictly after**
`commitPlotSave` resolves, and that a rejected commit shows a failure, keeps the
plot dirty, and shows **no** success — so the success indication appears for 0%
of saves that did not fully commit.
