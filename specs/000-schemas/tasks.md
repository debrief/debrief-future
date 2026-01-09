# Tasks: Schema Foundation (Tracer Bullet)

**Input**: Design documents from `/specs/000-schemas/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Scope**: Tracer bullet implementation with **TrackFeature** and **ReferenceLocation** only.

**Tests**: Required per Constitution Article II - schema tests gate all merges.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and build tooling

- [x] T001 Create shared/schemas/ directory structure
- [x] T002 Create shared/schemas/pyproject.toml with uv config, LinkML and Pydantic v2 dependencies
- [x] T003 [P] Create shared/schemas/package.json with pnpm config, AJV and TypeScript dependencies
- [x] T004 [P] Create shared/schemas/Makefile with generate, test, and clean targets
- [x] T005 [P] Create shared/schemas/scripts/generate.py to orchestrate all generators

---

## Phase 2: Foundational

**Purpose**: Base schema infrastructure

- [x] T006 Create shared/schemas/src/linkml/debrief.yaml root schema
- [x] T007 [P] Create placeholder directories for generated files
- [x] T008 Verify `make generate` runs without error

---

## Phase 3: LinkML Schema Definitions

**Goal**: Define TrackFeature and ReferenceLocation in LinkML

- [x] T009 Define common types (TrackTypeEnum, LocationTypeEnum, TimestampedPosition) in common.yaml
- [x] T010 [P] Define TrackFeature schema in geojson.yaml
- [x] T011 [P] Define ReferenceLocation schema in geojson.yaml
- [x] T012 Update debrief.yaml to import common and geojson modules
- [x] T013 Verify LinkML schemas compile

---

## Phase 4: Golden Fixtures

**Goal**: Create valid and invalid test fixtures

- [x] T014 [P] Create valid TrackFeature fixtures (2 files)
- [x] T015 [P] Create invalid TrackFeature fixtures (2 files)
- [x] T016 [P] Create valid ReferenceLocation fixtures (2 files)
- [x] T017 [P] Create invalid ReferenceLocation fixtures (2 files)

---

## Phase 5: Pydantic Generation

**Goal**: Generate Python models from LinkML

- [x] T018 Configure gen-pydantic in generate.py with --extra-fields forbid
- [x] T019 Generate Pydantic models to src/generated/python/
- [x] T020 Create py.typed marker for PEP 561
- [x] T021 Verify models import and validate fixtures

---

## Phase 6: JSON Schema Generation

**Goal**: Generate JSON Schema for frontend validation

- [x] T022 Configure gen-json-schema in generate.py
- [x] T023 Generate JSON Schema to src/generated/json-schema/
- [x] T024 Generate per-entity schemas (TrackFeature.schema.json, ReferenceLocation.schema.json)
- [x] T025 Create validate-jsonschema.js using AJV

---

## Phase 7: TypeScript Generation

**Goal**: Generate TypeScript interfaces

- [x] T026 Configure gen-typescript in generate.py
- [x] T027 Generate TypeScript interfaces to src/generated/typescript/
- [x] T028 Create index.ts exports
- [x] T029 Verify TypeScript compilation with tsc --noEmit
- [x] T030 Create typescript-usage.ts demonstration

---

## Phase 8: Adherence Testing

**Goal**: Ensure derived schemas stay in sync

- [x] T031 Create test_golden.py for Pydantic fixture validation
- [x] T032 Create test_roundtrip.py for Python JSON round-trip testing
- [x] T033 Create test_schema_compare.py for schema structure verification
- [x] T034 Create .github/workflows/schema-tests.yml for CI

---

## Phase 9: Polish

- [x] T035 Create README.md with usage documentation
- [x] T036 Verify `make generate` and `make test` work end-to-end

---

## Summary

**Total Tasks**: 36 (all complete)
**Entity Types**: TrackFeature, ReferenceLocation
**Generated Artifacts**: Pydantic models, JSON Schema, TypeScript interfaces
