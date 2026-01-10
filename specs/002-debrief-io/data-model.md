# Data Model: debrief-io

**Feature**: File Parsing Service
**Date**: 2026-01-10
**Status**: Complete

## Overview

The debrief-io service is a pure transformation layer. It consumes file content and produces validated GeoJSON features. The data model defines the intermediate structures used during parsing and the contracts for parser output.

## Entity Definitions

### ParseResult

Container for successful parse operation results.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| features | list[Feature] | Yes | Parsed and validated GeoJSON features |
| warnings | list[ParseWarning] | Yes | Non-fatal issues encountered (empty if none) |
| source_file | str | Yes | Absolute path to source file |
| encoding | str | Yes | Detected file encoding (utf-8 or latin-1) |
| parse_time_ms | float | Yes | Parse duration in milliseconds |
| handler | str | Yes | Handler name that processed the file |

**Notes**:
- `features` contains TrackFeature, ReferenceLocation, or SensorContact instances
- All features are validated against Stage 0 Pydantic models before inclusion
- `warnings` is empty list if no warnings, never None

### ParseWarning

Non-fatal issue encountered during parsing.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | str | Yes | Human-readable warning description |
| line_number | int | No | Source file line number (if applicable) |
| field | str | No | Field name (if validation warning) |
| code | str | Yes | Warning code (e.g., "UNKNOWN_RECORD", "INVALID_COORD") |

**Warning Codes**:
- `UNKNOWN_RECORD` - Unrecognized record type, line skipped
- `INVALID_COORD` - Coordinate out of valid range
- `INVALID_TIMESTAMP` - Unparseable timestamp format
- `ENCODING_FALLBACK` - File decoded as Latin-1 (not UTF-8)
- `TRUNCATED_RECORD` - Incomplete record at end of file
- `MISSING_FIELD` - Optional field missing or empty
- `TIMEZONE_ASSUMED` - No timezone in timestamp, UTC assumed

### ParseError (Exception)

Fatal error preventing parsing completion.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | str | Yes | Error description |
| line_number | int | No | Line where error occurred |
| field | str | No | Field that caused error |
| cause | Exception | No | Underlying exception if any |

### UnsupportedFormatError (Exception)

File format not recognized by any registered handler.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| extension | str | Yes | File extension that was not recognized |
| supported | list[str] | Yes | List of supported extensions |

### HandlerInfo

Metadata about a registered file handler.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| extension | str | Yes | File extension (lowercase, with dot) |
| name | str | Yes | Handler display name |
| description | str | Yes | Handler description |
| version | str | Yes | Handler version |

## Output Entities (from Stage 0)

The parser produces instances of these Stage 0 schema entities:

### TrackFeature

GeoJSON Feature representing a vessel track. Defined in `debrief-schemas`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | "Feature" | Yes | GeoJSON type discriminator |
| id | str | Yes | Unique identifier (UUID) |
| geometry | GeoJSONLineString | Yes | Track path |
| properties | TrackProperties | Yes | Track metadata |
| bbox | list[float] | No | Bounding box [minLon, minLat, maxLon, maxLat] |

### TrackProperties

Properties for a TrackFeature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform_id | str | Yes | Platform/vessel identifier |
| platform_name | str | No | Human-readable name |
| track_type | TrackTypeEnum | Yes | OWNSHIP, CONTACT, REFERENCE, SOLUTION |
| start_time | datetime | Yes | Track start time (ISO8601) |
| end_time | datetime | Yes | Track end time (ISO8601) |
| positions | list[TimestampedPosition] | Yes | Position array (min 2) |
| source_file | str | No | Original source file path |
| color | str | No | Display color (CSS color) |

### ReferenceLocation

GeoJSON Feature for fixed reference points. Defined in `debrief-schemas`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | "Feature" | Yes | GeoJSON type discriminator |
| id | str | Yes | Unique identifier |
| geometry | GeoJSONPoint | Yes | Location point |
| properties | ReferenceLocationProperties | Yes | Location metadata |

### ReferenceLocationProperties

Properties for a ReferenceLocation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | str | Yes | Reference location name |
| location_type | LocationTypeEnum | Yes | WAYPOINT, EXERCISE_AREA, etc. |
| description | str | No | Additional description |
| symbol | str | No | Map symbol identifier |
| color | str | No | Display color (CSS color) |

### SensorContact (Future)

GeoJSON Feature for sensor detections. To be added in Stage 0 schemas.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | "Feature" | Yes | GeoJSON type discriminator |
| id | str | Yes | Unique identifier |
| geometry | GeoJSONPoint | Yes | Contact location/estimate |
| properties | SensorContactProperties | Yes | Contact metadata |

### SensorContactProperties (Future)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| parent_track_id | str | Yes | ID of track that detected contact |
| timestamp | datetime | Yes | Detection time |
| bearing | float | Yes | Bearing in degrees (0-360) |
| range | float | No | Range in meters (if available) |
| classification | str | No | Contact classification |

## Type Aliases

```python
# Path to a file to parse
FilePath = Path | str

# Any feature type output by parser
Feature = TrackFeature | ReferenceLocation  # | SensorContact when added

# Handler class type
HandlerClass = type["BaseHandler"]
```

## State Transitions

### Parse Operation Flow

```
[File Path] → detect_encoding() → [Content, Encoding]
                                         ↓
[Content] → get_handler(ext) → [Handler]
                                    ↓
[Handler] → parse() → [Raw Records]
                            ↓
[Records] → validate() → [Features] or [Warnings]
                              ↓
[Features + Warnings] → ParseResult
```

### Handler Registration Flow

```
[Handler Class] → register_handler(ext, cls) → [Registry Updated]
                                                      ↓
[File Path] → get_handler(ext) → [Handler Instance]
```

## Validation Rules

### Coordinate Validation
- Longitude: -180.0 to 180.0 (inclusive)
- Latitude: -90.0 to 90.0 (inclusive)
- Invalid coordinates: skip position, add warning

### Timestamp Validation
- Must be parseable as datetime
- If no timezone: assume UTC, add warning
- Future dates: allowed (exercise planning)
- Invalid timestamp: skip record, add warning

### Track Validation
- Minimum 2 positions required
- Positions must be chronologically ordered
- platform_id must be non-empty
- track_type must be valid enum value

### Reference Location Validation
- name must be non-empty
- location_type must be valid enum value
- coordinates must be valid

## Relationships

```
ParseResult
    ├── 1:N → TrackFeature
    ├── 1:N → ReferenceLocation
    └── 1:N → ParseWarning

TrackFeature
    └── 1:N → TimestampedPosition

Handler Registry
    └── ext:1 → HandlerClass
```

## Schema Compliance

All output features MUST validate against Stage 0 Pydantic models:
- `debrief_schemas.TrackFeature`
- `debrief_schemas.ReferenceLocation`

Validation occurs during parsing, not as a separate step. Invalid data raises ParseError or adds ParseWarning depending on severity.
