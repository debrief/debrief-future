# Test Summary: STAC Store Reorganization (#040)

## Migration Tests (`test_migrate.py`)

```
tests/test_migrate.py::TestMigrateFlatStore::test_migrates_items_from_items_subdirectory PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_idempotent_second_run_is_noop PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_catalog_item_links_updated PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_item_self_link_updated PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_item_parent_root_links_correct PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_asset_hrefs_correct PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_empty_items_directory_removed PASSED
tests/test_migrate.py::TestMigrateFlatStore::test_assets_subdirectory_created PASSED

8 passed in 0.15s
```

## CLI Tests (`test_cli.py`)

```
tests/test_cli.py::TestHandleCopyAsset::test_copy_multiple_assets_to_same_plot PASSED
tests/test_cli.py::TestHandleCopyAsset::test_copy_asset_returns_correct_path PASSED
tests/test_cli.py::TestHandleMigrateStore::test_migrate_store_returns_migrated_items PASSED

3 passed in 0.06s
```

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 11 |
| Passed | 11 |
| Failed | 0 |
| New tests added | 9 (8 migration + 1 CLI) |

## Key Scenarios Verified

- Flat store (items/ subdirectory) migrated to per-item folders
- Idempotent: second run is a no-op (returns empty list)
- Catalog links updated to `./{id}/item.json`
- Item self-link updated to `./item.json`
- Root/parent links remain `../catalog.json`
- Asset hrefs preserved (relative to item.json)
- Empty `items/` directory cleaned up
- `assets/` subdirectory created in each item folder
- JSON-RPC handler returns correct response format
