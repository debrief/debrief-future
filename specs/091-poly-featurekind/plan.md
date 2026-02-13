# Implementation Plan: [E05] Add POLY FeatureKind for Arbitrary Polygons

**Branch**: `091-poly-featurekind` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/091-poly-featurekind/spec.md`

## Summary

Add `POLY` as a valid FeatureKindEnum value in the LinkML schema, define PolyAnnotationProperties and PolyAnnotation classes following the established annotation pattern, regenerate all derived types, create golden fixtures, and confirm multi-vertex LINE supports polylines. This aligns the schema with the IO service's existing `build_polygon()` output that already emits `kind: "POLY"`.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, Pydantic models), TypeScript 5.x (generated types)
**Primary Dependencies**: LinkML >= 1.7.0 (schema source), Pydantic v2 (Python validation), gen-pydantic, gen-json-schema, gen-typescript (existing generators)
**Storage**: Local filesystem (STAC catalogs with GeoJSON payloads)
**Testing**: pytest (golden fixtures, round-trip), tsc --noEmit (TypeScript type checking)
**Target Platform**: Cross-platform (Python + TypeScript consumers)
**Project Type**: Schema library (shared/schemas workspace member)
**Performance Goals**: N/A — schema definition, no runtime performance impact
**Constraints**: Additive-only change to FeatureKindEnum; zero regressions in existing tests
**Scale/Scope**: 2 new classes (PolyAnnotationProperties, PolyAnnotation), 1 new enum value, 5 new fixture files, 1 test file update

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| II.1 Single source of truth | LinkML master defines POLY; types generated, not hand-written | PASS | |
| II.2 Schema tests mandatory | Golden fixtures + adherence tests required before merge | PASS | FR-004, FR-005, FR-006, FR-009 |
| II.3 Schema versioning | Additive enum value — not a breaking change | PASS | Pre-release (Art. XIV) |
| III.1 Provenance always | source_file + line_number in PolyAnnotationProperties | PASS | |
| VI.1 Schema tests gate merges | Will run `make test` confirming all pass | PASS | |
| VI.2 Services require unit tests | Schema change only; IO service tests already cover build_polygon() | PASS | |
| VII.1 Tests before implementation | Fixture files (valid/invalid) serve as acceptance tests | PASS | |
| VIII.1 Specs before code | This plan + spec.md precede implementation | PASS | |
| IX.1 Minimal dependencies | No new dependencies | PASS | |
| XIV Pre-release freedom | Additive change, no backwards compat concern | PASS | |

**Post-design re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/091-poly-featurekind/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Build & verify guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml           # Add POLY to FeatureKindEnum
│   │   └── annotations.yaml      # Add PolyAnnotationProperties + PolyAnnotation
│   ├── fixtures/
│   │   ├── valid/
│   │   │   ├── poly-annotation-valid-01.json    # Simple polygon (4 vertices)
│   │   │   ├── poly-annotation-valid-02.json    # Complex polygon (8+ vertices)
│   │   │   └── line-annotation-valid-02.json    # Multi-vertex LINE (5 points)
│   │   └── invalid/
│   │       ├── poly-annotation-invalid-kind.json    # Wrong kind
│   │       └── poly-annotation-missing-style.json   # Missing style
│   └── generated/                  # Auto-regenerated (not hand-edited)
│       ├── python/debrief_schemas/__init__.py
│       ├── json-schema/PolyAnnotation.schema.json
│       └── typescript/types.ts
└── tests/
    └── test_golden.py              # Add ENTITY_MAP entry for poly-annotation
```

**Structure Decision**: All changes are within the existing `shared/schemas` workspace member. No new packages or workspaces needed.

## Media Components

None - backend/infrastructure feature (schema definition only, no visual components).

## Storybook E2E Testing

None - no interactive UI components.

## Complexity Tracking

No constitution violations to justify — all gates pass cleanly.
