# Implementation Plan: PROV Schema Foundation

**Branch**: `070-prov-schema-foundation` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/070-prov-schema-foundation/spec.md`
**Epic**: E02 — PROV Logging Implementation (Phase 0)

## Summary

Replace the current flat, duplicated provenance system with a unified PROV-aligned schema foundation. This involves creating LinkML schemas for Log Entry and system record structures, expanding the Python ToolResult model with structured change tracking fields, migrating the provenance attachment logic to produce PROV-vocabulary entries stored as arrays on features, removing the duplicate STAC provenance module, and adding golden fixtures for validation. All existing calc service tests must pass after migration.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, Pydantic models), standard library only (plus `pydantic>=2.0.0`)
**Primary Dependencies**: LinkML >= 1.7.0 (schema definition + generators), Pydantic v2 (Python model validation)
**Storage**: Local filesystem (STAC catalogs with GeoJSON payloads)
**Testing**: pytest, pytest-cov (existing calc service test suite)
**Target Platform**: Cross-platform (Python services, consumed by TypeScript frontends via MCP)
**Project Type**: Monorepo workspace (uv workspaces for Python, pnpm for TypeScript)
**Performance Goals**: N/A — schema/model changes, no runtime performance impact
**Constraints**: Offline by default (Art. I), schema-first (Art. II), provenance always (Art. III)
**Scale/Scope**: ~15 files modified, 3 new schema files, 5+ new fixture files, ~30 test updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network dependencies. All schemas and models are local. |
| I.4 Reproducibility | Same inputs → same results | PASS | activityId uses UUID v4 (non-deterministic) but this is identity, not computation. Tool outputs remain reproducible. |
| II. Schema Integrity | LinkML is single source of truth | PASS | New schemas defined in LinkML. Pydantic models generated from LinkML. |
| II.2 Schema tests mandatory | Adherence tests before merge | PASS | Golden fixtures for valid/invalid entries. Round-trip tests planned. |
| III. Data Sovereignty | Provenance always | PASS | This feature strengthens provenance — more structured, richer data model. |
| III.3 Audit trail immutable | No modification after creation | PASS | `properties.provenance` array is append-only. Tune annotations are additions, not modifications. |
| IV. Architectural Boundaries | Services never touch UI | PASS | All changes are in Python services and schemas. No UI changes. |
| IV.2 Frontends never persist | All writes through services | PASS | No frontend changes in this phase. |
| VI. Testing | Unit tests for services | PASS | All existing tests updated. New tests for new models and fixtures. |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures define expected format. Tests updated alongside models. |
| VIII. Documentation | Specs before code | PASS | Spec, research, data-model, contracts all created before implementation. |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies. Uses existing LinkML and Pydantic. |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Breaking changes to provenance format are explicitly permitted. |

**Post-design re-check**: All gates pass. The snake_case → camelCase aliasing (Decision 1 in research.md) aligns with Art. II by keeping LinkML as the source of truth while producing SRD-compliant JSON output.

## Project Structure

### Documentation (this feature)

```text
specs/070-prov-schema-foundation/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions and rationale
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Verification guide
├── contracts/
│   ├── log-entry-schema.json           # Target JSON Schema for Log Entry
│   ├── system-record-schema.json       # Target JSON Schema for system record
│   └── tool-result-expanded-schema.json # Target JSON Schema for expanded ToolResult
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── debrief.yaml                # MODIFIED: add log-entry, system-record imports
│   ├── log-entry.yaml              # NEW: LogEntry, WasGeneratedBy, ParameterValue, TuneAnnotation
│   └── system-record.yaml          # NEW: SystemRecordProperties, SnapshotLinks, BranchRecord
├── src/generated/
│   ├── python/debrief_schemas/     # REGENERATED: includes new schema classes
│   ├── json-schema/                # REGENERATED: includes new entity schemas
│   └── typescript/types.ts         # REGENERATED: includes new type definitions
└── fixtures/
    ├── log-entry/
    │   ├── valid/
    │   │   ├── tool-invocation.json     # NEW: calculate-range example (SRD A.3)
    │   │   ├── property-edit.json       # NEW: set-property example (SRD A.3)
    │   │   └── artifact-producing.json  # NEW: bearing-time-plot example (SRD A.3)
    │   └── invalid/
    │       ├── missing-activity-id.json # NEW: missing required field
    │       └── bad-duration-format.json # NEW: invalid ISO 8601 duration
    └── system-record/
        └── valid/
            ├── empty-system-record.json     # NEW: no snapshots, no branches
            └── populated-system-record.json # NEW: with snapshot links and branches

services/calc/debrief_calc/
├── models.py          # MODIFIED: add ModifiedFeature, PropertyDelta, CreatedAsset, ParameterValue; expand ToolResult
├── provenance.py      # MODIFIED: replace create_provenance/attach_provenance with create_log_entry/attach_log_entry
├── validation.py      # MODIFIED: update provenance validation for array format
└── executor.py        # MODIFIED: use new attach_log_entry, populate tool_version and parameters

services/calc/tests/
├── test_models.py         # MODIFIED: add tests for new model classes
├── test_provenance.py     # MODIFIED: update all tests for new format
└── test_executor.py       # MODIFIED: update provenance assertions

services/stac/
├── src/debrief_stac/
│   └── provenance.py      # DELETED: duplicate removed
└── tests/
    └── test_provenance.py # MODIFIED: update for unified provenance
```

**Structure Decision**: This feature modifies existing workspace members (shared/schemas, services/calc, services/stac). No new packages or workspaces are created. The changes are distributed across the monorepo following existing project structure.

## Media Components

None — backend/infrastructure feature with no visual components.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No constitution violations to justify. All changes align with existing patterns and constitutional requirements.
