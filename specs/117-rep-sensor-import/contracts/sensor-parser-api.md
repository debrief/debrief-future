# Sensor Parser API Contract

**Module**: `services/io/src/debrief_io/handlers/sensor_parser.py`

## Public Functions

### `parse_sensor_v1(line: str, line_number: int) -> ParsedSensorContact | None`

Parse a `;SENSOR:` (v1) line into an intermediate sensor contact record.

**Input**: Raw REP line string starting with `;SENSOR:`
**Output**: `ParsedSensorContact` or `None` (with warning) if the line is malformed.

**Field extraction order** (matching ImportSensor.java):
1. Date (YYMMDD/YYYYMMDD)
2. Time (HHMMSS.SSS)
3. Track name (quoted `"NAME"` or unquoted `NAME`)
4. Symbology code (e.g., `@A`, `@C`)
5. Location: either `NULL` or 8 DMS tokens (deg min sec hem for lat + lon)
6. Bearing (float or `NULL`/`NAN`)
7. Range in yards (float)
8. Sensor name (quoted `"NAME"` or unquoted `NAME`)
9. Label (remaining free text)

### `parse_sensor_v2(line: str, line_number: int) -> ParsedSensorContact | None`

Parse a `;SENSOR2:` (v2) line into an intermediate sensor contact record.

**Input**: Raw REP line string starting with `;SENSOR2:`
**Output**: `ParsedSensorContact` or `None` (with warning) if the line is malformed.

**Field extraction order** (matching ImportSensor2.java):
1. Date
2. Time
3. Track name (unquoted)
4. Symbology code
5. `NULL` (position placeholder)
6. Bearing (float or `NULL`/`NAN`)
7. Range in yards (float)
8. Ambiguous bearing (float or `NULL`)
9. Frequency (float or `NULL`)
10. Speed (float or `NULL` -- parsed but not stored)
11. Sensor name
12. Label (remaining free text)

**Note**: The field order differs from v1 -- ambiguous bearing and frequency appear between range and sensor name.

### `parse_sensor_v3(line: str, line_number: int) -> ParsedSensorContact | None`

Parse a `;SENSOR3:` (v3) line into an intermediate sensor contact record.

**Input**: Raw REP line string starting with `;SENSOR3:`
**Output**: `ParsedSensorContact` or `None` (with warning) if the line is malformed.

**Field extraction order** (matching ImportSensor3.java):
1-9. Same as SENSOR2
10. Bearing accuracy (float or `NULL` -- parsed, discarded)
11. Frequency accuracy (float or `NULL` -- parsed, discarded)
12. Speed (float or `NULL` -- parsed, not stored)
13. Sensor name
14. Label

### `parse_sensorarc(line: str, line_number: int) -> dict[str, Any] | None`

Parse a `;SENSORARC` line into a DynamicTrackCoverage GeoJSON feature dict.

**Input**: Raw REP line string starting with `;SENSORARC`
**Output**: GeoJSON Feature dict with `kind: "DYNAMIC_TRACK_COVERAGE"` or `None` if malformed.

**Field extraction order** (matching ImportSensorArc.java):
1. Start date + time
2. End date + time
3. Track name
4. Left bearing (degrees)
5. Right bearing (degrees)
6. Inner range (metres -- already in correct unit)
7. Outer range (metres)

### `group_sensor_contacts(records: list[ParsedSensorContact]) -> dict[str, list[dict[str, Any]]]`

Group parsed sensor contacts into SensorData dicts keyed by parent track name.

**Input**: List of `ParsedSensorContact` records from all sensor lines in the file.
**Output**: `{parent_track_name: [SensorData_dict, ...]}` where each SensorData dict has `name`, `color`, and `contacts` (time-ordered).

**Behaviour**:
- Contacts with the same `(parent_track, sensor_name)` are merged into a single SensorData entry.
- Contacts within each SensorData are sorted by `time`.
- SensorData `color` is set from the first contact's `color_code` for that sensor.
- Contact dicts include all fields from the SensorContact schema plus boolean presence flags.

### `is_sensor_line(line: str) -> bool`

Check if a line is a sensor format line (SENSOR, SENSOR2, SENSOR3, or SENSORARC).

**Input**: Stripped line text starting with `;`
**Output**: `True` if the line starts with any recognised sensor prefix.

## Data Classes

### `ParsedSensorContact`

```python
@dataclass
class ParsedSensorContact:
    parent_track: str
    sensor_name: str
    time: str  # ISO8601
    bearing: float  # 0 if has_bearing is False
    has_bearing: bool
    range_m: float | None  # metres (converted from yards)
    has_frequency: bool
    has_ambiguous: bool
    frequency: float | None = None
    ambiguous_bearing: float | None = None
    origin: list[float] | None = None  # [lon, lat]
    label: str | None = None
    color_code: str | None = None  # A-Q
    line_number: int = 0
```

## Constants

```python
YARDS_TO_METRES: float = 0.9144
SENSOR_PREFIXES: tuple[str, ...] = (";SENSOR:", ";SENSOR2:", ";SENSOR3:", ";SENSORARC")
```

## Integration Points

### REP Handler (`rep.py`)

The REP handler's `parse()` method will be modified to:

1. Check each `;` line for sensor prefixes using `is_sensor_line()` **before** passing to `is_annotation_line()`.
2. Parse sensor lines using the appropriate `parse_sensor_v*()` function, collecting `ParsedSensorContact` records.
3. Parse SENSORARC lines using `parse_sensorarc()`, collecting DynamicTrackCoverage features.
4. After all lines are processed, call `group_sensor_contacts()` to produce `pending_sensor_data`.
5. Set `ParseResult.pending_sensor_data` with the grouped sensor data.
6. Add DynamicTrackCoverage features to the features list.
7. Emit `ORPHANED_SENSOR` warnings for tracks in `pending_sensor_data` that have no TrackBuilder.

### Annotation Parser (`annotations/parser.py`)

- Remove `;SENSOR:` and `;SENSOR2:` from `ANNOTATION_PREFIXES`.
- Add `;SENSOR3:` and `;SENSORARC` to `ANNOTATION_PREFIXES` (in case they appear in non-REP annotation contexts) -- or alternatively, remove them since the REP handler now intercepts them before the annotation parser runs.
- Keep `build_sensor` and `build_sensor2` in builders.py for backward compatibility with any code that calls them directly, but they will no longer be invoked from the REP parsing path.
