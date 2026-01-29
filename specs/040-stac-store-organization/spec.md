# Spec 040: Reorganize STAC Store to Per-Item Folder Structure

## Problem

The VS Code test data STAC store uses a flat `items/` directory where all `.json` item files and `.geojson` data files sit side-by-side. This doesn't accommodate additional assets per item (e.g., original source files). The Python `debrief-stac` service already creates per-item folders with `item.json`, but the test data and any legacy stores don't match this convention.

## Current vs Target Structure

**Current (flat `items/` directory):**
```
local-store/
  catalog.json                     → links: ./items/exercise-alpha.json
  items/
    exercise-alpha.json            → self: ./exercise-alpha.json, asset: ./exercise-alpha.geojson
    exercise-alpha.geojson
    training-run-1.json
    training-run-1.geojson
```

**Target (per-item folders):**
```
local-store/
  catalog.json                     → links: ./exercise-alpha/item.json
  exercise-alpha/
    item.json                      → self: ./item.json, asset: ./exercise-alpha.geojson
    exercise-alpha.geojson
    assets/                        → (empty, ready for source files)
  training-run-1/
    item.json
    training-run-1.geojson
    assets/
```

## Changes Required

### 1. Python Migration CLI Command

Add a `migrate_flat_store` function to `debrief_stac` and expose it via CLI.

**Module**: `services/stac/src/debrief_stac/migrate.py`

```python
def migrate_flat_store(catalog_path: Path) -> list[str]:
    """Migrate a flat STAC store to per-item folder structure.

    Detects flat structure (items as {id}.json at same level or in items/ subfolder),
    moves each item into its own folder as item.json, moves associated assets,
    creates assets/ subfolder, and updates all href references.

    Returns list of migrated item IDs.
    """
```

**Detection logic:**
1. Read `catalog.json` and find all `rel=item` links
2. For each item link, check if href matches flat pattern (e.g., `./items/{id}.json` or `./{id}.json`)
3. Skip items already in per-item folder structure (href matches `./{id}/item.json`)

**Migration per item:**
1. Create directory `{catalog_root}/{item_id}/`
2. Move `{id}.json` → `{item_id}/item.json`
3. Move sibling `.geojson` files referenced in assets → same relative position in new folder
4. Create `{item_id}/assets/` directory
5. Update item JSON:
   - `self` link → `./item.json`
   - `root`/`parent` links → adjust relative depth if needed (stays `../catalog.json` if moving from `items/` to `{id}/`)
   - Asset `href` values stay relative to item.json (e.g., `./{id}.geojson` stays same)
6. Update `catalog.json` item link href → `./{item_id}/item.json`

**CLI exposure** (in `cli.py`):
```python
# JSON-RPC method: migrate_store
def handle_migrate_store(params: dict) -> dict:
    path = params["path"]
    migrated = migrate_flat_store(Path(path))
    return {"migrated_items": migrated, "count": len(migrated)}
```

### 2. Migrate Test Data

Run migration against `apps/vscode/test-data/local-store/`.

Expected result:
- `items/` directory removed
- `exercise-alpha/item.json` + `exercise-alpha/exercise-alpha.geojson` + `exercise-alpha/assets/`
- `training-run-1/item.json` + `training-run-1/training-run-1.geojson` + `training-run-1/assets/`
- `catalog.json` links updated

### 3. Update TypeScript stacService (if needed)

The TypeScript `stacService.ts` resolves item paths relative to catalog location using `path.resolve(path.dirname(catalogPath), link.href)`. Since catalog links will change from `./items/{id}.json` to `./{id}/item.json`, and the service already handles relative paths, **no code changes should be needed** — only the test data changes.

Verify by running existing VS Code extension tests after migration.

## Success Criteria

- [ ] Python `migrate_flat_store()` function migrates flat stores to per-item folders
- [ ] Each item folder contains `item.json`, associated `.geojson` file, and empty `assets/` dir
- [ ] All `href` references in item JSON and catalog JSON are correct after migration
- [ ] Test data at `apps/vscode/test-data/local-store/` is migrated
- [ ] Existing Python tests pass
- [ ] Existing VS Code extension tests pass with migrated test data
- [ ] Migration is idempotent (running twice doesn't break anything)

## Out of Scope

- Remote/cloud STAC catalog support
- Changing the Python `debrief-stac` create/read/write operations (already correct)
- Adding new asset types
