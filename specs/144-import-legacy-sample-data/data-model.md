# Data Model: Import Legacy Sample Data

**Feature**: 144-import-legacy-sample-data
**Date**: 2026-03-20

## Entities

### DPF Document

Represents a parsed DPF (Debrief Plot File) XML document.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Plot name from root `<plot>` element's `Name` attribute |
| created | datetime | Creation timestamp from `Created` attribute |
| plot_id | string | Optional plot identifier from `PlotId` attribute |
| description | string | Optional text from `<details>` element |
| tracks | list[DPFTrack] | Extracted track data |
| sensors | list[DPFSensorGroup] | Sensor contact groups |
| narratives | list[DPFNarrative] | Narrative entries |
| shapes | list[DPFShape] | Shape annotations (lines, circles, rectangles, labels) |

### DPFTrack

A track extracted from a `<track>` element within a DPF file.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Track name (e.g., "NELSON") |
| symbol | string | Display symbol identifier (e.g., "ScaledSubmarine") |
| segments | list[DPFTrackSegment] | One or more track segments |

### DPFTrackSegment

A segment of positions from a `<TrackSegment>` element.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Segment name (typically "Positions") |
| plot_relative | bool | Whether positions are relative to a reference point |
| fixes | list[DPFFix] | Ordered position fixes |

### DPFFix

A single position fix from a `<fix>` element.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Date/time from `Dtg` attribute (YYMMDD HHMMSS[.SSS]) |
| latitude | float | Decimal degrees from `<shortLocation>` Lat attribute |
| longitude | float | Decimal degrees from `<shortLocation>` Long attribute |
| depth | float | Depth in metres from `<shortLocation>` Depth attribute |
| course | float | Course in degrees (0-360) from `Course` attribute |
| speed | float | Speed in knots from `Speed` attribute |
| label | string | Optional display label from `Label` attribute |

### DPFSensorGroup

A sensor group from a `<sensor>` element (child of `<track>`).

| Field | Type | Description |
|-------|------|-------------|
| name | string | Sensor name (e.g., "sensor 3:90") |
| track_name | string | Parent track name from `TrackName` attribute |
| contacts | list[DPFSensorContact] | Individual sensor contacts |

### DPFSensorContact

A single sensor contact from a `<sensor_contact>` element.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Date/time from `Dtg` attribute |
| bearing | float | Bearing in degrees from `Bearing` attribute |
| ambiguous_bearing | float \| None | Second bearing if `HasAmbiguousBearing="true"` |
| frequency | float \| None | Frequency if `HasFrequency="true"` |
| range | float \| None | Range (not present in DPF sensor_contact — derived contacts) |
| label | string | Contact label from `Label` attribute |

### DPFNarrative

A narrative entry from a `<narrative_entry>` element.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Date/time from `Dtg` attribute |
| entry | string | Narrative text from `Entry` attribute |
| track | string | Associated track name from `Track` attribute |
| type | string | Narrative type from `Type` attribute |

### DPFShape

A shape annotation from layer elements.

| Field | Type | Description |
|-------|------|-------------|
| shape_type | string | One of: "line", "rectangle", "circle", "textlabel" |
| label | string | Shape label from `Label` attribute |
| coordinates | list[tuple[float, float]] | Lat/lon pairs from `<shortLocation>` elements |
| radius | float \| None | Radius in yards for circles (from `<Radius>`) |

---

### DSF Sensor Contact

A sensor contact from a DSF file line. Uses the same format as REP `;SENSOR:` lines.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Date/time (YYMMDD HHMMSS.SSS) |
| track_name | string | Host track name |
| symbol | string | Display symbol (e.g., "@A") |
| latitude | float \| None | Explicit location or None if NULL |
| longitude | float \| None | Explicit location or None if NULL |
| bearing | float | Bearing in degrees |
| range | float | Range in yards |
| sensor_name | string | Sensor system identifier |
| label | string | Free-text label |

---

### Import Result

The output of the batch import pipeline.

| Field | Type | Description |
|-------|------|-------------|
| catalog_path | string | Absolute path to the created STAC catalog |
| files_processed | int | Total files attempted |
| files_succeeded | int | Files successfully imported |
| files_failed | int | Files that could not be imported |
| total_tracks | int | Total track features extracted |
| total_sensors | int | Total sensor contact features extracted |
| total_narratives | int | Total narrative features extracted |
| warnings | list[ImportWarning] | Aggregated non-fatal warnings |
| errors | list[ImportError] | Per-file fatal errors |
| duration_seconds | float | Total import duration |

### ImportWarning

A non-fatal issue encountered during import.

| Field | Type | Description |
|-------|------|-------------|
| file | string | Source file path |
| code | string | Warning code (e.g., "INVALID_COORD", "UNKNOWN_ELEMENT") |
| message | string | Human-readable description |
| line | int \| None | Line number (for line-based formats) |

---

## GeoJSON Output Mapping

### DPF Track → GeoJSON TrackFeature

```
DPFTrack → GeoJSON Feature:
  geometry.type = "LineString"
  geometry.coordinates = [[fix.longitude, fix.latitude] for fix in segment.fixes]
  properties.kind = "TRACK"
  properties.platform_id = track.name (kebab-cased)
  properties.platform_name = track.name
  properties.track_type = "CONTACT"  (default; no ownship indicator in DPF)
  properties.times = [fix.timestamp_ms for fix in segment.fixes]
  properties.start_time = first fix timestamp (ISO 8601)
  properties.end_time = last fix timestamp (ISO 8601)
  properties.positions = [
    {time, course, speed, depth} for fix in segment.fixes
  ]
```

### DPF Sensor Contact → GeoJSON Feature

```
DPFSensorContact → GeoJSON Feature:
  geometry = null  (location derived from host track at runtime)
  properties.kind = "SENSOR_CONTACT"
  properties.parent_track = sensor_group.track_name
  properties.sensor_name = sensor_group.name
  properties.bearing = contact.bearing
  properties.ambiguous_bearing = contact.ambiguous_bearing (if present)
  properties.frequency = contact.frequency (if present)
  properties.time = contact.timestamp (ISO 8601)
```

### DPF Narrative → GeoJSON Feature

```
DPFNarrative → GeoJSON Feature:
  geometry = null  (no spatial location)
  properties.kind = "NARRATIVE"
  properties.track = narrative.track
  properties.entry = narrative.entry
  properties.type = narrative.type
  properties.time = narrative.timestamp (ISO 8601)
```

### DSF Sensor Contact → GeoJSON Feature

```
DSFSensorContact → GeoJSON Feature:
  geometry.type = "Point" (if explicit lat/lon provided)
  geometry = null (if location is NULL)
  properties.kind = "SENSOR_CONTACT"
  properties.parent_track = contact.track_name
  properties.sensor_name = contact.sensor_name
  properties.bearing = contact.bearing
  properties.range = contact.range
  properties.time = contact.timestamp (ISO 8601)
```

## State Transitions

Not applicable — this feature is a one-time batch import with no ongoing state management.
