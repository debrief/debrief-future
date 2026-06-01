# Feature Specification: SYSTEM Kind Discriminator for Non-Spatial State

**Feature Branch**: `022-system-kind-discriminator`
**Created**: 2026-01-23
**Status**: Draft
**Input**: Add SYSTEM kind discriminator for storing non-spatial system state (viewports, selections) as GeoJSON Features

> **Superseded shape (spec-261 / #249):** The `state.spatial` viewport originally defined here as `bbox`/`zoom`/`center` was later unified onto a single `viewport: ViewportPolygon` (+ optional `rotation`). The spatial examples in this spec have been updated to reflect that current shape; see `specs/261-session-state-systemstate/`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save Plot with Viewport State (Priority: P1)

An analyst working on a complex plot adjusts the map view to focus on a specific area of interest and sets a narrow time window to examine a critical period. When they save the plot, these viewport settings are preserved so reopening the plot restores their exact working context.

**Why this priority**: Without viewport persistence, users lose their working context every time they close and reopen a plot, requiring manual re-navigation that wastes time and may not perfectly recreate their previous view.

**Independent Test**: Can be fully tested by saving a plot with specific viewport settings, closing it, reopening it, and verifying the viewport is restored.

**Acceptance Scenarios**:

1. **Given** a plot with the map zoomed to a specific area, **When** the user saves the plot, **Then** the spatial viewport (ViewportPolygon) is stored as a SYSTEM feature with id `state.spatial`
2. **Given** a plot with a time range filter applied, **When** the user saves the plot, **Then** the temporal viewport (start/end times) is stored as a SYSTEM feature with id `state.temporal`
3. **Given** a saved plot with viewport state, **When** the user opens the plot, **Then** the application can retrieve the SYSTEM features by their known IDs

---

### User Story 2 - Preserve Selection State (Priority: P2)

An analyst has selected several tracks of interest for comparison. When they save and later reopen the plot, the same tracks remain selected, allowing them to continue their analysis without re-selecting.

**Why this priority**: Selection state is valuable but secondary to viewport—users can visually identify and re-select tracks, whereas recreating an exact viewport is harder.

**Independent Test**: Can be tested by selecting features, saving, reopening, and verifying the selection can be restored.

**Acceptance Scenarios**:

1. **Given** a plot with specific features selected, **When** the user saves the plot, **Then** the selected feature IDs are stored in a SYSTEM feature with id `state.selection`
2. **Given** a saved plot with selection state, **When** the user opens the plot, **Then** the application can retrieve and apply the selection

---

### User Story 3 - Schema Validation for SYSTEM Features (Priority: P3)

A developer integrating with Debrief's data model needs to create or validate SYSTEM features. The schema provides clear guidance on structure and validates that SYSTEM features conform to requirements.

**Why this priority**: Schema validation ensures data integrity and enables third-party integrations, but is a developer concern rather than direct user value.

**Independent Test**: Can be tested by creating valid/invalid SYSTEM feature JSON and running schema validation.

**Acceptance Scenarios**:

1. **Given** a SYSTEM feature with null geometry, **When** validated against the schema, **Then** validation passes
2. **Given** a SYSTEM feature with non-null geometry, **When** validated against the schema, **Then** validation fails (SYSTEM features must have null geometry)
3. **Given** a SYSTEM feature without a valid state ID prefix, **When** validated against the schema, **Then** validation fails

---

### Edge Cases

- What happens when a plot has no SYSTEM features? Application uses default viewport/empty selection.
- What happens when SYSTEM feature IDs are missing or malformed? Application ignores invalid SYSTEM features and uses defaults.
- What happens when multiple features have the same SYSTEM ID? Only the first is used; others ignored.
- What happens when viewport coordinates are outside valid ranges? Schema validation rejects invalid coordinates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add `SYSTEM` to the `FeatureKindEnum` in the LinkML schema
- **FR-002**: System MUST allow SYSTEM features to have `geometry: null` (valid GeoJSON)
- **FR-003**: System MUST require SYSTEM features to have deterministic feature IDs with `state.` prefix
- **FR-004**: System MUST define SYSTEM feature IDs: `state.temporal`, `state.spatial`, `state.selection`
- **FR-005**: Generated Pydantic models MUST include SYSTEM in the kind enum
- **FR-006**: Generated TypeScript types MUST include SYSTEM in the kind enum
- **FR-007**: Schema tests MUST validate SYSTEM features with null geometry pass validation
- **FR-008**: Schema tests MUST validate that SYSTEM features follow the required ID convention

### Key Entities

- **SYSTEM Feature**: A GeoJSON Feature with `kind: "SYSTEM"` storing non-spatial application state. Distinguished by null geometry and reserved `state.*` feature IDs.
- **Temporal Viewport** (`state.temporal`): Stores the visible time range with `start` and `end` ISO8601 timestamps in properties.
- **Spatial Viewport** (`state.spatial`): Stores the visible map extent as a `viewport` (a 4-corner `ViewportPolygon` carrying an optional `zoom`) plus optional `rotation` in properties.
- **Selection State** (`state.selection`): Stores an array of selected feature IDs in properties.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All schema generation tasks (LinkML → Pydantic, LinkML → TypeScript, LinkML → JSON Schema) complete without errors
- **SC-002**: Round-trip test passes: Python model → JSON → TypeScript → JSON → Python model produces identical SYSTEM features
- **SC-003**: 100% of existing schema tests continue to pass (no regressions)
- **SC-004**: New golden fixture tests for SYSTEM features pass (valid and invalid cases)
- **SC-005**: SYSTEM features with null geometry are accepted by all generated validators

## Assumptions

- SYSTEM features are optional in any plot (plots without SYSTEM features are valid)
- The `state.*` ID convention is reserved exclusively for SYSTEM features
- Applications reading plots are responsible for interpreting SYSTEM feature properties (this spec defines storage, not consumption)
- Layer visibility is stored per-feature (not as a SYSTEM feature)—out of scope for this specification
