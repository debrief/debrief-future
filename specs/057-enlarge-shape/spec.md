# Feature Specification: Enlarge Shape Tool Spec

**Feature Branch**: `057-enlarge-shape`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Add enlarge shape tool spec — create a language-neutral tool specification (following #049 tool documentation model) for a shape scaling tool"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scale Shape Up from Centroid (Priority: P1)

An analyst has a polygon annotation (e.g., an exercise area) on the map and needs to enlarge it to cover a wider region. They invoke the enlarge shape tool with a scale factor of 3.0, using the default geometric centroid as the origin. All vertices scale outward from the center, tripling the shape's extent.

**Why this priority**: This is the core use case — scaling a shape relative to its geometric center with the default parameters. It validates the fundamental scaling algorithm and covers the most common analyst workflow.

**Independent Test**: Can be fully tested by providing a polygon FeatureCollection with `scale_factor=3.0` and verifying all output coordinates are 3x farther from the centroid than the originals.

**Acceptance Scenarios**:

1. **Given** a FeatureCollection containing a single polygon annotation with known vertices, **When** the enlarge shape tool is invoked with `scale_factor=3.0` and no explicit origin, **Then** each vertex is repositioned 3x farther from the computed geometric centroid, and the output includes provenance recording the origin and scale factor.
2. **Given** a circle annotation with a `center` property, **When** scaled by factor 2.0 from centroid, **Then** the polygon vertices scale outward and the `center` property remains at the centroid (unchanged since origin equals centroid).
3. **Given** a rectangle annotation, **When** scaled by factor 1.5 from centroid, **Then** all ring vertices are repositioned 1.5x farther from the centroid and the shape retains its rectangular proportions.

---

### User Story 2 - Scale Shape from Custom Origin (Priority: P2)

An analyst wants to scale a shape relative to a specific point (e.g., a sensor location or a corner of the shape) rather than the geometric centroid. They provide an explicit `origin` parameter and a scale factor. All vertices move relative to that custom origin point.

**Why this priority**: Custom origin scaling enables more sophisticated analyst workflows, such as anchoring one edge of a shape while expanding the other side. This extends the core algorithm with a user-specified reference point.

**Independent Test**: Can be fully tested by providing a polygon with an explicit origin point and verifying vertices are repositioned relative to that origin rather than the centroid.

**Acceptance Scenarios**:

1. **Given** a polygon annotation and an explicit origin at one of its vertices, **When** scaled by factor 2.0, **Then** the vertex at the origin remains fixed while all other vertices move 2x farther away from it.
2. **Given** a line annotation and an explicit origin outside the shape, **When** scaled by factor 0.5, **Then** all line coordinates move halfway toward the origin point, shrinking the shape.

---

### User Story 3 - No-Op Scale Factor (Priority: P3)

An analyst accidentally invokes the enlarge tool with a scale factor of 1.0. The system returns the shape unchanged, ensuring no data corruption from identity transformations.

**Why this priority**: Edge case safety — confirms the tool handles identity transformations correctly and produces valid provenance even when no geometric change occurs.

**Independent Test**: Can be fully tested by invoking with `scale_factor=1.0` and verifying output coordinates exactly match input coordinates.

**Acceptance Scenarios**:

1. **Given** any annotation feature, **When** the enlarge shape tool is invoked with `scale_factor=1.0`, **Then** all coordinates remain unchanged and provenance still records the transformation with factor 1.0.

---

### User Story 4 - Shrink Shape (Priority: P3)

An analyst needs to reduce a shape's size. They invoke the tool with a scale factor less than 1.0 (e.g., 0.5), which moves all vertices closer to the origin, effectively shrinking the shape.

**Why this priority**: Shrinking is the inverse of enlarging and uses the same algorithm, but should be explicitly validated to confirm factors < 1.0 work correctly.

**Independent Test**: Can be fully tested by providing a polygon with `scale_factor=0.5` and verifying all vertices are halfway between their original positions and the origin.

**Acceptance Scenarios**:

1. **Given** a polygon annotation, **When** the tool is invoked with `scale_factor=0.5` and default origin, **Then** each vertex is repositioned to the midpoint between its original position and the centroid.

---

### Edge Cases

- What happens when the scale factor is 0? All vertices collapse to the origin point — the shape degenerates to a single point. The tool should return the degenerate geometry with provenance.
- What happens when the scale factor is negative? Negative factors are invalid. The tool returns an error response.
- What happens when a very large scale factor (e.g., 1000) is applied to shapes near the poles? Coordinates may exceed valid latitude bounds ([-90, 90]). The tool must clamp latitude to valid range.
- What happens with an empty FeatureCollection? The tool returns an error indicating no features to process.
- What happens when the FeatureCollection contains non-annotation features? Non-annotation features are silently skipped; only annotation kinds (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR) are processed.
- What happens with a polygon that has multiple rings (holes)? All rings (exterior and interior) are scaled relative to the same origin.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool MUST accept a FeatureCollection containing annotation features and scale parameters (`origin`, `scale_factor`)
- **FR-002**: Tool MUST compute the geometric centroid of each shape as the default origin when no explicit origin is provided
- **FR-003**: Tool MUST scale all vertex coordinates relative to the origin by the given scale factor using geographic coordinate math (lat/lon differences multiplied by factor)
- **FR-004**: Tool MUST support all five annotation kinds: CIRCLE, RECTANGLE, LINE, TEXT, VECTOR
- **FR-005**: Tool MUST update the `center` property of CIRCLE annotations when scaling (recalculate from scaled vertices or scale the center point itself)
- **FR-006**: Tool MUST update the `origin` property of VECTOR annotations when scaling
- **FR-007**: Tool MUST preserve the `range` and `bearing` properties of VECTOR annotations (only the origin point changes, not the vector geometry definition)
- **FR-008**: Tool MUST return a ToolResponse with `mutation/shape/scaled` result type and provenance annotations including source feature IDs, origin used, and scale factor
- **FR-009**: Tool MUST return shapes unchanged when `scale_factor` is 1.0 (identity/no-op)
- **FR-010**: Tool MUST return an error for negative scale factors
- **FR-011**: Tool MUST return an error for empty input or input with no annotation features
- **FR-012**: Tool MUST silently skip non-annotation features in the input collection
- **FR-013**: Tool MUST clamp output latitude to [-90, 90] range to handle extreme scaling near poles
- **FR-014**: Tool MUST normalise output longitude to [-180, 180] range
- **FR-015**: Tool MUST follow the #049 tool documentation model with all 9 required sections
- **FR-016**: Tool MUST include golden I/O example files (`.input.json` and `.output.json`) for validation
- **FR-017**: Tool MUST record provenance including the origin point and scale factor used in the transformation
- **FR-018**: Tool MUST use a default scale factor of 3.0 when none is provided
- **FR-020**: Tool MUST declare `scale_factor` with preset choices (e.g., 0.25, 0.5, 1.5, 2.0, 3.0, 5.0) so frontends can present a selection menu before execution, while still accepting any non-negative numeric value via custom input
- **FR-019**: Tool MUST work entirely offline with no network dependencies

### Key Entities

- **Annotation Feature**: A GeoJSON Feature with a `kind` property indicating its annotation type (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR). Contains geometry coordinates and type-specific properties (center, origin, radius, bearing, range).
- **Scale Parameters**: The tool's input configuration consisting of an `origin` point (lat/lon, defaults to geometric centroid) and a `scale_factor` (multiplicative number, defaults to 3.0).
- **ToolResponse**: The standardised response envelope containing content items with result type annotations and provenance metadata.
- **Geometric Centroid**: The arithmetic mean of all vertex coordinates in a shape, used as the default scaling origin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool specification contains all 9 required sections per the #049 tool documentation model (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References)
- **SC-002**: At least 3 golden I/O example pairs are provided covering: basic polygon scaling, custom origin scaling, and scale factor of 1.0 (no-op)
- **SC-003**: All golden I/O examples produce identical outputs when processed by both Python and TypeScript implementations (cross-language validation)
- **SC-004**: Edge cases documented cover at minimum: scale factor of 0, negative scale factor, scale factor of 1, very large scale factors, empty input, non-annotation features, and shapes near geographic poles
- **SC-005**: Provenance annotations on every output feature record the origin point and scale factor used
- **SC-006**: The spec passes the existing tool-spec validation checklist without modifications

### Assumptions

- Scaling operates in geographic coordinates (lat/lon) using simple linear interpolation of coordinate differences, consistent with the approach used by the move-shape tool for local-scale operations. This is acceptable for typical maritime exercise areas where shapes span small geographic extents.
- The geometric centroid is computed as the arithmetic mean of polygon exterior ring vertices (excluding the closing vertex that duplicates the first). For LineString geometries, it is the mean of all coordinate points. For Point geometries (TEXT annotations), the centroid is the point itself.
- VECTOR annotations have their geometry scaled like any other LineString, but `range` and `bearing` properties are preserved since they define the vector's directional meaning independently of absolute position.
- The tool specification is the deliverable — Python and TypeScript implementations are out of scope for this feature and will be handled by a separate implementation task.

### Dependencies

- **#049 - Tool Documentation Model**: The template, 9-section structure, and golden I/O conventions that this spec must follow. This dependency is already complete.
- **#056 - Move Shape**: Sibling tool in `shape/manipulation` category. The enlarge-shape spec follows the same patterns and conventions established by move-shape.
