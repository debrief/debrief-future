# Feature Specification: Schema Foundation

**Feature Branch**: `000-schemas`
**Created**: 2026-01-09
**Status**: Draft
**Input**: Tracer Bullet Delivery Plan - Stage 0

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define GeoJSON Profile Schema (Priority: P1)

A schema developer authors LinkML definitions for Debrief's GeoJSON profile, including track features,
sensor contacts, and reference locations. The schema captures maritime-specific conventions that
extend standard GeoJSON.

**Why this priority**: All downstream services depend on validated data structures. Without the
GeoJSON profile, no features can be parsed, stored, or displayed.

**Independent Test**: Run `linkml-validate` against a sample track feature JSON; validation passes
for valid data and fails with clear errors for invalid data.

**Acceptance Scenarios**:

1. **Given** a LinkML schema defining TrackFeature, **When** a valid track JSON is validated,
   **Then** validation passes with no errors.
2. **Given** a LinkML schema defining TrackFeature, **When** a track JSON with missing required
   field is validated, **Then** validation fails with specific field error message.
3. **Given** a LinkML schema with temporal properties, **When** a track with ISO8601 timestamps
   is validated, **Then** timestamps are correctly parsed and validated.

---

### User Story 2 - Generate Pydantic Models (Priority: P1)

A Python service developer imports generated Pydantic models to parse and validate GeoJSON features
at runtime. The models provide type hints, validation, and serialisation without hand-coding.

**Why this priority**: Python services (stac, io, calc) all require Pydantic models for type-safe
data handling. This is a blocker for all Stage 1+ work.

**Independent Test**: Import `debrief_schemas.TrackFeature`, instantiate with valid dict, serialise
to JSON, deserialise back — round-trip preserves all fields.

**Acceptance Scenarios**:

1. **Given** generated Pydantic models, **When** valid GeoJSON dict is passed to model constructor,
   **Then** model instance is created with all fields populated.
2. **Given** generated Pydantic models, **When** invalid data is passed, **Then** ValidationError
   is raised with field-level details.
3. **Given** Pydantic model instance, **When** `.model_dump_json()` is called, **Then** output
   matches the original valid GeoJSON structure.

---

### User Story 3 - Generate JSON Schema (Priority: P2)

A frontend developer uses generated JSON Schema to validate user input before sending to backend
services. The JSON Schema is used in form validation and API contract testing.

**Why this priority**: Enables frontend validation and contract testing, but Python services can
function without it initially.

**Independent Test**: Load generated JSON Schema into AJV (JavaScript validator), validate sample
GeoJSON — same pass/fail results as LinkML validation.

**Acceptance Scenarios**:

1. **Given** generated JSON Schema for TrackFeature, **When** loaded into a JSON Schema validator,
   **Then** schema is valid and loadable.
2. **Given** JSON Schema and golden fixture, **When** fixture is validated, **Then** result matches
   LinkML validation result (both pass or both fail).

---

### User Story 4 - Generate TypeScript Interfaces (Priority: P2)

A TypeScript developer imports generated interfaces for type-safe frontend development. The
interfaces match the Pydantic models exactly, enabling safe data exchange.

**Why this priority**: Required for Electron loader and VS Code extension, but those are Stage 4+.

**Independent Test**: TypeScript compiler accepts code using generated interfaces with no type errors.

**Acceptance Scenarios**:

1. **Given** generated TypeScript interfaces, **When** importing into a TS project, **Then**
   compilation succeeds with strict mode enabled.
2. **Given** TypeScript interfaces, **When** assigning a valid GeoJSON object to typed variable,
   **Then** no type errors occur.

---

### User Story 5 - Schema Adherence Testing (Priority: P1)

A CI pipeline runs automated tests ensuring all derived schemas (Pydantic, JSON Schema, TypeScript)
remain in sync with the LinkML source. Drift is caught before merge.

**Why this priority**: Constitution Article II mandates schema tests gate all merges. Without this,
schema integrity cannot be guaranteed.

**Independent Test**: Modify a field in LinkML, run adherence tests — tests fail until all derived
schemas are regenerated.

**Acceptance Scenarios**:

1. **Given** golden fixture files, **When** adherence tests run, **Then** all derived schemas
   validate fixtures identically (same pass/fail).
2. **Given** Python-generated data, **When** round-trip test runs (Python → JSON → TypeScript →
   JSON → Python), **Then** data is identical before and after.
3. **Given** generated JSON Schema from Pydantic, **When** compared to JSON Schema from LinkML,
   **Then** structural diff shows no meaningful differences.

---

### Edge Cases

- What happens when LinkML schema has circular references?
- How does system handle optional fields with default values across all targets?
- What happens when a field name is a reserved word in Python or TypeScript?
- How are union types (e.g., `string | number`) represented consistently across targets?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define LinkML schemas for: TrackFeature, SensorContact, ReferenceLocation,
  PlotMetadata, ToolMetadata.
- **FR-002**: System MUST generate Pydantic models from LinkML with full type annotations.
- **FR-003**: System MUST generate JSON Schema from LinkML for frontend validation.
- **FR-004**: System MUST generate TypeScript interfaces from LinkML for type-safe frontend code.
- **FR-005**: System MUST provide golden fixtures (valid and invalid examples) for each schema type.
- **FR-006**: System MUST implement three adherence test strategies: golden fixtures, round-trip,
  schema comparison.
- **FR-007**: CI pipeline MUST run all adherence tests and block merge on failure.
- **FR-008**: Adding a field to LinkML MUST propagate correctly to all generated targets without
  manual intervention.

### Key Entities

- **TrackFeature**: GeoJSON Feature representing a vessel track. Properties include platform ID,
  track type, temporal extent, and an array of timestamped positions.
- **SensorContact**: GeoJSON Feature representing a sensor detection. Links to parent track,
  includes bearing, range (if available), timestamp.
- **ReferenceLocation**: GeoJSON Feature for fixed reference points (e.g., exercise area markers).
- **PlotMetadata**: STAC Item properties for a Debrief plot — title, description, temporal extent,
  source files.
- **ToolMetadata**: Describes an analysis tool — name, description, required selection context,
  input/output schemas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five entity schemas (TrackFeature, SensorContact, ReferenceLocation, PlotMetadata,
  ToolMetadata) defined in LinkML and generating to all three targets.
- **SC-002**: Golden fixtures exist for each entity type (minimum 2 valid, 2 invalid per type).
- **SC-003**: All three adherence test strategies implemented and passing in CI.
- **SC-004**: Adding a new optional field to LinkML schema results in updated Pydantic, JSON Schema,
  and TypeScript within a single `make generate` command.
- **SC-005**: Zero manual edits required to generated files — all customisation via LinkML or
  generator configuration.
