# Feature Specification: Add MultiPoint and MultiPolygon Feature Schemas

**Feature Branch**: `081-add-multi-feature-styling`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "We're currently developing tools that return multi-point and multi-polygon features. I don't think our feature schemas include styling for these types of entity. Check if they are missing. If they are, then examine the existing schemas, and develop new ones that are compliant with those. Note: LinkML is the 'master' schema, with other schemas defined from it."

## Analysis of Current State

The existing schema suite defines the following GeoJSON geometry classes:

- **GeoJSONPoint** - Point geometry
- **GeoJSONEmptyPoint** - Point with empty coordinates (system state features)
- **GeoJSONLineString** - LineString geometry
- **GeoJSONPolygon** - Polygon geometry
- **GeoJSONMultiLineString** - MultiLineString geometry (used by compound tracks)

The styling schemas already describe multi-geometry support in their documentation:

- **PointProperties** - "Styling schema for Point and MultiPoint geometries"
- **LineProperties** - "Styling schema for LineString and MultiLineString geometries"
- **PolygonProperties** - "Styling schema for Polygon and MultiPolygon geometries"

**Confirmed gaps:**

1. **GeoJSONMultiPoint** geometry class does not exist in `geojson.yaml`
2. **GeoJSONMultiPolygon** geometry class does not exist in `geojson.yaml`
3. No GeoJSON Feature types reference these missing geometry classes
4. No `FeatureKindEnum` values exist for multi-point or multi-polygon result features
5. No golden fixture files exist for MultiPoint or MultiPolygon geometries or features
6. Generated Pydantic and TypeScript code cannot represent these geometry types

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tool Returns MultiPoint Result (Priority: P1)

A calculation tool (e.g., intercept finder, rendezvous planner) produces a set of discrete geographic points as its result. The system must be able to store, validate, and render this MultiPoint result as a styled GeoJSON Feature within a STAC catalog plot.

**Why this priority**: Tools currently in development return multi-point results. Without the MultiPoint geometry class and a corresponding Feature type, these tool results cannot be represented in the schema, blocking tool integration.

**Independent Test**: Can be fully tested by creating a MultiPoint Feature with PointProperties styling, validating it against the schema, and confirming round-trip serialisation across Python and TypeScript.

**Acceptance Scenarios**:

1. **Given** a tool produces a set of geographic coordinates, **When** the result is stored as a GeoJSON Feature with MultiPoint geometry and PointProperties styling, **Then** the feature passes schema validation in both Python and TypeScript.
2. **Given** a valid MultiPoint Feature, **When** it is serialised to JSON and deserialised back, **Then** the geometry coordinates, styling properties, and metadata are preserved identically.
3. **Given** a MultiPoint Feature with PointProperties styling, **When** it is rendered on the map, **Then** all points display using the same styling (shape, colour, radius, opacity).

---

### User Story 2 - Tool Returns MultiPolygon Result (Priority: P1)

A calculation tool (e.g., area-of-coverage analyser, zone generator) produces a set of polygonal regions as its result. The system must be able to store, validate, and render this MultiPolygon result as a styled GeoJSON Feature within a STAC catalog plot.

**Why this priority**: Tools currently in development return multi-polygon results. Without the MultiPolygon geometry class and a corresponding Feature type, these tool results cannot be represented in the schema, blocking tool integration.

**Independent Test**: Can be fully tested by creating a MultiPolygon Feature with PolygonProperties styling, validating it against the schema, and confirming round-trip serialisation across Python and TypeScript.

**Acceptance Scenarios**:

1. **Given** a tool produces a set of polygonal regions, **When** the result is stored as a GeoJSON Feature with MultiPolygon geometry and PolygonProperties styling, **Then** the feature passes schema validation in both Python and TypeScript.
2. **Given** a valid MultiPolygon Feature, **When** it is serialised to JSON and deserialised back, **Then** the geometry coordinates, styling properties, and metadata are preserved identically.
3. **Given** a MultiPolygon Feature with PolygonProperties styling, **When** it is rendered on the map, **Then** all polygons display using the same fill colour, border, and opacity settings.

---

### User Story 3 - Schema Generation and Adherence (Priority: P2)

A developer adds the new geometry classes and feature types to the LinkML master schema. The schema generators produce valid Pydantic models and TypeScript interfaces, and all existing adherence tests continue to pass alongside new ones.

**Why this priority**: Schema-first development is a governing principle. Generated code must remain consistent with the master schema, and existing schemas must not break.

**Independent Test**: Can be fully tested by running the schema generators and the existing golden-fixture, round-trip, and schema-comparison test suites, confirming zero regressions and new tests passing.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema, **When** generators run, **Then** Pydantic models, JSON Schema, and TypeScript interfaces are produced without errors.
2. **Given** new golden fixture files for MultiPoint and MultiPolygon features, **When** validation tests run, **Then** all valid fixtures pass and all invalid fixtures are correctly rejected.
3. **Given** existing golden fixture files for all current feature types, **When** validation tests run after the schema update, **Then** all existing tests still pass (zero regressions).

---

### User Story 4 - Mixed-Geometry Tool Results (Priority: P3)

A tool returns results that may include both simple and multi-geometry features in the same output. The system must handle a FeatureCollection containing a mix of Point, MultiPoint, Polygon, MultiPolygon, and other geometry types, each with appropriate styling.

**Why this priority**: Realistic tool outputs often contain heterogeneous geometry. This validates that the new types compose correctly with existing types.

**Independent Test**: Can be fully tested by constructing a FeatureCollection with mixed feature types and validating it against the schema.

**Acceptance Scenarios**:

1. **Given** a FeatureCollection containing both single-geometry and multi-geometry features, **When** it is validated, **Then** each feature is accepted based on its own geometry and properties type.

---

### Edge Cases

- What happens when a MultiPoint Feature contains only a single point? It should still be valid (a MultiPoint with one coordinate set is valid GeoJSON).
- What happens when a MultiPolygon Feature contains zero polygons? An empty coordinates array should be rejected (at least one polygon required).
- What happens when a MultiPoint or MultiPolygon Feature is missing its style property? Validation must reject the feature (style is required).
- How does the system handle a MultiPolygon with polygons containing holes (interior rings)? The coordinate structure must follow GeoJSON spec (array of polygon coordinate arrays, each of which is an array of linear rings).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The master LinkML schema MUST define a `GeoJSONMultiPoint` geometry class with `type` constrained to `"MultiPoint"` and a `coordinates` field for arrays of positions.
- **FR-002**: The master LinkML schema MUST define a `GeoJSONMultiPolygon` geometry class with `type` constrained to `"MultiPolygon"` and a `coordinates` field for arrays of polygon coordinate arrays.
- **FR-003**: The `FeatureKindEnum` MUST include new values to discriminate features that use MultiPoint and MultiPolygon geometries (e.g., `MULTI_POINT` and `MULTI_POLYGON`, or a more general approach if tool result features use a shared kind).
- **FR-004**: The schema MUST define Feature types (Properties + Feature classes) for MultiPoint and MultiPolygon results, following the same structural pattern as existing features (ReferenceLocation, CircleAnnotation, etc.).
- **FR-005**: MultiPoint Feature properties MUST include a required `style` field of type `PointProperties`.
- **FR-006**: MultiPolygon Feature properties MUST include a required `style` field of type `PolygonProperties`.
- **FR-007**: Feature properties MUST include a `label` field for human-readable identification of the result.
- **FR-008**: Feature properties MUST include a `source_tool` field to record which calculation tool produced the result (provenance requirement).
- **FR-009**: Schema generators MUST produce valid Pydantic v2 models, JSON Schema, and TypeScript interfaces for all new classes.
- **FR-010**: Golden fixture files MUST be created for both valid and invalid examples of each new geometry class and feature type.
- **FR-011**: Existing schema tests (golden fixtures, round-trip, schema comparison) MUST continue to pass without modification.
- **FR-012**: The new geometry classes and feature types MUST follow the naming conventions, structural patterns, and Leaflet-compatible styling approach established by existing schemas.

### Key Entities

- **GeoJSONMultiPoint**: A GeoJSON geometry representing multiple discrete points. Coordinates is an array of [longitude, latitude] pairs. Uses `PointProperties` for styling.
- **GeoJSONMultiPolygon**: A GeoJSON geometry representing multiple polygonal regions. Coordinates is an array of polygon coordinate arrays (each an array of linear rings). Uses `PolygonProperties` for styling.
- **MultiPointFeature**: A GeoJSON Feature with MultiPoint geometry, styled with PointProperties. Represents tool results that produce discrete point sets.
- **MultiPolygonFeature**: A GeoJSON Feature with MultiPolygon geometry, styled with PolygonProperties. Represents tool results that produce polygonal region sets.
- **PointProperties** (existing): Styling schema for Point and MultiPoint geometries. No changes needed.
- **PolygonProperties** (existing): Styling schema for Polygon and MultiPolygon geometries. No changes needed.

## Assumptions

- The existing `PointProperties` and `PolygonProperties` styling classes are sufficient for MultiPoint and MultiPolygon features respectively. No per-element styling (different colours for individual points within a MultiPoint) is required at this stage.
- New Feature types will follow the same property pattern as existing features (kind discriminator, style, label, optional metadata).
- The `source_tool` field on properties records provenance, aligning with the project's "provenance always" principle.
- The new FeatureKindEnum values will use SCREAMING_SNAKE_CASE consistent with existing values (TRACK, POINT, CIRCLE, etc.).
- MultiPoint coordinates follow GeoJSON RFC 7946: `[[lon1, lat1], [lon2, lat2], ...]`
- MultiPolygon coordinates follow GeoJSON RFC 7946: `[[[[lon, lat], ...]], [[[lon, lat], ...]]]`

## Dependencies

- **Existing styling schemas**: `PointProperties` and `PolygonProperties` from `styling.yaml` are reused directly.
- **Schema generators**: LinkML generators for Pydantic, JSON Schema, and TypeScript must support the new classes.
- **Feature 062** (missing FeatureKind enum values): May overlap if it also adds enum values. Coordinate to avoid conflicts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All new geometry classes and feature types pass golden-fixture validation with at least 2 valid and 2 invalid fixture files each.
- **SC-002**: Round-trip serialisation tests (Python to JSON to TypeScript to JSON to Python) pass for all new types with zero data loss.
- **SC-003**: Generated Pydantic models, JSON Schema, and TypeScript interfaces include all new classes without manual edits.
- **SC-004**: All existing schema tests pass unchanged after the additions (zero regressions).
- **SC-005**: Tools that produce MultiPoint or MultiPolygon results can store their output as validated, styled GeoJSON Features in STAC catalogs.
