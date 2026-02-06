# Research: Cross-Service End-to-End Workflow Tests

## Decision 1: Test Location

**Decision**: Place e2e tests in `tests/e2e/` at the repository root.

**Rationale**: The root `pyproject.toml` already includes `tests/` in `testpaths`, so tests here are discovered automatically by `uv run pytest`. Cross-service tests are inherently workspace-level concerns — placing them inside any single service directory would create a misleading ownership signal. The `e2e/` subdirectory provides clear namespace separation.

**Alternatives considered**:
- `services/stac/tests/test_e2e_workflow.py` — rejected because stac tests are explicitly ignored in root pytest config (`--ignore=services/stac/tests`), and this is not a stac-specific concern
- `services/calc/tests/test_e2e.py` — rejected because the tests span all three services equally
- A new top-level `e2e/` directory — rejected because it would require adding to testpaths config

## Decision 2: Fixture Data Strategy

**Decision**: Reuse existing io test fixtures (`boat1.rep`, `boat2.rep`) by referencing their paths from the e2e conftest. Create STAC catalogs fresh in `tmp_path` for each test.

**Rationale**: The io service already provides well-characterized REP files with known content (NELSON track with 30 positions, COLLINGWOOD track). Duplicating these fixtures would violate DRY and create a maintenance burden. STAC catalogs must be fresh per-test to ensure isolation — this follows the pattern established in `services/stac/tests/conftest.py`.

**Alternatives considered**:
- Copy fixture files into `tests/e2e/fixtures/` — rejected because it duplicates data and creates sync issues when io fixtures change
- Use calc GeoJSON fixtures directly — rejected because the goal is to test the *parse* path, not skip it with pre-built GeoJSON

## Decision 3: Test Granularity

**Decision**: Three test modules aligned with the three user stories (P1, P2, P3), plus a shared conftest for common fixtures.

**Rationale**: Each module can be run independently, making debugging faster. The conftest provides catalog creation and REP parsing helpers that all modules share. This matches the existing project pattern where `test_integration.py` files exist in individual services.

**Alternatives considered**:
- Single `test_workflow.py` with all scenarios — rejected because it would be harder to run specific scenarios in isolation
- One test per acceptance scenario — rejected because it would create too many small files with shared setup

## Decision 4: Cross-Service Import Strategy

**Decision**: Import service APIs directly (`from debrief_io import parse`, `from debrief_stac.catalog import create_catalog`, `from debrief_calc import run`).

**Rationale**: The uv workspace makes all workspace members importable from any test location. Direct imports match how a real orchestrator (VS Code extension, CLI) would call these services. This tests the actual public API surface, not internal implementation details.

**Alternatives considered**:
- Import via MCP wrappers — rejected because MCP adds serialization overhead and tests the wrapper layer rather than the service contracts
- Import via subprocess — rejected because it adds unnecessary complexity and prevents direct assertion on return types

## Decision 5: Provenance Verification Approach

**Decision**: Verify provenance at each pipeline stage by inspecting `properties.prov` (stac provenance) and `properties.provenance` (calc provenance) on output features.

**Rationale**: The io service records `source_file` in feature properties. The stac service adds `debrief:provenance` to asset metadata via `add_asset()`. The calc executor attaches `properties.provenance` with tool, version, timestamp, and source feature references. Tests will assert the complete chain exists and is internally consistent (source IDs match, timestamps are ordered).

**Alternatives considered**:
- Only verify final provenance — rejected because it would miss intermediate provenance gaps
- Verify provenance via separate audit log — rejected because no such log exists; provenance is embedded in the data

## Decision 6: Error Propagation Testing

**Decision**: Test three error scenarios: (1) partially malformed REP input, (2) kind mismatch when calling calc, (3) verify catalog integrity after calc errors.

**Rationale**: These cover the three service boundaries: io output validation, calc input validation, and stac state preservation. The existing `bad_coordinates.rep` fixture provides realistic malformed input. The calc service raises `KindMismatchError` when feature kinds don't match tool requirements, which is testable by passing wrong feature types.

**Alternatives considered**:
- Test disk-full scenarios — rejected because infrastructure-level failures require mocking that adds complexity without testing service logic
- Test schema version mismatches — rejected because this is a pre-release project (Article XIV) where schema is stable within the workspace

## Decision 7: CI Integration

**Decision**: No CI configuration changes required. Tests run automatically via existing `task test` -> `uv run pytest` pipeline.

**Rationale**: The root `pyproject.toml` testpaths includes `tests/`, so any `.py` files matching `test_*.py` in `tests/e2e/` are discovered automatically. Coverage reporting at root level will include the new tests.

**Alternatives considered**:
- Add a separate CI job for e2e tests — rejected because the tests are fast (<30s) and benefit from running alongside existing tests to catch regressions in the same CI run
- Add e2e-specific pytest markers — considered for future use but not needed now with only 3 test modules
