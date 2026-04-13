# Contract: Platform ID Validation

**Feature**: 182-import-platform-warnings  
**Date**: 2026-04-13

## Internal Function Contract

This feature adds one internal function to `import_catalog.py`. It is not a public API — it's an internal helper called during the import pipeline. Documented here for implementation clarity and test design.

### `_validate_platform_ids`

**Signature**:
```python
def _validate_platform_ids(
    features: list[dict[str, Any]],
    file_rel: str,
    registry: PlatformRegistry,
    warnings: list[ImportWarning],
) -> None:
```

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `features` | `list[dict[str, Any]]` | GeoJSON Feature dicts from the parse result |
| `file_rel` | `str` | Relative path to the source file (for warning attribution) |
| `registry` | `PlatformRegistry` | Loaded platform registry instance |
| `warnings` | `list[ImportWarning]` | Mutable list to append warnings to |

**Behaviour**:

1. Extract all `platform_id` values from `feature["properties"]["platform_id"]` across all features.
2. Deduplicate into a set. Discard empty strings and whitespace-only strings.
3. For each unique platform ID, call `registry.resolve(platform_id)`.
4. If `resolve()` returns `None`, append an `ImportWarning` to `warnings`:
   - `file`: `file_rel`
   - `code`: `"UNREGISTERED_PLATFORM"`
   - `message`: `"Platform '{platform_id}' is not registered in the platform registry"`

**Postconditions**:
- `warnings` may have 0 to N new entries appended (where N = number of unique unregistered platform IDs)
- Features are not modified
- No exceptions raised

### Modified: `import_legacy_data`

**Existing signature** (unchanged):
```python
def import_legacy_data(
    source_dir: Path,
    catalog_path: Path,
    catalog_title: str = "Debrief Legacy Sample Data",
) -> ImportResult:
```

**New behaviour**:
1. At function start: attempt to load the platform registry via `load_registry()`.
   - On success: store the registry instance.
   - On failure (`FileNotFoundError`, `RegistryError`): set registry to `None`, append a single `ImportWarning` with code `REGISTRY_UNAVAILABLE`.
2. After each file parse (after `parse(source_file)` succeeds): if registry is not `None`, call `_validate_platform_ids(features, file_rel, registry, result.warnings)`.
3. All existing behaviour is unchanged — the validation step is additive only.

## Warning Output Examples

### Successful validation with unregistered platforms

```python
ImportResult(
    catalog_path="/path/to/catalog",
    files_processed=1,
    files_succeeded=1,
    warnings=[
        ImportWarning(
            file="data/exercise1.rep",
            code="UNREGISTERED_PLATFORM",
            message="Platform 'PHANTOM' is not registered in the platform registry",
        ),
        ImportWarning(
            file="data/exercise1.rep",
            code="UNREGISTERED_PLATFORM",
            message="Platform 'CONTACT_BRAVO' is not registered in the platform registry",
        ),
    ],
)
```

### Registry unavailable

```python
ImportResult(
    catalog_path="/path/to/catalog",
    files_processed=1,
    files_succeeded=1,
    warnings=[
        ImportWarning(
            file="",
            code="REGISTRY_UNAVAILABLE",
            message="Platform registry could not be loaded: [Errno 2] No such file or directory: '/path/to/registry.json'. Platform validation skipped.",
        ),
    ],
)
```

### All platforms registered

```python
ImportResult(
    catalog_path="/path/to/catalog",
    files_processed=1,
    files_succeeded=1,
    warnings=[],  # No warnings
)
```
