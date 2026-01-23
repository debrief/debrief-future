# Feature Specification: GeoJSON Styling Properties Schemas

**Feature Branch**: `014-geojson-styling-schemas`
**Created**: 2026-01-20
**Status**: Draft
**Input**: User description: "Add styling properties schemas to GeoJSON features. Create LinkML style schemas that define styling properties for each geometry type, following Leaflet Path options as the base standard with Debrief-specific extensions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frontend Developer Renders Track with Consistent Styling (Priority: P1)

A frontend developer building the VS Code extension map view needs to render tracks with consistent visual styling. Currently, tracks have only a `color` property, requiring ad-hoc decisions about line weight, opacity, and point marker styles. With standardized styling schemas, the developer can read the `style` property from any feature and apply it directly to Leaflet or other renderers.

**Why this priority**: This is the core use case that enables all other styling scenarios. Without standardized styling schemas, frontends cannot render features consistently.

**Independent Test**: Can be fully tested by loading a GeoJSON track feature with a `style` property and verifying that all styling attributes (line color, weight, opacity, dash pattern, point markers) are correctly applied to the rendered visualization.

**Acceptance Scenarios**:

1. **Given** a TrackFeature GeoJSON with `style.line` and `style.point` properties, **When** the frontend renders it, **Then** the track line uses LineProperties (color, weight, opacity, dash pattern) and position markers use PointProperties (shape, size, fill).
2. **Given** a TrackFeature with invalid styling (missing required properties), **When** the frontend loads it, **Then** schema validation fails with a clear error message identifying the missing properties.
3. **Given** two TrackFeatures with different `style` properties, **When** rendered side-by-side, **Then** they display with distinct visual appearances as specified.

---

### User Story 2 - Schema Generator Produces Validated Pydantic Models (Priority: P2)

A developer working on the debrief-io service needs Pydantic models for styling properties to validate incoming data and serialize outgoing GeoJSON. The LinkML schemas must generate valid Pydantic models that enforce all constraints (required fields, value ranges, patterns) and integrate with existing feature models.

**Why this priority**: Code generators consuming the schemas depend on correct LinkML definitions. Invalid schemas would break the entire pipeline.

**Independent Test**: Can be fully tested by running the LinkML generator to produce Pydantic models, then validating sample styling objects against those models.

**Acceptance Scenarios**:

1. **Given** the styling LinkML schemas, **When** the Pydantic generator runs, **Then** valid Python models are produced with all required attributes, types, and constraints.
2. **Given** a valid LineProperties JSON object, **When** validated against the generated Pydantic model, **Then** validation succeeds.
3. **Given** a LineProperties object with `strokeWeight: -5` (invalid negative), **When** validated, **Then** validation fails with a minimum value constraint error.

---

### User Story 3 - Round-Trip Serialization Preserves Styling Data (Priority: P3)

A developer needs assurance that styling properties survive round-trip serialization between Python services (using Pydantic), JSON interchange, and TypeScript frontends (using JSON Schema validation). Any loss of precision or data would cause visual inconsistencies.

**Why this priority**: Data integrity across the stack is essential for the schema-first architecture to work correctly.

**Independent Test**: Can be fully tested by creating a styled feature in Python, serializing to JSON, validating in TypeScript, and deserializing back to Python, then comparing original and final objects.

**Acceptance Scenarios**:

1. **Given** a PolygonProperties object in Python, **When** serialized to JSON and deserialized back, **Then** all properties have identical values (including float precision for opacity).
2. **Given** a JSON file with LineProperties, **When** validated against both the JSON Schema (TypeScript) and Pydantic model (Python), **Then** both validations produce the same pass/fail result.

---

### User Story 4 - Analyst Sets Custom Styling for Exported Data (Priority: P4)

An analyst using Debrief needs to export track data with custom styling that reflects tactical significance (e.g., red dashed line for hostile contacts, blue solid line for friendly). The styling properties must be expressive enough to encode these visual semantics.

**Why this priority**: End-user value depends on the styling system being sufficiently expressive for tactical analysis use cases.

**Independent Test**: Can be fully tested by creating features with various styling combinations (colors, patterns, shapes) and verifying they render as expected in a frontend.

**Acceptance Scenarios**:

1. **Given** an analyst specifies `strokeDasharray: [10, 5]` for a track, **When** exported and rendered, **Then** the track displays as a dashed line with 10px dash and 5px gap pattern.
2. **Given** an analyst sets point markers to `shape: triangle` with `fillColor: #FF0000`, **When** track positions are rendered, **Then** each position marker displays as a red triangle.

---

### Edge Cases

- What happens when a feature has no `style` property? (Validation fails - style is required per FR-005)
- What happens when `strokeOpacity` is exactly 0 or 1? (Valid boundary values, accepted)
- What happens when `strokeDasharray` has an odd number of values? (Valid per SVG spec, accepted)
- How does system handle CSS color values in different formats? (`#RGB`, `#RRGGBB`, `rgb()`, named colors all valid via CSSColor type)
- What happens when `pointRadius` is 0? (Valid, results in invisible marker - implementation choice)
- What happens when `stroke` is false but stroke properties are provided? (Valid - stroke properties ignored when stroke disabled)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a `PointProperties` schema for Point and MultiPoint geometry styling with shape, size, color, and stroke properties
- **FR-002**: System MUST define a `LineProperties` schema for LineString and MultiLineString geometry styling with stroke color, weight, opacity, and dash pattern properties
- **FR-003**: System MUST define a `PolygonProperties` schema for Polygon and MultiPolygon geometry styling with fill color, fill opacity, and stroke properties
- **FR-004**: TrackFeature MUST support both `LineProperties` (for the track line) and `PointProperties` (for position markers) in a composite style structure
- **FR-005**: All feature schemas (TrackFeature, ReferenceLocation, annotations) MUST have a required `style` property that references the appropriate style schema(s)
- **FR-006**: Property names MUST follow Leaflet Path options naming conventions where applicable (e.g., `stroke`, `color`, `weight`, `opacity`, `fillColor`, `fillOpacity`, `dashArray`)
- **FR-007**: Color properties MUST accept CSS color strings (hex, named, rgb, rgba, hsl, hsla) using the existing CSSColor type
- **FR-008**: Numeric properties MUST have appropriate constraints (e.g., opacity 0-1, weight > 0, radius >= 0)
- **FR-009**: `PointProperties.shape` MUST support at minimum: `circle`, `square`, `triangle` as an extensible enum
- **FR-010**: System MUST remove existing ad-hoc `color` properties from feature schemas when migrating to the new style structure
- **FR-011**: LinkML schemas MUST generate valid Pydantic models and JSON Schema without errors
- **FR-012**: Golden fixtures MUST exist for valid and invalid style objects for each styling schema
- **FR-013**: Round-trip tests MUST validate Python to JSON to TypeScript to JSON to Python preservation

### Key Entities

- **PointProperties**: Styling schema for point geometries. Contains shape type (enum), radius, fill color, fill opacity, stroke enable flag, stroke color, stroke weight, stroke opacity.
- **LineProperties**: Styling schema for line geometries. Contains stroke enable flag, stroke color, stroke weight, stroke opacity, dash array pattern, line cap style, line join style.
- **PolygonProperties**: Styling schema for polygon geometries. Contains fill enable flag, fill color, fill opacity, plus stroke properties inherited from LineProperties concept.
- **TrackStyle**: Composite styling for tracks containing both `line` (LineProperties) for the track path and `point` (PointProperties) for position markers.
- **PointShapeEnum**: Enum defining valid point marker shapes: `circle`, `square`, `triangle`.
- **LineCapEnum**: Enum defining valid line cap styles: `butt`, `round`, `square`.
- **LineJoinEnum**: Enum defining valid line join styles: `miter`, `round`, `bevel`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three styling schemas (PointProperties, LineProperties, PolygonProperties) plus TrackStyle pass LinkML validation and generate error-free Pydantic models and JSON Schema
- **SC-002**: 100% of feature schemas requiring styling (TrackFeature, ReferenceLocation, all 6 annotation types) are updated with required `style` property
- **SC-003**: Golden fixtures exist for at least 3 valid and 3 invalid examples per styling schema (minimum 18 total fixtures)
- **SC-004**: Round-trip tests pass with zero data loss for all styling schemas across Python and TypeScript
- **SC-005**: Frontend developers can render any styled feature using only the `style` property without consulting external documentation (self-describing schema)
- **SC-006**: Schema validation catches 100% of invalid styling values (out-of-range opacity, invalid colors, negative weights)

## Assumptions

- Leaflet Path options naming is the standard to follow for frontend compatibility (stroke, color, weight, opacity, fillColor, fillOpacity, dashArray)
- Basic shapes (circle, square, triangle) are sufficient for initial release; icons and military symbols are explicitly deferred
- Multi-geometry variants (MultiPoint, MultiLineString, MultiPolygon) use the same style schema as their base type
- Style is always required on features (no optional with defaults) to ensure explicit styling intent
- Line cap and join styles follow SVG/CSS standards: `butt`, `round`, `square` for cap; `miter`, `round`, `bevel` for join
- The existing CSSColor type pattern from common.yaml is sufficient for color validation
- Boolean flags (`stroke`, `fill`) control whether that styling aspect is applied, allowing properties to be present but inactive
