# Feature Specification: Generate Reference Points Tool

**Feature Branch**: `078-generate-reference-points`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Implement generate-reference-points tool [E03] — creates grid/scatter of reference points on plot (requires #049)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a grid of reference points (Priority: P1)

An analyst setting up a buffer zone analysis needs a uniform grid of reference points covering their area of interest. They specify a bounding box (e.g., the plot extent) and desired grid dimensions (rows and columns). The tool generates evenly spaced Point features across the bounding area, each classified as a reference location. The analyst can then visually confirm coverage on the map before running downstream classification tools.

**Why this priority**: The grid pattern is the primary use case for buffer zone analysis — it provides uniform spatial coverage essential for systematic point-in-zone classification (#081) and histogram generation (#082).

**Independent Test**: Can be verified by providing a bounding box and grid dimensions, running the tool, and checking that the output contains the expected number of points at correctly spaced coordinates.

**Acceptance Scenarios**:

1. **Given** a bounding box of [−5, 49, 1, 52] and grid dimensions of 4 columns × 3 rows, **When** generate-reference-points is invoked with pattern="grid", **Then** the output contains 12 Point features evenly spaced within the bounds, each with kind=POINT and locationType=REFERENCE.
2. **Given** a bounding box and grid dimensions of 1 column × 1 row, **When** generate-reference-points is invoked, **Then** the output contains 1 Point feature at the centre of the bounding box.
3. **Given** a bounding box, **When** generate-reference-points is invoked with pattern="grid" and rows=5 cols=5, **Then** the 25 points are spaced at equal intervals of latitude and longitude within the bounding box.

---

### User Story 2 - Generate a scatter of reference points (Priority: P2)

An analyst wants a randomised distribution of reference points rather than a regular grid. They specify a bounding box, the number of points, and optionally a seed for reproducibility. The tool generates uniformly distributed random points within the bounding area.

**Why this priority**: Scatter patterns provide an alternative to grids for situations where uniform random sampling is preferred. Reproducibility via seed is important for repeatable analysis.

**Independent Test**: Can be verified by providing a bounding box, count, and seed, running the tool, and checking that the output contains the expected number of points all within bounds, and that running with the same seed produces identical results.

**Acceptance Scenarios**:

1. **Given** a bounding box of [−5, 49, 1, 52] and count=20, **When** generate-reference-points is invoked with pattern="scatter" and seed=42, **Then** the output contains 20 Point features all within the bounding box, each with kind=POINT and locationType=REFERENCE.
2. **Given** the same bounding box, count, and seed, **When** the tool is invoked twice, **Then** both invocations produce identical point coordinates.
3. **Given** a bounding box and count=20 with no seed, **When** the tool is invoked twice, **Then** each invocation produces different point coordinates.

---

### User Story 3 - Use generated points in downstream tools (Priority: P3)

An analyst generates reference points as the first step of the E03 buffer zone analysis chain. The generated points must be compatible with downstream tools: point-in-zone classifier (#081) reads them as input, and the zone histogram generator (#082) counts them per zone. The output FeatureCollection must follow the standard GeoJSON schema so it can be persisted in STAC and consumed without transformation.

**Why this priority**: Integration with the downstream tool chain is essential but depends on the core generation functionality working first.

**Independent Test**: Can be verified by generating reference points and passing the output directly to a mock classifier, confirming the features are parseable and contain all required properties.

**Acceptance Scenarios**:

1. **Given** a generated set of reference points, **When** the output FeatureCollection is loaded by a downstream tool expecting Point features with kind=POINT, **Then** all features are accepted without error.
2. **Given** a generated set of reference points, **When** persisted as a STAC item asset, **Then** the GeoJSON file validates against the project schema.

---

### Edge Cases

- What happens when the bounding box has zero area (e.g., west=east or south=north)? Return an error — a valid bounding box with positive area is required.
- What happens when rows or columns is 0 or negative? Return an error specifying that grid dimensions must be positive integers.
- What happens when count is 0 for scatter pattern? Return an error specifying that count must be a positive integer.
- What happens when the bounding box crosses the antimeridian (e.g., west=170, east=−170)? Points should be generated correctly across the date line, wrapping longitude values.
- What happens with very large grid dimensions (e.g., 1000×1000)? The tool should generate all requested points. Performance limits are out of scope for this spec.
- What happens when south > north in the bounding box? Return an error — south must be less than north.
- What happens with a 1×1 grid? A single point at the bounding box centre is returned.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool spec MUST follow the #049 tool documentation model with all 9 required sections (metadata, description, MCP, inputs, outputs, algorithm, edge cases, examples, changelog).
- **FR-002**: Tool MUST accept a `pattern` parameter with values "grid" or "scatter".
- **FR-003**: Tool MUST accept a `bounds` parameter as a bounding box array [west, south, east, north] in decimal degrees (WGS84).
- **FR-004**: For grid pattern, tool MUST accept `rows` (integer ≥ 1) and `cols` (integer ≥ 1) parameters specifying grid dimensions.
- **FR-005**: For scatter pattern, tool MUST accept a `count` (integer ≥ 1) parameter specifying the number of points to generate.
- **FR-006**: For scatter pattern, tool MUST accept an optional `seed` (integer) parameter for reproducible random generation.
- **FR-007**: Tool MUST output a FeatureCollection of Point features, each with `kind: "POINT"` and `locationType: "REFERENCE"`.
- **FR-008**: Grid pattern MUST produce points at evenly spaced intervals of latitude and longitude within the bounding box. For an N×M grid, points are placed at regular intervals including the boundary edges.
- **FR-009**: Scatter pattern MUST produce points uniformly distributed within the bounding box using a deterministic pseudo-random algorithm when seed is provided.
- **FR-010**: Each generated Point feature MUST have a unique identifier.
- **FR-011**: Tool MUST return an `addition`-type ToolResponse with result subtype `reference/generated_points`.
- **FR-012**: Tool MUST record provenance annotations including pattern type, bounds, and point count in the label.
- **FR-013**: Tool MUST handle bounding boxes that cross the antimeridian (west > east), generating points across the date line with correctly wrapped longitude values.
- **FR-014**: Tool MUST produce at least 2 golden I/O example files (grid example and scatter example).
- **FR-015**: Tool MUST work entirely offline with no network dependency.

### Key Entities

- **Reference Point**: A GeoJSON Point Feature with `kind: "POINT"` and `locationType: "REFERENCE"`. Represents a generated spatial location used for zone classification and analysis.
- **Bounding Box**: A four-element array [west, south, east, north] in decimal degrees defining the generation area. West and east are longitude (−180 to 180), south and north are latitude (−90 to 90).
- **Generation Pattern**: Either "grid" (regular spacing) or "scatter" (random distribution). Determines how points are distributed within the bounding box.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool spec file exists at `shared/tools/reference/generation/generate-reference-points.1.0.md` with all 9 required sections complete.
- **SC-002**: At least 2 golden I/O example pairs exist (grid pattern and scatter pattern).
- **SC-003**: Algorithm pseudocode handles both grid and scatter patterns with correct coordinate generation logic.
- **SC-004**: Edge cases table covers at minimum: empty/zero-area bounds, zero/negative dimensions, antimeridian crossing, single-point grid.
- **SC-005**: Generated points are valid GeoJSON Point features conforming to the project schema with `kind: "POINT"` and `locationType: "REFERENCE"`.
- **SC-006**: Scatter pattern with the same seed produces identical output across invocations.
- **SC-007**: Grid pattern with R rows and C columns produces exactly R × C points.

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

No new schema enums or types are required.

### Dependencies

- Requires #049 (tool documentation model) — **complete**
- Downstream consumers: #081 (point-in-zone classifier), #082 (zone histogram generator)

## Assumptions

- The bounding box is specified in WGS84 decimal degrees (the project standard).
- Grid spacing uses simple linear interpolation of latitude/longitude, which is acceptable for typical analysis areas. Geodetic spacing (equal distance on the ellipsoid) is out of scope.
- The default marker shape for reference points is `square` per `PointShapeEnum` documentation in the schema.
- Performance optimisation for very large point sets (> 10,000 points) is out of scope.
