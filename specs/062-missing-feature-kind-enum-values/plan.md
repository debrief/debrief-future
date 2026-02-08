# Implementation Plan: Compound Track Model with Embedded Children

**Branch**: `062-missing-feature-kind-enum-values` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/062-missing-feature-kind-enum-values/spec.md`

## Summary

Evolve `TrackFeature` to support compound geometry (MultiLineString) with per-segment metadata, and embedded child arrays (sensors, TUAs) within TrackProperties. Zero new `FeatureKindEnum` values — all new concepts live inside TrackFeature. Hierarchical kind paths (e.g., `TRACK.SENSOR`) enable tool selection targeting embedded children.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, Pydantic v2 models), TypeScript 5.x (generated types)
**Primary Dependencies**: LinkML 1.7+, gen-pydantic, gen-json-schema, gen-typescript (existing schema generators)
**Storage**: Local filesystem (STAC catalogs with GeoJSON payloads)
**Testing**: pytest (golden fixtures, round-trip, schema comparison), AJV (JSON Schema validation), tsc (TypeScript compilation)
**Target Platform**: Cross-platform (offline-first desktop analysis tool)
**Project Type**: Monorepo — uv workspaces (Python), pnpm workspaces (TypeScript)
**Performance Goals**: N/A — schema definition, no runtime performance impact
**Constraints**: Must maintain backward compatibility with existing simple TrackFeature instances; must follow schema-first development (Article II)
**Scale/Scope**: 8 LinkML schema files modified/extended, ~60 golden fixtures affected, 3 test suites to update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Schema changes are local; no network dependency |
| II. Schema Integrity | LinkML master, adherence tests | PASS | All changes start in LinkML; Pydantic/JSON Schema/TypeScript derived. Tests required before merge. |
| III. Data Sovereignty | Provenance always | PASS | No data transformation changes; schema extension only |
| IV. Architectural Boundaries | Services never touch UI | PASS | Schema defines data shapes; no UI or service logic |
| V. Extensibility | No vendor lock-in | PASS | LinkML is open standard; generated outputs are standard formats |
| VI. Testing | Schema tests gate merges | PASS | Golden fixtures, round-trip, and structural comparison tests will be updated |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures (valid + invalid) written before schema changes |
| VIII. Documentation | Specs before code | PASS | Spec and plan complete before implementation |
| IX. Dependencies | Minimal, vetted | PASS | No new dependencies; uses existing generator toolchain |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0; schema evolution expected |

**Post-design re-check**: All gates still pass. The `any_of` union pattern on geometry and embedded child arrays are additive changes to TrackFeature. Existing fixtures remain valid.

## Project Structure

### Documentation (this feature)

```text
specs/062-missing-feature-kind-enum-values/
├── spec.md              # Feature specification (revised for compound model)
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity model for new/modified types
├── quickstart.md        # Developer guide for schema changes
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── contracts/
│   └── schema-changes.md # Schema change contract
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml          # + SegmentTypeEnum
│   │   └── geojson.yaml         # + GeoJSONMultiLineString, SegmentMetadata,
│   │                            #   SensorData, SensorContact, TUAData, TUASolution
│   │                            #   + modify TrackFeature.geometry (any_of union)
│   │                            #   + modify TrackProperties (segments, sensors, tuas)
│   ├── fixtures/
│   │   ├── valid/
│   │   │   ├── track-feature-compound-01.json      # MultiLineString + segments
│   │   │   ├── track-feature-sensors-01.json        # Track with sensors
│   │   │   ├── track-feature-tuas-01.json           # Track with TUAs
│   │   │   └── track-feature-full-01.json           # All embedded children
│   │   └── invalid/
│   │       ├── track-feature-segment-mismatch.json  # Segment/coordinate count mismatch
│   │       ├── track-feature-sensor-no-bearing.json # Contact missing bearing
│   │       └── track-feature-segments-linestring.json # Segments with LineString geometry
│   └── generated/                                    # Regenerated after schema changes
│       ├── python/debrief_schemas/__init__.py
│       ├── json-schema/*.schema.json
│       └── typescript/types.ts
└── tests/
    ├── test_golden.py           # Updated model mapping for new fixtures
    ├── test_roundtrip.py        # Add compound track round-trip (if feasible)
    └── test_schema_compare.py   # Add SegmentTypeEnum assertion
```

**Structure Decision**: This feature modifies existing schema files within the established `shared/schemas/` workspace. No new packages, services, or directories are created outside of the existing schema structure.

## Media Components

None — backend/infrastructure feature. No visual components or Storybook stories.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No constitution violations requiring justification.
