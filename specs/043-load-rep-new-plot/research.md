# Research: 043 - Load REP Files into New Plot

## Decision 1: Where to implement `createItem()`

**Decision**: Add `createItem()` to the existing TypeScript `stacService.ts` in the VS Code extension.

**Rationale**: The VS Code extension already operates directly on the local filesystem for all STAC operations (`addAsset`, `addFeatures`, `listItems`). The Python `debrief-stac` service has `create_plot()` but the TypeScript extension doesn't call it — it does its own file I/O. Adding `createItem()` follows the established pattern.

**Alternatives considered**:
- Call Python `debrief-stac` via subprocess — adds latency and complexity for a simple folder+JSON creation. Rejected.
- Create a shared MCP tool — premature; MCP wrappers come later per architecture plan. Rejected.

## Decision 2: Item ID generation

**Decision**: Use `crypto.randomUUID()` (Node.js built-in) to generate item IDs when not provided.

**Rationale**: UUIDs avoid collisions without coordination. The existing `exercise-alpha` and `training-run-1` IDs in test data are human-readable slugs, but for user-created items a UUID is safer. The `id` parameter remains optional so tests can use predictable IDs.

**Alternatives considered**:
- Slug from title (e.g., "Exercise Alpha" → "exercise-alpha") — collision risk with duplicate titles (spec explicitly allows duplicate titles). Rejected.
- Timestamp-based ID — less standard, no benefit over UUID. Rejected.

## Decision 3: Extending existing command vs. new command

**Decision**: Extend the existing `debrief.importRep` command and its `showItemPicker()` function.

**Rationale**: The spec explicitly requires "Add to new plot" options to appear in the same picker as existing plot targets. A separate command would fragment the UX. The existing `importRep.ts` already handles the full import workflow; adding the "new plot" branch keeps all import logic in one place.

**Alternatives considered**:
- Separate `debrief.createPlotFromRep` command — splits import UX into two entry points. Rejected per spec.

## Decision 4: Atomicity implementation

**Decision**: Create the item folder first, then wrap all subsequent operations in a try/catch. On failure, recursively delete the item folder using `fs.rm(itemDir, { recursive: true })`.

**Rationale**: Simple and effective. The folder is the only artifact created. Original REP files are read-only. No database or external state to roll back.

**Alternatives considered**:
- Create in temp folder, move on success — adds complexity with no benefit since the only rollback action is deletion. Rejected.
- Two-phase commit — over-engineering for local filesystem operations. Rejected.

## Decision 5: Catalog linking after item creation

**Decision**: `createItem()` must also update `catalog.json` to add a link to the new item. This matches the pattern in the Python `debrief-stac` service's `create_plot()`.

**Rationale**: Without a catalog link, the new item won't appear in the STAC Stores tree view. The catalog.json is the index.

**Alternatives considered**:
- Refresh/rebuild catalog from filesystem scan — fragile, doesn't match STAC spec which uses explicit links. Rejected.

## Decision 6: Multi-file handling

**Decision**: Parse all files first, then create the item and write data. If any parse fails, abort before creating anything.

**Rationale**: Fail-fast approach. Parsing is the most likely failure point (malformed REP files). By parsing all files before any writes, we avoid needing to clean up a partially created item due to a parse error.

**Alternatives considered**:
- Parse and write incrementally — requires rollback on late failures. More complex. Rejected.
