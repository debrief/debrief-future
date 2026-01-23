# Implementation Plan: GeoJSON Styling Properties Schemas

**Branch**: `014-geojson-styling-schemas` | **Date**: 2026-01-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-geojson-styling-schemas/spec.md`

## Summary

Add standardized styling schemas to GeoJSON features following Leaflet Path options naming conventions. This creates three core styling schemas (PointProperties, LineProperties, PolygonProperties) plus a composite TrackStyle, then migrates all existing feature schemas to use the new required `style` property. The approach uses LinkML as the single source of truth, generating Pydantic models and JSON Schema for validation across Python and TypeScript.

## Technical Context

**Language/Version**: Python 3.11+ (LinkML, Pydantic), TypeScript 5.x (generated types)
**Primary Dependencies**: LinkML, linkml-runtime, Pydantic v2, AJV (JSON Schema validation in JS)
**Storage**: N/A (schema definitions only - no persistence)
**Testing**: pytest (Python), Node.js/AJV (TypeScript JSON Schema validation)
**Target Platform**: Cross-platform (schema definitions consumed by multiple services)
**Project Type**: Schema library within monorepo workspace
**Performance Goals**: Schema validation under 10ms per feature
**Constraints**: Must follow Leaflet Path options naming for frontend compatibility
**Scale/Scope**: 4 new styling schemas, updates to 8 existing feature schemas, 18+ golden fixtures

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| II. Schema Integrity | Single source of truth (LinkML) | PASS | All styling schemas defined in LinkML, Pydantic/JSON Schema generated |
| II. Schema Integrity | Schema tests mandatory | PASS | Golden fixtures + round-trip tests planned |
| IV. Architectural Boundaries | Services never touch UI | PASS | Schema definitions only - no rendering logic |
| VI. Testing | Schema tests gate merges | PASS | test_golden.py, test_roundtrip.py extended for new schemas |
| VII. Test-Driven AI | Tests before implementation | PASS | Fixtures written before schema implementation |
| VIII. Documentation | Specs before code | PASS | Specification complete |
| IX. Dependencies | Minimal dependencies | PASS | Uses existing LinkML toolchain, no new dependencies |

**Pre-Design Status**: All gates PASS

## Project Structure

### Documentation (this feature)

```text
specs/014-geojson-styling-schemas/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts)
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec quality checklist
└── media/               # Blog/LinkedIn content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml          # ADD: PointShapeEnum, LineCapEnum, LineJoinEnum
│   │   ├── styling.yaml         # NEW: PointProperties, LineProperties, PolygonProperties, TrackStyle
│   │   ├── geojson.yaml         # MODIFY: Add style to TrackProperties, ReferenceLocationProperties
│   │   ├── annotations.yaml     # MODIFY: Add style to all annotation properties
│   │   └── debrief.yaml         # MODIFY: Import styling.yaml
│   ├── fixtures/
│   │   ├── valid/
│   │   │   ├── point-properties-valid-01.json    # NEW
│   │   │   ├── point-properties-valid-02.json    # NEW
│   │   │   ├── point-properties-valid-03.json    # NEW
│   │   │   ├── line-properties-valid-01.json     # NEW
│   │   │   ├── line-properties-valid-02.json     # NEW
│   │   │   ├── line-properties-valid-03.json     # NEW
│   │   │   ├── polygon-properties-valid-01.json  # NEW
│   │   │   ├── polygon-properties-valid-02.json  # NEW
│   │   │   ├── polygon-properties-valid-03.json  # NEW
│   │   │   ├── track-style-valid-01.json         # NEW (composite)
│   │   │   ├── track-feature-valid-01.json       # UPDATE: Add style property
│   │   │   └── ...                               # UPDATE: All existing fixtures
│   │   └── invalid/
│   │       ├── point-properties-invalid-radius.json      # NEW
│   │       ├── point-properties-invalid-shape.json       # NEW
│   │       ├── point-properties-invalid-opacity.json     # NEW
│   │       ├── line-properties-invalid-weight.json       # NEW
│   │       ├── line-properties-invalid-cap.json          # NEW
│   │       ├── line-properties-invalid-opacity.json      # NEW
│   │       ├── polygon-properties-invalid-fill.json      # NEW
│   │       ├── polygon-properties-invalid-opacity.json   # NEW
│   │       ├── polygon-properties-invalid-stroke.json    # NEW
│   │       └── track-feature-missing-style.json          # NEW
│   └── generated/
│       ├── python/
│       │   └── debrief_schemas/__init__.py  # Re-generated with styling classes
│       ├── json-schema/
│       │   ├── PointProperties.schema.json  # NEW
│       │   ├── LineProperties.schema.json   # NEW
│       │   ├── PolygonProperties.schema.json # NEW
│       │   └── TrackStyle.schema.json       # NEW
│       └── typescript/
│           └── types.ts                     # Re-generated with styling interfaces
└── tests/
    ├── test_golden.py       # EXTEND: Add styling schema tests
    └── test_roundtrip.py    # EXTEND: Add styling round-trip tests
```

**Structure Decision**: Extends existing `shared/schemas/` workspace with a new `styling.yaml` module. Follows established pattern of LinkML source files generating Python/TypeScript/JSON Schema outputs.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None - backend/infrastructure feature (schema definitions only, no visual components).

This feature defines data structures that will be consumed by visual components, but the schemas themselves have no UI representation. The blog post will use diagrams and code snippets instead of interactive demos.

## Complexity Tracking

No constitution violations to justify.
