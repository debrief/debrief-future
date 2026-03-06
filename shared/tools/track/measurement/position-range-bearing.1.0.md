---
name: position-range-bearing
version: 1.0
category: track/measurement
status: draft
created: 2026-02-17
---

# Position Range Bearing

> Measure range and bearing from a selected track position to the closest-in-time position on another track.

## MCP

**Description**: Given a selected position on one track and a second track, finds the temporally closest position on the second track (snap-to-nearest, no interpolation) and calculates the great-circle range in nautical miles and initial bearing in degrees from the selected position to the matched position.

**When to use**: When the user has selected a specific position on a track (via nested child selection, e.g., `track-001/positions/4`) and wants to know the range and bearing to the nearest-in-time point on another track. This complements the whole-track `range-bearing` tool by providing position-level granularity.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (first track contains the selected position, second track is searched for the temporal match)
- `selected_position_index`: Integer index into the first track's coordinates/times arrays identifying the selected position

**Returns**: A single measurement containing range (nautical miles), bearing (degrees), and metadata about the matched position on the second track.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "TRACK"` and `geometry.type = "LineString"`
- Both tracks must have `properties.times` as a non-empty integer array (epoch milliseconds)
- `properties.times` length must equal `geometry.coordinates` length for both features
- `selected_position_index` must be >= 0 and < length of features[0]'s coordinates array

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/position_range_bearing`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-position-range-bearing-{id}`
- `mimeType`: `"application/json"`
- `text`: Serialised measurement object with range, bearing, and match metadata

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/position_range_bearing"`
- `debrief:sourceFeatures`: `["track-alpha", "track-bravo"]`
- `debrief:label`: `"Range 3.57 nm, bearing 032.7° from track-alpha/positions/1 to track-bravo/positions/1"`

## Algorithm

```pseudocode
FUNCTION position_range_bearing(input: FeatureCollection, selected_position_index: integer) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Two track features required", "invalid_input", [])
    END IF

    primary = input.features[0]
    secondary = input.features[1]

    primary_coords = primary.geometry.coordinates
    primary_times = primary.properties.times
    secondary_coords = secondary.geometry.coordinates
    secondary_times = secondary.properties.times

    // Validate tracks have positions
    IF primary_coords IS EMPTY OR primary_times IS EMPTY:
        RETURN build_error("Primary track has no positions", "invalid_input", [primary.id])
    END IF

    IF secondary_coords IS EMPTY OR secondary_times IS EMPTY:
        RETURN build_error("Secondary track has no positions", "invalid_input", [secondary.id])
    END IF

    // Validate selected position index
    IF selected_position_index < 0 OR selected_position_index >= LENGTH(primary_coords):
        RETURN build_error(
            "Selected position index " + selected_position_index + " out of range [0, " + (LENGTH(primary_coords) - 1) + "]",
            "invalid_input",
            [primary.id]
        )
    END IF

    // Extract selected position
    selected_coords = primary_coords[selected_position_index]
    selected_time = primary_times[selected_position_index]

    // Step 1: Temporal matching — find closest-in-time position on secondary track
    best_index = 0
    best_delta = ABS(secondary_times[0] - selected_time)

    FOR i = 1 TO LENGTH(secondary_times) - 1:
        delta = ABS(secondary_times[i] - selected_time)
        IF delta < best_delta:
            best_index = i
            best_delta = delta
        END IF
        // On tie (delta == best_delta), keep earlier index (lower i) — no update
    END FOR

    matched_coords = secondary_coords[best_index]
    matched_time = secondary_times[best_index]

    // Step 2: Calculate range using Haversine
    range_nm = haversine_distance_nm(selected_coords, matched_coords)

    // Step 3: Calculate bearing using forward azimuth
    bearing_deg = initial_bearing_deg(selected_coords, matched_coords)

    // Build measurement result
    measurement = {
        range_nm: ROUND(range_nm, 2),
        bearing_deg: ROUND(bearing_deg, 1),
        selected_track: primary.id,
        selected_position_index: selected_position_index,
        selected_time: selected_time,
        selected_coordinates: selected_coords,
        matched_track: secondary.id,
        matched_position_index: best_index,
        matched_time: matched_time,
        matched_coordinates: matched_coords,
        time_delta_ms: best_delta
    }

    // Build artifact response
    content_items = build_artifact(
        data: measurement,
        mime: "application/json",
        result_subtype: "measurement/position_range_bearing",
        source_feature_ids: [primary.id, secondary.id],
        label: "Range " + measurement.range_nm + " nm, bearing " +
               FORMAT_BEARING(measurement.bearing_deg) + "° from " +
               primary.id + "/positions/" + selected_position_index +
               " to " + secondary.id + "/positions/" + best_index
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION haversine_distance_nm(coord1: [lon, lat], coord2: [lon, lat]) -> float:
    // Returns great-circle distance in nautical miles
    // Earth radius: 3440.065 nm
    lat1 = TO_RADIANS(coord1[1])
    lat2 = TO_RADIANS(coord2[1])
    dlat = TO_RADIANS(coord2[1] - coord1[1])
    dlon = TO_RADIANS(coord2[0] - coord1[0])

    a = SIN(dlat / 2) ^ 2 + COS(lat1) * COS(lat2) * SIN(dlon / 2) ^ 2
    c = 2 * ASIN(SQRT(a))

    RETURN c * 3440.065
END FUNCTION

FUNCTION initial_bearing_deg(from: [lon, lat], to: [lon, lat]) -> float:
    // Returns initial bearing in degrees [0, 360)
    lat1 = TO_RADIANS(from[1])
    lat2 = TO_RADIANS(to[1])
    dlon = TO_RADIANS(to[0] - from[0])

    x = SIN(dlon) * COS(lat2)
    y = COS(lat1) * SIN(lat2) - SIN(lat1) * COS(lat2) * COS(dlon)

    bearing_rad = ATAN2(x, y)
    bearing_deg = TO_DEGREES(bearing_rad)

    RETURN (bearing_deg + 360) MOD 360
END FUNCTION

FUNCTION FORMAT_BEARING(deg: float) -> string:
    // Format bearing as 3-digit string with 1 decimal: "032.7"
    RETURN ZERO_PAD(deg, 3, 1)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_artifact(data, mime, subtype, sources, label)` | `artifact/*` | Producing measurement results |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |

### Complexity

- **Time**: O(N) where N = number of positions on the secondary track (linear scan for temporal match)
- **Space**: O(1) — constant memory for coordinates and result

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required" |
| Primary track has no positions | Return error: `invalid_input`, "Primary track has no positions" |
| Secondary track has no positions | Return error: `invalid_input`, "Secondary track has no positions" |
| Selected position index out of range | Return error: `invalid_input`, "Selected position index N out of range [0, M]" |
| Secondary track has only 1 position | That position is always matched regardless of time difference |
| Two positions equidistant in time | Earlier position (lower index) is used as tiebreaker |
| Identical coordinates (range = 0) | Return range 0.0 nm, bearing 0.0 degrees |
| Identical timestamps (exact match) | Normal operation — exact match is the ideal case |
| No temporal overlap (large time gap) | Still matches closest position — no minimum proximity requirement |
| Negative selected_position_index | Return error: `invalid_input`, index out of range |

## Examples

### Basic Example

**Input**: `position-range-bearing.basic.input.json`
**Output**: `position-range-bearing.basic.output.json`

Description: Track-alpha has 3 positions; selected position index 1 is at [-1.0, 50.0] with timestamp 2024-01-15T10:30:00Z. Track-bravo has 3 positions at different times. The closest-in-time position on track-bravo is index 1 at [-0.95, 50.05] (1 minute later). Returns range 3.57 nm, bearing 32.7 degrees.

### Single-Position Edge Case

**Input**: `position-range-bearing.single-position.input.json`
**Output**: `position-range-bearing.single-position.output.json`

Description: Track-alpha position 0 at [-2.0, 51.0] at 08:00:00Z. Track-bravo has only 1 position at [-1.5, 51.5] at 15:00:00Z (7 hours later). The single position is always matched. Returns range 35.42 nm, bearing 31.8 degrees.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "Secondary track has no positions",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": ["track-bravo"]
    }
  }
}
```

## Registration

A new tool must be wired into **three** places to be available across all frontends:

### 1. Python (debrief-calc MCP server)

```
services/calc/debrief_calc/tools/__init__.py          # imports track
  → tools/track/__init__.py                            # imports measurement package
    → tools/track/measurement/__init__.py              # imports tool module
      → tools/track/measurement/position_range_bearing.py  # @tool decorator registers on import
```

### 2. TypeScript (VS Code extension)

```
apps/vscode/src/tools/track/measurement/positionRangeBearing.ts     # toolDefinition + execute
apps/vscode/src/tools/track/measurement/index.ts                    # barrel re-export
```

### 3. Web-shell (browser-only registry)

```
apps/web-shell/src/services/toolService.ts    # import and toolRegistry.set() entry
```

## Changelog

### 1.0 (2026-02-17)
- Initial release
- Snap-to-nearest temporal matching (no interpolation)
- Haversine range calculation, forward-azimuth bearing
- Two golden I/O example pairs (basic + single-position edge case)

## References

**Related Tools**:
- [range-calc](./range-calc.1.0.md) — range between two tracks at a given time
- [bearing-calc](./bearing-calc.1.0.md) — bearing between two tracks at a given time
- [range-bearing (Python)](../../../../services/calc/debrief_calc/tools/range_bearing.py) — whole-track range/bearing time-series

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`
- `specs/041-document-tool-results/data-model.md` — ToolResponse format

**Dependencies**:
- [#049 Tool Documentation Model](../../../../specs/049-tool-documentation-model/spec.md) — template structure
- [#053 Nested Child Selection](../../../../specs/053-nested-child-selection/spec.md) — selection path format

**External**:
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) — great-circle distance
- [Forward azimuth](https://en.wikipedia.org/wiki/Azimuth#Calculating_azimuth) — initial bearing calculation
