# Quickstart: STAC Store Migration

## Python API

```python
from pathlib import Path
from debrief_stac.migrate import migrate_flat_store

# Migrate a flat STAC store to per-item folders
migrated = migrate_flat_store(Path("/path/to/catalog"))
print(f"Migrated {len(migrated)} items: {migrated}")
```

## JSON-RPC CLI

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"migrate_store","params":{"path":"/path/to/catalog"}}' | python -m debrief_stac.cli
```

Response:
```json
{"jsonrpc":"2.0","id":1,"result":{"migrated_items":["exercise-alpha","training-run-1"],"count":2}}
```

## What Changes

**Before** (flat):
```
catalog/items/exercise-alpha.json
catalog/items/exercise-alpha.geojson
```

**After** (per-item):
```
catalog/exercise-alpha/item.json
catalog/exercise-alpha/exercise-alpha.geojson
catalog/exercise-alpha/assets/
```

The migration is idempotent — running it again on an already-migrated store is a no-op.
