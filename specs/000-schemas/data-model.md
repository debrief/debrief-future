# Data Model: Schema Foundation

**Feature**: 000-schemas | **Date**: 2026-01-09
**Purpose**: Define entity structures, relationships, and validation rules for the Debrief schema foundation.

---

## Overview

This document defines the five core entity types required by the Schema Foundation feature. All entities follow GeoJSON conventions where applicable and include maritime-specific extensions.

```
┌─────────────────────────────────────────────────────────────────┐
│                         PlotMetadata                             │
│  (STAC Item properties for a Debrief plot)                      │
├─────────────────────────────────────────────────────────────────┤
│ Contains:                                                        │
│   ├── TrackFeature[]        (vessel tracks)                     │
│   ├── SensorContact[]       (sensor detections, linked to track)│
│   └── ReferenceLocation[]   (fixed reference points)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         ToolMetadata                             │
│  (describes available analysis tools)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entity: TrackFeature

A GeoJSON Feature representing a vessel track with timestamped positions.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON type discriminator |
| `id` | `string` | Yes | Unique identifier (UUID) |
| `geometry` | `LineString` | Yes | Track path as GeoJSON LineString |
| `properties` | `TrackProperties` | Yes | Track metadata |
| `bbox` | `number[4]` | No | Bounding box [minLon, minLat, maxLon, maxLat] |

### TrackProperties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform_id` | `string` | Yes | Platform/vessel identifier |
| `platform_name` | `string` | No | Human-readable platform name |
| `track_type` | `TrackTypeEnum` | Yes | Type of track (see enum below) |
| `start_time` | `datetime` | Yes | Track start time (ISO8601) |
| `end_time` | `datetime` | Yes | Track end time (ISO8601) |
| `positions` | `TimestampedPosition[]` | Yes | Array of timestamped positions |
| `source_file` | `string` | No | Original source file path |
| `color` | `string` | No | Display color (CSS color string) |

### TrackTypeEnum

| Value | Description |
|-------|-------------|
| `OWNSHIP` | Own ship track |
| `CONTACT` | Contact/target track |
| `REFERENCE` | Reference track |
| `SOLUTION` | Solution/analysis track |

### TimestampedPosition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `time` | `datetime` | Yes | Position timestamp (ISO8601) |
| `coordinates` | `number[2]` | Yes | [longitude, latitude] |
| `depth` | `number` | No | Depth in meters (negative = below surface) |
| `course` | `number` | No | Course in degrees (0-360) |
| `speed` | `number` | No | Speed in knots |

### Validation Rules

1. `geometry.coordinates` must match the coordinates in `properties.positions`
2. `start_time` must be <= `end_time`
3. `positions` array must be ordered by time
4. `positions` array must have at least 2 elements

### Example (Valid)

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-5.0, 50.0],
      [-4.9, 50.1],
      [-4.8, 50.2]
    ]
  },
  "properties": {
    "platform_id": "HMS-EXAMPLE",
    "platform_name": "HMS Example",
    "track_type": "OWNSHIP",
    "start_time": "2026-01-09T10:00:00Z",
    "end_time": "2026-01-09T12:00:00Z",
    "positions": [
      {"time": "2026-01-09T10:00:00Z", "coordinates": [-5.0, 50.0], "course": 45, "speed": 12},
      {"time": "2026-01-09T11:00:00Z", "coordinates": [-4.9, 50.1], "course": 45, "speed": 12},
      {"time": "2026-01-09T12:00:00Z", "coordinates": [-4.8, 50.2], "course": 45, "speed": 12}
    ]
  }
}
```

---

## Entity: SensorContact

A GeoJSON Feature representing a sensor detection, linked to a parent track.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON type discriminator |
| `id` | `string` | Yes | Unique identifier (UUID) |
| `geometry` | `Point` | Yes | Contact position as GeoJSON Point |
| `properties` | `SensorContactProperties` | Yes | Contact metadata |

### SensorContactProperties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parent_track_id` | `string` | Yes | ID of parent TrackFeature |
| `sensor_type` | `SensorTypeEnum` | Yes | Type of sensor |
| `time` | `datetime` | Yes | Detection timestamp (ISO8601) |
| `bearing` | `number` | No | Bearing in degrees (0-360) |
| `bearing_error` | `number` | No | Bearing error in degrees |
| `range` | `number` | No | Range in nautical miles |
| `range_error` | `number` | No | Range error in nautical miles |
| `frequency` | `number` | No | Frequency in Hz (for acoustic) |
| `label` | `string` | No | User-assigned label |
| `color` | `string` | No | Display color |

### SensorTypeEnum

| Value | Description |
|-------|-------------|
| `SONAR_ACTIVE` | Active sonar |
| `SONAR_PASSIVE` | Passive sonar |
| `RADAR` | Radar |
| `ESM` | Electronic Support Measures |
| `VISUAL` | Visual observation |
| `AIS` | Automatic Identification System |
| `OTHER` | Other sensor type |

### Validation Rules

1. `parent_track_id` must reference an existing TrackFeature
2. `bearing` must be in range [0, 360)
3. `range` must be non-negative if present
4. If `bearing` is provided without `range`, contact is a bearing-only detection

### Example (Valid)

```json
{
  "type": "Feature",
  "id": "contact-001",
  "geometry": {
    "type": "Point",
    "coordinates": [-4.95, 50.05]
  },
  "properties": {
    "parent_track_id": "track-001",
    "sensor_type": "SONAR_PASSIVE",
    "time": "2026-01-09T10:30:00Z",
    "bearing": 135,
    "bearing_error": 2,
    "frequency": 150,
    "label": "Possible submarine"
  }
}
```

---

## Entity: ReferenceLocation

A GeoJSON Feature for fixed reference points (exercise area markers, waypoints, etc.).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON type discriminator |
| `id` | `string` | Yes | Unique identifier |
| `geometry` | `Point \| Polygon` | Yes | Location or area |
| `properties` | `ReferenceLocationProperties` | Yes | Reference metadata |

### ReferenceLocationProperties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Reference location name |
| `location_type` | `LocationTypeEnum` | Yes | Type of reference |
| `description` | `string` | No | Additional description |
| `symbol` | `string` | No | Map symbol identifier |
| `color` | `string` | No | Display color |
| `valid_from` | `datetime` | No | Start of validity period |
| `valid_until` | `datetime` | No | End of validity period |

### LocationTypeEnum

| Value | Description |
|-------|-------------|
| `WAYPOINT` | Navigation waypoint |
| `EXERCISE_AREA` | Exercise area boundary |
| `DANGER_AREA` | Danger/exclusion zone |
| `ANCHORAGE` | Anchorage location |
| `PORT` | Port/harbor |
| `REFERENCE` | Generic reference point |

### Validation Rules

1. If `valid_from` and `valid_until` are both present, `valid_from` <= `valid_until`
2. For `location_type: EXERCISE_AREA` or `DANGER_AREA`, geometry should be Polygon

### Example (Valid)

```json
{
  "type": "Feature",
  "id": "ref-001",
  "geometry": {
    "type": "Point",
    "coordinates": [-5.5, 50.0]
  },
  "properties": {
    "name": "Alpha Waypoint",
    "location_type": "WAYPOINT",
    "description": "Start of exercise track",
    "symbol": "waypoint-circle"
  }
}
```

---

## Entity: PlotMetadata

STAC Item properties for a Debrief plot. Extends STAC Item conventions.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique plot identifier |
| `title` | `string` | Yes | Human-readable plot title |
| `description` | `string` | No | Plot description |
| `datetime` | `datetime` | No | Single datetime (if not range) |
| `start_datetime` | `datetime` | No | Start of temporal extent |
| `end_datetime` | `datetime` | No | End of temporal extent |
| `created` | `datetime` | Yes | Plot creation timestamp |
| `updated` | `datetime` | Yes | Last update timestamp |
| `source_files` | `SourceFile[]` | Yes | List of source files |
| `platform_ids` | `string[]` | No | Platforms included in plot |
| `exercise_name` | `string` | No | Exercise/operation name |
| `classification` | `string` | No | Security classification |

### SourceFile

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | `string` | Yes | Original filename |
| `format` | `string` | Yes | File format (e.g., "REP", "CSV") |
| `loaded_at` | `datetime` | Yes | When file was loaded |
| `sha256` | `string` | Yes | SHA256 hash of file contents |
| `asset_href` | `string` | Yes | Path to asset in STAC catalog |

### Validation Rules

1. Either `datetime` OR (`start_datetime` AND `end_datetime`) must be present
2. If both start/end present, `start_datetime` <= `end_datetime`
3. `source_files` must have at least one entry
4. `created` <= `updated`

### Example (Valid)

```json
{
  "id": "plot-2026-001",
  "title": "Exercise Neptune Analysis",
  "description": "Post-exercise analysis of submarine tracking",
  "start_datetime": "2026-01-09T08:00:00Z",
  "end_datetime": "2026-01-09T18:00:00Z",
  "created": "2026-01-10T09:00:00Z",
  "updated": "2026-01-10T09:00:00Z",
  "source_files": [
    {
      "filename": "ownship.rep",
      "format": "REP",
      "loaded_at": "2026-01-10T09:00:00Z",
      "sha256": "abc123...",
      "asset_href": "./assets/ownship.rep"
    }
  ],
  "platform_ids": ["HMS-EXAMPLE"],
  "exercise_name": "Neptune 26-1"
}
```

---

## Entity: ToolMetadata

Describes an analysis tool available in the calc service.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique tool identifier |
| `name` | `string` | Yes | Human-readable tool name |
| `description` | `string` | Yes | Tool description |
| `version` | `string` | Yes | Tool version |
| `category` | `ToolCategoryEnum` | Yes | Tool category |
| `selection_context` | `SelectionContextEnum[]` | Yes | Required selection types |
| `input_schema` | `object` | No | JSON Schema for tool inputs |
| `output_schema` | `object` | No | JSON Schema for tool outputs |
| `icon` | `string` | No | Icon identifier |

### ToolCategoryEnum

| Value | Description |
|-------|-------------|
| `GEOMETRY` | Geometric calculations |
| `KINEMATICS` | Speed, course, bearing calculations |
| `TACTICAL` | Tactical analysis |
| `EXPORT` | Data export |
| `TRANSFORM` | Data transformation |

### SelectionContextEnum

| Value | Description |
|-------|-------------|
| `SINGLE_TRACK` | Single track selected |
| `MULTIPLE_TRACKS` | Multiple tracks selected |
| `TIME_PERIOD` | Time period selected |
| `TRACK_SEGMENT` | Track segment selected |
| `SENSOR_CONTACT` | Sensor contact selected |
| `FEATURE_SET` | Arbitrary feature set selected |

### Validation Rules

1. `selection_context` must have at least one entry
2. `version` should follow semantic versioning (not enforced but recommended)

### Example (Valid)

```json
{
  "id": "calc-range-bearing",
  "name": "Range and Bearing",
  "description": "Calculate range and bearing between two points on selected tracks",
  "version": "1.0.0",
  "category": "GEOMETRY",
  "selection_context": ["MULTIPLE_TRACKS", "TIME_PERIOD"],
  "input_schema": {
    "type": "object",
    "properties": {
      "reference_track": {"type": "string"},
      "target_track": {"type": "string"},
      "time": {"type": "string", "format": "date-time"}
    },
    "required": ["reference_track", "target_track", "time"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "range_nm": {"type": "number"},
      "bearing_deg": {"type": "number"}
    }
  }
}
```

---

## Relationships

```
TrackFeature
    │
    ├─────< SensorContact (parent_track_id → TrackFeature.id)
    │
    └─────< ReferenceLocation (temporal overlap via valid_from/valid_until)

PlotMetadata
    │
    ├─────< TrackFeature (contained in plot's FeatureCollection)
    ├─────< SensorContact (contained in plot's FeatureCollection)
    └─────< ReferenceLocation (contained in plot's FeatureCollection)

ToolMetadata (standalone, references SelectionContextEnum for applicability)
```

---

## State Transitions

### PlotMetadata Lifecycle

```
┌──────────┐    load file    ┌──────────┐    add track    ┌──────────┐
│  EMPTY   │ ───────────────>│  LOADED  │ ───────────────>│  ACTIVE  │
└──────────┘                 └──────────┘                 └──────────┘
                                                                │
                                  ┌─────────────────────────────┘
                                  │  add analysis result
                                  v
                             ┌──────────┐    export     ┌──────────┐
                             │ ANALYZED │ ────────────> │ EXPORTED │
                             └──────────┘               └──────────┘
```

*Note: State is implicit based on contents, not an explicit field.*

---

## Cross-Cutting Concerns

### Temporal Data
- All timestamps use ISO8601 format with timezone (prefer UTC)
- Temporal extent uses `start_datetime`/`end_datetime` pair
- Individual positions use `time` field

### Identifiers
- All entities use string `id` fields
- UUIDs recommended but not enforced
- Must be unique within containing collection

### Display Properties
- `color` fields accept CSS color strings
- `symbol` and `icon` fields reference symbol registries (defined separately)
