# Feature Specification: LinkML Per-Platform Override Fields

**Feature Branch**: `181-linkml-platform-overrides`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "[E10] LinkML schema update -- per-platform override fields on TrackProperties; debrief:platforms STAC extension replacing flat aggregates; regen Pydantic + TS types (requires #180)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema Declares Per-Platform Override Fields (Priority: P1)

As a developer working on the enrichment pipeline, I need the LinkML schema to include optional per-platform metadata fields on TrackProperties so that analysts can override registry-derived values on individual tracks and downstream tools (save-time resolution, CQL2 filtering) have a well-defined schema to work against.

**Why this priority**: The override fields are the foundation for the entire E10 enrichment model. Without them in the schema, no downstream consumer (save-time resolution #183, CQL2 array_filter #185, filter bar #186) can be built. Every other story in this feature and most items in the E10 epic depend on these fields existing.

**Independent Test**: Can be tested by running the LinkML generators and verifying the new optional fields appear in the generated Pydantic models and TypeScript types, and that existing valid fixtures still pass validation (backward compatibility).

**Acceptance Scenarios**:

1. **Given** the updated LinkML geojson.yaml schema, **When** I inspect TrackProperties, **Then** I see six new optional fields: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`.
2. **Given** an existing valid TrackFeature JSON fixture that omits the new fields, **When** I validate it against the updated schema, **Then** validation passes (backward compatible).
3. **Given** a TrackFeature JSON fixture that includes one or more of the new optional fields with valid values, **When** I validate it, **Then** validation passes.
4. **Given** a TrackFeature JSON with `nationality` set to a three-letter code (e.g., "GBR"), **When** I validate it, **Then** validation fails because `nationality` must be an ISO 3166-1 alpha-2 code (two uppercase letters).
5. **Given** a TrackFeature JSON with `domain` set to "air", **When** I validate it, **Then** validation fails because `domain` is constrained to VesselDomainEnum values (surface, subsurface, unknown).

---

### User Story 2 - STAC Extension Carries Structured Platform Array (Priority: P1)

As a developer building the CQL2 array_filter evaluator (#185), I need the STAC extension schema to define a `debrief:platforms` array of structured platform records so that compound predicates like "nationality = GB AND domain = subsurface" can be evaluated against per-platform data rather than disconnected flat lists.

**Why this priority**: Replacing flat aggregates with structured per-platform records is the core schema change that makes joined queries possible. This is co-equal with Story 1 because both are needed before any downstream consumer can proceed.

**Independent Test**: Can be tested by validating STAC item fixtures against the updated schema, confirming that the new `debrief:platforms` array is accepted and the old flat aggregate fields remain valid during the transition period.

**Acceptance Scenarios**:

1. **Given** the updated stac-extension.yaml schema, **When** I inspect StacExtensionProperties, **Then** I see a new optional `platforms` field that is a multivalued array of PlatformRecord objects.
2. **Given** a PlatformRecord, **When** I inspect its schema definition, **Then** it contains fields: `id` (required), `name` (optional), `nationality` (optional, two uppercase letters), `vessel_class` (optional, slash-delimited path), `vessel_type` (optional), `vessel_role` (optional), `domain` (optional, constrained to surface/subsurface/unknown).
3. **Given** a STAC item fixture with a `debrief:platforms` array containing two fully-populated platform records, **When** I validate it, **Then** validation passes.
4. **Given** a STAC item fixture with a `debrief:platforms` array containing a record with only `id` populated (all other fields absent), **When** I validate it, **Then** validation passes (sparse records are valid for unregistered platforms).
5. **Given** a STAC item fixture that still uses the old flat aggregate fields without `debrief:platforms`, **When** I validate it, **Then** validation passes (backward compatible during transition).

---

### User Story 3 - Regenerated Types Match Schema (Priority: P2)

As a developer consuming Debrief schemas in Python or TypeScript, I need the generated Pydantic models and TypeScript types to reflect the updated LinkML schema so that I get compile-time and runtime validation of the new fields without manual type definitions.

**Why this priority**: Generated types are how the schema is consumed by all services and frontends. Without regeneration, developers would need to cast or ignore types, defeating the schema-first approach.

**Independent Test**: Can be tested by running the schema generators and verifying the output includes the new fields with correct types, optionality, and constraints. Round-trip tests confirm cross-language consistency.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema, **When** I run the Pydantic generator, **Then** the output TrackProperties model includes six new optional fields with correct types and validators.
2. **Given** the updated LinkML schema, **When** I run the TypeScript generator, **Then** the output TrackProperties interface includes six new optional fields with correct types.
3. **Given** the updated LinkML schema, **When** I run the generators for StacExtensionProperties, **Then** the output includes an optional platforms array with the PlatformRecord structure.
4. **Given** the generated types, **When** I run the existing schema adherence test suite, **Then** all tests pass.

---

### User Story 4 - Golden Fixtures Updated (Priority: P2)

As a developer maintaining the test suite, I need the golden fixture set to include examples of the new schema structures so that schema adherence tests cover the new fields and downstream developers have reference data to work from.

**Why this priority**: Fixtures are how the schema is validated in CI. Without updated fixtures, the new fields are never tested and regressions could go undetected.

**Independent Test**: Can be tested by running the fixture validation suite and confirming that new valid fixtures pass and new invalid fixtures correctly fail.

**Acceptance Scenarios**:

1. **Given** the updated fixture set, **When** I look for TrackFeature fixtures, **Then** I find at least one valid fixture that includes per-platform override fields.
2. **Given** the updated fixture set, **When** I look for STAC item fixtures, **Then** I find at least one valid fixture with a `debrief:platforms` array containing fully-populated records.
3. **Given** the updated fixture set, **When** I look for STAC item fixtures, **Then** I find at least one valid fixture with a `debrief:platforms` array containing a sparse record (only `id`).
4. **Given** the updated fixture set, **When** I look for invalid fixtures, **Then** I find at least one fixture with an invalid nationality value that fails validation.
5. **Given** the complete fixture set (old and new), **When** I run the full validation suite, **Then** all valid fixtures pass and all invalid fixtures correctly fail.

---

### Edge Cases

- What happens when a TrackFeature includes override fields but no `platform_id`? This cannot occur because `platform_id` is already required on TrackProperties.
- What happens when `vessel_class` contains an invalid path format (e.g., uppercase letters, spaces)? Validation rejects it via the pattern constraint on the field.
- What happens when `debrief:platforms` is an empty array? This is valid -- a plot with no tracks has no platforms to list.
- What happens when `debrief:platforms` contains duplicate platform IDs? This is permitted at the schema level; deduplication is the responsibility of the save-time resolution handler (#183).
- What happens when old-format STAC items (flat aggregates only, no `debrief:platforms`) are loaded? They remain valid because all new fields are optional and old fields are preserved during the transition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST add six optional fields to TrackProperties: `display_name` (string), `nationality` (string, two uppercase letters), `vessel_class` (string, slash-delimited path), `vessel_type` (string), `vessel_role` (string), `domain` (constrained to surface/subsurface/unknown).
- **FR-002**: The schema MUST define a new PlatformRecord entity with fields: `id` (required string), `name` (optional string), `nationality` (optional string, two uppercase letters), `vessel_class` (optional string, slash-delimited path), `vessel_type` (optional string), `vessel_role` (optional string), `domain` (optional, constrained to surface/subsurface/unknown).
- **FR-003**: StacExtensionProperties MUST add an optional `platforms` field as a multivalued array of PlatformRecord, representing fully-resolved per-platform metadata for the STAC item.
- **FR-004**: The existing flat aggregate fields on StacExtensionProperties (`vessel_classes`, `nationalities`, `track_names`) MUST remain in the schema during the transition period for backward compatibility.
- **FR-005**: StacItemSummary MUST add an optional `platforms` field mirroring the StacExtensionProperties structure, so the summary type used for filtering carries per-platform data.
- **FR-006**: Generated Pydantic models, JSON Schema, and TypeScript types MUST be regenerated from the updated LinkML schema, and all generated output MUST pass existing adherence tests.
- **FR-007**: The golden fixture set MUST be updated to include valid examples of TrackFeatures with override fields, STAC items with `debrief:platforms` arrays (fully-populated and sparse), and at least one invalid example testing constraint enforcement.
- **FR-008**: All existing valid fixtures MUST continue to pass validation against the updated schema (backward compatibility).
- **FR-009**: The `domain` field on both TrackProperties and PlatformRecord MUST reuse the existing VesselDomainEnum (surface, subsurface, unknown).
- **FR-010**: The `nationality` field on both TrackProperties and PlatformRecord MUST be constrained to exactly two uppercase letters.

### Key Entities

- **TrackProperties**: Properties of a vessel track GeoJSON feature. Extended with six optional override fields that allow analysts to annotate individual tracks with platform metadata, overriding registry-derived values.
- **PlatformRecord**: A new entity representing fully-resolved metadata for a single platform within a STAC item. Contains platform identity (`id`, `name`) and classification (`nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`). Only `id` is required; all other fields may be absent for unregistered platforms.
- **StacExtensionProperties**: Extension properties on STAC items in the `debrief:` namespace. Extended with a `platforms` array of PlatformRecord that replaces flat aggregate fields for per-platform joined queries.
- **StacItemSummary**: Lightweight projection of a STAC item for UI filtering. Extended with the same `platforms` array to enable compound filtering at the summary level.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six override fields are present and optional on TrackProperties in the generated Pydantic model, TypeScript types, and JSON Schema -- verified by schema adherence tests.
- **SC-002**: The PlatformRecord entity is defined with the correct field set and constraints -- verified by validating golden fixtures against the generated schema.
- **SC-003**: The `debrief:platforms` array is present on StacExtensionProperties and StacItemSummary in all generated outputs -- verified by schema adherence tests.
- **SC-004**: 100% of existing valid golden fixtures pass validation against the updated schema with zero backward-compatibility regressions.
- **SC-005**: At least 3 new valid golden fixtures and 1 new invalid golden fixture are added covering the new schema structures.
- **SC-006**: The full verification suite (lint, typecheck, test) passes on the feature branch with zero failures.

## Assumptions

- The platform registry (#180) is complete and provides the VesselDomainEnum and vessel classification path conventions that this schema update references.
- The existing flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) will be deprecated and removed in a future item, not in this one. This feature only adds the new structures alongside them.
- The `vessel_class` path format follows the convention established by #180: lowercase alphanumeric segments separated by forward slashes (e.g., `surface/warship/frigate/type23`).
- Schema generation tooling (LinkML generators) is already configured and working in the repository.
- The VesselDomainEnum already exists in the STAC extension schema and will be reused (not duplicated) for the `domain` field on TrackProperties and PlatformRecord.

## Dependencies

- **#180 (Platform Registry)**: Must be complete (it is). Provides the vessel class tree structure, domain enum values, and path conventions that the schema update codifies.

## Out of Scope

- Save-time registry resolution logic (covered by #183)
- Import handler warnings for unregistered platforms (covered by #182)
- CQL2 `array_filter` evaluator (covered by #185)
- Removal of flat aggregate fields from StacExtensionProperties (future deprecation item)
- UI display of registry-derived vs. analyst-set values (future item)
- Platform registry file format or loader changes
