# Quickstart: Import Handler Warnings for Unregistered Platforms

**Feature**: 182-import-platform-warnings  
**Date**: 2026-04-13

## Prerequisites

- Python 3.11+
- `uv` package manager
- Platform registry (#180) complete (it is)

## Implementation Order

Follow test-driven development: write tests first, then implementation.

### Step 1: Add `debrief-data` dependency

In `services/io/pyproject.toml`, add `debrief-data` to the dependencies:

```toml
dependencies = [
    "pydantic>=2.12.5",
    "debrief-schemas",
    "debrief-data",
]
```

Then sync:
```bash
uv sync
```

### Step 2: Write unit tests (`test_platform_validation.py`)

Create `services/io/tests/test_platform_validation.py` with tests for `_validate_platform_ids()`:

**Test cases to cover**:
1. Features with all registered platform IDs produce no warnings
2. Features with unregistered platform IDs produce one warning per unregistered ID
3. Empty/whitespace platform IDs are skipped (no warning)
4. Duplicate platform IDs in multiple features produce only one warning
5. Case-sensitive: "nelson" (lowercase) is unregistered even though "NELSON" is registered
6. Warning has correct code (`UNREGISTERED_PLATFORM`), file path, and message format
7. Features with no `platform_id` property are skipped gracefully

**Fixture**: Use the real `load_registry()` from `debrief_data` — the bundled registry file has 10 known platforms.

### Step 3: Write integration tests (add to `test_import_catalog.py`)

Add tests to the existing `TestImportLegacyData` class:

**Test cases to cover**:
1. Import REP file with registered platforms — no `UNREGISTERED_PLATFORM` warnings in result
2. Import REP file with unregistered platforms — correct warnings in result
3. Import with registry unavailable — `REGISTRY_UNAVAILABLE` warning, import still succeeds
4. Verify existing tests still pass (regression check)

### Step 4: Implement `_validate_platform_ids()`

Add to `services/io/src/debrief_io/import_catalog.py`:

```python
from debrief_data import load_registry, PlatformRegistry

def _validate_platform_ids(
    features: list[dict[str, Any]],
    file_rel: str,
    registry: PlatformRegistry,
    warnings: list[ImportWarning],
) -> None:
    """Check platform IDs against registry; append warnings for unregistered ones."""
    platform_ids: set[str] = set()
    for feature in features:
        pid = feature.get("properties", {}).get("platform_id", "")
        if pid and pid.strip():
            platform_ids.add(pid)

    for pid in sorted(platform_ids):
        if registry.resolve(pid) is None:
            warnings.append(
                ImportWarning(
                    file=file_rel,
                    code="UNREGISTERED_PLATFORM",
                    message=f"Platform '{pid}' is not registered in the platform registry",
                )
            )
```

### Step 5: Integrate into `import_legacy_data()`

At the top of `import_legacy_data()`, load the registry:

```python
registry: PlatformRegistry | None = None
try:
    registry = load_registry()
except (FileNotFoundError, RegistryError):
    result.warnings.append(
        ImportWarning(
            file="",
            code="REGISTRY_UNAVAILABLE",
            message=f"Platform registry could not be loaded: {e}. Platform validation skipped.",
        )
    )
```

After each file parse succeeds (after existing warning collection), add:

```python
if registry is not None:
    _validate_platform_ids(parse_result.features, file_rel, registry, result.warnings)
```

### Step 6: Verify

```bash
# Run unit tests
uv run pytest services/io/tests/test_platform_validation.py -v

# Run integration tests
uv run pytest services/io/tests/test_import_catalog.py -v

# Run full verification
task verify
```

## Key Files

| File | Action |
|------|--------|
| `services/io/pyproject.toml` | Add `debrief-data` dependency |
| `services/io/src/debrief_io/import_catalog.py` | Add `_validate_platform_ids()` function + registry loading in `import_legacy_data()` |
| `services/io/tests/test_platform_validation.py` | New: unit tests for validation logic |
| `services/io/tests/test_import_catalog.py` | Add: integration tests for registry warnings |
