# Contract: Save & Reconcile-on-Open Flow

**Feature**: 268-save-atomicity · **Phase 1**

Behavioural contract for how the host commands drive `commitPlotSave` /
`reconcilePlotSave`. Companion to `stac-writer-commit.ts` (the type contract).

## Save (both hosts)

```
analyst triggers Save
   │
   ├─ host gathers FeatureCollection (view-state folded in) + best-effort thumbnail capture
   │
   ├─ await writer.commitPlotSave({ ctx, stacItemPath, featureCollection, thumbnails? })
   │       │
   │       ├─ REJECTS ─▶ host shows error; dirty flag STAYS set; previous plot intact   [FR-005/006/010]
   │       │
   │       └─ RESOLVES ─▶ host markClean(); host shows "Plot saved"                       [FR-005]
```

Key change vs. today: `markClean()` and the success message move to **after**
`commitPlotSave` resolves (currently they fire before the thumbnail write —
`saveSession.ts:133-134`). Thumbnail *capture* failure is non-fatal: omit
`thumbnails` and still commit the feature collection.

### VS Code — `apps/vscode/src/commands/saveSession.ts`
- Replace `storeFeatureCollection` (raw `fs.writeFileSync`) **and** `storeThumbnails`
  with a single `await writer.commitPlotSave(...)`.
- The feature-collection write is now on the boundary (FR-004 / Article IV.2).

### Web-shell — `apps/web-shell/src/mocks/stacService.ts` (save path)
- Replace the sequential `writeItem()` + `writeAsset()` (lines 449-457, two
  transactions) with one `commitPlotSave(...)` (one IDB transaction).
- Bundled-plot edits via `patchItem` are already single-transaction; tasks
  confirm whether they also route through `commitPlotSave` or stay as-is.

## Reconcile-on-open (both hosts)

```
analyst opens plot
   │
   ├─ await writer.reconcilePlotSave({ ctx, stacItemPath })   ◀── BEFORE the read
   │       │
   │       ├─ { recovered:false, outcome:'clean' } ─▶ (silent)
   │       └─ { recovered:true,  outcome:'rolled-back'|'rolled-forward' } ─▶ non-blocking notice  [FR-008]
   │
   ├─ read plot data (loadPlotData / catalogReadView)         ◀── now sees coherent state
   └─ hydrate store
```

`reconcilePlotSave` MUST run **before** the read because it can change what is
on disk (roll forward applies pending renames; roll back deletes temps).

### VS Code — `apps/vscode/src/commands/openPlot.ts`
- Insert the reconcile call **before** `loadPlotData` (`:155`).
- On `recovered`, `vscode.window.showWarningMessage('Recovered an interrupted save — opened the last good version of this plot.')` (wording finalised in tasks; must be non-modal).

### Web-shell — `apps/web-shell/src/services/catalogReadView.ts` / `App.tsx`
- Insert reconcile before the IDB read; `outcome` is normally `clean`
  (IDB transactions never expose partial state). On the rare orphan-prune,
  surface the existing toast.

## Notes
- `reconcilePlotSave` is idempotent and cheap on the common (clean) path —
  it is acceptable to call on every open (FR-011: no perceptible regression).
- No new user-facing surface beyond the existing notification APIs → the
  feature stays non-UI (Clarifications Q2).
