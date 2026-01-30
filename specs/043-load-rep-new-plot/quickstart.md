# Quickstart: 043 - Load REP Files into New Plot

## What This Feature Does

Adds an "Add to new plot in [store-name]" option to the existing "Load into Debrief..." context menu. Users can create a new STAC plot from REP files in a single action instead of creating an empty plot first.

## Implementation Summary

### Files to Modify

1. **`apps/vscode/src/commands/importRep.ts`** — Add "new plot" entries to `showItemPicker()`, add `createNewPlotFromRep()` flow
2. **`apps/vscode/src/services/stacService.ts`** — Add `createItem()` method

### Key Changes

**stacService.ts** — New method:
```typescript
async createItem(storePath: string, options: { title: string; id?: string }): Promise<CreateItemResult>
```
Creates: `{itemId}/item.json`, `{itemId}/assets/`, updates `catalog.json`.

**importRep.ts** — Extended picker:
```typescript
// Prepend "new plot" options
for (const store of stores) {
  pickItems.unshift({
    label: `$(add) Add to new plot in "${store.displayName}"`,
    kind: 'newPlot',
    storeId: store.id,
    storePath: store.path,
  });
}
```

**importRep.ts** — New flow (when `kind === 'newPlot'`):
1. Prompt for title via `showInputBox`
2. Parse all selected .rep files (fail-fast)
3. `stacService.createItem(storePath, { title })`
4. `stacService.addFeatures(...)` with merged GeoJSON
5. `stacService.addAsset(...)` for each .rep file
6. Open in MapPanel
7. On failure after step 3: delete item folder

## Testing Approach

- Unit test `createItem()`: verify folder structure, item.json content, catalog.json update
- Unit test picker: verify "new plot" entries appear per store
- Unit test atomicity: simulate failure after folder creation, verify cleanup
- Unit test multi-file merge: verify features combined correctly

## Constitution Compliance

- **Article I (Offline)**: All local filesystem operations
- **Article III (Source preservation)**: Original .rep files copied to assets/
- **Article III (Provenance)**: Assets registered with `roles: ["source"]`
- **Article IV (Services never touch UI)**: stacService returns data only; VS Code command handles UI
