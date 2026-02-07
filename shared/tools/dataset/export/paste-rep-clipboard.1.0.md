---
name: paste-rep-clipboard
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GeneratePasteRepClipboard
---

# Paste REP Clipboard

> Import track data from REP format text, parsing position fixes into one or more new track features.

## MCP

**Description**: Parses REP-formatted text (typically from clipboard) into track features. Each line contains a position fix with platform name, date/time, lat, lon, course, speed, and depth. Lines are grouped by platform name to create separate track features.

**When to use**: When the user wants to import track data from REP format text pasted from the clipboard, create tracks from REP-formatted position data, or quickly add track data without loading a file.

**Parameters**:
- `clipboard_text`: REP-formatted text string containing one or more position fix lines

**Returns**: ToolResponse containing one or more new track features created from the parsed REP data.

## Inputs

**Schema**: N/A (raw REP text input, not GeoJSON)

**Constraints**:
- `clipboard_text` must contain at least one valid REP position fix line
- REP format: `;SYM: {platform} {YYMMDD} {HHMMSS} {lat_deg} {lat_min} {lat_sec} {N/S} {lon_deg} {lon_min} {lon_sec} {E/W} {course} {speed} {depth}`
- Lines not matching REP format are silently ignored

**Defaults**:
- `track_type`: "SURFACE" (depth > 0 implies subsurface but track_type defaults to SURFACE)

## Outputs

Returns a **ToolResponse** with one or more addition content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/track/imported`

**Content Items**: One `AdditionResult` per unique platform name, containing:
- `type`: "resource"
- `uri`: `feature://imported-track-{n}`
- `mimeType`: "application/geo+json"
- `text`: Serialized new TrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/track/imported"`
- `debrief:sourceFeatures`: `[]` (no source features -- data is external)
- `debrief:label`: `"Imported track {platform_name} from REP clipboard ({n} positions)"`

## Algorithm

```pseudocode
FUNCTION paste_rep_clipboard(clipboard_text: string) -> ToolResponse:
    // Validate inputs
    IF clipboard_text IS NULL OR clipboard_text IS EMPTY:
        RETURN build_error("clipboard_text is required", "invalid_input", [])
    END IF

    // Parse REP lines
    lines = SPLIT(clipboard_text, newline)
    positions_by_platform = empty map  // platform_name -> list of positions

    FOR EACH line IN lines:
        line = TRIM(line)

        // Skip empty lines and non-REP lines
        IF line IS EMPTY OR NOT line STARTS_WITH ";SYM:":
            CONTINUE
        END IF

        // Parse REP format fields
        fields = SPLIT(line, whitespace)
        // Expected: ;SYM: platform YYMMDD HHMMSS lat_deg lat_min lat_sec N/S lon_deg lon_min lon_sec E/W course speed depth

        IF LENGTH(fields) < 15:
            CONTINUE  // Malformed line, skip
        END IF

        platform = fields[1]
        date_str = fields[2]      // YYMMDD
        time_str = fields[3]      // HHMMSS

        lat_deg = PARSE_INT(fields[4])
        lat_min = PARSE_INT(fields[5])
        lat_sec = PARSE_FLOAT(fields[6])
        lat_hemisphere = fields[7]  // N or S

        lon_deg = PARSE_INT(fields[8])
        lon_min = PARSE_INT(fields[9])
        lon_sec = PARSE_FLOAT(fields[10])
        lon_hemisphere = fields[11]  // E or W

        course = PARSE_FLOAT(fields[12])
        speed = PARSE_FLOAT(fields[13])
        depth = PARSE_FLOAT(fields[14])

        // Convert to decimal degrees
        lat = lat_deg + lat_min / 60.0 + lat_sec / 3600.0
        IF lat_hemisphere == "S":
            lat = -lat
        END IF

        lon = lon_deg + lon_min / 60.0 + lon_sec / 3600.0
        IF lon_hemisphere == "W":
            lon = -lon
        END IF

        // Convert date/time to ISO 8601
        timestamp = parse_rep_datetime(date_str, time_str)

        position = {
            time: timestamp,
            coordinates: [lon, lat],
            course: course,
            speed: speed,
            depth: depth
        }

        IF platform NOT IN positions_by_platform:
            positions_by_platform[platform] = empty list
        END IF
        positions_by_platform[platform].append(position)
    END FOR

    IF positions_by_platform IS EMPTY:
        RETURN build_error("No valid REP position fixes found in clipboard text", "invalid_input", [])
    END IF

    // Create track features grouped by platform
    content_items = empty list
    track_counter = 1

    FOR EACH platform, positions IN positions_by_platform:
        // Sort positions by time
        sorted_positions = SORT(positions, BY position.time ASCENDING)

        // Build geometry
        coordinates = [pos.coordinates FOR pos IN sorted_positions]
        IF LENGTH(coordinates) == 1:
            geometry = {type: "Point", coordinates: coordinates[0]}
        ELSE:
            geometry = {type: "LineString", coordinates: coordinates}
        END IF

        start_time = sorted_positions[0].time
        end_time = sorted_positions[LAST].time

        track = {
            type: "Feature",
            id: "imported-track-" + ZERO_PAD(track_counter, 3),
            geometry: geometry,
            properties: {
                kind: "TRACK",
                platform_id: platform,
                platform_name: platform,
                track_type: "SURFACE",
                start_time: start_time,
                end_time: end_time,
                positions: sorted_positions
            }
        }

        item = build_addition_item(
            feature: track,
            result_subtype: "track/imported",
            source_feature_ids: [],
            label: "Imported track " + platform + " from REP clipboard (" + LENGTH(sorted_positions) + " positions)"
        )
        content_items.append(item)
        track_counter = track_counter + 1
    END FOR

    RETURN build_response(content_items)
END FUNCTION

FUNCTION parse_rep_datetime(date_str: string, time_str: string) -> string:
    // date_str format: YYMMDD -> 20YY-MM-DD (assumes 2000s)
    year = 2000 + PARSE_INT(SUBSTRING(date_str, 0, 2))
    month = SUBSTRING(date_str, 2, 4)
    day = SUBSTRING(date_str, 4, 6)

    // time_str format: HHMMSS
    hours = SUBSTRING(time_str, 0, 2)
    minutes = SUBSTRING(time_str, 2, 4)
    seconds = SUBSTRING(time_str, 4, 6)

    RETURN year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z"
END FUNCTION
```

### Complexity

- **Time**: O(n log n) -- n lines parsed, sorting positions per platform dominates
- **Space**: O(n) -- stores all parsed positions

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty or null clipboard_text | Return error response: `invalid_input`, "clipboard_text is required" |
| No valid REP lines in text | Return error response: `invalid_input`, "No valid REP position fixes found in clipboard text" |
| Single position for a platform | Create track with Point geometry instead of LineString |
| Multiple platforms in clipboard | Create separate track feature per platform |
| Malformed REP line (too few fields) | Skip the line silently, continue processing |
| Non-REP lines mixed in (comments, blanks) | Skip silently, process only `;SYM:` lines |
| Southern hemisphere coordinates | Negate latitude for `S` hemisphere |
| Eastern hemisphere coordinates | Longitude remains positive for `E` hemisphere |
| Positions not in chronological order | Sort by time before creating track |
| Depth > 0 | Store depth value; track_type remains "SURFACE" (track_type inference is out of scope) |

## Examples

### Basic Usage

**Input**: `paste-rep-clipboard.basic.input.json`
**Output**: `paste-rep-clipboard.basic.output.json`

Description: Parses 2 REP position fix lines for VESSEL-A, creating a single track with 2 positions.

### Edge Case: Single Position

**Input**: `paste-rep-clipboard.edge.input.json`
**Output**: `paste-rep-clipboard.edge.output.json`

Description: Parses a single REP line, creating a track with Point geometry and 1 position.

### Complex: Multiple Platforms

**Input**: `paste-rep-clipboard.complex.input.json`
**Output**: `paste-rep-clipboard.complex.output.json`

Description: Parses 6 REP lines for 2 platforms (OWNSHIP with 3 positions, TARGET-1 with 3 positions), creating 2 separate track features.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Parses standard REP position fix format
- Groups positions by platform name
- Supports both hemispheres

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-track-as-csv](./export-track-as-csv.1.0.md) - Export track data as CSV

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition (output)

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GeneratePasteRepClipboard`

**External**:
- Debrief REP file format specification
