# Implementation Plan: Import Legacy Sample Data

**Branch**: `144-import-legacy-sample-data` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/144-import-legacy-sample-data/spec.md`

## Summary

Import ~148 legacy Debrief sample data files (REP, DPF, DSF) into a committed STAC catalog for stakeholder demos. Requires building a DPF XML parser and DSF sensor file parser as new `debrief-io` handlers, then running a batch import pipeline that creates one STAC plot per source file with provenance tracking.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: xml.etree.ElementTree (stdlib), debrief-io, debrief-stac, Pydantic v2
**Storage**: Local filesystem STAC catalog (JSON + GeoJSON)
**Testing**: pytest, pytest-cov
**Target Platform**: Linux (CI/cloud), macOS/Windows (developer machines)
**Project Type**: Single project — extends existing `services/io/` and `services/stac/`
**Performance Goals**: Full import of ~148 files in under 5 minutes
**Constraints**: Offline-only (no network calls), committed catalog under 50 MB
**Scale/Scope**: One-time batch import of ~148 files producing ~140+ STAC plots

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I.1 Offline by default | No network calls in import pipeline | PASS | Source files provided locally |
| I.3 No silent failures | Warn-and-continue with logged warnings | PASS | ImportResult captures all warnings/errors |
| II.1 Single source of truth | GeoJSON output conforms to LinkML schemas | PASS | Uses existing schema validation |
| III.1 Provenance always | Source files preserved as STAC assets with metadata | PASS | add_asset() records lineage |
| III.2 Source preservation | Original files copied to assets/, never modified | PASS | Uses existing asset copy mechanism |
| IV.1 Services never touch UI | Parsers return data only | PASS | No UI involvement |
| IV.3 Zero MCP dependency | Domain logic in pure Python; no MCP in parsers | PASS | CLI script for invocation |
| VI.1 Schema tests gate merges | Parser output validated against schemas | PASS | Pydantic validation on features |
| VI.2 Services require unit tests | DPF/DSF handlers have unit tests | PASS | Test files per handler |
| VII.1 Tests before implementation | Golden fixtures from legacy repo drive tests | PASS | Sample DPF/DSF files as fixtures |
| IX.1 Minimal dependencies | xml.etree.ElementTree is stdlib | PASS | No new external dependencies |
| XV.1 Explicit types everywhere | All functions typed; Pydantic models | PASS | Strict pyright compliance |

**Post-Phase-1 Re-check**: All gates pass. No new dependencies, no UI, no network calls.

## Project Structure

### Documentation (this feature)

```text
specs/144-import-legacy-sample-data/
├── spec.md
├── plan.md              # This file
├── research.md          # DPF/DSF format analysis
├── data-model.md        # Entity definitions and GeoJSON mappings
├── quickstart.md        # Developer setup guide
├── contracts/
│   └── import-pipeline.md  # API contracts for handlers and pipeline
└── tasks.md             # (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/io/
├── src/debrief_io/
│   ├── __init__.py              # MODIFY: register DPF/DSF handlers
│   ├── handlers/
│   │   ├── base.py              # Existing: BaseHandler ABC
│   │   ├── rep.py               # Existing: REP parser
│   │   ├── dpf.py               # NEW: DPF XML parser
│   │   └── dsf.py               # NEW: DSF sensor file parser
│   ├── import_catalog.py        # NEW: Batch import pipeline
│   ├── models.py                # MODIFY: add ImportResult model
│   └── cli/
│       └── import_cmd.py        # NEW: CLI entry point
└── tests/
    ├── test_dpf_handler.py      # NEW: DPF parser unit tests
    ├── test_dsf_handler.py      # NEW: DSF parser unit tests
    ├── test_import_catalog.py   # NEW: Integration tests
    └── fixtures/
        ├── sample.dpf           # NEW: DPF test fixture (from legacy repo)
        ├── sample_sensors.dpf   # NEW: DPF with sensor data
        └── sen_frig_sensor.dsf  # NEW: DSF test fixture (from legacy repo)

demo/catalog/                    # NEW: Committed STAC catalog (import output)
├── catalog.json
└── {plot-id}/
    ├── item.json
    ├── features.geojson
    └── assets/{source-file}
```

**Structure Decision**: Extends existing `services/io/` with new handlers and import pipeline. No new packages or workspaces needed. The committed demo catalog lives at `demo/catalog/` alongside the existing `demo/` directory.

## Media Components

None - backend/infrastructure feature

## Storybook E2E Testing

None - no interactive UI components

## VS Code Webview E2E Testing

None - no extension workflow changes

## Complexity Tracking

No constitution violations to justify.
