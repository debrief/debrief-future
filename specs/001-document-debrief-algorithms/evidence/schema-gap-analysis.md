# Schema Gap Analysis — New Data Types Implied by Tool Specifications

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07
**Purpose**: Identify schema-controlled data types that tool specs and golden I/O fixtures reference but that don't yet exist in `shared/schemas/src/linkml/`.

## New FeatureKindEnum Values Needed

The current `FeatureKindEnum` in `common.yaml` defines: TRACK, POINT, NARRATIVE, CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, SYSTEM.

Tool golden I/O fixtures use these additional `kind` values:

| Kind Value | Used By | Description | Suggested Schema |
|-----------|---------|-------------|-----------------|
| `SENSOR` | sensor/analysis, sensor/calibration, track/analysis tools | Sensor contact data (bearings, ranges, frequencies) | `geojson.yaml` — new `SensorFeature` + `SensorProperties` |
| `TMA_SEGMENT` | track/analysis (generate-tma-*) | Target Motion Analysis segment with estimated course/speed | `geojson.yaml` — new `TMASegmentFeature` |
| `TRACK_SEGMENT` | track/analysis (generate-tma-from-infill) | Sub-segment of a track (e.g., infill between known positions) | `geojson.yaml` — new `TrackSegmentFeature` |
| `TUAS_SOLUTION` | track/analysis (generate-tuas-solution) | Target Under Active Sonar solution | `geojson.yaml` — new `TUASSolutionFeature` or fold into TMA |
| `LIGHTWEIGHT_TRACK` | track/manipulation (convert-lightweight-to-track) | Simplified track with fewer properties | `geojson.yaml` — new `LightweightTrackFeature` |
| `FREQUENCY_RESIDUALS` | sensor/calibration tools | Frequency calibration residuals | `geojson.yaml` or new `sensor.yaml` |
| `ZONE` | sensor/analysis tools | Spatial zone/area for sensor analysis | May map to existing `CIRCLE` or `RECTANGLE` |

## New Properties on Existing Types

### TimestampedPosition (common.yaml)
Current: `time`, `depth`, `course`, `speed`

Tool specs imply additional position-level properties:
- `bearing` — bearing to target (used by tote measurement tools)
- `range` — range to target (used by range-calc, sensor tools)
- `frequency` — Doppler frequency (used by doppler-calc, sensor tools)
- `elevation` — elevation angle (used by some sensor tools)

**Recommendation**: These may be better modelled as separate contact/measurement types rather than extending `TimestampedPosition`, since they describe inter-feature relationships rather than intrinsic position properties.

### SensorProperties (new)
Implied by golden I/O:
- `sensor_type` — e.g., `PASSIVE_TOWED`, `HULL_MOUNTED`, `ACTIVE`
- `sensor_name` — human-readable name
- `host_track_id` — ID of the platform track
- `contacts` — array of sensor contacts with: `time`, `bearing`, `range`, `frequency`, `origin`

### TMASegmentProperties (new)
Implied by golden I/O:
- `segment_type` — `ABSOLUTE` or `RELATIVE`
- `parent_track_id` — parent track reference
- `estimated_course`, `estimated_speed` — solution parameters
- `course_variance`, `speed_variance` — quality metrics
- `bearing_residuals`, `rms_bearing_error` — fit quality

## Result Type Domains

The `ResultTypePath` pattern in `tool-result.yaml` validates against `^(mutation|addition|deletion|artifact)/[a-z_]+/[a-z_]+$`.

### All result type domains used across tool specs:

**Mutation domains** (modifying existing features):
- `track` — styled, interpolated, smoothed, grouped, merged, trimmed, converted, time_referenced, tma_converted
- `sensor` — filtered, resolved, shaded

**Addition domains** (creating new features):
- `track` — merged, split_legs, imported, from_cuts
- `sensor` — contact, arc, merged
- `analysis` — tma_segment, tuas_solution
- `measurement` — course_delta_rate_rate, speed_rate_rate

**Artifact domains** (non-GeoJSON output):
- `measurement` — range, bearing, course, speed, depth, time, doppler, bearing_rate, course_rate, speed_rate, course_delta_average, speed_delta_average, relative_bearing, angle_to_bow, delta_range_rate, track_length
- `dataset` — exported_csv, exported_gpx, exported_rtf, exported_wmf, exported_geo_pdf, bearing_table, time_series_table
- `analysis` — xy_plot, time_variable_plot, doppler_curve, inflection_points, sensor_range_plot

**Note**: `analysis/zig_detection` appears without a top-type prefix in one fixture — should be `artifact/analysis/zig_detection` or `addition/analysis/zig_detection`.

## Recommendations

1. **Schema extension priority**: Define `SensorFeature` and `SensorProperties` first — 9+ tools depend on the SENSOR kind
2. **TMA types**: Create a `tma.yaml` schema for TMA_SEGMENT and related types used by 5+ analysis tools
3. **Measurement types**: Most measurement results are `artifact/*` — consider whether these need dedicated schema classes or are adequately described by the `ToolResultAnnotations` pattern
4. **Validation**: When these schema types are defined, tool golden I/O fixtures should be validated against them as part of adherence testing
