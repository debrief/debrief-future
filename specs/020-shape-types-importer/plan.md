# Implementation Plan: Add Remaining Shape Type Importers with Storybook Verification

**Branch**: `claude/shape-types-importer-test-qCD6P` | **Date**: 2026-01-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-shape-types-importer/spec.md`

## Summary

Implement parsing for all remaining REP annotation shape types (Phase 2: POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL; Phase 3: DYNAMIC_*, SENSOR, TMA_*, TRACKSPLIT) and create a Storybook-based verification pipeline for visual testing. Follows established patterns in `builders.py` with existing `_approximate_circle()`, `_build_polygon_style()` helpers.

## Technical Context

**Language/Version**: Python 3.11+ (debrief-io service), TypeScript 5.x (Storybook stories)
**Primary Dependencies**: Pydantic v2 (models), LinkML (schemas), React 18+ / react-leaflet v5+ (MapView)
**Storage**: N/A (pure transformation service — outputs GeoJSON to files for Storybook)
**Testing**: pytest (Python unit tests), Storybook visual verification
**Target Platform**: Local development, CI pipelines
**Project Type**: Multi-package monorepo (services/io, shared/schemas, shared/components)
**Performance Goals**: Parse 10,000+ shapes/second (REP files typically have 100-1000 annotations)
**Constraints**: Offline-capable, no external service dependencies
**Scale/Scope**: 15 shape types total (7 Phase 2 + 8 Phase 3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | PASS | Shape parsing is purely local |
| I.4 Reproducibility | Same inputs → same outputs | PASS | Deterministic parsing, fixed polygon approximation points |
| II.1 Single source of truth | LinkML master schemas | PASS | Will extend annotations.yaml |
| II.2 Schema tests mandatory | Adherence tests before merge | PASS | Will add JSON fixtures for each shape type |
| III.1 Provenance always | Transformation records lineage | PASS | Features include source_file, line_number |
| IV.1 Services never touch UI | Python returns data only | PASS | Outputs GeoJSON, Storybook consumes |
| VI.2 Services require unit tests | No service code without tests | PASS | Will add tests for each builder |
| VIII.1 Specs before code | Specification exists | PASS | spec.md complete |

**No violations detected. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/020-shape-types-importer/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── media/               # Phase 2 output
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/io/
├── src/debrief_io/handlers/annotations/
│   ├── builders.py          # MODIFY: Add Phase 2 + 3 builders
│   └── coordinates.py       # May need ellipse helpers
├── scripts/
│   └── generate-storybook-fixtures.py  # CREATE: Fixture generator
└── tests/
    ├── fixtures/valid/
    │   └── all-shapes.rep   # CREATE: Comprehensive test file
    └── test_annotations/
        └── test_shapes.py   # MODIFY: Add tests for new shapes

shared/schemas/src/
├── linkml/
│   └── annotations.yaml     # MODIFY: Add new shape schemas
└── fixtures/valid/
    └── *-annotation-valid-01.json  # CREATE: Per-shape fixtures

shared/components/src/
├── fixtures/
│   └── all-shapes.geojson   # CREATE: Generated from REP
└── MapView/
    └── ShapeTypes.stories.tsx  # CREATE: Verification story
```

**Structure Decision**: Follows existing multi-package monorepo structure. Changes span services/io (parsing), shared/schemas (types), and shared/components (visual verification).

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ShapeTypes | `shared/components/src/MapView/ShapeTypes.stories.tsx` | `shape-types.js` | Demonstrate all parsed annotation shapes on map |

**Inclusion Criteria Applied**:
- [x] New visual component (new Storybook story for shapes)
- [x] Significant visual change (renders 15 new shape types)
- [x] Interactive demo adds narrative value (shows parsing results visually)

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created)
- [x] Components render standalone (MapView already works standalone)
- [x] Reasonable bundle size expected (< 500KB — reuses existing MapView)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-mapview--shape-types`

## Complexity Tracking

> No violations detected. This section is empty.

## Implementation Phases

### Phase 2a: Shape Builders (Python)

1. Implement `_approximate_ellipse()` helper (rotated ellipse polygon)
2. Implement Phase 2 builders: POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL
3. Implement Phase 3 builders: DYNAMIC_*, SENSOR, SENSOR2, TMA_POS, TMA_RB, TRACKSPLIT
4. Add unit tests for each builder

### Phase 2b: Schema Extensions (LinkML)

1. Add schema definitions for new shape types in annotations.yaml
2. Regenerate Pydantic, JSON Schema, TypeScript types
3. Add golden fixture JSON files
4. Run schema adherence tests

### Phase 2c: Storybook Verification

1. Create `all-shapes.rep` test fixture with all shape types
2. Create `generate-storybook-fixtures.py` script
3. Generate `all-shapes.geojson` fixture
4. Create `ShapeTypes.stories.tsx` Storybook story
5. Visual verification of all shapes

## Dependencies

- Existing Phase 1 implementations provide patterns
- `_approximate_circle()` helper for polygon generation
- Symbol parsing utilities in `symbols.py` and `symbology.py`
- MapView component with GeoJSON rendering
