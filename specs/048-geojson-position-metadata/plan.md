# Implementation Plan: GeoJSON Position Metadata Strategy

**Branch**: `048-geojson-position-metadata` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-geojson-position-metadata/spec.md`

## Summary

This feature normalizes the GeoJSON track data model by removing coordinate duplication from `TimestampedPosition` and adding per-position styling capabilities. The technical approach involves:

1. **Schema Changes**: Modify LinkML schemas to remove `coordinates` from `TimestampedPosition`, add `PositionStyle` and `PositionStyleOverride` classes, and extend `TrackProperties` with interval-based display rules.
2. **Migration**: Update golden fixtures and regenerate all derived schemas (Pydantic, TypeScript, JSON Schema).
3. **Rendering**: Implement style resolution cascade in the track renderer to support position symbols and labels.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, Pydantic models), TypeScript 5.x (generated types, VS Code extension webview)
**Primary Dependencies**: LinkML (schema source), Pydantic v2 (Python validation), Leaflet 1.9.x (map rendering)
**Storage**: Local filesystem STAC catalogs (JSON + GeoJSON files)
**Testing**: pytest (Python schema tests), vitest (TypeScript), JSON Schema validation (golden fixtures)
**Target Platform**: VS Code extension (desktop, offline-capable)
**Project Type**: Monorepo with shared schemas (`shared/schemas/`) and VS Code extension (`apps/vscode/`)
**Performance Goals**: Render tracks with 1000+ positions with interval-based symbols without visible delay
**Constraints**: Offline-capable, schema-first (LinkML source of truth), parallel array constraint (geometry.coordinates[i] ↔ positions[i])
**Scale/Scope**: Per-track styling with sparse overrides; typical tracks have hundreds to thousands of positions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| II. Schema Integrity | LinkML as single source of truth | ✅ PASS | All changes start in LinkML YAML; Pydantic/TS/JSON Schema derived |
| II. Schema Integrity | Schema tests mandatory | ✅ PASS | Golden fixtures updated; round-trip tests included |
| III. Data Sovereignty | Provenance always | ✅ PASS | No provenance impact - styling is presentation layer |
| IV. Architectural Boundaries | Services never touch UI | ✅ PASS | Schema defines data; renderer implements display |
| VI. Testing | Schema tests gate merges | ✅ PASS | Test plan includes fixture migration validation |
| VIII. Documentation | Specs before code | ✅ PASS | Spec complete before implementation |
| XIV. Pre-Release | Breaking changes permitted | ✅ PASS | Schema evolution expected pre-v4.0.0 |

**Gate Result**: ✅ PASS - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/048-geojson-position-metadata/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml          # MODIFY: TimestampedPosition (remove coordinates)
│   │   ├── geojson.yaml         # MODIFY: TrackProperties (add styling fields)
│   │   └── styling.yaml         # MODIFY: Add PositionStyle, PositionStyleOverride
│   ├── fixtures/
│   │   └── valid/
│   │       ├── track-feature-valid-01.json  # MIGRATE: Remove position coordinates
│   │       ├── track-feature-valid-02.json  # MIGRATE: Remove position coordinates
│   │       └── track-feature-position-styling.json  # NEW: Styling fixture
│   └── generated/
│       ├── python/              # REGENERATE: Pydantic models
│       ├── typescript/          # REGENERATE: TypeScript types
│       └── json-schema/         # REGENERATE: JSON Schema
├── tests/
│   ├── test_golden.py           # UPDATE: Add position styling tests
│   └── test_roundtrip.py        # UPDATE: Add styling round-trip

apps/vscode/
└── src/
    └── webview/
        └── web/
            └── trackRenderer.ts  # MODIFY: Add position symbol/label rendering
```

**Structure Decision**: Existing monorepo structure maintained. Changes span shared schemas and VS Code extension.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None - schema/infrastructure feature. No new visual components created.

The track renderer changes are modifications to existing rendering logic, not new standalone components suitable for Storybook isolation.

## Complexity Tracking

> **No violations requiring justification.** Constitution gates passed cleanly.
