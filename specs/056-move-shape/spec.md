# Feature Specification: Move Shape Tool Spec

**Feature Branch**: `056-move-shape`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Add move shape tool spec (requires #049)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Translate polygon annotation (Priority: P1)

An analyst has placed a rectangle or circle annotation on the map to mark an exercise area, but the location is slightly off. They invoke the move-shape tool, specifying a compass bearing (e.g., 045 degrees NE) and distance (e.g., 10 km), and the shape is translated accordingly using great-circle math. All vertices shift uniformly, preserving the shape's size and orientation.

**Why this priority**: Polygon shapes (circles, rectangles) are the most common annotations that need repositioning. This covers the primary use case.

**Independent Test**: Can be verified by providing a Polygon FeatureCollection as input, running the move-shape algorithm, and checking that all coordinates have shifted by the expected great-circle displacement.

**Acceptance Scenarios**:

1. **Given** a FeatureCollection containing a CircleAnnotation at [0, 50], **When** move-shape is invoked with direction=90 (East) and distance_km=5, **Then** the circle center and all polygon vertices shift ~5 km East, and the `center` property is updated to match.
2. **Given** a FeatureCollection containing a RectangleAnnotation, **When** move-shape is invoked with direction=0 (North) and distance_km=10, **Then** all 4 corners (plus closing point) shift ~10 km North uniformly.

---

### User Story 2 - Translate line and vector annotations (Priority: P2)

An analyst repositions a line annotation or vector annotation. For vectors, both the geometry coordinates and the `origin` property must be updated. The range and bearing of a vector are preserved (only the origin moves).

**Why this priority**: Line and vector annotations are common but less frequent than polygon shapes.

**Independent Test**: Provide a LineAnnotation or VectorAnnotation, invoke move-shape, verify all coordinates shift and vector `origin` property updates while `range` and `bearing` remain unchanged.

**Acceptance Scenarios**:

1. **Given** a LineAnnotation with two endpoints, **When** move-shape is invoked with direction=180 (South) and distance_km=2, **Then** both endpoints shift ~2 km South.
2. **Given** a VectorAnnotation with origin at [0, 50], **When** move-shape is invoked with direction=90 and distance_km=5, **Then** the `origin` property and both geometry coordinates shift, but `range` and `bearing` properties remain unchanged.

---

### User Story 3 - Translate text and point annotations (Priority: P3)

An analyst repositions a text annotation (single point). The point geometry shifts by the specified direction and distance.

**Why this priority**: Text annotations are the simplest case (single coordinate), but they still require correct great-circle math.

**Independent Test**: Provide a TextAnnotation, invoke move-shape, verify the point coordinate shifts correctly.

**Acceptance Scenarios**:

1. **Given** a TextAnnotation at [0, 50], **When** move-shape is invoked with direction=90 and distance_km=5, **Then** the point shifts ~5 km East along the great-circle path.

---

### Edge Cases

- What happens when distance_km is 0? Shape should remain unchanged (no-op mutation).
- What happens when a shape crosses the antimeridian (longitude wrapping from 180 to -180)? Coordinates must wrap correctly.
- What happens near the poles (latitude approaching 90/-90)? Great-circle math must handle polar convergence.
- What happens with an empty feature collection? Return an error response.
- What happens with non-annotation features (e.g., TRACK features)? Skip them silently or return an error.
- What happens with a CircleAnnotation? Both the polygon vertices AND the `center` property must be updated.
- What happens with a VectorAnnotation? The `origin` property must be updated, but `range` and `bearing` must be preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool spec MUST follow the #049 tool documentation model with all 9 required sections (metadata, description, MCP, inputs, outputs, algorithm, edge cases, examples, changelog).
- **FR-002**: Algorithm MUST use great-circle (spherical Earth) translation, not planar projection.
- **FR-003**: Tool MUST accept `direction` parameter as compass bearing in degrees (0-360, default: 90).
- **FR-004**: Tool MUST accept `distance_km` parameter as translation distance in kilometres (default: 5).
- **FR-005**: Tool MUST translate all geometry coordinates (Point, LineString, Polygon vertices) uniformly by the specified direction and distance.
- **FR-006**: For CircleAnnotation features, tool MUST also update the `center` property to match the translated geometry.
- **FR-007**: For VectorAnnotation features, tool MUST update the `origin` property and geometry, preserving `range` and `bearing`.
- **FR-008**: Tool MUST record provenance annotations including direction and distance applied.
- **FR-009**: Tool MUST handle longitude wrapping at the antimeridian (180/-180).
- **FR-010**: Tool MUST produce golden I/O example files (`.input.json` / `.output.json`).
- **FR-011**: Tool MUST return a mutation-type ToolResponse with `mutation/shape/translated` result type.
- **FR-012**: Tool MUST handle all annotation kinds: CIRCLE, RECTANGLE, LINE, TEXT, VECTOR.

### Key Entities

- **Shape Feature**: Any GeoJSON Feature with annotation kind (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR). Each has geometry coordinates and kind-specific properties.
- **Translation Parameters**: Direction (bearing in degrees) and distance (km) defining the displacement vector.
- **Great-Circle Destination**: The Vincenty/Haversine destination point formula: given a start point, bearing, and distance, compute the end point on a sphere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool spec file exists at `shared/tools/shape/manipulation/move-shape.1.0.md` with all 9 required sections.
- **SC-002**: At least 2 golden I/O example pairs exist (e.g., `move-shape.basic-polygon.input.json` / `.output.json` and `move-shape.vector.input.json` / `.output.json`).
- **SC-003**: Algorithm pseudocode is language-neutral and covers all 5 annotation kinds.
- **SC-004**: Edge cases table covers at minimum: empty input, zero distance, antimeridian crossing, polar regions, non-shape features.
- **SC-005**: Provenance annotations include direction and distance in the label.

## Deliverables

| Deliverable | Path |
|-------------|------|
| Tool spec | `shared/tools/shape/manipulation/move-shape.1.0.md` |
| Golden example (basic polygon) | `shared/tools/shape/manipulation/move-shape.basic-polygon.input.json` |
| Golden example (basic polygon output) | `shared/tools/shape/manipulation/move-shape.basic-polygon.output.json` |
| Golden example (vector) | `shared/tools/shape/manipulation/move-shape.vector.input.json` |
| Golden example (vector output) | `shared/tools/shape/manipulation/move-shape.vector.output.json` |

## Technical Notes

### Great-Circle Destination Formula

Given start point (lat1, lon1), bearing, and distance d on a sphere of radius R:

```
lat2 = asin(sin(lat1) * cos(d/R) + cos(lat1) * sin(d/R) * cos(bearing))
lon2 = lon1 + atan2(sin(bearing) * sin(d/R) * cos(lat1), cos(d/R) - sin(lat1) * sin(lat2))
```

Where R = 6371.0 km (mean Earth radius). This is the standard Vincenty destination formula.

### Annotation Kind to Geometry Mapping

| Kind | Geometry Type | Extra Properties to Update |
|------|---------------|---------------------------|
| CIRCLE | Polygon | `center` (lon, lat array) |
| RECTANGLE | Polygon | None |
| LINE | LineString | None |
| TEXT | Point | None |
| VECTOR | LineString | `origin` (lon, lat array) |

### Dependencies

- Requires #049 (tool documentation model) - **complete**
