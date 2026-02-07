# Research: STAC Store Reorganization

## R1: Current vs Target Structure Alignment

**Decision**: The Python `debrief-stac` service (`plot.py:59-92`) already creates items in per-item folders with `item.json`. The migration only needs to handle legacy flat stores (like the VS Code test data).

**Rationale**: No changes needed to `create_plot()`, `read_plot()`, `_save_plot()`, `list_plots()`, `add_features()`, or `add_asset()` — they all already use `catalog_path / plot_id / item.json` pattern.

**Alternatives considered**: Modifying the service to support both layouts was rejected — single canonical layout is simpler and avoids ambiguity.

## R2: Flat Store Detection Strategy

**Decision**: Detect flat stores by checking catalog.json item link hrefs. If an item link href does NOT match `./{id}/item.json` pattern, the item needs migration.

**Rationale**: Two flat patterns observed:
1. `./items/{id}.json` — items in shared `items/` subdirectory (VS Code test data)
2. `./{id}.json` — items at catalog root level (hypothetical)

Both are distinguishable from the target `./{id}/item.json`.

**Alternatives considered**: Scanning filesystem for `*.json` files was rejected — catalog links are the authoritative source of item locations.

## R3: File Move Strategy

**Decision**: Use `shutil.move()` for relocating files, then update JSON in-place.

**Rationale**:
- `shutil.move()` handles cross-device moves
- JSON updates are atomic (read → modify → write)
- Source `.geojson` files are moved alongside their item (same relative position maintained)

**Alternatives considered**: Copy-then-delete was rejected — move is atomic on same filesystem and simpler.

## R4: Href Update Rules

**Decision**: After migration, update these hrefs:

| Location | Field | Before | After |
|----------|-------|--------|-------|
| catalog.json | item link href | `./items/{id}.json` | `./{id}/item.json` |
| item.json | self link | `./{id}.json` | `./item.json` |
| item.json | root/parent links | `../catalog.json` (from items/) | `../catalog.json` (from {id}/) |
| item.json | asset data href | `./{id}.geojson` | `./{id}.geojson` (unchanged — relative to item) |

**Rationale**: Root/parent links stay `../catalog.json` because depth doesn't change (items/ → {id}/ is same level). Asset hrefs stay the same since geojson moves alongside item.json.

## R5: Idempotency

**Decision**: Skip items whose catalog link already matches `./{id}/item.json`. Return list of actually migrated item IDs.

**Rationale**: Running migration twice must be safe. Items already in target structure are left untouched.

## R6: Empty items/ Cleanup

**Decision**: After migrating all items from `items/` directory, remove it if empty.

**Rationale**: Leaving empty directories is confusing. Only remove if completely empty to avoid data loss.
