---
name: course-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.courseCalc
---

# Course Calc

> Calculate the current course (heading) of a track at the specified time.

## MCP

**Description**: Retrieves the course of the primary track at a given time. The course value is read from the track position's course property, converted from radians to degrees if necessary, and normalized to 0-360.

**When to use**: When the user needs to know the heading of a vessel at a specific moment. Commonly displayed in the tote panel.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp at which to evaluate the course

**Returns**: A scalar measurement of course in degrees (0-360) from true north.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have a position at or interpolatable to the specified time
- Position must have a `course` property

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/course`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-course-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with course value in degrees

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/course"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Calculated course: {value} degs"`

## Algorithm

```pseudocode
FUNCTION course_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    primary = input.features[0]

    IF primary.properties["debrief:kind"] != "track":
        RETURN build_error("Feature must be a track", "invalid_input", [primary.id])
    END IF

    // Get position at the specified time
    position = get_position_at_time(primary, time)

    IF position IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [primary.id])
    END IF

    // Read course from position
    // Legacy: Rads2Degs(primary.getCourse())
    // In the migration, course is stored in degrees in GeoJSON positions
    course_degs = position.course

    IF course_degs IS NULL OR course_degs IS NaN:
        RETURN build_error("No course data available at specified time", "invalid_input", [primary.id])
    END IF

    // Normalize to 0-360 range
    course_degs = course_degs MOD 360.0
    IF course_degs < 0:
        course_degs = course_degs + 360.0
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "course",
            value: course_degs,
            units: "degs",
            time: time,
            primary_track: primary.id,
            primary_position: position.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/course",
        source_feature_ids: [primary.id],
        label: "Calculated course: " + course_degs + " degs"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- direct property lookup and normalization
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Course property is null | Return error: `invalid_input`, "No course data available at specified time" |
| Course is NaN | Return error: `invalid_input`, "No course data available at specified time" |
| Course is negative (e.g., -45) | Normalize to positive: -45 becomes 315 |
| Course exceeds 360 (e.g., 400) | Normalize via modulo: 400 becomes 40 |
| Course is exactly 0 or 360 | Return `0.0` degrees (due north) |

## Examples

### Basic Example

**Input**: `course-calc.basic.input.json`
**Output**: `course-calc.basic.output.json`

Description: Retrieves course of OWNSHIP at time 2024-01-15T10:30:00Z. Returns 45.0 degrees (northeast).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Course always returned in degrees (0-360)
- Legacy code converted from radians; GeoJSON stores degrees natively

## References

**Related Tools**:
- [speed-calc](./speed-calc.1.0.md) -- speed of a single track
- [bearing-calc](./bearing-calc.1.0.md) -- bearing between two tracks
- [course-delta-average-calc](./course-delta-average-calc.1.0.md) -- average course change over period

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.courseCalc`
