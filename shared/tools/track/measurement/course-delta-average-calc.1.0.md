---
name: course-delta-average-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.courseDeltaAverageCalc
---

# Course Delta Average Calc

> Calculate the average course change over a period for a single track.

## MCP

**Description**: Calculates the average rate of course change across all consecutive position pairs in a track. Returns the mean absolute course delta in degrees. Useful for detecting track manoeuvres.

**When to use**: When the user needs to assess how much a vessel's heading is changing on average, to identify turns, manoeuvres, or steady-state segments.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp (used for context; calculation uses all positions in the track)

**Returns**: A scalar measurement of the average course change in degrees.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have at least 2 positions with course data

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/course_delta_average`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-course-delta-avg-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with average course delta

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/course_delta_average"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Calculated average course change: {value} degs"`

## Algorithm

```pseudocode
FUNCTION course_delta_average_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    primary = input.features[0]

    IF primary.properties["debrief:kind"] != "track":
        RETURN build_error("Feature must be a track", "invalid_input", [primary.id])
    END IF

    positions = primary.properties["debrief:positions"]

    IF positions IS NULL OR LENGTH(positions) < 2:
        RETURN build_error("At least two positions required for course delta average", "invalid_input", [primary.id])
    END IF

    // Calculate course deltas between consecutive positions
    total_delta = 0.0
    num_deltas = 0

    FOR i FROM 0 TO LENGTH(positions) - 2:
        course_1 = positions[i].course
        course_2 = positions[i + 1].course

        IF course_1 IS NOT NULL AND course_2 IS NOT NULL
           AND course_1 IS NOT NaN AND course_2 IS NOT NaN:
            // Calculate shortest angular difference
            delta = course_2 - course_1
            // Normalize to -180..+180
            WHILE delta > 180:
                delta = delta - 360
            END WHILE
            WHILE delta < -180:
                delta = delta + 360
            END WHILE

            total_delta = total_delta + ABS(delta)
            num_deltas = num_deltas + 1
        END IF
    END FOR

    IF num_deltas == 0:
        RETURN build_error("No valid course data for delta calculation", "invalid_input", [primary.id])
    END IF

    average_delta = total_delta / num_deltas

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "course_delta_average",
            value: ROUND(average_delta, 1),
            units: "degs",
            time: time,
            primary_track: primary.id,
            num_positions: LENGTH(positions),
            period_start: positions[0].time,
            period_end: positions[LENGTH(positions) - 1].time
        },
        mime: "application/geo+json",
        result_subtype: "measurement/course_delta_average",
        source_feature_ids: [primary.id],
        label: "Calculated average course change: " + ROUND(average_delta, 1) + " degs"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates over all consecutive position pairs
- **Space**: O(1) -- running total, no additional storage

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| Only one position | Return error: `invalid_input`, "At least two positions required" |
| All positions have same course | Return `0.0` degrees |
| Course wraps around 360/0 boundary | Use shortest angular difference (e.g., 350 to 10 = 20, not 340) |
| Some positions have null course | Skip those pairs, average only valid deltas |
| All courses are NaN | Return error: `invalid_input`, "No valid course data" |

## Examples

### Basic Example

**Input**: `course-delta-average-calc.basic.input.json`
**Output**: `course-delta-average-calc.basic.output.json`

Description: Calculates average course change for OWNSHIP with two positions both at course 45.0 degrees. Since course is constant, returns 0.0 degrees.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Uses shortest angular difference for wrap-around handling
- Returns absolute average (always non-negative)

## References

**Related Tools**:
- [course-calc](./course-calc.1.0.md) -- instantaneous course
- [speed-delta-average-calc](./speed-delta-average-calc.1.0.md) -- average speed change

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.courseDeltaAverageCalc`
