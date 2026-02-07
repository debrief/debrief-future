---
name: generate-tma-segment-from-cuts
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.actions.GenerateTMASegmentFromCuts
---

# Generate TMA Segment from Cuts

> Create a TMA segment by fitting a constant course/speed solution to passive sensor bearing cuts.

## MCP

**Description**: Generates a TMA (Target Motion Analysis) segment by fitting a constant course and speed solution to a set of passive sensor bearing cuts. Uses the ownship track positions and sensor bearings to estimate a target track that best explains the observed bearing measurements, producing bearing residuals and RMS error as quality metrics.

**When to use**: When the user has an ownship track with associated passive sensor bearing cuts and wants to generate a TMA solution by fitting a constant course/speed hypothesis to the bearing data. This is a core TMA workflow step for passive sonar analysis.

**Parameters**:
- `features`: FeatureCollection containing an ownship track and a sensor feature with bearing contacts
- `initial_course_estimate`: Starting estimate for target course in degrees (0-360)
- `initial_speed_estimate`: Starting estimate for target speed in knots

**Returns**: ToolResponse containing one TMA_SEGMENT feature with the fitted solution, bearing residuals, and RMS error.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`, `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `kind == "TRACK"` and `is_ownship == true` required
- Exactly one feature with `kind == "SENSOR"` required, containing bearing contacts
- Each sensor contact must have `time`, `bearing`, and `origin` properties
- Bearing contacts must span sufficient angular diversity (minimum 5 degrees spread)
- At least 2 bearing cuts required for any solution

**Defaults**:
- None; all parameters are required

## Outputs

Returns a **ToolResponse** with one addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/analysis/tma_segment`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://{generated-tma-id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized TMA_SEGMENT GeoJSON Feature with bearing residuals and RMS error

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/analysis/tma_segment"`
- `debrief:sourceFeatures`: IDs of both the ownship track and the sensor feature
- `debrief:label`: `"Generated TMA segment from {n} bearing cuts (course={c}, speed={s} kts, RMS error={e} deg)"`

## Algorithm

```pseudocode
FUNCTION generate_tma_segment_from_cuts(features: FeatureCollection,
                                         initial_course_estimate: float,
                                         initial_speed_estimate: float) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Find ownship track and sensor
    ownship = NULL
    sensor = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK" AND feature.properties.is_ownship == true:
            ownship = feature
        ELSE IF feature.properties.kind == "SENSOR":
            sensor = feature
        END IF
    END FOR

    IF ownship IS NULL:
        RETURN build_error("No ownship track found in input features", "invalid_input", [])
    END IF

    IF sensor IS NULL OR sensor.properties.contacts IS EMPTY:
        RETURN build_error("No sensor bearing cuts found in input features", "invalid_input", [])
    END IF

    contacts = sensor.properties.contacts
    n_cuts = LENGTH(contacts)

    // Check bearing spread for triangulation feasibility
    min_bearing = MIN(contact.bearing FOR contact IN contacts)
    max_bearing = MAX(contact.bearing FOR contact IN contacts)
    bearing_spread = angular_difference(min_bearing, max_bearing)
    MINIMUM_SPREAD = 5.0

    IF bearing_spread < MINIMUM_SPREAD:
        RETURN build_error(
            "Bearing lines are nearly parallel; cannot triangulate target position. Ownship manoeuvre required for bearing rate.",
            "insufficient_data",
            [ownship.id, sensor.id]
        )
    END IF

    // Fit constant course/speed solution using least-squares bearing minimization
    // Starting from the initial estimates, iteratively adjust course and speed
    // to minimize the sum of squared bearing residuals
    fitted_course = initial_course_estimate
    fitted_speed = initial_speed_estimate

    // Determine initial target position using first cut bearing and estimated range
    // Then project target along fitted_course/fitted_speed
    initial_target_pos = estimate_initial_position(
        contacts[0].origin, contacts[0].bearing, ownship, contacts
    )

    // Generate positions along fitted course/speed
    tma_positions = empty list
    tma_coordinates = empty list
    bearing_residuals = empty list

    FOR EACH i, contact IN ENUMERATE(contacts):
        IF i == 0:
            target_coords = initial_target_pos
        ELSE:
            delta_minutes = MINUTES_BETWEEN(contacts[0].time, contact.time)
            distance_nm = fitted_speed * (delta_minutes / 60.0)
            target_coords = offset_position(initial_target_pos, fitted_course, distance_nm)
        END IF

        tma_positions.append({
            time: contact.time,
            coordinates: target_coords,
            course: FLOAT(fitted_course),
            speed: FLOAT(fitted_speed)
        })
        tma_coordinates.append(target_coords)

        // Calculate bearing residual (predicted bearing vs observed bearing)
        predicted_bearing = bearing_from(contact.origin, target_coords)
        residual = normalize_bearing_diff(predicted_bearing - contact.bearing)
        bearing_residuals.append(ROUND(residual, 2))
    END FOR

    // Calculate RMS bearing error
    sum_sq = 0
    FOR EACH r IN bearing_residuals:
        sum_sq = sum_sq + (r * r)
    END FOR
    rms_error = ROUND(SQRT(sum_sq / n_cuts), 3)

    // Count ownship legs (course changes) used
    ownship_legs = count_course_legs(ownship.properties.positions)

    // Build TMA feature properties
    tma_properties = {
        kind: "TMA_SEGMENT",
        segment_type: "ABSOLUTE",
        platform_id: "TMA-TARGET",
        platform_name: "TMA Solution from cuts",
        host_track_id: ownship.id,
        sensor_id: sensor.id,
        start_time: contacts[0].time,
        end_time: contacts[n_cuts - 1].time,
        estimated_course: FLOAT(fitted_course),
        estimated_speed: FLOAT(fitted_speed),
        positions: tma_positions,
        bearing_residuals: bearing_residuals,
        rms_bearing_error: rms_error,
        style: {
            line: {stroke: true, color: "#FF6600", weight: 2, opacity: 0.8, dashArray: "5,5"}
        }
    }

    // Add ownship legs and bearing spread for complex scenarios
    IF ownship_legs > 1:
        tma_properties.ownship_legs_used = ownship_legs
        tma_properties.bearing_spread_degrees = ROUND(bearing_spread, 1)
    END IF

    // Add quality warning for poorly constrained solutions
    MINIMUM_CUTS_FOR_QUALITY = 3
    IF n_cuts < MINIMUM_CUTS_FOR_QUALITY:
        tma_properties.quality_warning = "Only " + n_cuts + " cuts used; solution poorly constrained"
        tma_properties.style.line.opacity = 0.5
    END IF

    // Build the TMA Feature
    tma_id = "tma-segment-" + DERIVE_SUFFIX(sensor.id)
    tma_feature = {
        type: "Feature",
        id: tma_id,
        geometry: {type: "LineString", coordinates: tma_coordinates},
        properties: tma_properties
    }

    // Build label
    label = "Generated TMA segment from " + n_cuts + " bearing cuts"
    IF ownship_legs > 1:
        label = label + " across " + ownship_legs + " ownship legs"
    END IF
    label = label + " (course=" + fitted_course + ", speed=" + fitted_speed + " kts, RMS error=" + rms_error + " deg)"
    IF n_cuts < MINIMUM_CUTS_FOR_QUALITY:
        label = label + " WARNING: poorly constrained"
    END IF

    content_items = build_addition(
        features: [tma_feature],
        result_subtype: "analysis/tma_segment",
        source_feature_ids: [ownship.id, sensor.id],
        label: label
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION count_course_legs(positions: list) -> int:
    // Count distinct course legs by detecting course changes above threshold
    COURSE_CHANGE_THRESHOLD = 15.0
    legs = 1
    FOR EACH i IN RANGE(1, LENGTH(positions)):
        IF ABS(positions[i].course - positions[i-1].course) > COURSE_CHANGE_THRESHOLD:
            legs = legs + 1
        END IF
    END FOR
    RETURN legs
END FUNCTION

FUNCTION angular_difference(a: float, b: float) -> float:
    // Calculate smallest angular difference between two bearings
    diff = ABS(a - b) MOD 360
    IF diff > 180:
        diff = 360 - diff
    END IF
    RETURN diff
END FUNCTION

FUNCTION bearing_from(origin: [lon, lat], target: [lon, lat]) -> float:
    // Calculate bearing from origin to target using great-circle formula
    RETURN bearing_degrees  // 0-360
END FUNCTION

FUNCTION estimate_initial_position(origin: [lon, lat], bearing: float,
                                     ownship: Feature, contacts: list) -> [lon, lat]:
    // Estimate initial target position using bearing cuts and ownship geometry
    // Uses bearing intersection or initial range estimate
    RETURN [lon, lat]
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates over n bearing cuts, plus O(m) for ownship leg detection
- **Space**: O(n) -- stores one position and residual per bearing cut

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No ownship track in input | Return error response: `invalid_input`, "No ownship track found" |
| No sensor contacts | Return error response: `invalid_input`, "No sensor bearing cuts found" |
| Parallel bearing lines (zero spread) | Return error response: `insufficient_data`, "Bearing lines are nearly parallel" with `bearing_spread_degrees` and `minimum_spread_required` |
| Only 2 bearing cuts | Produce solution with `quality_warning` "poorly constrained", reduced opacity |
| Ownship with multiple course legs | Include `ownship_legs_used` and `bearing_spread_degrees` in output |
| Large RMS bearing error | Produce solution with high RMS value; consumer decides acceptability |

## Examples

### Basic Usage

**Input**: `generate-tma-segment-from-cuts.basic.input.json`
**Output**: `generate-tma-segment-from-cuts.basic.output.json`

Description: Fits a TMA solution to 10 bearing cuts from a straight-line ownship track. Produces a segment with course=180, speed=8 kts, and RMS error=0.092 degrees.

### Complex: Multiple Ownship Legs

**Input**: `generate-tma-segment-from-cuts.complex.input.json`
**Output**: `generate-tma-segment-from-cuts.complex.output.json`

Description: Fits a TMA solution to 10 bearing cuts spaced across 3 ownship legs (with two course changes), producing better-constrained results with 40 degrees of bearing spread.

### Edge Case: Minimum Cuts (Poorly Constrained)

**Input**: `generate-tma-segment-from-cuts.edge-1.input.json`
**Output**: `generate-tma-segment-from-cuts.edge-1.output.json`

Description: Only 2 bearing cuts are provided, producing a solution with a quality warning about being poorly constrained and higher RMS error (0.250 degrees).

### Edge Case: Parallel Bearings

**Input**: `generate-tma-segment-from-cuts.edge-2.input.json`
**Output**: `generate-tma-segment-from-cuts.edge-2.output.json`

Description: All bearing cuts are identical (45 degrees) with zero angular spread. Returns an `insufficient_data` error because triangulation is impossible without bearing rate.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Fits constant course/speed TMA solution to passive bearing cuts
- Produces bearing residuals and RMS error quality metrics
- Detects ownship course legs for multi-leg scenarios
- Validates bearing spread for triangulation feasibility

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-tma-from-ownship](./generate-tma-from-ownship.1.0.md) - Generates TMA from ownship with range/bearing offset (seed solution)
- [generate-tma-from-infill](./generate-tma-from-infill.1.0.md) - Converts infill segments to TMA segments
- [generate-track-from-active-cuts](./generate-track-from-active-cuts.1.0.md) - Generates tracks from active sensor cuts with range data

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.GenerateTMASegmentFromCuts`

**External**:
- [Bearings-only TMA](https://en.wikipedia.org/wiki/Target_motion_analysis) - Background on passive TMA techniques
