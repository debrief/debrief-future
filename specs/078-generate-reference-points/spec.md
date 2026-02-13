# Feature Specification: Generate Reference Points Tool

**Feature Branch**: `078-generate-reference-points`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Implement generate-reference-points tool [E03] — creates grid/scatter of reference points on plot (requires #049)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a grid of reference points (Priority: P1)

An analyst setting up a buffer zone analysis needs a uniform grid of reference points covering their area of interest. They specify a bounding box (e.g., the plot extent) and desired grid dimensions (rows and columns). The tool generates a single MultiPoint feature containing evenly spaced coordinates across the bounding area, classified as a reference location. The analyst can then visually confirm coverage on the map before running downstream classification tools.

**Why this priority**: The grid pattern is the primary use case for buffer zone analysis — it provides uniform spatial coverage essential for systematic point-in-zone classification (#081) and histogram generation (#082).

**Independent Test**: Can be verified by providing a bounding box and grid dimensions, running the tool, and checking that the output contains the expected number of points at correctly spaced coordinates.

**Acceptance Scenarios**:

1. **Given** a bounding box of [−5, 49, 1, 52] and grid dimensions of 4 columns × 3 rows, **When** generate-reference-points is invoked with pattern="grid", **Then** the output contains a single MultiPoint feature with 12 coordinates evenly spaced within the bounds, with kind=POINT and locationType=REFERENCE, and a `pointMetadata` array of 12 entries parallel to the coordinates.
2. **Given** a bounding box and grid dimensions of 1 column × 1 row, **When** generate-reference-points is invoked, **Then** the output contains a single MultiPoint feature with 1 coordinate at the centre of the bounding box.
3. **Given** a bounding box, **When** generate-reference-points is invoked with pattern="grid" and rows=5 cols=5, **Then** the MultiPoint feature contains 25 coordinates spaced at equal intervals of latitude and longitude within the bounding box.

---

### User Story 2 - Generate a scatter of reference points (Priority: P2)

An analyst wants a randomised distribution of reference points rather than a regular grid. They specify a bounding box, the number of points, and optionally a seed for reproducibility. The tool generates a single MultiPoint feature with uniformly distributed random coordinates within the bounding area.

**Why this priority**: Scatter patterns provide an alternative to grids for situations where uniform random sampling is preferred. Reproducibility via seed is important for repeatable analysis.

**Independent Test**: Can be verified by providing a bounding box, count, and seed, running the tool, and checking that the output contains the expected number of points all within bounds, and that running with the same seed produces identical results.

**Acceptance Scenarios**:

1. **Given** a bounding box of [−5, 49, 1, 52] and count=20, **When** generate-reference-points is invoked with pattern="scatter" and seed=42, **Then** the output contains a single MultiPoint feature with 20 coordinates all within the bounding box, with kind=POINT and locationType=REFERENCE, and a `pointMetadata` array of 20 entries.
2. **Given** the same bounding box, count, and seed, **When** the tool is invoked twice, **Then** both invocations produce identical coordinates.
3. **Given** a bounding box and count=20 with no seed, **When** the tool is invoked twice, **Then** each invocation produces different coordinates.

---

### User Story 3 - Use generated points in downstream tools (Priority: P3)

An analyst generates reference points as the first step of the E03 buffer zone analysis chain. The generated MultiPoint feature must be compatible with downstream tools: point-in-zone classifier (#081) reads the coordinates and per-point metadata, recoloring points by zone membership, and the zone histogram generator (#082) counts them per zone. The `pointMetadata` array provides a natural extension point for per-point styling — the classifier populates zone and color fields without changing the geometry. The output FeatureCollection must follow the standard GeoJSON schema so it can be persisted in STAC and consumed without transformation.

**Why this priority**: Integration with the downstream tool chain is essential but depends on the core generation functionality working first.

**Independent Test**: Can be verified by generating reference points and passing the output directly to a mock classifier, confirming the features are parseable and contain all required properties.

**Acceptance Scenarios**:

1. **Given** a generated MultiPoint feature, **When** the output FeatureCollection is loaded by a downstream tool expecting a feature with kind=POINT and a `pointMetadata` array, **Then** the feature is accepted and each coordinate can be processed individually via its metadata entry.
2. **Given** a generated MultiPoint feature, **When** persisted as a STAC item asset, **Then** the GeoJSON file validates against the project schema.

---

### Edge Cases

- What happens when the bounding box has zero area (e.g., west=east or south=north)? Return an error — a valid bounding box with positive area is required.
- What happens when rows or columns is 0 or negative? Return an error specifying that grid dimensions must be positive integers.
- What happens when count is 0 for scatter pattern? Return an error specifying that count must be a positive integer.
- What happens when the bounding box crosses the antimeridian (e.g., west=170, east=−170)? Points should be generated correctly across the date line, wrapping longitude values.
- What happens with very large grid dimensions (e.g., 1000×1000)? The tool should generate all requested points. Performance limits are out of scope for this spec.
- What happens when south > north in the bounding box? Return an error — south must be less than north.
- What happens with a 1×1 grid? A MultiPoint feature with a single coordinate at the bounding box centre is returned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool spec MUST follow the #049 tool documentation model with all 9 required sections (metadata, description, MCP, inputs, outputs, algorithm, edge cases, examples, changelog).
- **FR-002**: Tool MUST accept a `pattern` parameter with values "grid" or "scatter".
- **FR-003**: Tool MUST accept a `bounds` parameter as a bounding box array [west, south, east, north] in decimal degrees (WGS84).
- **FR-004**: For grid pattern, tool MUST accept `rows` (integer ≥ 1) and `cols` (integer ≥ 1) parameters specifying grid dimensions.
- **FR-005**: For scatter pattern, tool MUST accept a `count` (integer ≥ 1) parameter specifying the number of points to generate.
- **FR-006**: For scatter pattern, tool MUST accept an optional `seed` (integer) parameter for reproducible random generation.
- **FR-007**: Tool MUST output a FeatureCollection containing a single MultiPoint feature with `kind: "POINT"` and `locationType: "REFERENCE"`. The feature's geometry contains all generated coordinates.
- **FR-008**: The MultiPoint feature's properties MUST include a `pointMetadata` array parallel to the coordinates array, where each entry contains at minimum an `index` (0-based ordinal) and `name` (human-readable label). Downstream tools (e.g., #081 classifier) can extend entries with additional fields such as `zone` and `color`.
- **FR-009**: Grid pattern MUST produce coordinates at evenly spaced intervals of latitude and longitude within the bounding box. For an R×C grid, coordinates are placed at regular intervals including the boundary edges.
- **FR-010**: Scatter pattern MUST produce coordinates uniformly distributed within the bounding box using a deterministic pseudo-random algorithm when seed is provided.
- **FR-010a**: The MultiPoint feature MUST have a unique identifier.
- **FR-010b**: The `ReferenceLocation` schema MUST be updated to allow MultiPoint geometry (currently only allows Point). This is a non-breaking schema extension under Article XIV (Pre-Release Freedom).
- **FR-011**: Tool MUST return an `addition`-type ToolResponse with result subtype `reference/generated_points`.
- **FR-012**: Tool MUST record provenance annotations including pattern type, bounds, and point count in the label.
- **FR-013**: Tool MUST handle bounding boxes that cross the antimeridian (west > east), generating points across the date line with correctly wrapped longitude values.
- **FR-014**: Tool MUST produce at least 2 golden I/O example files (grid example and scatter example).
- **FR-015**: Tool MUST work entirely offline with no network dependency.

### Key Entities

- **Reference Point Set**: A single GeoJSON MultiPoint Feature with `kind: "POINT"` and `locationType: "REFERENCE"`. Contains all generated coordinates in its geometry, with a parallel `pointMetadata` array in properties for per-point information (index, name, and extension fields for downstream tools like zone/color).
- **Point Metadata Entry**: An element of the `pointMetadata` array, indexed parallel to the MultiPoint coordinates. Initially contains `index` and `name`; downstream tools (#081 classifier) extend entries with `zone`, `color`, etc. This avoids per-point styling in a shared feature-level style property.
- **Bounding Box**: A four-element array [west, south, east, north] in decimal degrees defining the generation area. West and east are longitude (−180 to 180), south and north are latitude (−90 to 90).
- **Generation Pattern**: Either "grid" (regular spacing) or "scatter" (random distribution). Determines how points are distributed within the bounding box.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool spec file exists at `shared/tools/reference/generation/generate-reference-points.1.0.md` with all 9 required sections complete.
- **SC-002**: At least 2 golden I/O example pairs exist (grid pattern and scatter pattern).
- **SC-003**: Algorithm pseudocode handles both grid and scatter patterns with correct coordinate generation logic.
- **SC-004**: Edge cases table covers at minimum: empty/zero-area bounds, zero/negative dimensions, antimeridian crossing, single-point grid.
- **SC-005**: Generated output is a valid GeoJSON MultiPoint feature conforming to the project schema with `kind: "POINT"` and `locationType: "REFERENCE"`, and a `pointMetadata` array with entries parallel to coordinates.
- **SC-006**: Scatter pattern with the same seed produces identical output across invocations.
- **SC-007**: Grid pattern with R rows and C columns produces a MultiPoint feature with exactly R × C coordinates.

## Deliverables

| Deliverable | Path |
|-------------|------|
| Tool spec | `shared/tools/reference/generation/generate-reference-points.1.0.md` |
| Golden example (grid) | `shared/tools/reference/generation/generate-reference-points.grid.input.json` |
| Golden example (grid output) | `shared/tools/reference/generation/generate-reference-points.grid.output.json` |
| Golden example (scatter) | `shared/tools/reference/generation/generate-reference-points.scatter.input.json` |
| Golden example (scatter output) | `shared/tools/reference/generation/generate-reference-points.scatter.output.json` |

## Technical Notes

### Grid Point Spacing

For a grid with R rows and C columns within bounding box [west, south, east, north]:

```
If R = 1: lat = (south + north) / 2
If R > 1: lat_step = (north - south) / (R - 1)
           lat_i = south + i * lat_step  (for i = 0..R-1)

If C = 1: lon = (west + east) / 2
If C > 1: lon_step = (east - west) / (C - 1)
           lon_j = west + j * lon_step  (for j = 0..C-1)
```

For antimeridian-crossing boxes (west > east), the effective east is east + 360, and generated longitudes are normalised to [−180, 180].

### Feature Schema Alignment

Generated points use existing schema types:
- `FeatureKind.POINT` — already defined in `common.yaml`
- `LocationTypeEnum.REFERENCE` — already defined in `common.yaml`
- `PointShapeEnum.square` — default marker shape for reference points (as documented in `common.yaml`)

**Schema update required**: The `ReferenceLocation` class in `geojson.yaml` currently constrains geometry to `GeoJSONPoint`. This feature extends it to also accept `GeoJSONMultiPoint` (a non-breaking addition under Article XIV). A `pointMetadata` attribute is also added to `ReferenceLocationProperties` for per-point metadata.

### Dependencies

- Requires #049 (tool documentation model) — **complete**
- Downstream consumers: #081 (point-in-zone classifier), #082 (zone histogram generator)

## Assumptions

- The bounding box is specified in WGS84 decimal degrees (the project standard).
- Grid spacing uses simple linear interpolation of latitude/longitude, which is acceptable for typical analysis areas. Geodetic spacing (equal distance on the ellipsoid) is out of scope.
- The default marker shape for reference points is `square` per `PointShapeEnum` documentation in the schema.
- Performance optimisation for very large point sets (> 10,000 points) is out of scope.
- A single MultiPoint feature is used rather than many individual Point features. This keeps the FeatureCollection manageable and provides a natural structure for per-point metadata via the `pointMetadata` array, which downstream tools (#081) extend with zone/color information.
