# Implementation Plan: LinkML Per-Platform Override Fields

**Branch**: `181-linkml-platform-overrides` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/181-linkml-platform-overrides/spec.md`

## Summary

Add optional per-platform override fields (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`) to TrackProperties in the LinkML schema. Define a new `PlatformRecord` entity and add a `debrief:platforms` structured array to the STAC extension, replacing the semantic role of flat aggregate fields while preserving them for backward compatibility. Regenerate all derived types (Pydantic, TypeScript, JSON Schema) and update golden fixtures.

## Technical Context

**Language/Version**: Python 3.11 (schema generation, tests), TypeScript 5.x (generated types, type checking)  
**Primary Dependencies**: LinkML >= 1.7.0 (schema source), Pydantic v2 (generated Python models), gen-pydantic/gen-typescript/gen-json-schema (code generators)  
**Storage**: N/A (schema definitions only; no runtime storage changes)  
**Testing**: pytest (Python golden fixture + round-trip tests), vitest + tsc (TypeScript type checking)  
**Target Platform**: Cross-platform (schema artifacts consumed by all services and frontends)  
**Project Type**: Monorepo schema module (`shared/schemas/`)  
**Performance Goals**: N/A (schema-time, not runtime)  
**Constraints**: All existing fixtures must continue to validate (zero backward-compatibility regressions)  
**Scale/Scope**: 3 LinkML YAML files modified, ~4-8 new fixture files, 3 generated output directories regenerated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| II.1 Single source of truth | LinkML master schemas define all data structures; derived types are never hand-written | PASS | All changes are to LinkML source; Pydantic/TS/JSON Schema are regenerated |
| II.2 Schema tests mandatory | Derived schemas must pass adherence tests before merge | PASS | Golden fixture tests, round-trip tests, and structural comparison all run in CI |
| II.3 Schema versioning | Breaking changes require version bump and migration path | PASS | No breaking changes -- all new fields are optional, all old fields preserved |
| IV.1 Services never touch UI | Python services return data only | N/A | No service or UI changes in this feature |
| VI.1 Schema tests gate merges | Derived schema adherence tests must pass | PASS | `task verify` runs lint + typecheck + test including schema tests |
| VII.1 Tests before implementation | Define expected behaviour as executable tests before implementing | PASS | Golden fixtures (expected valid/invalid) define acceptance criteria |
| VIII.1 Specs before code | No implementation without written specification | PASS | Spec written and approved before this plan |
| IX.1 Minimal dependencies | External dependencies must be justified | PASS | No new dependencies added |
| XIII.3 CI must pass | All automated checks green before merge | PASS | `task verify` is the gate |
| XV.1 Explicit types | All types must have explicit annotations | PASS | Generated types are fully typed by the LinkML generators |
| XV.4 Schema types canonical | Generated types must be fully typed with no Any/any | PASS | gen-pydantic uses `--extra-fields forbid`; post-processing replaces `dict[str, Any]` with `dict[str, object]` |

**Gate result**: PASS -- no violations.

## Project Structure

### Documentation (this feature)

```text
specs/181-linkml-platform-overrides/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity changes and relationships
├── quickstart.md        # Step-by-step implementation guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md # Blog post draft
    └── linkedin-planning.md # LinkedIn summary
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml              # MODIFIED: VesselDomainEnum moved here
│   │   ├── geojson.yaml             # MODIFIED: 6 override fields on TrackProperties
│   │   ├── stac-extension.yaml      # MODIFIED: PlatformRecord + platforms field
│   │   └── debrief.yaml             # UNCHANGED (imports all modules transitively)
│   ├── fixtures/
│   │   ├── valid/
│   │   │   ├── track-feature-platform-overrides-01.json    # NEW
│   │   │   └── track-feature-platform-overrides-minimal-01.json  # NEW
│   │   └── invalid/
│   │       ├── track-feature-invalid-nationality.json      # NEW
│   │       └── track-feature-invalid-domain.json           # NEW
│   └── generated/
│       ├── python/debrief_schemas/__init__.py    # REGENERATED
│       ├── typescript/types.ts                   # REGENERATED
│       └── json-schema/*.schema.json             # REGENERATED
├── fixtures/
│   └── stac-browser/
│       ├── valid/
│       │   ├── extension-platforms-full.json      # NEW
│       │   └── extension-platforms-sparse.json    # NEW
│       └── invalid/
│           └── invalid-platform-nationality.json  # NEW
└── tests/
    ├── test_golden.py              # UNCHANGED (auto-discovers new fixtures)
    ├── test_stac_extension.py      # MODIFIED: add platforms round-trip test
    └── test_roundtrip.py           # UNCHANGED (TrackFeature round-trip auto-covers new optional fields)
```

**Structure Decision**: All changes are within the existing `shared/schemas/` module. No new directories or projects created. The schema module already has the correct structure for source LinkML, fixtures, generated output, and tests.

## Media Components

None - backend/infrastructure feature. No visual components, Storybook stories, or UI changes.

## Storybook E2E Testing

None - no interactive UI components.

## VS Code Webview E2E Testing

None - no extension workflow changes.

## Complexity Tracking

No constitution violations to justify. All changes are additive and follow established patterns.
