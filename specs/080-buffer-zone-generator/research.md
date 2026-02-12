# Research: Buffer Zone Generator

**Feature**: 080-buffer-zone-generator
**Date**: 2026-02-12

## Decision 1: Buffer Polygon Generation Algorithm

**Decision**: Use Vincenty destination formula to offset each track vertex at 36 bearings (every 10 degrees), creating a "tube" polygon around the LineString. For each buffer distance, iterate track positions and generate offset points at each bearing, then compute the convex hull or ordered perimeter to form a valid polygon.

**Rationale**: This approach is already proven in move-shape.py (`translate_point`). The same `EARTH_RADIUS_KM` constant and spherical math are used. No external geo libraries needed — stdlib `math` module only. The 10-degree angular interval provides good polygon fidelity while keeping vertex count manageable (~36 vertices per track position).

**Alternatives considered**:
- **External geo library (Shapely/PyGEOS)**: Better buffer algorithms but violates the "minimal dependencies" constitution principle (Article IX). Project explicitly uses stdlib math only.
- **Simple rectangular bounding**: Fast but inaccurate — doesn't follow the track shape.
- **Per-segment offset + union**: More accurate for complex tracks but significantly more complex to implement without a geometry library.

## Decision 2: Sensor Model Interface Design

**Decision**: Use a simple callable (Protocol class) that accepts a track dict and returns a list of `SensorModelZone` dataclass instances. The stub is a module-level function that ignores the track and returns hardcoded values.

**Rationale**: Python Protocol (structural subtyping) avoids forcing inheritance. The interface is minimal: one function, one input, one output. The tool function accepts an optional `sensor_model` parameter defaulting to the stub, enabling dependency injection without a DI framework. This matches the project's preference for simple, stdlib-only solutions.

**Alternatives considered**:
- **ABC (abstract base class)**: More explicit but heavier. Protocol is sufficient for a single-method interface.
- **Strategy pattern with registration**: Over-engineered for a stub that will eventually be replaced by a single real model.
- **Configuration-driven**: Too early — the real sensor model's interface is unknown. Keep it simple.

## Decision 3: Nautical Mile Handling

**Decision**: Accept distances in nautical miles (nm) as the user-facing unit. Convert internally to kilometres for the Vincenty formula using the standard conversion factor (1 nm = 1.852 km).

**Rationale**: Maritime domain uses nautical miles. The spec explicitly states distances as 3 nm, 6 nm, 12 nm. Internal conversion is a single multiplication; no unit library needed. The existing move-shape tool uses km internally, so we convert at the boundary.

**Alternatives considered**:
- **Accept km, document as nm equivalent**: Confusing for maritime users.
- **Dual unit support**: Over-engineered; nm is the domain standard.

## Decision 4: Zone Feature Properties

**Decision**: Each zone feature includes `kind: "ZONE"`, `name` (the percentage label, e.g., "75%"), `detection_likelihood_pct` (integer: 75, 50, 25), and `buffer_distance_nm` (float: 3.0, 6.0, 12.0).

**Rationale**: The `name` property serves as the human-readable label (per clarification: "named with the percentage"). The numeric `detection_likelihood_pct` enables programmatic comparisons by the downstream classifier (#081). The `buffer_distance_nm` records the generation parameter for provenance.

**Alternatives considered**:
- **Separate `label` field**: Redundant with `name`.
- **Float likelihood (0.75)**: Less intuitive than integer percentage for the demo context.

## Decision 5: Zone Polygon Construction Strategy

**Decision**: For each buffer distance, generate the polygon by:
1. For each track position, compute 36 offset points (every 10 degrees).
2. Collect all offset points into a point cloud.
3. Compute the convex hull to form the polygon exterior ring.
4. Close the ring (first point = last point) per GeoJSON spec.

**Rationale**: The convex hull approach produces clean, valid polygons that fully enclose the track. For straight or gently curving tracks, the convex hull is identical to the ideal buffer. For tracks with sharp turns, the convex hull may slightly over-estimate the area, but this is acceptable for a stub demonstration tool. The convex hull algorithm is O(n log n) and can be implemented in pure Python.

**Alternatives considered**:
- **Ordered perimeter traversal**: More accurate for non-convex tracks but significantly more complex (requires segment offset, intersection handling, and Minkowski sum logic).
- **Per-vertex circles union**: Equivalent to convex hull for the offset point cloud.
- **Simple bounding box**: Too crude for realistic-looking zones.

## Decision 6: File Location in Repository

**Decision**: Place tool implementation at `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py` with the sensor model at `services/calc/debrief_calc/tools/sensor/detection/sensor_model.py`. Tests at `services/calc/tests/tools/sensor/detection/`. Tool specification at `shared/tools/sensor/detection/buffer-zone-generator.1.0.md`.

**Rationale**: Follows the existing directory structure pattern (`tools/{domain}/{subdomain}/{tool_name}.py`) established by move-shape at `tools/shape/manipulation/move_shape.py`. The `sensor/detection` subdomain groups detection-related tools together, anticipating future real sensor models.

**Alternatives considered**:
- **Flat `tools/buffer_zone_generator.py`**: Inconsistent with existing nested structure.
- **`tools/analysis/buffer_zone_generator.py`**: Too generic; "sensor" is more descriptive of the domain.

## Decision 7: FeatureKindEnum Extension

**Decision**: Add `ZONE` to the FeatureKindEnum in `shared/schemas/src/linkml/common.yaml`. This is required for the zone features to pass schema validation.

**Rationale**: The existing enum includes TRACK, POINT, NARRATIVE, and annotation types but not ZONE. Since #062 (missing feature kind enum values) is a dependency, ZONE should be added there or as part of this feature's implementation.

**Alternatives considered**:
- **Reuse REGION**: Semantically different — REGION is a user-defined area, ZONE is a computed detection boundary.
- **Skip schema update**: Would break schema validation tests (Constitution Article II).
