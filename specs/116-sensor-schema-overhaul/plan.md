# Implementation Plan: Sensor Schema Overhaul

**Branch**: `116-sensor-schema-overhaul` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/116-sensor-schema-overhaul/spec.md`

## Summary

Redesign SensorContact and SensorData in LinkML to fully capture the legacy Debrief sensor data model. Add 4 new enums, 9 new SensorContact fields (boolean presence flags, display properties, origin coordinate pair), 4 new SensorData fields (array centre mode, display properties, measured positions), and a new MeasuredArrayPosition class. Update the schema generation pipeline output, create comprehensive golden fixtures, and update all 9 sensor tool spec fixtures (62 JSON files).

## Technical Context

**Language/Version**: Python 3.11 (schema generation, tests), TypeScript 5.x (generated types, consumer components)
**Primary Dependencies**: LinkML >= 1.7.0 (schema source), Pydantic v2 (Python validation), gen-pydantic / gen-json-schema / gen-typescript (code generators)
**Storage**: Local filesystem — STAC Items with GeoJSON payloads containing embedded sensor data
**Testing**: pytest (schema validation, round-trip, golden fixtures), vitest (TypeScript consumer tests)
**Target Platform**: Cross-platform (offline-first desktop analysis tool)
**Project Type**: Monorepo — schema definitions generate code consumed by multiple packages
**Performance Goals**: N/A — schema definition, no runtime performance concern
**Constraints**: Offline-capable (Constitution Art. I), schema tests mandatory (Constitution Art. II), all derived schemas auto-generated from LinkML (Constitution Art. II.1)
**Scale/Scope**: 3 schema files modified, ~62 tool fixture files updated, 6+ golden fixtures created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Schema definition — no network dependency |
| II. Schema Integrity | Single source of truth (LinkML) | PASS | All changes in LinkML; Pydantic/JSON Schema/TS are generated |
| II.2 | Schema tests mandatory | PASS | Golden fixtures + round-trip tests cover all new fields |
| II.3 | Schema versioning for breaking changes | PASS | No breaking changes — all new fields are optional |
| III. Data Sovereignty | Provenance always | N/A | Schema definition only; no data transformation |
| IV. Architectural Boundaries | Services never touch UI | PASS | Schema defines data structure; display property storage is not UI logic |
| VI. Testing | Schema tests gate merges | PASS | Existing test infrastructure auto-discovers new fixtures |
| VI.2 | Services require unit tests | PASS | Schema tests serve as unit tests for the data model |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures define expected behavior before schema changes |
| VIII. Documentation | Specs before code | PASS | This plan and spec.md precede implementation |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies — uses existing LinkML/Pydantic toolchain |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | But not needed — all changes are additive |
| XV. Strict Type Safety | Explicit types everywhere | PASS | LinkML generates fully typed models; no Any/any in output |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/116-sensor-schema-overhaul/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions and rationale
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Developer onboarding guide
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── common.yaml          # ADD: 4 new enums
│   │   └── geojson.yaml         # MODIFY: SensorContact, SensorData, ADD: MeasuredArrayPosition
│   ├── generated/
│   │   ├── python/debrief_schemas/__init__.py  # AUTO-GENERATED
│   │   ├── typescript/types.ts                 # AUTO-GENERATED
│   │   └── json-schema/*.json                  # AUTO-GENERATED
│   └── fixtures/
│       ├── valid/
│       │   ├── track-feature-sensors-01.json           # EXISTING (backward compat)
│       │   ├── track-feature-sensors-02.json           # NEW: all fields
│       │   ├── track-feature-sensors-measured-01.json  # NEW: MEASURED mode
│       │   └── track-feature-sensors-minimal-01.json   # NEW: minimal
│       └── invalid/
│           ├── track-feature-sensor-no-bearing.json       # EXISTING
│           ├── track-feature-sensor-invalid-enum.json      # NEW
│           ├── track-feature-sensor-invalid-origin.json    # NEW
│           └── track-feature-sensor-bearing-range.json     # NEW
├── scripts/
│   └── generate.py              # NO CHANGE (existing post-processing sufficient)
└── tests/
    ├── test_golden.py           # NO CHANGE (auto-discovers fixtures)
    ├── test_roundtrip.py        # NO CHANGE (auto-discovers fixtures)
    └── test_validation.py       # NO CHANGE

shared/tools/sensor/
├── analysis/                    # UPDATE: 38 fixture JSON files
├── calibration/                 # UPDATE: 18 fixture JSON files
└── detection/                   # UPDATE: 2 fixture JSON files (buffer-zone-generator)
```

**Structure Decision**: Schema-only feature — all changes are in `shared/schemas/` (LinkML definitions, generated code, fixtures) and `shared/tools/sensor/` (tool spec fixtures). No new directories or packages needed.

## Media Components

None — backend/infrastructure feature. This is a schema definition change with no visual components.

## Storybook E2E Testing

None — no interactive UI components. Schema changes are validated through golden fixtures and round-trip tests.

## VS Code Webview E2E Testing

None — no extension workflow changes. The schema changes are transparent to the VS Code extension until Phase 3 (rendering).

## Complexity Tracking

No Constitution violations to justify — all gates pass cleanly.
