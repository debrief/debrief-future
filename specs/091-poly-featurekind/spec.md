# Feature Specification: [E05] Add POLY FeatureKind for Arbitrary Polygons

**Feature Branch**: `091-poly-featurekind`
**Created**: 2026-02-13
**Status**: Draft
**Epic**: E05 — Shape Drawing Tools
**Input**: User description: "Add POLY kind to FeatureKindEnum. Add PolyAnnotationProperties class. Regenerate types. Add fixtures. Run schema tests. Confirm LINE kind works for polylines."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import REP files containing POLY annotations (Priority: P1)

A maritime analyst imports a REP file that contains `;POLY:` annotation lines defining arbitrary freeform polygons (e.g., patrol zones, exclusion areas). The system parses these into valid GeoJSON features with `kind: "POLY"` that pass schema validation and render correctly on the map.

**Why this priority**: The IO service already produces features with `kind: "POLY"` from REP file parsing, but the schema enum does not include POLY. This means produced features fail schema validation. Fixing this mismatch is the primary value of this item.

**Independent Test**: Import a REP file containing a `;POLY:` annotation line with 4+ vertices. Verify the resulting GeoJSON feature has `kind: "POLY"`, valid Polygon geometry, and passes Pydantic model validation.

**Acceptance Scenarios**:

1. **Given** a REP file with a `;POLY:` line containing 4 coordinate pairs, **When** the file is parsed, **Then** the resulting feature has `kind: "POLY"`, a closed Polygon geometry ring, and passes schema validation.
2. **Given** a REP file with a `;POLY:` line containing 10+ coordinate pairs, **When** the file is parsed, **Then** the resulting feature preserves all vertices and auto-closes the ring if needed.
3. **Given** an existing STAC catalog with POLY features, **When** the catalog is loaded, **Then** POLY features are recognized and displayed on the map as filled polygons.

---

### User Story 2 - Schema adherence for POLY type (Priority: P1)

A developer generates Pydantic, JSON Schema, and TypeScript types from the LinkML schema. The generated types include POLY as a valid FeatureKind value and PolyAnnotationProperties as a validated properties class. All existing schema tests continue to pass.

**Why this priority**: Without schema-level support, there is no type safety or validation for POLY features. This is the core schema change that enables all downstream usage.

**Independent Test**: Run the schema generation pipeline and golden fixture tests. Verify POLY-specific valid fixtures pass and invalid fixtures fail with appropriate errors.

**Acceptance Scenarios**:

1. **Given** the updated LinkML schema with POLY in FeatureKindEnum, **When** Pydantic models are generated, **Then** `FeatureKindEnum.POLY` is a valid enum member.
2. **Given** a valid POLY fixture JSON file, **When** validated against the generated Pydantic model, **Then** validation passes without errors.
3. **Given** an invalid POLY fixture with wrong kind value, **When** validated, **Then** a ValidationError is raised.
4. **Given** the updated schema, **When** all existing golden fixture tests run, **Then** 100% of existing tests still pass (no regressions).

---

### User Story 3 - Confirm LINE kind supports polylines (Priority: P2)

A developer confirms that the existing `LINE` FeatureKind correctly supports multi-vertex LineString geometries (polylines with 3+ points), not just two-point lines. This validates that no new kind is needed for the polyline drawing tool.

**Why this priority**: The E05 drawing tools need polyline support. If LINE already handles multi-vertex LineStrings, no additional schema change is required for polylines.

**Independent Test**: Create a LINE annotation fixture with 5+ coordinate points forming a multi-vertex LineString. Validate it passes schema validation. Verify the existing LineAnnotation schema does not constrain vertex count.

**Acceptance Scenarios**:

1. **Given** a LINE annotation with a LineString geometry containing 5 coordinate pairs, **When** validated against the LineAnnotation schema, **Then** validation passes.
2. **Given** the LineAnnotation schema definition, **When** inspected, **Then** no minimum or maximum vertex count constraint exists beyond the GeoJSON LineString minimum of 2 points.

---

### Edge Cases

- What happens when a POLY feature has exactly 3 vertices (minimum valid polygon)? The ring auto-closes to 4 coordinate pairs and validation passes.
- What happens when a POLY feature's ring is not closed (first point != last point)? The IO parser auto-closes; the schema accepts both open and closed rings.
- What happens when a POLY feature has duplicate consecutive vertices? Accepted at schema level — no topological validation.
- What happens when existing features with `kind: "POLY"` are loaded that were created before the schema update? They become valid once the enum is updated — backward compatible.
- What happens with a POLY feature with only 2 vertices? Invalid Polygon geometry — not enough points to form a closed ring.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The FeatureKindEnum MUST include `POLY` as a valid value with description "Arbitrary polygon annotation (Polygon geometry)".
- **FR-002**: A `PolyAnnotationProperties` class MUST be defined in the annotation schema with:
  - `kind` field constrained to `"POLY"` via equals_string
  - `vertex_count` integer field (number of unique vertices, excluding ring closure)
  - `label` optional string field
  - `symbol` optional string field (REP color code)
  - `style` required field using PolygonProperties
  - `source_file` optional string field (provenance)
  - `line_number` optional integer field (provenance)
- **FR-003**: A `PolyAnnotation` class MUST be defined as a GeoJSON Feature with:
  - `type` constrained to `"Feature"`
  - `id` required string identifier
  - `geometry` required GeoJSON Polygon
  - `properties` required PolyAnnotationProperties
- **FR-004**: Valid golden fixture files MUST be created for POLY annotations covering:
  - A simple polygon (3-4 vertices)
  - A complex polygon (8+ vertices)
- **FR-005**: Invalid golden fixture files MUST be created for POLY annotations covering:
  - Wrong kind value (e.g., `"RECTANGLE"` instead of `"POLY"`)
  - Missing required `style` property
- **FR-006**: The golden fixture test runner MUST be updated to recognize POLY annotation fixtures and map them to the PolyAnnotation model.
- **FR-007**: All Pydantic, JSON Schema, and TypeScript types MUST be regenerated from the updated LinkML schema.
- **FR-008**: A multi-vertex LINE annotation fixture (5+ points) MUST be created or verified to confirm LINE supports polyline geometries.
- **FR-009**: All existing schema adherence tests MUST continue to pass without modification.

### Key Entities

- **PolyAnnotationProperties**: Properties for an arbitrary user-defined polygon, discriminated by `kind: "POLY"`. Contains vertex count, optional label and symbol, required polygon styling, and source provenance.
- **PolyAnnotation**: GeoJSON Feature wrapping a Polygon geometry with PolyAnnotationProperties. Structurally similar to RectangleAnnotation but distinguished by kind and the addition of vertex_count.
- **FeatureKindEnum.POLY**: New enum value representing freeform polygons, distinct from CIRCLE (has center/radius) and RECTANGLE (axis-aligned).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POLY` is a valid value in all generated type systems (Pydantic enum, JSON Schema enum, TypeScript union) and can be used to create validated features.
- **SC-002**: 100% of existing golden fixture tests pass without modification after the schema change (zero regressions).
- **SC-003**: At least 2 valid and 2 invalid POLY fixture files exist and are tested by the fixture validation suite.
- **SC-004**: A multi-vertex LINE fixture (5+ points) passes validation, confirming LINE supports polyline use cases without a new kind.
- **SC-005**: Features produced by the existing `build_polygon()` IO handler pass schema validation against the new PolyAnnotation model.
- **SC-006**: Generated TypeScript types include POLY, enabling downstream VS Code extension rendering without type errors.

## Assumptions

- The existing `build_polygon()` function in the IO service already produces output matching the proposed PolyAnnotationProperties structure (kind, vertex_count, label, symbol, style, source_file, line_number). The schema is being aligned to match existing implementation output.
- POLYLINE support is out of scope for this item. The `build_polyline()` function currently outputs `kind: "POLYLINE"`, but the backlog idea document states that LINE should be confirmed to work for polylines. Reconciling the builder's output kind with the schema is a separate concern.
- Self-intersecting polygon edges are accepted at the schema level (no topological validation). Geometry validity checking, if needed, is a rendering or analysis concern.
- The `vertex_count` property is informational metadata, not used for geometry validation. The actual polygon shape is defined solely by the geometry coordinates.

## Dependencies

- None — this is a schema-only change that does not depend on other unmerged features.
- Downstream consumers: E05 items #092 (Geoman integration), #093 (drawing toolbar), #094 (point/rectangle drawing), #095 (polygon/polyline drawing) all depend on POLY being a valid FeatureKind.

## Out of Scope

- Adding POLYLINE as a new FeatureKind value (to be assessed separately; LINE may suffice).
- Map rendering changes for POLY features (handled by existing polygon rendering logic).
- Drawing tool UI (covered by E05 items #093-#096).
- Topological validation of polygon geometry (self-intersection, winding order).
