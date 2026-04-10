# Data Model: Sensor Schema Overhaul (#116)

**Date**: 2026-04-10
**Feature**: 116-sensor-schema-overhaul
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## Entity Overview

```
TrackProperties
 └── sensors: SensorData[]
      ├── measured_positions: MeasuredArrayPosition[]
      └── contacts: SensorContact[]
```

## SensorContact (updated)

Single sensor observation at a point in time. Belongs to exactly one SensorData parent.

### Fields

| Field | Type | Required | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| time | datetime | yes | — | ISO8601 | Observation timestamp |
| bearing | float | yes | — | 0 ≤ x ≤ 360 | Primary bearing in degrees |
| has_bearing | boolean | no | true | — | Controls display; data stored regardless |
| ambiguous_bearing | float | no | null | 0 ≤ x ≤ 360 | Alternative bearing for towed arrays |
| has_ambiguous | boolean | no | null | — | Ambiguous bearing active flag |
| range | float | no | null | ≥ 0 | Target distance in metres |
| frequency | float | no | null | — | Received frequency in Hz |
| has_frequency | boolean | no | null | — | Frequency data presence flag |
| label | string | no | null | — | Display label |
| comment | string | no | null | — | Operator notes |
| color | CSSColor | no | null | — | Contact color override (null = inherit from sensor) |
| visible | boolean | no | true | — | Contact visibility |
| show_label | boolean | no | false | — | Label visibility |
| line_style | LineStyleEnum | no | null | SOLID, DASHED, DOT, DASH_DOT | Bearing line style |
| label_location | LabelLocationEnum | no | null | LEFT, CENTER, RIGHT | Label horizontal alignment |
| put_label_at | LineLabelPositionEnum | no | null | START, MIDDLE, END | Label position on bearing line |
| origin | float[2] | no | null | [lon, lat] | Explicit sensor location override |

### Changes from Current Schema

| Status | Fields |
|--------|--------|
| Existing (unchanged) | time, bearing, range, frequency, ambiguous_bearing, label, comment |
| New data fields | has_bearing, has_ambiguous, has_frequency |
| New display fields | color, visible, show_label, line_style, label_location, put_label_at |
| New positioning field | origin |

### Validation Rules

- `bearing` must be between 0 and 360 inclusive (existing)
- `ambiguous_bearing` must be between 0 and 360 inclusive (existing)
- `range` must be ≥ 0 (existing)
- `origin` must be exactly 2 elements when present (follows CircleAnnotation.center pattern)
- `has_bearing=false` with a bearing value present is valid (flag controls display, not data presence)

## SensorData (updated)

Named sensor instrument attached to a track. Contains configuration, display defaults, and contacts.

### Fields

| Field | Type | Required | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| name | string | yes | — | — | Sensor identifier (e.g., "TOWED_ARRAY") |
| base_frequency | float | no | null | — | Source transmitted frequency for Doppler (Hz) |
| offset | float | no | null | — | Array offset from platform reference (metres) |
| array_centre_mode | ArrayCentreModeEnum | no | null | PLAIN, WORM, MEASURED | How bearing line origin is calculated |
| worm_in_hole | boolean | no | false | — | Display mode flag |
| color | CSSColor | no | null | — | Default color for all contacts |
| visible | boolean | no | true | — | Sensor visibility |
| line_thickness | integer | no | null | — | Bearing line width |
| contacts | SensorContact[] | yes | — | — | Time-ordered sensor observations |
| measured_positions | MeasuredArrayPosition[] | no | null | — | Actual array positions for MEASURED mode |

### Changes from Current Schema

| Status | Fields |
|--------|--------|
| Existing (unchanged) | name, base_frequency, offset, worm_in_hole, contacts |
| New configuration field | array_centre_mode |
| New display fields | color, visible, line_thickness |
| New positioning field | measured_positions |

## MeasuredArrayPosition (new)

Timestamped geographic position of a towed array centre.

### Fields

| Field | Type | Required | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| time | datetime | yes | — | ISO8601 | Position timestamp |
| location | float[2] | yes | — | [lon, lat] | Array centre position (GeoJSON coordinate order) |

## New Enumerations

### ArrayCentreModeEnum

Determines how bearing line origin is calculated relative to the host platform.

| Value | Description |
|-------|-------------|
| PLAIN | Simple backtrack along vessel's current heading |
| WORM | Follow vessel's historical track path backwards |
| MEASURED | Use actual measured array position data |

### LineStyleEnum

Visual style for bearing lines.

| Value | Description |
|-------|-------------|
| SOLID | Continuous line |
| DASHED | Evenly spaced dashes |
| DOT | Evenly spaced dots |
| DASH_DOT | Alternating dash and dot |

> **Rendering mapping**: At render time, LineStyleEnum maps to SVG/Leaflet `dash_array` values:
> SOLID → `null` (no dash), DASHED → `"10, 5"`, DOT → `"2, 5"`, DASH_DOT → `"10, 5, 2, 5"`.
> This mapping is defined as a code constant in the rendering layer (Phase 3, #118), not in the schema.
> The existing `LineProperties.dash_array` field in `styling.yaml` is the lower-level representation;
> `LineStyleEnum` is the semantic label stored in sensor data.

### LabelLocationEnum

Horizontal alignment of contact labels.

| Value | Description |
|-------|-------------|
| LEFT | Left-aligned text |
| CENTER | Center-aligned text |
| RIGHT | Right-aligned text |

### LineLabelPositionEnum

Position along the bearing line where the label is placed.

| Value | Description |
|-------|-------------|
| START | At the origin (sensor location) |
| MIDDLE | At the midpoint of the bearing line |
| END | At the far end of the bearing line |

## Boolean Presence Flag Pattern

The `has_bearing`, `has_ambiguous`, and `has_frequency` flags follow a legacy pattern where the boolean controls **display**, not data presence. A contact with `has_bearing=false` and `bearing=045.0` is valid — the bearing value is stored but not displayed. This pattern exists because legacy Debrief stores raw sensor values unconditionally; the flags determine which values are shown to the operator.

**Key implications for developers**:
- Do NOT treat `has_bearing=false` as "bearing is absent" — the value is still there
- Rendering code should check the flag before drawing bearing lines
- Schema validation accepts any `bearing` value regardless of the flag
- The same pattern applies to `has_ambiguous` and `has_frequency`

## Entity Relationships

```
TrackFeature
 └── properties: TrackProperties
      └── sensors: SensorData[]                    (0..*)
           ├── contacts: SensorContact[]            (1..*, required)
           │    ├── line_style → LineStyleEnum
           │    ├── label_location → LabelLocationEnum
           │    └── put_label_at → LineLabelPositionEnum
           ├── measured_positions: MeasuredArrayPosition[]  (0..*)
           └── array_centre_mode → ArrayCentreModeEnum
```

## Color Inheritance Pattern

SensorContact color resolution follows legacy behavior:
1. If `contact.color` is set → use contact color
2. If `contact.color` is null → inherit from `sensor.color`
3. If `sensor.color` is also null → use application default

This is a runtime behavior, not a schema constraint. The schema only stores the values; resolution logic belongs to the rendering layer (Phase 3, #118).

## Embedding Location

SensorData remains embedded under `TrackProperties.sensors[]` — no change to the parent structure. The compound track model (#062) established this embedding pattern and it is preserved.
