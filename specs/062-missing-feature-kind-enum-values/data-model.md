# Data Model: Compound Track Model with Embedded Children

**Feature**: 062-missing-feature-kind-enum-values
**Date**: 2026-02-08

## Entity Overview

```
TrackFeature (modified)
├── geometry: LineString | MultiLineString (union via any_of)
├── properties: TrackProperties (modified)
│   ├── positions: TimestampedPosition[]  (existing — simple tracks only)
│   ├── segments: SegmentMetadata[]       (NEW — compound tracks only)
│   ├── sensors: SensorData[]             (NEW — optional)
│   └── tuas: TUAData[]                   (NEW — optional)
│
├── SegmentMetadata (NEW)
│   ├── segment_type: SegmentTypeEnum
│   ├── start_time, end_time
│   ├── positions: TimestampedPosition[]
│   ├── name, style (optional)
│   ├── course, speed, base_frequency (TMA-specific, optional)
│   ├── host_track_id, host_sensor_name, offset_bearing, offset_range (RELATIVE_TMA)
│   └── before_leg, after_leg (DYNAMIC_INFILL)
│
├── SensorData (NEW)
│   ├── name (required)
│   ├── base_frequency, offset, worm_in_hole (optional)
│   └── contacts: SensorContact[] (NEW)
│       ├── time, bearing (required)
│       └── range, frequency, ambiguous_bearing, label, comment (optional)
│
└── TUAData (NEW)
    ├── name, host_track_name (required)
    └── solutions: TUASolution[] (NEW)
        ├── time, label (required)
        ├── centre_lat, centre_lon (absolute positioning, optional)
        ├── bearing, range (relative positioning, optional)
        ├── orientation, maxima, minima (ellipse, optional)
        └── course, speed, depth (kinematics, optional)
```

## New Entities

### GeoJSONMultiLineString

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string (= "MultiLineString") | yes | GeoJSON type discriminator |
| coordinates | float[][][] | yes | Array of LineString coordinate arrays |

**Relationships**: Used by TrackFeature.geometry when segments are present.

### SegmentTypeEnum

| Value | Description |
|-------|-------------|
| TRACK | Plain recorded track segment |
| ABSOLUTE_TMA | TMA leg with absolute geographic coordinates |
| RELATIVE_TMA | TMA leg relative to ownship position |
| DYNAMIC_INFILL | Interpolated segment between TMA legs |

### SegmentMetadata

| Field | Type | Required | Condition | Description |
|-------|------|----------|-----------|-------------|
| segment_type | SegmentTypeEnum | yes | all | Segment type discriminator |
| start_time | datetime | yes | all | Segment start timestamp |
| end_time | datetime | yes | all | Segment end timestamp |
| positions | TimestampedPosition[] | yes | all | Per-position metadata (parallel to coordinates) |
| name | string | no | all | Human-readable segment name |
| style | LineProperties | no | all | Per-segment line styling override |
| course | float (0-360) | no | TMA types | Estimated course in degrees |
| speed | float (>= 0) | no | TMA types | Estimated speed in knots |
| base_frequency | float | no | TMA types | Base frequency in Hz |
| host_track_id | string | yes* | RELATIVE_TMA | ID of track this solution is relative to |
| host_sensor_name | string | no | RELATIVE_TMA | Towed array sensor name |
| offset_bearing | float (0-360) | no | RELATIVE_TMA | Bearing offset in degrees |
| offset_range | float (>= 0) | no | RELATIVE_TMA | Range offset in metres |
| before_leg | string | yes* | DYNAMIC_INFILL | Name of preceding TMA leg |
| after_leg | string | yes* | DYNAMIC_INFILL | Name of following TMA leg |

*Conditionally required — enforced via LinkML rules or Pydantic validators.

**Relationships**: Array of SegmentMetadata is parallel to MultiLineString coordinates. `segments[i]` describes `geometry.coordinates[i]`.

### SensorData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Sensor identifier (e.g., "TOWED_ARRAY") |
| base_frequency | float | no | Reference frequency in Hz |
| offset | float | no | Sensor offset from host platform in metres |
| worm_in_hole | boolean | no | Display mode flag |
| contacts | SensorContact[] | yes | Array of sensor measurements |

**Relationships**: Embedded in TrackProperties.sensors[]. Sensor has no independent geometry — rendering derives position from host track at contact time.

### SensorContact

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | datetime | yes | Contact measurement timestamp |
| bearing | float (0-360) | yes | Bearing to contact in degrees |
| range | float (>= 0) | no | Range to contact in metres |
| frequency | float | no | Measured frequency in Hz |
| ambiguous_bearing | float (0-360) | no | Ambiguous bearing (second solution) |
| label | string | no | Display label |
| comment | string | no | Operator note |

**Relationships**: Embedded in SensorData.contacts[].

### TUAData

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | TUA collection name |
| host_track_name | string | yes | Name of track this TUA set relates to |
| solutions | TUASolution[] | yes | Array of TUA estimates |

**Relationships**: Embedded in TrackProperties.tuas[].

### TUASolution

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | datetime | yes | Solution timestamp |
| label | string | yes | Solution label |
| centre_lat | float | no | Absolute latitude (mutual exclusive with bearing/range) |
| centre_lon | float | no | Absolute longitude (mutual exclusive with bearing/range) |
| bearing | float (0-360) | no | Relative bearing from host track |
| range | float (>= 0) | no | Relative range from host track in metres |
| orientation | float (0-360) | no | Ellipse orientation from north in degrees |
| maxima | float (>= 0) | no | Semi-major axis in metres |
| minima | float (>= 0) | no | Semi-minor axis in metres |
| course | float (0-360) | no | Estimated course in degrees |
| speed | float (>= 0) | no | Estimated speed in knots |
| depth | float | no | Estimated depth in metres |

**Relationships**: Embedded in TUAData.solutions[].

**Constraint**: A solution has either absolute positioning (centre_lat + centre_lon) or relative positioning (bearing + range), never both. Documented in schema; enforced via Pydantic validator.

## Modified Entities

### TrackFeature (existing — modified)

| Field | Change | Details |
|-------|--------|---------|
| geometry | Union type | `GeoJSONLineString` (existing) OR `GeoJSONMultiLineString` (new). Uses `any_of`. |

### TrackProperties (existing — modified)

| Field | Change | Details |
|-------|--------|---------|
| segments | New optional field | `SegmentMetadata[]`. Present only when geometry is MultiLineString. |
| sensors | New optional field | `SensorData[]`. Independent of geometry type. |
| tuas | New optional field | `TUAData[]`. Independent of geometry type. |

**Invariant**: When `segments` is present, geometry MUST be MultiLineString and `positions` is unused (each segment has its own positions). When `segments` is absent, geometry MUST be LineString and the flat `positions` array is used.

## Validation Rules

| Rule | Scope | Enforcement |
|------|-------|-------------|
| segments present ↔ MultiLineString geometry | TrackFeature | Pydantic model_validator |
| segments absent ↔ LineString geometry + positions | TrackFeature | Pydantic model_validator |
| segments.length == coordinates.length | TrackFeature (compound) | Pydantic model_validator |
| segments[i].positions.length == coordinates[i].length | TrackFeature (compound) | Pydantic model_validator |
| RELATIVE_TMA requires host_track_id | SegmentMetadata | LinkML rules + Pydantic |
| DYNAMIC_INFILL requires before_leg, after_leg | SegmentMetadata | LinkML rules + Pydantic |
| TUASolution: absolute XOR relative positioning | TUASolution | Pydantic model_validator |
| SensorContact.bearing required | SensorContact | LinkML required field |
| bearing values 0-360 | Multiple | LinkML minimum_value/maximum_value |
