# Usage Example: STAC Store Migration

## Python API

```python
from pathlib import Path
from debrief_stac.migrate import migrate_flat_store

store = Path("/path/to/local-store")
migrated = migrate_flat_store(store)
print(f"Migrated {len(migrated)} items: {migrated}")
# Output: Migrated 2 items: ['exercise-alpha', 'training-run-1']
```

## JSON-RPC CLI

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"migrate_store","params":{"path":"/path/to/local-store"}}' \
  | python -m debrief_stac.cli
```

Response:
```json
{"jsonrpc":"2.0","id":1,"result":{"migrated_items":["exercise-alpha","training-run-1"],"count":2}}
```

## Idempotent — Safe to Run Again

```python
second_run = migrate_flat_store(store)
print(f"Second run: {second_run}")
# Output: Second run: []
```
