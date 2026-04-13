# Research: Import Handler Warnings for Unregistered Platforms

**Feature**: 182-import-platform-warnings  
**Date**: 2026-04-13

## R1: Where to Insert Registry Validation in the Import Pipeline

**Decision**: Validate platform IDs against the registry inside `import_legacy_data()` in `import_catalog.py`, after each file is parsed and before STAC catalog creation.

**Rationale**: The import pipeline processes files sequentially in a loop (line 309–413 of `import_catalog.py`). After `parse(source_file)` returns a `ParseResult`, all track features with `platform_id` properties are available. This is the earliest point where we have the complete set of platform IDs for a file — and the right place to validate them before the features are written to the catalog.

Validating here (rather than inside individual handlers) means:
- One validation call covers all formats (REP, DPF, DSF)
- Deduplication is straightforward — collect unique IDs per file
- The existing `ImportWarning` accumulation pattern is directly available

**Alternatives considered**:
- *Inside each handler*: Would require duplicating validation logic in `rep.py`, `dpf.py`, and `dsf.py`. Violates DRY. Also harder to deduplicate since handlers produce features incrementally.
- *After the full batch*: Would lose per-file source context on warnings. An unregistered platform would have no file attribution.
- *Separate post-processing step*: Unnecessary abstraction for a simple set-difference check.

## R2: New Dependency — `debrief-data` for `debrief-io`

**Decision**: Add `debrief-data` as a dependency of `services/io/` in its `pyproject.toml`.

**Rationale**: The platform registry loader (`load_registry()` → `PlatformRegistry`) lives in the `debrief-data` workspace member at `shared/data/`. This is an in-repo workspace dependency, not an external package — it was built specifically for cross-service access to the platform registry (#180). Adding it is equivalent to importing from a sibling module.

**Alternatives considered**:
- *Copy the registry loading code*: Violates DRY and constitution Article II (single source of truth).
- *Read the JSON file directly*: Bypasses the validated `PlatformRegistry` API, duplicates tree-walking logic, and loses the `resolve()` method.
- *Pass registry as a parameter*: Considered for the validation function itself (good for testability), but `import_legacy_data()` should handle its own registry loading internally with graceful fallback.

## R3: Registry Loading Strategy — Eager vs Lazy, Failure Handling

**Decision**: Load the registry once at the start of `import_legacy_data()` with a try/except. On failure, set registry to `None` and emit a single `REGISTRY_UNAVAILABLE` warning. All subsequent validation calls are skipped when registry is `None`.

**Rationale**: The registry is a small static file (~10 platforms, <5KB JSON). Loading it once per import call is negligible overhead. Loading eagerly (at the top of the function) rather than lazily (per-file) keeps the logic simple and avoids repeated file I/O.

Catching both `FileNotFoundError` and `RegistryError` at load time ensures the import never fails due to registry issues — this is a best-effort validation step.

**Alternatives considered**:
- *Module-level singleton*: Would cache the registry across multiple `import_legacy_data()` calls, but makes testing harder and prevents registry updates between calls.
- *Per-file loading*: Wasteful — the registry doesn't change between files in a single batch.
- *Raising on registry failure*: Would violate FR-003 (import must never be blocked by registry gaps).

## R4: Validation Function Design — Extract vs Inline

**Decision**: Extract a standalone function `_validate_platform_ids()` that takes a list of features, the source file path, the registry, and appends warnings to a list. Called once per file after parsing.

**Rationale**: A standalone function is independently testable with unit tests — no need to set up a full import pipeline to test the deduplication and edge case logic. The function signature:

```python
def _validate_platform_ids(
    features: list[dict[str, Any]],
    file_rel: str,
    registry: PlatformRegistry,
    warnings: list[ImportWarning],
) -> None:
```

It collects unique non-empty `platform_id` values from feature properties, resolves each against the registry, and appends an `ImportWarning` with code `UNREGISTERED_PLATFORM` for each miss.

**Alternatives considered**:
- *Inline in the import loop*: Harder to unit test, mixes concerns.
- *Separate module*: Over-engineering for a single function.
- *Method on ImportResult*: Wrong responsibility — the result model should not know about the registry.

## R5: Warning Deduplication Strategy

**Decision**: Deduplicate at the unique-platform-ID-per-file level using a `set()` of platform IDs extracted from features before checking the registry.

**Rationale**: A REP file can have hundreds of position records for the same platform, but only one `TrackBuilder` per platform ID. However, DPF files could have multiple track elements with the same name. The safest approach is to extract all `platform_id` values from all features for a given file, deduplicate them into a set, then check each unique ID once.

This means:
- One warning per unregistered platform per source file
- A platform appearing in files A and B produces two warnings (one per file)
- A platform appearing 500 times in one file produces one warning

**Alternatives considered**:
- *Global deduplication across all files*: Would lose per-file source context. An analyst importing 50 files needs to know which file introduced "UNKNOWN_VESSEL".
- *No deduplication*: Could produce hundreds of duplicate warnings for a single platform in a large file.

## R6: Warning Code Convention

**Decision**: Use `UNREGISTERED_PLATFORM` as the warning code. Use `REGISTRY_UNAVAILABLE` for registry load failures.

**Rationale**: The existing codebase uses `SCREAMING_SNAKE_CASE` for warning codes (e.g., `ORPHAN_SENSOR`, `NO_FEATURES`, `SCHEMA_VALIDATION`). The new codes follow this convention and are distinct enough for programmatic filtering.

**Alternatives considered**:
- *`UNKNOWN_PLATFORM`*: "Unknown" is ambiguous — the platform isn't unknown, it's just not in the registry.
- *`MISSING_REGISTRY_ENTRY`*: Focuses on the registry rather than the platform — less intuitive for the analyst.

## R7: Test Strategy

**Decision**: Two test files — unit tests for the validation function (`test_platform_validation.py`) and integration tests added to the existing `test_import_catalog.py`.

**Rationale**:
- **Unit tests** (`test_platform_validation.py`): Test `_validate_platform_ids()` directly with synthetic features and a mock/real registry. Cover: registered platforms (no warnings), unregistered platforms (warnings emitted), empty IDs (skipped), deduplication, case sensitivity.
- **Integration tests** (added to `test_import_catalog.py`): Import actual REP/DPF fixtures through the full pipeline and verify warnings appear in `ImportResult.warnings`. Cover: registry unavailable (graceful fallback), all-registered (no warnings), mixed (correct warnings).

Both approaches align with constitution Article VI (unit + integration) and Article VII (tests before implementation).

**Alternatives considered**:
- *Only integration tests*: Slower, harder to cover edge cases like empty IDs or case sensitivity.
- *Only unit tests*: Would miss integration issues like the registry not being loaded at the right point in the pipeline.
