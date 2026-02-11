# Feature Specification: Enlarge Shape Tool Spec

**Feature Branch**: `057-enlarge-shape`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Add enlarge shape tool spec (requires #049)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scale up a polygon annotation (Priority: P1)

An analyst has a rectangle or circle annotation representing an exercise area that needs to be enlarged. They invoke the enlarge-shape tool with a scale factor (e.g., 2.0) and the shape doubles in size, scaling outward from its geometric centroid. All vertices move proportionally away from the center.

**Why this priority**: Polygon shapes (circles, rectangles) are the most common annotations that need resizing. Scaling from centroid is the natural default behavior.

**Independent Test**: Can be verified by providing a Polygon FeatureCollection, running the enlarge-shape algorithm with scale_factor=2.0, and checking that all coordinates have moved to twice their original distance from the centroid.

**Acceptance Scenarios**:

1. **Given** a FeatureCollection containing a RectangleAnnotation centered at [0, 50], **When** enlarge-shape is invoked with scale_factor=2.0 (default origin=centroid), **Then** all 4 corners move to twice their original distance from the centroid, and the rectangle is twice its original size.
2. **Given** a FeatureCollection containing a CircleAnnotation with radius 1000m, **When** enlarge-shape is invoked with scale_factor=3.0, **Then** the polygon vertices scale outward from the center and the `radius` property is updated to 3000m.

---

### User Story 2 - Scale from a custom origin point (Priority: P2)

An analyst wants to scale a shape relative to a specific point rather than the centroid. For example, scaling a rectangle from its bottom-left corner, keeping that corner fixed while the rest of the shape grows.

**Why this priority**: Custom origin provides flexibility for precise positioning, but the centroid default covers most use cases.

**Independent Test**: Provide a shape with an explicit origin parameter, verify the origin point remains fixed and all other points scale relative to it.

**Acceptance Scenarios**:

1. **Given** a RectangleAnnotation and origin=[0, 50] (a corner), **When** enlarge-shape is invoked with scale_factor=2.0, **Then** the corner at [0, 50] stays fixed and all other vertices move to twice their distance from that point.
2. **Given** a LineAnnotation with origin at one endpoint, **When** enlarge-shape is invoked with scale_factor=0.5, **Then** the line shrinks toward that endpoint.

---

### User Story 3 - Shrink a shape (Priority: P3)

An analyst uses a scale factor less than 1 to reduce a shape. For example, shrinking an oversized danger area annotation to its correct proportional size.

**Why this priority**: Shrinking is the inverse of enlarging and uses the same algorithm, just with factor < 1.

**Independent Test**: Provide a shape with scale_factor=0.5, verify all vertices move to half their original distance from the origin.

**Acceptance Scenarios**:

1. **Given** a CircleAnnotation with radius 2000m, **When** enlarge-shape is invoked with scale_factor=0.5, **Then** the radius becomes 1000m and all polygon vertices move to half their distance from center.

---

### Edge Cases

- What happens when scale_factor is 1.0? Shape should remain unchanged (no-op mutation).
- What happens when scale_factor is 0? All points collapse to the origin (degenerate shape).
- What happens with very large scale factors (e.g., 1000)? Coordinates may wrap or exceed valid lat/lon bounds.
- What happens near the poles? Geographic scaling must handle latitude distortion.
- What happens with an empty feature collection? Return an error response.
- What happens with non-annotation features (e.g., TRACK features)? Skip them or return an error.
- What happens with a CircleAnnotation? Both polygon vertices AND the `radius` property must be scaled; `center` stays at origin (or moves if scaling from non-center origin).
- What happens with a VectorAnnotation? The `range` property must be scaled; `origin` moves relative to the scale origin; `bearing` is preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool spec MUST follow the #049 tool documentation model with all 9 required sections (metadata, description, MCP, inputs, outputs, algorithm, edge cases, examples, changelog).
- **FR-002**: Algorithm MUST scale in geographic coordinates relative to a specified origin point.
- **FR-003**: Tool MUST accept `scale_factor` parameter as a positive multiplicative factor (default: 3.0). Factor > 1 enlarges, factor < 1 shrinks, factor = 1 is no-op.
- **FR-004**: Tool MUST accept `origin` parameter as [longitude, latitude] (default: geometric centroid of the shape).
- **FR-005**: Tool MUST scale all geometry coordinates (Point, LineString, Polygon vertices) relative to the origin point.
- **FR-006**: For CircleAnnotation features, tool MUST also update the `radius` property (radius * scale_factor) and the `center` property if it moves relative to the scale origin.
- **FR-007**: For VectorAnnotation features, tool MUST update the `range` property (range * scale_factor) and recompute geometry endpoint; `bearing` is preserved.
- **FR-008**: Tool MUST record provenance annotations including origin and scale_factor applied.
- **FR-009**: Tool MUST clamp latitude to [-90, 90] and normalize longitude to [-180, 180] after scaling.
- **FR-010**: Tool MUST produce golden I/O example files (`.input.json` / `.output.json`).
- **FR-011**: Tool MUST return a mutation-type ToolResponse with `mutation/shape/scaled` result type.
- **FR-012**: Tool MUST handle all annotation kinds: CIRCLE, RECTANGLE, LINE, TEXT, VECTOR.
- **FR-013**: Tool MUST reject scale_factor <= 0 with an error response.

### Key Entities

- **Shape Feature**: Any GeoJSON Feature with annotation kind (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR). Each has geometry coordinates and kind-specific properties.
- **Scale Parameters**: Scale factor (positive float) and origin point ([lon, lat]).
- **Geometric Centroid**: Computed as the arithmetic mean of all vertex coordinates (for the default origin).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool spec file exists at `shared/tools/shape/manipulation/enlarge-shape.1.0.md` with all 9 required sections.
- **SC-002**: At least 2 golden I/O example pairs exist (e.g., `enlarge-shape.basic-polygon.input.json` / `.output.json` and `enlarge-shape.shrink.input.json` / `.output.json`).
- **SC-003**: Algorithm pseudocode is language-neutral and covers all 5 annotation kinds.
- **SC-004**: Edge cases table covers at minimum: empty input, scale_factor=1, scale_factor=0, large factors, non-shape features.
- **SC-005**: Provenance annotations include origin and scale_factor in the label.

## Deliverables

| Deliverable | Path |
|-------------|------|
| Tool spec | `shared/tools/shape/manipulation/enlarge-shape.1.0.md` |
| Golden example (basic polygon) | `shared/tools/shape/manipulation/enlarge-shape.basic-polygon.input.json` |
| Golden example (basic polygon output) | `shared/tools/shape/manipulation/enlarge-shape.basic-polygon.output.json` |
| Golden example (shrink) | `shared/tools/shape/manipulation/enlarge-shape.shrink.input.json` |
| Golden example (shrink output) | `shared/tools/shape/manipulation/enlarge-shape.shrink.output.json` |

## Technical Notes

### Scaling Formula

For each vertex (lon, lat) relative to origin (olon, olat):

```
new_lon = olon + (lon - olon) * scale_factor
new_lat = olat + (lat - olat) * scale_factor
```

Then clamp: `new_lat = clamp(new_lat, -90, 90)` and normalize: `new_lon = normalize(new_lon, -180, 180)`.

Note: This is a simple geographic coordinate scaling. For shapes spanning large areas, the distortion from Mercator-like scaling is acceptable for annotation purposes.

### Centroid Computation

For Polygon: average of exterior ring coordinates (excluding closing point).
For LineString: average of all coordinates.
For Point: the point itself (scaling a point from its own centroid is a no-op).

### Annotation Kind to Property Updates

| Kind | Geometry Type | Extra Properties to Update |
|------|---------------|---------------------------|
| CIRCLE | Polygon | `center` (recompute from origin), `radius` (multiply by scale_factor) |
| RECTANGLE | Polygon | None |
| LINE | LineString | None |
| TEXT | Point | None |
| VECTOR | LineString | `origin` (recompute from scale origin), `range` (multiply by scale_factor), `bearing` preserved |

### Dependencies

- Requires #049 (tool documentation model) - **complete**
