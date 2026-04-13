# Feature Specification: LinkML Per-Platform Override Fields

**Feature Branch**: `181-linkml-platform-overrides`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "[E10] LinkML schema update -- per-platform override fields on TrackProperties; debrief:platforms STAC extension replacing flat aggregates; regen Pydantic + TS types (requires #180)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema Declares Per-Platform Override Fields (Priority: P1)

As a developer working on the enrichment pipeline, I need the LinkML schema to include optional per-platform metadata fields on TrackProperties so that analysts can override registry-derived values on individual tracks and downstream tools (save-time resolution, CQL2 filtering) have a well-defined schema to work against.

**Why this priority**: The override fields are the foundation for the entire E10 enrichment model. Without them in the schema, no downstream consumer (save-time resolution #183, CQL2 array_filter #185, filter bar #186) can be built. Every other story in this feature and most items in the E10 epic depend on these fields existing.

**Independent Test**: Can be tested by running the LinkML generators and verifying the new optional fields appear in the generated Pydantic models and TypeScript types, and that existing valid fixtures still pass validation.

**Acceptance Scenarios**:

1. **Given** the updated LinkML geojson.yaml schema, **When** I inspect TrackProperties, **Then** I see six new optional fields: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`.
2. **Given** a TrackFeature JSON fixture that includes one or more of the new optional fields with valid values, **When** I validate it, **Then** validation passes.
3. **Given** a TrackFeature JSON with `nationality` set to a three-letter code (e.g., "GBR"), **When** I validate it, **Then** validation fails because `nationality` must be an ISO 3166-1 alpha-2 code (two uppercase letters).
4. **Given** a TrackFeature JSON with `domain` set to "air", **When** I validate it, **Then** validation fails because `domain` is constrained to VesselDomainEnum values (surface, subsurface, unknown).

---

### User Story 2 - Flat Aggregates Replaced by Structured Platform Array (Priority: P1)

As a developer building the CQL2 array_filter evaluator (#185), I need the STAC extension schema to define a `debrief:platforms` array of structured platform records AND remove the old flat aggregate fields so that the data model is clean, there is one canonical way to query platform metadata, and compound predicates like "nationality = GB AND domain = subsurface" work against per-platform data.

**Why this priority**: The flat aggregates (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) are structurally unable to represent joined queries. Keeping them alongside `debrief:platforms` would create ambiguity about which is authoritative. Per Constitution Article XIV, we have no backward compatibility obligation pre-v4.0.0.

**Independent Test**: Can be tested by validating STAC item fixtures against the updated schema, confirming that `debrief:platforms` is accepted and the old flat fields are rejected.

**Acceptance Scenarios**:

1. **Given** the updated stac-extension.yaml schema, **When** I inspect StacExtensionProperties, **Then** I see a `platforms` field and DO NOT see `vessel_classes`, `nationalities`, or `track_names`.
2. **Given** a PlatformRecord, **When** I inspect its schema definition, **Then** it contains fields: `id` (required), `name` (optional), `nationality` (optional, two uppercase letters), `vessel_class` (optional, slash-delimited path), `vessel_type` (optional), `vessel_role` (optional), `domain` (optional, constrained to surface/subsurface/unknown).
3. **Given** a STAC item fixture with a `debrief:platforms` array containing two fully-populated platform records, **When** I validate it, **Then** validation passes.
4. **Given** a STAC item fixture with a `debrief:platforms` array containing a record with only `id` populated (all other fields absent), **When** I validate it, **Then** validation passes (sparse records are valid for unregistered platforms).
5. **Given** a STAC item fixture that still uses the old flat aggregate fields, **When** I validate it, **Then** validation fails (the old fields no longer exist in the schema).

---

### User Story 3 - Consumer Code Migrated to Platforms (Priority: P1)

As a developer working on the codebase, I need all consumer code that previously referenced the flat aggregate fields to be updated to use the `platforms` array so that the codebase compiles, passes type checking, and `task verify` succeeds.

**Why this priority**: Removing fields from the schema without updating consumers would break the build. This must be done atomically with the schema change.

**Independent Test**: Can be tested by running `task verify` (lint, typecheck, test) and confirming zero failures.

**Acceptance Scenarios**:

1. **Given** the updated types, **When** I run TypeScript type checking across the monorepo, **Then** there are no type errors referencing `vessel_classes`, `nationalities`, or `track_names` on STAC-related types.
2. **Given** the updated filter engine, **When** I run the filter engine test suite, **Then** all tests pass using `platforms`-based matching.
3. **Given** the updated stacService, **When** it reads a STAC item with `debrief:platforms`, **Then** it correctly populates the internal data structures with per-platform data.
4. **Given** the updated CatalogOverviewItem type, **When** the filter bar extracts distinct values, **Then** it derives nationalities, vessel classes, and track names from the `platforms` array.

---

### User Story 4 - Regenerated Types Match Schema (Priority: P2)

As a developer consuming Debrief schemas in Python or TypeScript, I need the generated Pydantic models and TypeScript types to reflect the updated LinkML schema so that I get compile-time and runtime validation of the new fields without manual type definitions.

**Why this priority**: Generated types are how the schema is consumed by all services and frontends. Without regeneration, developers would need to cast or ignore types, defeating the schema-first approach.

**Independent Test**: Can be tested by running the schema generators and verifying the output includes the new fields with correct types, optionality, and constraints. Round-trip tests confirm cross-language consistency.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema, **When** I run the Pydantic generator, **Then** the output TrackProperties model includes six new optional fields with correct types and validators.
2. **Given** the updated LinkML schema, **When** I run the TypeScript generator, **Then** the output TrackProperties interface includes six new optional fields with correct types.
3. **Given** the updated LinkML schema, **When** I run the generators for StacExtensionProperties, **Then** the output includes an optional platforms array with the PlatformRecord structure and DOES NOT include vessel_classes, nationalities, or track_names.
4. **Given** the generated types, **When** I run the existing schema adherence test suite, **Then** all tests pass.

---

### User Story 5 - Golden Fixtures Updated (Priority: P2)

As a developer maintaining the test suite, I need the golden fixture set to use the new `debrief:platforms` structure (and not the old flat aggregates) so that schema adherence tests validate the correct format and downstream developers have reference data to work from.

**Why this priority**: Fixtures are how the schema is validated in CI. All fixtures must conform to the current schema.

**Independent Test**: Can be tested by running the fixture validation suite and confirming that all fixtures pass against the new schema.

**Acceptance Scenarios**:

1. **Given** the updated fixture set, **When** I look for TrackFeature fixtures, **Then** I find at least one valid fixture that includes per-platform override fields.
2. **Given** the updated STAC extension fixtures, **When** I validate them, **Then** all use `platforms` arrays and none contain the old flat aggregate fields.
3. **Given** the 100 exercise fixtures, **When** they are regenerated via the fixture generation script, **Then** all use `debrief:platforms` and pass schema validation.
4. **Given** the updated fixture set, **When** I look for invalid fixtures, **Then** I find at least one fixture with an invalid nationality value that fails validation.
5. **Given** the complete fixture set, **When** I run the full validation suite, **Then** all valid fixtures pass and all invalid fixtures correctly fail.

---

### Edge Cases

- What happens when a TrackFeature includes override fields but no `platform_id`? This cannot occur because `platform_id` is already required on TrackProperties.
- What happens when `vessel_class` contains an invalid path format (e.g., uppercase letters, spaces)? Validation rejects it via the pattern constraint on the field.
- What happens when `debrief:platforms` is an empty array? This is valid -- a plot with no tracks has no platforms to list.
- What happens when `debrief:platforms` contains duplicate platform IDs? This is permitted at the schema level; deduplication is the responsibility of the save-time resolution handler (#183).
- What happens when consumer code needs to display a flat list of nationalities? It derives the list from `platforms.map(p => p.nationality).filter(Boolean)`. The flat convenience is computed, not stored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST add six optional fields to TrackProperties: `display_name` (string), `nationality` (string, two uppercase letters), `vessel_class` (string, slash-delimited path), `vessel_type` (string), `vessel_role` (string), `domain` (constrained to surface/subsurface/unknown).
- **FR-002**: The schema MUST define a new PlatformRecord entity with fields: `id` (required string), `name` (optional string), `nationality` (optional string, two uppercase letters), `vessel_class` (optional string, slash-delimited path), `vessel_type` (optional string), `vessel_role` (optional string), `domain` (optional, constrained to surface/subsurface/unknown).
- **FR-003**: StacExtensionProperties MUST add an optional `platforms` field as a multivalued array of PlatformRecord, representing fully-resolved per-platform metadata for the STAC item.
- **FR-004**: The flat aggregate fields `vessel_classes`, `nationalities`, and `track_names` MUST be removed from StacExtensionProperties. They are replaced entirely by the `platforms` array.
- **FR-005**: StacItemSummary MUST add an optional `platforms` field and MUST remove `vessel_classes`, `nationalities`, and `track_names`.
- **FR-006**: Generated Pydantic models, JSON Schema, and TypeScript types MUST be regenerated from the updated LinkML schema, and all generated output MUST pass existing adherence tests.
- **FR-007**: The golden fixture set MUST be updated: all STAC extension fixtures and exercise fixtures MUST use `debrief:platforms` and MUST NOT contain the removed flat aggregate fields.
- **FR-008**: All consumer code referencing the removed flat fields MUST be migrated to use the `platforms` array. This includes the filter engine, stacService, CatalogOverviewItem, StacBrowserItem, and all test mocks.
- **FR-009**: The `domain` field on both TrackProperties and PlatformRecord MUST reuse the existing VesselDomainEnum (surface, subsurface, unknown).
- **FR-010**: The `nationality` field on both TrackProperties and PlatformRecord MUST be constrained to exactly two uppercase letters.
- **FR-011**: The full verification suite (`task verify`) MUST pass with zero failures after all changes.

### Key Entities

- **TrackProperties**: Properties of a vessel track GeoJSON feature. Extended with six optional override fields that allow analysts to annotate individual tracks with platform metadata, overriding registry-derived values.
- **PlatformRecord**: A new entity representing fully-resolved metadata for a single platform within a STAC item. Contains platform identity (`id`, `name`) and classification (`nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`). Only `id` is required; all other fields may be absent for unregistered platforms.
- **StacExtensionProperties**: Extension properties on STAC items in the `debrief:` namespace. Now carries a `platforms` array of PlatformRecord. The former flat aggregate fields (`vessel_classes`, `nationalities`, `track_names`) are removed.
- **StacItemSummary**: Lightweight projection of a STAC item for UI filtering. Carries the same `platforms` array. Former flat fields removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six override fields are present and optional on TrackProperties in the generated Pydantic model, TypeScript types, and JSON Schema -- verified by schema adherence tests.
- **SC-002**: The PlatformRecord entity is defined with the correct field set and constraints -- verified by validating golden fixtures against the generated schema.
- **SC-003**: The `debrief:platforms` array is present on StacExtensionProperties and StacItemSummary; `vessel_classes`, `nationalities`, and `track_names` are absent -- verified by schema adherence tests.
- **SC-004**: Zero references to the removed flat aggregate fields remain in non-documentation source files.
- **SC-005**: At least 3 new valid golden fixtures and 1 new invalid golden fixture are added covering the new schema structures.
- **SC-006**: All 100 exercise fixtures are regenerated with `debrief:platforms` and pass schema validation.
- **SC-007**: The full verification suite (`task verify`) passes on the feature branch with zero failures.

## Assumptions

- The platform registry (#180) is complete and provides the VesselDomainEnum and vessel classification path conventions that this schema update references.
- The `vessel_class` path format follows the convention established by #180: lowercase alphanumeric segments separated by forward slashes (e.g., `surface/warship/frigate/type23`).
- Schema generation tooling (LinkML generators) is already configured and working in the repository.
- The VesselDomainEnum already exists in the STAC extension schema and will be reused (not duplicated) for the `domain` field on TrackProperties and PlatformRecord.
- The exercise fixture generation script can be updated to produce `debrief:platforms` format.
- Consumer code (filter engine, stacService, etc.) can derive flat convenience lists from the `platforms` array at runtime where needed for display.
- Constitution Article XIV (Pre-Release Freedom) permits removing the flat fields without deprecation.

## Dependencies

- **#180 (Platform Registry)**: Must be complete (it is). Provides the vessel class tree structure, domain enum values, and path conventions that the schema update codifies.

## Out of Scope

- Save-time registry resolution logic (covered by #183)
- Import handler warnings for unregistered platforms (covered by #182)
- CQL2 `array_filter` evaluator for compound predicates (covered by #185)
- Platform registry file format or loader changes
- Updating preview/workspace/samples/local-store data (covered by #184)
- Documentation-only references in old spec files (read-only historical context)
