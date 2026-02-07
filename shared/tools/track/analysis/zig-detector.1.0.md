---
name: zig-detector
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: Debrief.Wrappers.Track.SplitTracksIntoLegs
---

# Zig Detector

> Detect course-change events ("zigs") in a target track based on a configurable threshold angle.

## MCP

**Description**: Analyses a target track to detect significant course changes ("zig" events) where the course change between consecutive positions exceeds a configurable threshold angle. Reports each zig event with timing, position, and course change details, along with aggregate statistics.

**When to use**: When the user wants to identify manoeuvre points in a target track, detect zig-zag evasion patterns, split a track into constant-course legs, or assess how frequently a target changes course. Requires at least two tracks (ownship and target) in the input; analysis is performed on non-ownship tracks.

**Parameters**:
- `features`: FeatureCollection containing an ownship track (with `is_ownship=true`) and one or more target tracks to analyse
- `course_change_threshold_deg`: Minimum absolute course change in degrees to qualify as a zig event (e.g., 30.0)

**Returns**: ToolResponse containing one analysis result per target track with zig event details, total count, and mean zig interval.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `is_ownship == true` and `kind == "TRACK"` required (provides context)
- At least one non-ownship feature with `kind == "TRACK"` required (the target to analyse)
- Each position must have a `course` property
- `course_change_threshold_deg` must be a positive number

**Defaults**:
- `course_change_threshold_deg`: `30.0` if not specified

## Outputs

Returns a **ToolResponse** with one or more analysis content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `analysis/zig_detection`

**Content Items**: One content item per target track containing:
- `type`: "resource"
- `uri`: `analysis://zig-detection-{track-id}`
- `mimeType`: "application/json"
- `text`: Serialized analysis object with:
  - `track_id`: ID of the analysed target track
  - `platform_name`: Name of the analysed platform
  - `course_change_threshold_deg`: Threshold used
  - `zig_events[]`: Array of detected zig events, each with:
    - `zig_index`: 1-based sequential index
    - `start_time`: Time of the last position before the course change
    - `end_time`: Time of the first position after the course change
    - `course_before`: Course at `start_time`
    - `course_after`: Course at `end_time`
    - `course_change_deg`: Signed course change (after - before, normalised to [-180, 180])
    - `position_at_zig`: Coordinates at `start_time`
  - `total_zigs`: Count of detected zig events
  - `mean_zig_interval_seconds`: Mean time between consecutive zig start times (null if fewer than 2 zigs)
  - `analysis_period`: `{start, end}` timestamps of the analysed track
  - `note`: (optional) Explanatory note when analysis could not be fully performed

**Annotations** (on each content item):
- `debrief:resultType`: `"analysis/zig_detection"`
- `debrief:sourceFeatures`: IDs of the target track and ownship track
- `debrief:label`: `"Detected {n} zig events in {platform_name} (threshold={t} deg, mean interval={i}s)"` or `"No zig events detected in {platform_name} (threshold={t} deg)"` or `"Insufficient data for zig detection in {platform_name} ({p} position)"`

## Algorithm

```pseudocode
FUNCTION zig_detector(features: FeatureCollection,
                       course_change_threshold_deg: float) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF course_change_threshold_deg IS NULL:
        course_change_threshold_deg = 30.0
    END IF

    IF course_change_threshold_deg <= 0:
        RETURN build_error("course_change_threshold_deg must be positive", "invalid_input", [])
    END IF

    // Identify ownship and target tracks
    ownship = NULL
    targets = empty list

    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            IF feature.properties.is_ownship == true:
                ownship = feature
            ELSE:
                targets.append(feature)
            END IF
        END IF
    END FOR

    IF ownship IS NULL:
        RETURN build_error("No ownship track found (is_ownship=true required)", "invalid_input", [])
    END IF

    IF targets IS EMPTY:
        RETURN build_error("No target tracks found for zig analysis", "invalid_input", [ownship.id])
    END IF

    // Analyse each target track
    content_items = empty list

    FOR EACH target IN targets:
        positions = target.properties.positions
        source_ids = [target.id, ownship.id]

        analysis_period = {
            start: target.properties.start_time,
            end: target.properties.end_time
        }

        // Check minimum position count
        IF LENGTH(positions) < 3:
            // Insufficient data -- return result with note, not an error
            result = {
                track_id: target.id,
                platform_name: target.properties.platform_name,
                course_change_threshold_deg: course_change_threshold_deg,
                zig_events: [],
                total_zigs: 0,
                mean_zig_interval_seconds: NULL,
                analysis_period: analysis_period,
                note: "Insufficient positions (" + LENGTH(positions) + ") for zig detection; minimum 3 required"
            }

            item = build_analysis_item(
                data: SERIALIZE(result),
                uri: "analysis://zig-detection-" + target.id,
                result_subtype: "analysis/zig_detection",
                source_feature_ids: source_ids,
                label: "Insufficient data for zig detection in " + target.properties.platform_name + " (" + LENGTH(positions) + " position)"
            )
            content_items.append(item)
            CONTINUE
        END IF

        // Detect zig events by comparing consecutive course values
        zig_events = empty list
        zig_index = 1

        FOR i FROM 0 TO LENGTH(positions) - 2:
            course_before = positions[i].course
            course_after = positions[i + 1].course

            // Compute signed course change, normalised to [-180, 180]
            course_change = normalize_angle(course_after - course_before)

            IF ABS(course_change) >= course_change_threshold_deg:
                zig_events.append({
                    zig_index: zig_index,
                    start_time: positions[i].time,
                    end_time: positions[i + 1].time,
                    course_before: course_before,
                    course_after: course_after,
                    course_change_deg: course_change,
                    position_at_zig: positions[i].coordinates
                })
                zig_index = zig_index + 1
            END IF
        END FOR

        // Compute mean zig interval
        mean_interval = NULL
        IF LENGTH(zig_events) >= 2:
            intervals = empty list
            FOR j FROM 1 TO LENGTH(zig_events) - 1:
                interval = time_difference_seconds(zig_events[j].start_time, zig_events[j - 1].start_time)
                intervals.append(interval)
            END FOR
            mean_interval = ROUND(MEAN(intervals))
        END IF

        // Build analysis result
        result = {
            track_id: target.id,
            platform_name: target.properties.platform_name,
            course_change_threshold_deg: course_change_threshold_deg,
            zig_events: zig_events,
            total_zigs: LENGTH(zig_events),
            mean_zig_interval_seconds: mean_interval,
            analysis_period: analysis_period
        }

        // Build label
        IF LENGTH(zig_events) == 0:
            label = "No zig events detected in " + target.properties.platform_name + " (threshold=" + course_change_threshold_deg + " deg)"
        ELSE:
            label = "Detected " + LENGTH(zig_events) + " zig events in " + target.properties.platform_name + " (threshold=" + course_change_threshold_deg + " deg, mean interval=" + mean_interval + "s)"
        END IF

        item = build_analysis_item(
            data: SERIALIZE(result),
            uri: "analysis://zig-detection-" + target.id,
            result_subtype: "analysis/zig_detection",
            source_feature_ids: source_ids,
            label: label
        )
        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION

FUNCTION normalize_angle(angle: float) -> float:
    // Normalise angle to range [-180, 180]
    WHILE angle > 180: angle = angle - 360
    WHILE angle < -180: angle = angle + 360
    RETURN angle
END FUNCTION
```

### Complexity

- **Time**: O(t * p) -- iterates over t target tracks with p positions each
- **Space**: O(z) -- stores z detected zig events (z <= p - 1)

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No ownship track | Return error: `invalid_input`, "No ownship track found" |
| No target tracks (only ownship) | Return error: `invalid_input`, "No target tracks found for zig analysis" |
| Target with fewer than 3 positions | Return analysis result (not error) with empty zig_events, `total_zigs=0`, and `note` explaining insufficient positions |
| Target with constant course (no zigs) | Return analysis result with empty zig_events, `total_zigs=0`, `mean_zig_interval_seconds=null` |
| Course change exactly at threshold | Counted as a zig event (comparison is `>=`) |
| Course change wrapping around 0/360 boundary | `normalize_angle` handles wrap-around (e.g., 350 to 10 = +20, not -340) |
| Single zig event | `mean_zig_interval_seconds` is null (need at least 2 zigs to compute interval) |
| Negative threshold value | Return error: `invalid_input`, "course_change_threshold_deg must be positive" |

## Examples

### Basic Usage

**Input**: `zig-detector.basic.input.json`
**Output**: `zig-detector.basic.output.json`

Description: Analyses a target track (Target Bravo) with 10 positions containing 4 course changes exceeding the 30-degree threshold (180->100, 100->180, 180->260, 260->180). Reports 4 zig events with mean interval of 120 seconds.

### Edge Case: No Zigs Detected

**Input**: `zig-detector.edge-1.input.json`
**Output**: `zig-detector.edge-1.output.json`

Description: Target track maintains near-constant course (180 to 181 degrees). The 1-degree change is well below the 30-degree threshold. Returns empty zig_events with `total_zigs=0`.

### Edge Case: Insufficient Positions

**Input**: `zig-detector.edge-2.input.json`
**Output**: `zig-detector.edge-2.output.json`

Description: Target track has only 1 position, which is insufficient for course change detection (minimum 3 required). Returns a result with a `note` field explaining the limitation, rather than an error.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Detects zig events based on configurable course-change threshold
- Reports signed course changes normalised to [-180, 180]
- Computes mean zig interval for pattern analysis
- Gracefully handles insufficient data with explanatory notes rather than errors

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [show-time-variable-plot](./show-time-variable-plot.1.0.md) - Visualise course vs time to see zig patterns graphically
- [xy-plot-generator](./xy-plot-generator.1.0.md) - General-purpose plot generation for track data

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Wrappers.Track.SplitTracksIntoLegs` (zig-detection analysis component)

**External**:
- [Course (navigation)](https://en.wikipedia.org/wiki/Course_(navigation)) - Definition of course as used in maritime navigation
