# Feature Specification: Buffer Zone Generator

**Feature Branch**: `080-buffer-zone-generator`
**Created**: 2026-02-12
**Status**: Draft
**Input**: User description: "Implement buffer-zone-generator tool [E03] — stub sensor model returning 3 detection-likelihood buffer polygons (requires #049, #079)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Detection Zones Around a Track (Priority: P1)

An analyst has a track representing a vessel's predicted path (possibly offset via the move-track tool). They invoke the buffer-zone-generator to visualize detection likelihood around that track. The tool generates three concentric buffer polygons — one for each detection likelihood level (high, medium, low) — and adds them to the plot as new features. Each zone is visually distinguishable by its detection probability label.

**Why this priority**: This is the core purpose of the tool. Without buffer zone generation around a track, the downstream E03 cascade (point classification, histogram) cannot function. It is the fundamental capability that the entire epic depends on.

**Independent Test**: Can be fully tested by providing a single track feature and verifying that three polygon features are returned, each at the correct buffer distance with the correct detection likelihood label.

**Acceptance Scenarios**:

1. **Given** a track feature (LineString geometry), **When** the analyst invokes buffer-zone-generator with default parameters, **Then** three new polygon features are returned representing high, medium, and low detection likelihood zones at increasing distances from the track.
2. **Given** a track feature, **When** the tool completes, **Then** each returned polygon fully encloses the track at its specified buffer distance, and each polygon's properties include a detection likelihood value and a human-readable zone label.
3. **Given** a track feature, **When** the tool completes, **Then** the result includes provenance annotations linking each zone back to the source track feature.

---

### User Story 2 - Customise Buffer Distances (Priority: P2)

An analyst wants to explore different detection scenarios by adjusting the three buffer distances. They invoke the tool with custom distance parameters to see how detection zones change at different ranges. This allows them to test "what-if" scenarios before a real sensor model is available.

**Why this priority**: Parameterisation adds flexibility for exploratory analysis and makes the tool useful beyond the default stub scenario. It also validates that the sensor model interface supports variable inputs.

**Independent Test**: Can be fully tested by providing a track and custom distances, then verifying the returned polygons match the specified distances.

**Acceptance Scenarios**:

1. **Given** a track feature and custom distances (e.g., 2 km, 8 km, 20 km), **When** the analyst invokes the tool with those distances, **Then** three zones are returned at exactly those distances.
2. **Given** custom distances provided in non-ascending order, **When** the tool processes them, **Then** the returned zones are ordered from smallest to largest distance regardless of input order.

---

### User Story 3 - Cascade Integration with Downstream Tools (Priority: P3)

As part of the E03 reactive PROV cascade, when the analyst modifies the move-track parameters (step 2), the buffer-zone-generator (step 3) automatically re-executes with the updated track. The newly generated zones feed into the point classifier (step 4) and histogram (step 5), producing an updated analysis chain.

**Why this priority**: Cascade integration is the ultimate goal of E03, but it depends on the PROV replay infrastructure (#076). The tool itself must produce correct output; the cascade wiring is handled by the PROV system.

**Independent Test**: Can be tested by invoking the tool twice with different input tracks and verifying that the output zones change correspondingly, confirming the tool is stateless and re-invocable.

**Acceptance Scenarios**:

1. **Given** the tool was previously invoked with track A, **When** it is re-invoked with track B (a modified version of track A), **Then** the returned zones reflect the geometry of track B, not track A.
2. **Given** the tool output, **When** the provenance metadata is inspected, **Then** each zone references the input track as its source, enabling downstream tools to detect when the source has changed.

---

### Edge Cases

- What happens when the input track has only one position (a single point)? The tool should generate circular buffer zones centred on that point.
- What happens when the input track crosses the antimeridian (longitude wrapping past 180/-180)? The generated polygons must correctly wrap or split at the antimeridian.
- What happens when the input is an empty feature collection? The tool returns an error indicating no track features were found.
- What happens when the input contains non-track features mixed with track features? Non-track features are silently skipped; only the first track feature is buffered.
- What happens when a buffer distance is zero? A zero-distance zone degenerates to the track's own geometry (a LineString, not a Polygon). The tool should return an error for zero or negative distances.
- What happens when the track positions are very close together (sub-metre spacing)? The buffer polygons may overlap heavily but should still be geometrically valid.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a single track feature (with LineString geometry) as input and generate three buffer polygon features around it.
- **FR-002**: System MUST use a sensor model interface to obtain the three buffer distances; the default (stub) sensor model returns hardcoded distances of 5 km, 10 km, and 20 km.
- **FR-003**: Each generated polygon MUST be labelled with its detection likelihood: high (innermost zone, e.g., 90%), medium (middle zone, e.g., 60%), low (outermost zone, e.g., 30%).
- **FR-004**: System MUST allow the analyst to override the three buffer distances via tool parameters, bypassing the stub sensor model values.
- **FR-005**: The sensor model interface MUST be designed as a swappable component — replacing the stub with a real sensor model should require no changes to the buffer generation logic.
- **FR-006**: Each generated zone feature MUST include provenance annotations linking back to the source track feature (using `debrief:sourceFeatures`).
- **FR-007**: The generated polygons MUST be valid GeoJSON Polygon geometries that fully enclose the track at the specified distances using great-circle (spherical Earth) calculations.
- **FR-008**: System MUST return the zones ordered from innermost (highest likelihood) to outermost (lowest likelihood).
- **FR-009**: System MUST return an error when the input contains no track features.
- **FR-010**: System MUST silently skip non-track features in the input and process only the first track feature found.
- **FR-011**: System MUST return an error when any buffer distance is zero or negative.
- **FR-012**: System MUST handle tracks that cross the antimeridian by correctly normalising longitudes in the generated polygons.
- **FR-013**: The result type for each zone MUST be `addition/sensor/detection_zone`.
- **FR-014**: System MUST work entirely offline with no network dependencies.

### Key Entities

- **Track Feature**: A GeoJSON Feature with LineString geometry representing a vessel's path. Contains position coordinates as `[longitude, latitude, altitude, timestamp_ms]` tuples. This is the input to the buffer zone generator.
- **Detection Zone**: A GeoJSON Feature with Polygon geometry representing an area around a track at a specific buffer distance. Properties include the detection likelihood (percentage), zone label (high/medium/low), and the buffer distance used to generate it.
- **Sensor Model**: An abstraction that provides detection-likelihood distances. The stub implementation returns three hardcoded values. The interface accepts a track and returns an ordered list of `{distance_km, likelihood, label}` entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given any valid track, the tool produces exactly three detection zone polygons within 2 seconds for tracks of up to 1,000 positions.
- **SC-002**: Each generated zone polygon fully encloses the source track at the specified buffer distance — no track position falls outside its corresponding zone.
- **SC-003**: The stub sensor model can be replaced with an alternative implementation without modifying any buffer generation logic — verified by substituting a test double that returns different distances and confirming correct output.
- **SC-004**: All three zones include correct provenance metadata (result type, source features, human-readable label) — verified by automated tests checking annotation fields.
- **SC-005**: The tool handles tracks of 1 position (point), 2 positions (segment), and 1,000+ positions without errors or invalid geometry.
- **SC-006**: Golden example input/output pairs pass validation, confirming the tool produces deterministic, reproducible results for known inputs.

## Assumptions

- The input track feature follows the existing Debrief GeoJSON conventions with `kind: "TRACK"` and LineString geometry using `[lon, lat, altitude, timestamp_ms]` coordinate tuples.
- The stub sensor model distances (5 km, 10 km, 20 km) and likelihoods (90%, 60%, 30%) are reasonable defaults for demonstration purposes.
- Buffer polygons are generated using great-circle offsetting of each track vertex at regular angular intervals (e.g., every 10 degrees) to approximate a tube around the track — the same Vincenty destination formula used by the move-shape tool.
- Only the first track feature in the input is processed; if multiple tracks are present, subsequent ones are ignored (matching the `ContextType.SINGLE` pattern).
- Detection zone polygons use the `ZONE` feature kind (or equivalent from the FeatureKindEnum).
- The tool is stateless — it does not persist results itself; the caller (PROV system) handles storage via STAC.

## Dependencies

- **#049 (Tool Documentation Model)**: Defines the 9-section tool specification format and `@tool` decorator pattern that this tool must follow.
- **#079 (Move Track)**: Provides the moved track that is the typical input to this tool in the E03 cascade. However, the buffer-zone-generator accepts any track feature, not only moved ones.
- **#062 (FeatureKindEnum)**: Must include a kind value for detection zone features.
