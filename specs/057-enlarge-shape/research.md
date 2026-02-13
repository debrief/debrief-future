# Research: Enlarge Shape Tool Spec

**Feature**: 057-enlarge-shape | **Date**: 2026-02-13

## Research Questions

### R1: Scaling Algorithm — Geographic Coordinates vs Projected

**Decision**: Use simple linear interpolation of lat/lon differences (same approach as move-shape)

**Rationale**: The move-shape sibling tool (`move-shape.1.0.md`) uses Vincenty destination formula for translation, which accounts for great-circle geometry. However, scaling is fundamentally different — it multiplies the *difference* between each vertex and the origin. For the typical Debrief use case (maritime exercise areas spanning tens of kilometres), the distortion from treating lat/lon as a flat coordinate system is negligible (<0.1% at mid-latitudes). Using simple linear interpolation keeps the algorithm straightforward and deterministic.

**Alternatives considered**:
- **Haversine/Vincenty scaling**: Compute bearing and distance from origin to each vertex, then multiply the distance by the scale factor and recompute the destination point. More accurate at large scales and near poles, but significantly more complex. The move-shape tool uses Vincenty for translation because direction and distance are the natural parameters; for scaling, the linear approach is more natural.
- **Projected coordinate scaling**: Project to a local coordinate system (e.g., UTM), scale, then back-project. Accurate but requires projection libraries (violates Constitution Art. IX — minimal dependencies) and is overkill for annotation shapes.

### R2: Centroid Computation Method

**Decision**: Arithmetic mean of vertices (excluding closing vertex for closed polygons)

**Rationale**: The geometric centroid of a polygon is technically the centroid of the enclosed area (computed via the shoelace formula), not the arithmetic mean of vertices. However, for the annotation shapes in Debrief (typically 4-8 vertices, roughly convex), the arithmetic mean is:
1. Simpler to implement and verify
2. Nearly identical to the area centroid for convex shapes
3. Consistent across all geometry types (Polygon, LineString, Point)
4. Deterministic and easy to validate in golden examples

**Alternatives considered**:
- **Area centroid (shoelace formula)**: More geometrically correct for concave polygons, but adds complexity for minimal benefit given Debrief's annotation shapes.
- **Bounding box center**: Simple but skewed for irregular shapes — vertices near one edge would pull the center off.

### R3: Handling VECTOR Annotations During Scaling

**Decision**: Scale the geometry coordinates and origin point, but preserve `range` and `bearing` properties

**Rationale**: A VECTOR annotation represents a directional indicator (e.g., course or wind direction). Its `origin` is the anchor point, `bearing` is the direction, and `range` is the length. When scaling, the entire shape grows/shrinks relative to the scaling origin, so the geometry coordinates and the `origin` property must be updated. However, `range` and `bearing` define the vector's semantic meaning and should be preserved — the vector still points the same direction and represents the same magnitude. This is consistent with how move-shape handles vectors (translates origin, preserves range/bearing).

**Alternatives considered**:
- **Scale range as well**: Would change the vector's semantic meaning, which is undesirable for a geometric transformation.
- **Recompute from scaled geometry**: Circular — the geometry is derived from origin + range + bearing, so scaling the geometry and then recomputing would be inconsistent.

### R4: Result Type Path for Scaling

**Decision**: Use `mutation/shape/scaled` as the result type

**Rationale**: Follows the naming conventions from TEMPLATE.md. The operation modifies existing features (mutation), operates on shapes (shape domain), and the specific action is scaling (scaled). This is analogous to move-shape's `mutation/shape/translated`.

**Alternatives considered**:
- `mutation/shape/enlarged`: Too specific — the tool also handles shrinking (factor < 1) and no-op (factor = 1).
- `mutation/shape/resized`: Acceptable, but "scaled" is the more precise geometric term.

### R5: Scale Factor of Zero Behavior

**Decision**: Allow scale factor of 0 — collapses shape to origin point, returns degenerate geometry

**Rationale**: A scale factor of 0 is mathematically well-defined: every vertex becomes the origin point. While the resulting geometry is degenerate (zero area/length), it's a valid GeoJSON geometry. Returning it with provenance allows the user to undo the operation. This is preferable to treating 0 as an error because:
1. The algorithm handles it naturally (no special case needed)
2. The user may intentionally want to collapse a shape to a point
3. Provenance records what happened, so it's recoverable

**Alternatives considered**:
- **Return error**: Overly restrictive — 0 is a valid multiplier.
- **Return empty collection**: Inconsistent — there IS a result, just a degenerate one.

### R6: Latitude Clamping Strategy

**Decision**: Clamp scaled latitude values to [-90, 90] range

**Rationale**: If a shape near the poles is scaled with a large factor, vertices could exceed valid latitude bounds. Since latitude outside [-90, 90] is meaningless in geographic coordinates, clamping is the correct approach. Longitude wrapping (to [-180, 180]) follows the same pattern as move-shape.

**Alternatives considered**:
- **Return error for out-of-bounds**: Too restrictive — partial scaling is better than no result.
- **Wrap latitude**: Latitude doesn't wrap — 91° latitude is not equivalent to 89° S.
