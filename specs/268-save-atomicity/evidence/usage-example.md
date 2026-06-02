# Usage Example — Atomic Plot Save (#268)

Two walkthroughs of the headline behaviour: a save that fails mid-write leaves
the plot intact, and an interrupted save auto-recovers on open. Both are
exercised by the test suite; the excerpts below show the flow and the asserted
outcome.

## 1. A save that fails mid-write leaves the plot intact

When `commitPlotSave` cannot complete, the analyst sees a failure, the plot
stays dirty (so they can retry), and the previously-persisted version is left
byte-identical — there is no partial on disk and no false "Plot saved".

```ts
// A real fs adaptor, wrapped so commitPlotSave rejects as if the store were
// read-only (apps/vscode/tests/unit/saveSession.commit.test.ts).
const realWriter = createStacWriterFs({ storePath, stacService: new StacService() });
const faultyWriter = createFaultInjectingWriter(realWriter, {
  method: 'commitPlotSave',
  failOnCall: 1,
  kind: 'read-only-fs',
  message: 'simulated read-only filesystem',
});

const command = createSaveSessionCommand(
  sessionManager, () => storePath, () => mapPanel, () => faultyWriter,
);
await command();
```

Expected behaviour (asserted):

```
showErrorMessage  → "Failed to save plot: simulated read-only filesystem"
markClean()       → NOT called      (plot stays dirty; analyst can retry)
features.geojson  → byte-identical to the previous version  (v1, not v2)
item.json         → byte-identical to the previous version
item directory    → no *.tmp, no .save-journal.json          (no partial)
```

Under the hood, the failure happened during the **stage** phase (or before the
journal was written), so the originals were never touched — the four-phase
commit only ever destroys the previous files *after* the atomic journal write
marks the save as committed.

## 2. An interrupted save auto-recovers on open

If the process is killed mid-save, the next open heals the plot **before** the
read — automatically, with a non-blocking notice, no dialog. Whether it rolls
back (to the last good version) or forward (to the new version) depends only on
whether the atomic commit point — the journal — had been written.

```ts
// Seed an "interrupted AFTER the commit point" fixture: staged temps + journal
// (apps/vscode/tests/unit/openPlot.reconcile.test.ts).
fs.writeFileSync(`${itemDir}/features.geojson.save-${TOKEN}.tmp`, 'FC_V2\n');
fs.writeFileSync(`${itemDir}/item.json.save-${TOKEN}.tmp`, 'ITEM_V2\n');
fs.writeFileSync(`${itemDir}/.save-journal.json`, JSON.stringify({
  version: 1, stacItemPath, createdAtMs,
  renames: [
    { temp: `features.geojson.save-${TOKEN}.tmp`, final: 'features.geojson' },
    { temp: `item.json.save-${TOKEN}.tmp`,        final: 'item.json' },
  ],
}));

// openPlot runs this BEFORE loadPlot / loadPlotData:
const result = await reconcileBeforeOpen(getStacWriter, storePath, itemPath, showWarning);
```

Expected behaviour (asserted):

```
result.outcome    → 'rolled-forward'
features.geojson  → 'FC_V2'    (new version completed)
item.json         → 'ITEM_V2'
item directory    → no *.tmp, no .save-journal.json
showWarning       → called once: "Recovered an interrupted save — opened the
                     last good version of this plot."
```

The mirror case — staged temps but **no** journal (interrupted *before* the
commit point) — rolls **back**: the temps are discarded, `features.geojson`
stays at the last-good `FC_V1`, and the same non-blocking notice fires. Either
way, the read that follows sees exactly one coherent plot.

## 3. The browser host: one transaction, atomic for free

On the web-shell, `commitPlotSave` writes the item record and the geojson
payload in a single IndexedDB transaction:

```ts
const result = await writer.commitPlotSave({ ctx, stacItemPath, featureCollection });
// stored.record.assets.data.href === `idb:${stacItemPath}::data`
// payload(stacItemPath) === JSON.stringify(featureCollection)
```

If that transaction aborts (quota, tab kill), IndexedDB rolls back **both**
puts — the store is left byte-identical to before — so `reconcilePlotSave` is a
clean no-op: the browser never exposes a partial save to reconcile.
