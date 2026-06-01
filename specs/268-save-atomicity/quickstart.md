# Quickstart: Atomic (Transactional) Plot Save

**Feature**: 268-save-atomicity · **Phase 1** · **Date**: 2026-06-01

How to exercise and verify the atomic-save guarantee once implemented.

## What changes for a user

Nothing, on the happy path: Save still produces the same `features.geojson`,
`item.json`, and thumbnails, and still shows "Plot saved" (FR-011). The
difference is only visible on failure: a save that errors or is interrupted
never leaves a half-updated plot, and "Plot saved" appears only when the whole
save committed.

## Manual smoke (VS Code)

1. Open a plot in the dev extension, make an edit, **Save**. Confirm
   `features.geojson` + `item.json` + thumbnails all updated and "Plot saved".
2. Make the item directory read-only (`chmod -w`), edit, **Save**. Expect a
   clear error, the dirty indicator **still set**, and the previous files
   intact and openable. No `.tmp` or `.save-journal.json` left behind.
3. Simulate an interrupted save (leave a `.save-journal.json` + temps in the
   item dir from the test fixtures), then **reopen** the plot. Expect a
   non-blocking "recovered an interrupted save" notice and a coherent plot.

## Manual smoke (web-shell)

1. `cd apps/web-shell && pnpm dev`, open a plot, edit, **Save** → reopens
   coherent. (IndexedDB transaction atomicity means an interrupted save in the
   browser simply leaves the last committed version.)

## Automated verification (the source of record)

Fault-injection acceptance tests prove the guarantees (SC-001..005):

```sh
# VS Code adaptor + save command (Node, temp dirs + mock-throw-on-Nth-write)
uv run pytest -q  # (no Python change) ; then:
pnpm --filter @debrief/vscode test -- stacWriterFs commitPlotSave reconcile
pnpm --filter @debrief/vscode test -- saveSession

# Web-shell adaptor (fake-indexeddb; one-transaction + abort-leaves-unchanged)
pnpm --filter @debrief/web-shell test -- stacWriterIdb commitPlotSave

# Shared interface contract types
pnpm --filter @debrief/stac-writer test
```

What the tests assert (maps to `contracts/stac-writer-commit.ts` C1–C5):
- **C1/SC-001** — inject a failure at each write phase; a follow-up read returns
  the *pre-save* state (no partial); originals intact for pre-commit failures.
- **C2** — on success every artefact reflects the new state.
- **C3/SC-002** — for each simulated interruption phase, `reconcilePlotSave`
  yields a coherent read (pre-commit → previous, post-commit → new); no
  `.tmp`/journal remain.
- **C3/SC-003** — `markClean`/"Plot saved" never fire for a non-committed save.
- **C4/SC-005** — web-shell uses exactly one IDB transaction; aborting leaves
  the store byte-identical.
- **C5** — `reconcilePlotSave` on a clean store is a no-op.

## Full gate before pushing

```sh
task verify   # lint + typecheck + test (Python + TS)
# plus the web-shell happy-path save→reopen Playwright smoke:
cd apps/web-shell && node run-playwright.mjs save-atomicity
```
