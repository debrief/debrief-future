# Data Model: REP Sensor Import (#117)

**Date**: 2026-04-10

## Entities

### ParsedSensorContact (intermediate, internal)

An intermediate record produced during REP line parsing, before grouping into SensorData structures. Not persisted -- exists only during the parse pass.

| Field | Type | Required | Source | Notes |
|-------|------|----------|--------|-------|
| parent_track | str | yes | Track name from REP line | Quoted or unquoted |
| sensor_name | str | yes | Sensor type field from REP line | e.g., "TOWED_ARRAY" |
| time | str (ISO8601) | yes | Date + Time fields | Parsed via `parse_timestamp()` |
| bearing | float | no | Bearing field | 0-360 degrees; None if NULL/NAN |
| has_bearing | bool | yes | Derived from bearing field | False if bearing is NULL/NAN |
| range_m | float | no | Range field | Converted from yards to metres |
| frequency | float | no | Frequency field (v2/v3 only) | Hz; None if NULL |
| has_frequency | bool | yes | Derived from frequency field | False if frequency is NULL/NAN |
| ambiguous_bearing | float | no | Ambiguous bearing field (v2/v3) | 0-360 degrees; None if NULL |
| has_ambiguous | bool | yes | Derived from ambiguous bearing | False if NULL/NAN |
| origin | [float, float] | no | DMS coordinates from REP line | [lon, lat] GeoJSON order; None if NULL |
| label | str | no | Free-text label field | Trailing text after sensor name |
| color_code | str | no | Symbology code letter | Single letter A-Q, extracted from symbol |
| line_number | int | yes | Source file line number | For provenance |

### SensorContact (output, schema-conformant dict)

A dict conforming to the SensorContact schema (current + #116 planned fields). Produced from `ParsedSensorContact` after grouping.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| time | str (ISO8601) | yes | Contact timestamp |
| bearing | float | yes | 0-360; 0 if has_bearing=false |
| has_bearing | bool | no | False when source bearing was NULL/NAN |
| range | float | no | Metres (converted from yards) |
| frequency | float | no | Hz |
| has_frequency | bool | no | False when source frequency was NULL/NAN |
| ambiguous_bearing | float | no | 0-360 degrees |
| has_ambiguous | bool | no | False when source ambiguous bearing was NULL/NAN |
| origin | [float, float] | no | [lon, lat] from explicit DMS coords |
| label | str | no | Free-text label |

### SensorData (output, schema-conformant dict)

A dict conforming to the SensorData schema. Groups contacts by sensor name per track.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | str | yes | Sensor identifier (e.g., "TOWED_ARRAY") |
| color | str | no | CSS hex from first contact's symbology code |
| contacts | SensorContact[] | yes | Time-ordered list of contacts |

### DynamicTrackCoverage (output, standalone GeoJSON feature)

A GeoJSON Feature for SENSORARC data. Not embedded in tracks -- stored as an annotation.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| kind | str | yes | "DYNAMIC_TRACK_COVERAGE" |
| track_id | str | yes | Parent track name |
| start_time | str (ISO8601) | yes | Coverage start |
| end_time | str (ISO8601) | yes | Coverage end |
| left_bearing | float | yes | Left arc bound (degrees) |
| right_bearing | float | yes | Right arc bound (degrees) |
| inner_range | float | yes | Inner range bound (metres) |
| outer_range | float | yes | Outer range bound (metres) |

## Entity Relationships

```
REP File
  |
  |-- Track position lines --> TrackBuilder --> TrackFeature
  |                                               |
  |-- ;SENSOR: lines ----\                        |
  |-- ;SENSOR2: lines ----> ParsedSensorContact --+--> pending_sensor_data
  |-- ;SENSOR3: lines ---/      |                      { track_name: [SensorData, ...] }
  |                             |                           |
  |                             | (grouped by              |
  |                             |  track + sensor name)    |
  |                             v                          v
  |                        SensorData              TrackFeature.properties.sensors[]
  |                          + SensorContact[]       (merged by import pipeline)
  |
  |-- ;SENSORARC lines --> DynamicTrackCoverage (standalone annotation feature)
```

## Validation Rules

1. **Bearing range**: 0-360 inclusive (0 and 360 are both valid, matching schema constraint)
2. **Range non-negative**: range_m >= 0 after conversion
3. **Timestamp valid**: must produce a valid datetime (invalid timestamps emit warning, contact skipped)
4. **Sensor name required**: if absent, default to "Unknown"
5. **Track name required**: if absent, emit warning and skip the line
6. **Contacts ordered by time**: within each SensorData, contacts sorted by `time`
7. **Color from first contact**: SensorData.color set from the symbology code of the first ParsedSensorContact for that sensor name on that track; subsequent contacts do not override

## State Transitions

This feature has no state machines. Data flows in a single direction:

```
Raw REP line text
  --> ParsedSensorContact (intermediate)
    --> SensorContact dict (grouped into SensorData)
      --> pending_sensor_data on ParseResult
        --> merged into TrackFeature.properties.sensors[] by import pipeline
```

## Conversion Constants

| Conversion | Factor | Notes |
|-----------|--------|-------|
| Yards to metres | 0.9144 | Exact by international agreement |
| NULL/NAN bearing | bearing=0, has_bearing=false | Sentinel value |
