# Implementation Plan: Schema Foundation

**Branch**: `000-schemas` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/000-schemas/spec.md`

## Summary

**Tracer bullet implementation** establishing the schema foundation for Debrief v4.x by creating LinkML master schemas for two core entity types (**TrackFeature** and **ReferenceLocation**), configuring generators for Pydantic, JSON Schema, and TypeScript, and implementing adherence testing (golden fixtures, round-trip, schema comparison) required by the Constitution.

Future iterations will add: SensorContact, PlotMetadata, ToolMetadata.

## Technical Context

**Language/Version**: Python 3.11+ (generators, Pydantic models), TypeScript 5.x (generated interfaces)
**Primary Dependencies**: LinkML, linkml-runtime, Pydantic v2, AJV (JSON Schema validation in JS)
**Storage**: N/A (schema package produces generated code, not persisted data)
**Testing**: pytest (Python adherence tests), vitest (TypeScript compilation/validation tests), linkml-validate
**Target Platform**: Cross-platform library (Python 3.11+, Node.js 18+, modern browsers)
**Project Type**: Shared library within monorepo (uv workspace for Python, pnpm workspace for TypeScript)
**Performance Goals**: Schema generation completes in <10 seconds; validation of typical fixture in <100ms
**Constraints**: Offline-capable (no network dependencies), zero manual edits to generated files, single `make generate` command propagates changes
**Scale/Scope**: 2 entity types (tracer bullet), approximately 10-20 fields per entity, 8 golden fixtures (2 valid + 2 invalid per type)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | ✅ PASS | Schema generation is purely local |
| I. Defence-Grade Reliability | No cloud dependencies | ✅ PASS | All tools run locally |
| I. Defence-Grade Reliability | Reproducibility | ✅ PASS | Same LinkML input → identical outputs |
| II. Schema Integrity | Single source of truth | ✅ PASS | LinkML is sole master; all others derived |
| II. Schema Integrity | Schema tests mandatory | ✅ PASS | Three strategies specified in requirements |
| II. Schema Integrity | Schema versioning | ⏸️ DEFERRED | Not required pre-v4.0.0 (Article XIV) |
| VI. Testing | Schema tests gate merges | ✅ PASS | CI pipeline requirement in spec |
| VI. Testing | CI must pass | ✅ PASS | Adherence tests run in CI |
| VIII. Documentation | Specs before code | ✅ PASS | spec.md complete |
| IX. Dependencies | Minimal, vetted deps | ✅ PASS | LinkML is purpose-built, Pydantic is standard |

**Gate Status**: PASS — proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/000-schemas/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty for schema-only feature)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/
└── schemas/
    ├── src/
    │   ├── linkml/           # Master .yaml schemas
    │   │   ├── debrief.yaml  # Root schema importing all modules
    │   │   ├── geojson.yaml  # GeoJSON profile (TrackFeature, SensorContact, ReferenceLocation)
    │   │   ├── stac.yaml     # PlotMetadata extensions
    │   │   └── tools.yaml    # ToolMetadata
    │   ├── generated/
    │   │   ├── python/       # Pydantic models (debrief_schemas package)
    │   │   ├── json-schema/  # JSON Schema files
    │   │   └── typescript/   # TypeScript interfaces
    │   └── fixtures/
    │       ├── valid/        # Known-good examples
    │       └── invalid/      # Known-bad examples with expected errors
    ├── tests/
    │   ├── test_golden.py        # Golden fixture validation
    │   ├── test_roundtrip.py     # Python → JSON → TS → JSON → Python
    │   └── test_schema_compare.py # Structural diff between generators
    ├── scripts/
    │   └── generate.py           # Orchestrates all generators
    ├── pyproject.toml            # Python package config
    ├── package.json              # TypeScript package config
    └── Makefile                  # `make generate`, `make test`
```

**Structure Decision**: This feature creates the `/shared/schemas/` package as defined in the tracer delivery plan. It is a shared library consumed by all downstream Python services and TypeScript apps. The structure follows the monorepo layout with uv workspace for Python and pnpm workspace for TypeScript.

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | ✅ PASS | All tools (LinkML, Pydantic) run locally |
| I. Defence-Grade Reliability | Reproducibility | ✅ PASS | Makefile ensures deterministic generation |
| II. Schema Integrity | Single source of truth | ✅ PASS | LinkML schemas in `src/linkml/` are sole master |
| II. Schema Integrity | Schema tests mandatory | ✅ PASS | Three test strategies defined in data-model.md |
| III. Data Sovereignty | Provenance always | ✅ PASS | Schema tracks source_file with SHA256 in PlotMetadata |
| IV. Architectural Boundaries | Services never touch UI | ✅ PASS | Schema library has no UI code |
| VI. Testing | Schema tests gate merges | ✅ PASS | CI workflow specified in research.md |
| VII. Test-Driven AI | Tests before implementation | ✅ PASS | Golden fixtures define expected behavior |
| VIII. Documentation | Specs before code | ✅ PASS | Full spec, plan, research, data-model complete |
| IX. Dependencies | Minimal, vetted deps | ✅ PASS | Only LinkML, Pydantic, AJV — all industry standard |

**Post-Design Gate Status**: PASS — ready for task generation.

## Complexity Tracking

> No violations requiring justification. Design follows Constitution and established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/000-schemas/plan.md` | ✅ Complete |
| Research | `specs/000-schemas/research.md` | ✅ Complete |
| Data Model | `specs/000-schemas/data-model.md` | ✅ Complete |
| Quickstart | `specs/000-schemas/quickstart.md` | ✅ Complete |
| Contracts | `specs/000-schemas/contracts/` | ✅ Complete (N/A for library) |

**Next Step**: Run `/speckit.tasks` to generate implementation tasks.
