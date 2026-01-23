# Implementation Plan: SYSTEM Kind Discriminator

**Branch**: `022-system-kind-discriminator` | **Date**: 2026-01-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-system-kind-discriminator/spec.md`

## Summary

Add `SYSTEM` to the `FeatureKindEnum` discriminator to enable storing non-spatial application state (viewports, selections) as GeoJSON Features with null geometry. This extends the existing schema pattern to support round-trip persistence of plot context.

## Technical Context

**Language/Version**: Python 3.11+ (LinkML generators, Pydantic models), TypeScript 5.x (generated types)
**Primary Dependencies**: LinkML, linkml-runtime, Pydantic v2, AJV (JSON Schema validation in JS)
**Storage**: N/A (schema definitions only - no persistence)
**Testing**: pytest (golden fixtures, round-trip, schema comparison), node/AJV (TypeScript validation)
**Target Platform**: Cross-platform (schema outputs consumed by Python services and TypeScript frontends)
**Project Type**: Single package (shared/schemas)
**Performance Goals**: N/A (schema definition, no runtime performance concerns)
**Constraints**: Must conform to GeoJSON spec (geometry: null is valid), offline-capable
**Scale/Scope**: ~50 lines of schema changes, ~4 new fixture files, test updates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | ✅ Pass | Schema changes, no network dependency |
| II. Schema Integrity | Single source of truth (LinkML) | ✅ Pass | Adding to LinkML master schema |
| II. Schema Integrity | Schema tests mandatory | ✅ Pass | Will add golden fixtures |
| III. Data Sovereignty | Provenance always | ✅ Pass | SYSTEM features are metadata, not user data |
| IV. Architectural Boundaries | Services never touch UI | ✅ Pass | Schema only, no UI |
| VI. Testing | Schema tests gate merges | ✅ Pass | Adding valid/invalid fixtures |
| VI. Testing | Services require unit tests | ✅ Pass | Fixture tests cover validation |
| VIII. Documentation | Specs before code | ✅ Pass | Spec complete |
| IX. Dependencies | Minimal dependencies | ✅ Pass | No new dependencies |

**Gate Result**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/022-system-kind-discriminator/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A for schema-only feature
├── checklists/
│   └── requirements.md  # Quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   └── common.yaml           # Add SYSTEM to FeatureKindEnum
│   ├── generated/
│   │   ├── python/debrief_schemas/__init__.py  # Regenerated
│   │   ├── typescript/types.ts                  # Regenerated
│   │   └── json-schema/*.schema.json           # Regenerated
│   └── fixtures/
│       ├── valid/
│       │   ├── system-state-temporal-01.json   # NEW
│       │   ├── system-state-spatial-01.json    # NEW
│       │   └── system-state-selection-01.json  # NEW
│       └── invalid/
│           ├── system-state-invalid-geometry.json   # NEW
│           └── system-state-invalid-id.json         # NEW
└── tests/
    └── test_golden.py   # Update ENTITY_MAP with SystemState
```

**Structure Decision**: Single package modification to existing `shared/schemas/`. No new directories beyond fixtures.

## Media Components

None - backend/infrastructure feature (schema definitions have no visual components).

## Complexity Tracking

No violations to justify.
