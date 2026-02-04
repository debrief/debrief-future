# Data Model: GeoJSON Position Metadata

**Feature**: 048-geojson-position-metadata
**Date**: 2026-02-04

## Overview

This document defines the schema changes for position metadata support. All changes are made to LinkML source schemas; Pydantic, TypeScript, and JSON Schema representations are generated.

---

## Entity Changes

### TimestampedPosition (Modified)

**File**: `shared/schemas/src/linkml/common.yaml`

**Change**: Remove `coordinates` attribute. Coordinates now live only in `geometry.coordinates`.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `time` | datetime | Yes | Position timestamp (ISO 8601) |
| `depth` | float | No | Depth in meters (negative = below surface) |
| `course` | float | No | Course in degrees (0-360) |
| `speed` | float | No | Speed in knots |
| ~~`coordinates`~~ | ~~float[2]~~ | ~~Yes~~ | **REMOVED** - Use geometry.coordinates[i] |

**Constraint**: `len(properties.positions) == len(geometry.coordinates)`

---

### PositionStyle (New)

**File**: `shared/schemas/src/linkml/styling.yaml`

Default styling configuration for track positions.

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `show_symbol` | boolean | Yes | - | Whether to show position symbol |
| `symbol` | PointShapeEnum | Yes | - | Symbol shape (circle, square, triangle) |
| `show_label` | boolean | Yes | - | Whether to show position label |

**LinkML Definition:**
```yaml
PositionStyle:
  description: Default styling configuration for track positions
  attributes:
    show_symbol:
      description: Whether to display a symbol at positions
      range: boolean
      required: true
    symbol:
      description: Shape to use for position symbols
      range: PointShapeEnum
      required: true
    show_label:
      description: Whether to display labels at positions
      range: boolean
      required: true
```

---

### PositionStyleOverride (New)

**File**: `shared/schemas/src/linkml/styling.yaml`

Per-position style override, keyed by timestamp.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `time` | datetime | Yes | Timestamp of position to override |
| `show_symbol` | boolean | No | Override: whether to show symbol |
| `symbol` | PointShapeEnum | No | Override: symbol shape |
| `show_label` | boolean | No | Override: whether to show label |
| `label` | string | No | Custom label text |

**LinkML Definition:**
```yaml
PositionStyleOverride:
  description: Per-position style override keyed by timestamp
  attributes:
    time:
      description: Timestamp of position this override applies to
      range: datetime
      required: true
    show_symbol:
      description: Override whether to show symbol (null = use default/interval)
      range: boolean
    symbol:
      description: Override symbol shape
      range: PointShapeEnum
    show_label:
      description: Override whether to show label
      range: boolean
    label:
      description: Custom label text (null = use timestamp)
      range: string
```

---

### TrackProperties (Modified)

**File**: `shared/schemas/src/linkml/geojson.yaml`

**Changes**: Add position styling fields.

| New Attribute | Type | Required | Description |
|---------------|------|----------|-------------|
| `default_position_style` | PositionStyle | Yes | Default styling for all positions |
| `symbol_interval` | string | No | ISO 8601 duration for symbol display interval |
| `label_interval` | string | No | ISO 8601 duration for label display interval |
| `position_style_overrides` | PositionStyleOverride[] | No | Sparse array of per-position overrides |

**LinkML Definition (additions):**
```yaml
TrackProperties:
  attributes:
    # ... existing attributes ...

    default_position_style:
      description: Default styling applied to all positions
      range: PositionStyle
      required: true
    symbol_interval:
      description: >-
        ISO 8601 duration for interval-based symbol display.
        E.g., "PT5M" = every 5 minutes, "PT1H" = every hour.
        Null means no interval-based symbols.
      range: string
      pattern: "^PT?[0-9HMSD.]+$"
    label_interval:
      description: >-
        ISO 8601 duration for interval-based label display.
        Null means no interval-based labels.
      range: string
      pattern: "^PT?[0-9HMSD.]+$"
    position_style_overrides:
      description: Sparse array of per-position style overrides
      range: PositionStyleOverride
      multivalued: true
```

---

## Validation Rules

### Parallel Array Constraint

**Rule**: `len(geometry.coordinates) == len(properties.positions)`

**Implementation**: Pydantic `model_validator` (see research.md)

```python
@model_validator(mode='after')
def validate_parallel_arrays(self) -> 'TrackFeature':
    coords_len = len(self.geometry.coordinates)
    positions_len = len(self.properties.positions)
    if coords_len != positions_len:
        raise ValueError(
            f"geometry.coordinates length ({coords_len}) must equal "
            f"properties.positions length ({positions_len})"
        )
    return self
```

### Duration Format Validation

**Rule**: `symbol_interval` and `label_interval` must be valid ISO 8601 PT durations.

**Pattern**: `^PT?[0-9HMSD.]+$`

Examples:
- Valid: `"PT5M"`, `"PT1H"`, `"PT30S"`, `"PT1H30M"`, `"P1D"`
- Invalid: `"5 minutes"`, `"1:30:00"`, `"PT"` (empty)

---

## Entity Relationships

```
TrackFeature
├── geometry: GeoJSONLineString
│   └── coordinates: float[][]          # [lon, lat] pairs
├── properties: TrackProperties
│   ├── positions: TimestampedPosition[]  # Parallel to coordinates
│   │   ├── time: datetime
│   │   ├── depth: float?
│   │   ├── course: float?
│   │   └── speed: float?
│   ├── style: TrackStyle
│   │   ├── line: LineProperties
│   │   └── point: PointProperties
│   ├── default_position_style: PositionStyle  # NEW
│   │   ├── show_symbol: boolean
│   │   ├── symbol: PointShapeEnum
│   │   └── show_label: boolean
│   ├── symbol_interval: string?               # NEW
│   ├── label_interval: string?                # NEW
│   └── position_style_overrides: PositionStyleOverride[]  # NEW
│       ├── time: datetime
│       ├── show_symbol: boolean?
│       ├── symbol: PointShapeEnum?
│       ├── show_label: boolean?
│       └── label: string?
```

---

## Style Resolution Algorithm

For each position at index `i`:

```
1. Start with default_position_style
   - show_symbol = default_position_style.show_symbol
   - symbol = default_position_style.symbol
   - show_label = default_position_style.show_label
   - label = null

2. Apply interval rules (if position matches interval)
   - If symbol_interval set AND position is at interval mark:
       show_symbol = true
   - If label_interval set AND position is at interval mark:
       show_label = true

3. Apply explicit override (if exists for this position)
   - override = position_style_overrides.find(o => o.time == positions[i].time)
   - If override.show_symbol defined: show_symbol = override.show_symbol
   - If override.symbol defined: symbol = override.symbol
   - If override.show_label defined: show_label = override.show_label
   - If override.label defined: label = override.label

4. Determine final label text
   - If show_label AND label is null: label = formatTimestamp(positions[i].time)
```

---

## Migration Impact

### Existing Fixtures

All track fixtures must be updated:

1. Remove `coordinates` from each `positions[]` entry
2. Add `default_position_style` with baseline values:
   ```json
   "default_position_style": {
     "show_symbol": false,
     "symbol": "circle",
     "show_label": false
   }
   ```

### Breaking Changes

- `TimestampedPosition.coordinates` removed (data migration required)
- `TrackProperties.default_position_style` now required (schema validation will fail without it)

### Non-Breaking Additions

- `symbol_interval` (optional)
- `label_interval` (optional)
- `position_style_overrides` (optional, empty array if not specified)
