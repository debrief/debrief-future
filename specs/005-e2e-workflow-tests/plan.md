# Implementation Plan: Cross-Service End-to-End Workflow Tests

**Branch**: `005-e2e-workflow-tests` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-e2e-workflow-tests/spec.md`

## Summary

Add end-to-end workflow tests that exercise the complete io -> stac -> calc -> stac data pipeline. Tests will parse REP files using debrief-io, store features in a STAC catalog using debrief-stac, run analysis tools using debrief-calc, and persist results back to the catalog. A new `tests/e2e/` directory at the repository root will house these cross-service tests, leveraging existing test fixtures and pytest's `tmp_path` for isolation.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: debrief-io, debrief-stac, debrief-calc (workspace members), pytest, pytest-cov
**Storage**: Local filesystem (temporary STAC catalogs via pytest `tmp_path`)
**Testing**: pytest with importlib mode, coverage >= 90%
**Target Platform**: Linux (CI), macOS/Windows (developer workstations)
**Project Type**: Single (Python test module added to existing uv workspace)
**Performance Goals**: Full e2e suite completes in < 30 seconds
**Constraints**: Offline-only, zero new external dependencies, uses existing test fixtures
**Scale/Scope**: 3 test modules (~15-20 test functions), 1 shared conftest

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Tests use local filesystem only, zero network access |
| II. Schema Integrity | Schema tests mandatory | PASS | Tests validate cross-service schema conformance at each boundary |
| III. Data Sovereignty | Provenance always | PASS | Tests verify provenance chain from source file through analysis results |
| IV. Architectural Boundaries | Services never touch UI | PASS | Tests exercise Python service APIs only, no frontend involvement |
| VI. Testing | Integration tests for workflows | PASS | This feature directly implements Article VI.3 |
| VII. Test-Driven AI | Tests before implementation | PASS | Spec and plan precede implementation |
| VIII. Documentation | Specs before code | PASS | Specification written and validated before planning |
| IX. Dependencies | Minimal, vetted dependencies | PASS | Zero new dependencies — uses existing workspace members and pytest |
| XIII. Contribution Standards | CI MUST pass | PASS | Tests integrate with existing `task test` pipeline |

**Post-Design Re-check**: All gates remain PASS. No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/005-e2e-workflow-tests/
├── plan.md              # This file
├── research.md          # Phase 0: Research findings
├── data-model.md        # Phase 1: Data flow model
├── quickstart.md        # Phase 1: Developer getting-started
├── contracts/           # Phase 1: Service boundary contracts
│   ├── io-to-stac.md
│   └── stac-to-calc.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
tests/
└── e2e/
    ├── __init__.py
    ├── conftest.py              # Shared fixtures: catalog setup, REP parsing helpers
    ├── test_full_workflow.py     # P1: Parse -> Store -> Analyze -> Persist
    ├── test_multi_file.py       # P2: Multi-file ingestion + multi-track analysis
    └── test_error_propagation.py # P3: Error handling across service boundaries
```

**Structure Decision**: Tests live at the repository root `tests/e2e/` directory because:
1. `tests/` is already in the root `pyproject.toml` testpaths configuration
2. Cross-service tests belong at the workspace level, not inside any individual service
3. The `e2e/` subdirectory clearly distinguishes these from any future root-level unit tests
4. No changes to pytest configuration or CI pipeline required — `task test` picks them up automatically

## Media Components

None - backend/infrastructure feature

## Storybook E2E Testing

None - no interactive UI components

## Complexity Tracking

No constitution violations. No complexity tracking required.
