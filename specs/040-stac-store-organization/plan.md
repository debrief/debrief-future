# Implementation Plan: Reorganize STAC Store to Per-Item Folders

**Branch**: `040-stac-store-organization` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/040-stac-store-organization/spec.md`

## Summary

Add a migration function to `debrief-stac` that converts legacy flat STAC stores (items in a shared `items/` directory) to the per-item folder structure already used by the Python service's `create_plot()`. Migrate VS Code test data and expose via JSON-RPC CLI.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: None (stdlib only — json, pathlib, shutil)
**Storage**: Local filesystem (STAC 1.0.0 catalogs)
**Testing**: pytest
**Target Platform**: Linux/macOS/Windows (local filesystem)
**Project Type**: Single Python package (`services/stac/`)
**Performance Goals**: N/A (one-time migration, small catalogs)
**Constraints**: Offline-only, must not modify source files, idempotent
**Scale/Scope**: ~2 items in test data, but must handle arbitrary catalog sizes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Local filesystem only |
| II. Schema Integrity | Schema compliance | PASS | No schema changes — only file layout |
| III. Data Sovereignty | Provenance, source preservation | PASS | Source files moved intact, hrefs updated |
| IV. Architectural Boundaries | Services never touch UI | PASS | Pure Python service function |
| VI. Testing | Unit tests required | PASS | Will add tests for migrate function |
| VII. Test-Driven AI | Tests before implementation | PASS | Test cases defined below |
| VIII. Documentation | Specs before code | PASS | This plan + spec.md |
| XIV. Pre-Release Freedom | Breaking changes OK | PASS | Test data layout changes are fine pre-v4 |

**No violations. All gates pass.**

## Project Structure

### Documentation (this feature)

```text
specs/040-stac-store-organization/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
services/stac/src/debrief_stac/
├── migrate.py            # NEW: migrate_flat_store() function
├── cli.py                # MODIFIED: add migrate_store handler
├── catalog.py            # UNCHANGED
├── plot.py               # UNCHANGED
└── ...

services/stac/tests/
├── test_migrate.py       # NEW: migration tests

apps/vscode/test-data/local-store/
├── catalog.json          # MODIFIED: item links updated
├── exercise-alpha/       # NEW: per-item folder
│   ├── item.json         # MOVED from items/exercise-alpha.json
│   ├── exercise-alpha.geojson  # MOVED from items/
│   └── assets/           # NEW: empty, ready for source files
├── training-run-1/       # NEW: per-item folder
│   ├── item.json
│   ├── training-run-1.geojson
│   └── assets/
└── items/                # DELETED after migration
```

**Structure Decision**: Changes are confined to `services/stac/` (new migration module + CLI method) and `apps/vscode/test-data/` (migrated test data). No new packages or structural changes.

## Media Components

None — backend/infrastructure feature

## Complexity Tracking

No violations to justify.
