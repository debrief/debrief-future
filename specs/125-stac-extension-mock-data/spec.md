# Feature Specification: STAC Extension Spec + Mock Data Fixtures

**Feature Branch**: `125-stac-extension-mock-data`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: Define STAC extension namespace, property names for vessel class/tags/author/tracks/nationalities; create 100 fixture item.json files; document mock data contract

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Define the Extension Property Contract (Priority: P1)

A developer building any E08 Discovery UI component needs a formal, documented contract specifying which property names exist in `item.properties` and what values they hold. Without this contract, each component would invent its own property names, leading to incompatible assumptions.

**Why this priority**: Every downstream E08 item (#126–#134) depends on this contract. No UI component can be built or tested without agreed property names.

**Independent Test**: Validate by loading a fixture item.json and confirming all extension properties are present, correctly named, and contain values conforming to documented types.

**Acceptance Scenarios**:

1. **Given** the extension specification document, **When** a developer reads it, **Then** they can determine the exact property name, type, and constraints for every extension field without consulting any other document.
2. **Given** an item.json fixture file, **When** validated against the extension specification, **Then** all extension properties conform to the documented schema (correct names, types, and value constraints).
3. **Given** the existing `item.properties` fields (`datetime`, `start_datetime`, `end_datetime`, `title`, `description`, `trackColors`), **When** the extension properties are added, **Then** no existing property names are overwritten or conflicted.

---

### User Story 2 — Build Mock Data Fixtures for Storybook Development (Priority: P2)

A frontend developer creating Discovery UI components in Storybook needs a realistic set of STAC item fixtures to drive visual development and filter testing. The fixtures must cover enough variety in vessel classes, tags, authors, durations, geographic extents, time ranges, and nationalities that all filter combinations can be exercised.

**Why this priority**: Without realistic mock data, Storybook-driven development cannot begin. 100 items provide the volume needed to test list scrolling, map clustering, timeline density, and filter selectivity.

**Independent Test**: Load the full fixture set into a test harness and verify that filtering by each property type returns a non-empty subset, that geographic extents span multiple ocean regions, and that temporal ranges span multiple years.

**Acceptance Scenarios**:

1. **Given** the fixture directory, **When** all item.json files are loaded, **Then** there are exactly 100 valid STAC items.
2. **Given** the 100 fixtures, **When** grouped by vessel class, **Then** at least 5 distinct vessel classes are represented, with a realistic distribution (not uniform).
3. **Given** the 100 fixtures, **When** plotted on a map, **Then** geographic extents span at least 4 distinct ocean regions (e.g., North Atlantic, Mediterranean, Indo-Pacific, Arctic).
4. **Given** the 100 fixtures, **When** sorted by temporal range, **Then** durations range from under 6 hours to over 10 days, covering each duration bucket (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`).
5. **Given** the 100 fixtures, **When** filtered by nationality, **Then** at least 6 distinct nationalities are represented.

---

### User Story 3 — Integrate Extension Properties into the Schema System (Priority: P3)

A schema maintainer needs the new extension properties defined as a LinkML schema module so that generated models (Pydantic, JSON Schema, TypeScript) stay consistent with the extension spec document. This ensures the contract is machine-enforceable, not just a human-readable document.

**Why this priority**: Schema-first is a governing principle. The extension spec document defines the contract in prose, but the LinkML module makes it enforceable. This can follow after the contract and fixtures are agreed.

**Independent Test**: Generate Pydantic and TypeScript models from the LinkML schema, then validate all 100 fixture files against the generated models.

**Acceptance Scenarios**:

1. **Given** the LinkML extension schema module, **When** Pydantic models are generated, **Then** a valid fixture item.json passes validation and an item with a missing required extension property fails validation.
2. **Given** the LinkML extension schema module, **When** TypeScript types are generated, **Then** the type definitions include all extension property names with correct types.
3. **Given** the existing `debrief.yaml` root schema, **When** the extension module is imported, **Then** no existing schema tests break.

---

### User Story 4 — Document the Duration Representation Decision (Priority: P4)

The SRD identifies duration as a filter dimension but leaves open whether duration is stored as a property in `item.properties` or computed at query time from `start_datetime` and `end_datetime`. This decision must be documented before filter components are built.

**Why this priority**: Duration affects both the extension schema (if stored) and the filter engine (#126). Deciding this upfront avoids rework.

**Independent Test**: Review the extension specification and confirm duration representation is explicitly documented with rationale.

**Acceptance Scenarios**:

1. **Given** the extension specification, **When** a developer reads the duration section, **Then** they can determine whether duration is stored or computed, and the rationale for the choice.
2. **Given** the chosen representation, **When** fixture items are examined, **Then** their duration data (stored or computable) matches the documented approach.

---

### Edge Cases

- What happens when a fixture item has no tracks (e.g., an annotation-only plot)? Extension properties for track names and nationalities should be present but empty arrays.
- What happens when a fixture item has a single timestamp rather than a range? The `datetime` field is set and `start_datetime`/`end_datetime` are absent; duration is zero or undefined.
- What happens when vessel class is unknown or unclassified? A designated "UNCLASSIFIED" value must exist in the vessel taxonomy.
- What happens when a plot has tracks from multiple nationalities? The nationalities array contains all distinct nationalities.
- What happens when tags contain special characters or are empty? Tags are trimmed strings; empty tags are excluded from arrays.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension specification MUST define a namespace prefix for all custom properties (e.g., `debrief:` prefix), consistent with existing `debrief:toolId` and `debrief:sourceFeatures` usage in STAC assets.
- **FR-002**: The extension specification MUST define property names, types, and constraints for: vessel class, plot-level tags, feature-level tags, author, track names, nationalities, and duration representation.
- **FR-003**: Each extension property MUST document whether it is required or optional, and its default value when optional.
- **FR-004**: The extension MUST define a hierarchical vessel classification structure with at least 3 levels (e.g., category > class > specific type).
- **FR-005**: The fixture set MUST contain exactly 100 valid STAC item.json files, each conforming to STAC 1.0.0 and the extension specification.
- **FR-006**: Fixtures MUST include realistic geographic extents (bbox and geometry) spanning multiple ocean regions, not placeholder coordinates.
- **FR-007**: Fixtures MUST include realistic temporal ranges spanning multiple years, with durations distributed across all SRD filter buckets (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`).
- **FR-008**: Fixtures MUST include at least 5 distinct vessel classes, 6 distinct nationalities, 10 distinct authors, and 15 distinct tag values.
- **FR-009**: Fixtures MUST be compatible with the existing `CatalogOverviewItem` interface (`id`, `title`, `bbox`, `datetime`, `startDatetime`, `endDatetime`, `itemPath`).
- **FR-010**: A LinkML schema module MUST be authored in `shared/schemas/src/linkml/` defining the extension properties, importable from the root `debrief.yaml` schema.
- **FR-011**: The extension MUST NOT modify or conflict with existing STAC core properties (`datetime`, `start_datetime`, `end_datetime`, `title`, `description`) or existing custom properties (`trackColors`, `sourcePath`).
- **FR-012**: The extension MUST document the duration representation decision (stored property vs. computed from temporal range) with rationale.
- **FR-013**: Fixture items MUST include at least 3 items with zero tracks (annotation-only or empty plots) and at least 3 items with 5+ tracks to test edge cases.
- **FR-014**: The fixture set MUST include valid `links` and `assets` sections in each item.json, with at least a `data` asset referencing a GeoJSON file path.

### Key Entities

- **STAC Extension Property**: A named field in `item.properties` under the extension namespace. Has a name, type, cardinality (single value or array), and optionality (required/optional).
- **Vessel Class**: A hierarchical classification of vessel types. Each node has a label and optional parent. Leaf nodes represent specific vessel types; inner nodes represent categories.
- **Plot Tag**: A free-text label applied at the plot level. Stored as an array of strings in `item.properties`.
- **Feature Tag**: A free-text label applied to individual GeoJSON features within a plot. Aggregated to `item.properties` for discoverability (the union of all feature-level tags).
- **Mock Fixture Item**: A complete STAC item.json file representing a fictional maritime exercise. Contains core STAC fields plus all extension properties with realistic values.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of E08 downstream components (#126–#134) can reference a single extension specification document for all property name and type decisions, with zero ambiguity requiring ad-hoc communication.
- **SC-002**: 100 fixture item.json files pass validation against the extension schema, with zero manual corrections needed after generation.
- **SC-003**: Filtering the 100 fixtures by any single extension property (vessel class, tag, author, nationality, duration bucket, track name) returns a non-empty result set containing between 5% and 80% of items (demonstrating realistic selectivity, not trivial all-or-nothing).
- **SC-004**: The LinkML schema module generates valid Pydantic and TypeScript models on first attempt, and all 100 fixtures validate against the generated Pydantic model.
- **SC-005**: Existing schema tests continue to pass after the new LinkML module is added to the root schema.
- **SC-006**: The vessel taxonomy hierarchy contains at least 3 levels and 15 leaf-node vessel types, sufficient for meaningful hierarchical filtering in the Discovery UI.

## Assumptions

- The `debrief:` namespace prefix is appropriate for extension properties, consistent with existing `debrief:toolId` usage in STAC assets. No formal STAC Extension registry submission is needed at this stage.
- Duration is best computed from `start_datetime` and `end_datetime` at query/filter time rather than stored redundantly, avoiding staleness if temporal bounds are updated. This follows the SRD's client-side filter approach.
- Feature-level tags are aggregated into `item.properties` as a union array for discoverability. The authoritative per-feature tags remain in each GeoJSON feature's properties.
- The vessel taxonomy is a development team concern for now, not yet requiring analyst collaboration (per SRD Open Item #3). A representative starter taxonomy is sufficient for Storybook development.
- Fixture exercises use fictional names and coordinates. No real operational data is included.
- The fixture files live in `shared/schemas/fixtures/stac-browser/` alongside existing schema fixtures, following the project convention of data formats living in `shared/schemas`.
