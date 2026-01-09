# Data Model: Schema Foundation (Tracer Bullet)

**Feature**: 000-schemas | **Date**: 2026-01-09
**Purpose**: Define entity structures, relationships, and validation rules for the Debrief schema foundation.

---

## Overview

This is a **tracer bullet** implementation defining two core entity types. All entities follow GeoJSON conventions and include maritime-specific extensions.

```
┌─────────────────────────────────────────────────────────────────┐
│                     TrackFeature                                │
│  (GeoJSON Feature representing a vessel track)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   ReferenceLocation                             │
│  (GeoJSON Feature for fixed reference points)                   │
└─────────────────────────────────────────────────────────────────┘
```

Future iterations will add: SensorContact, PlotMetadata, ToolMetadata.

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

## Relationships

```
TrackFeature
    │
    └─────< ReferenceLocation (temporal overlap via valid_from/valid_until)
```

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
