# Implementation Plan: STAC Extension Spec + Mock Data Fixtures

**Branch**: `125-stac-extension-mock-data` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/125-stac-extension-mock-data/spec.md`

## Summary

Define the `debrief:` STAC extension namespace with properties for vessel classification, tags, author, track names, and nationalities. Implement as a LinkML schema module generating Pydantic and TypeScript types. Create a deterministic Python generator producing 100 realistic fixture `item.json` files for Storybook-driven Discovery UI development. Deliver a vessel taxonomy reference and JSON Schema contract.

## Technical Context

**Language/Version**: Python 3.11 (fixture generator, schema, tests), LinkML >= 1.7.0 (schema source)
**Primary Dependencies**: LinkML (schema), Pydantic v2 (validation), jsonschema (fixture validation)
**Storage**: Local filesystem (JSON files in `shared/schemas/fixtures/stac-browser/`)
**Testing**: pytest (fixture validation, schema adherence), existing schema test infrastructure
**Target Platform**: Development tooling (Storybook mock data, CI validation)
**Project Type**: Schema module + data generation script (single project within `shared/schemas/`)
**Performance Goals**: N/A (development/build-time tooling)
**Constraints**: Offline-capable (no network dependencies), deterministic output (seeded RNG)
**Scale/Scope**: 100 fixture items, 20-type vessel taxonomy (including `unknown`), 6 extension properties

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All fixtures are local JSON files |
| I.4 Reproducibility | Deterministic output | PASS | Seeded RNG in fixture generator |
| II. Schema Integrity | LinkML single source of truth | PASS | `stac-extension.yaml` → Pydantic + JSON Schema + TypeScript |
| II.2 Schema tests mandatory | Adherence tests before merge | PASS | Golden fixture validation + round-trip tests planned |
| III. Data Sovereignty | Provenance always | N/A | Mock data, not real transformations |
| IV. Architectural Boundaries | Services never touch UI | PASS | Schema + data only, no UI code |
| VI. Testing | Services require unit tests | PASS | Fixture validation tests, schema adherence tests |
| VII. Test-Driven AI | Tests before implementation | PASS | Fixture validation tests define "done" |
| VIII. Documentation | Specs before code | PASS | This plan + spec.md exist before implementation |
| IX. Dependencies | Minimal dependencies | PASS | Only LinkML (already used), jsonschema (standard) |
| XV. Strict Type Safety | Explicit types everywhere | PASS | Pydantic models fully typed, TypeScript types generated |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/125-stac-extension-mock-data/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Integration guide
├── contracts/
│   ├── stac-extension-schema.json  # JSON Schema contract
│   └── example-item.json           # Reference fixture
├── checklists/
│   └── requirements.md  # Quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/
├── src/linkml/
│   ├── stac-extension.yaml          # NEW: Extension property definitions
│   └── debrief.yaml                 # MODIFIED: add stac-extension import
├── fixtures/stac-browser/
│   ├── catalog.json                 # NEW: Root STAC catalog
│   ├── vessel-taxonomy.json         # NEW: Vessel classification hierarchy
│   ├── exercise-001/item.json       # NEW: 100 fixture items
│   ├── exercise-002/item.json
│   └── ...                          # (exercise-003 through exercise-100)
├── scripts/
│   └── generate-stac-fixtures.py    # NEW: Deterministic fixture generator
└── tests/
    └── test_stac_extension.py       # NEW: Validation tests
```

**Structure Decision**: All new files live within the existing `shared/schemas/` workspace. No new packages or workspaces needed. The fixture generator is a development script, not a service.

## Media Components

None — backend/infrastructure feature. No visual components, no Storybook stories.

## Storybook E2E Testing

None — no interactive UI components. This feature produces data fixtures consumed by downstream UI features (#126–#134).

## VS Code Webview E2E Testing

None — no extension workflow changes.

## Complexity Tracking

No constitution violations to justify.
