# Usage Example: Position Styling in GeoJSON Tracks

## Overview

Feature 048 adds position-level styling to track features. This includes:

1. **Default position style** - baseline styling for all positions
2. **Interval-based symbols** - render symbols at time intervals (e.g., every 5 minutes)
3. **Interval-based labels** - render timestamps at time intervals
4. **Position overrides** - custom styling for specific positions

## Complete Example

```json
{
  "type": "Feature",
  "id": "track-003-position-styling",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-5.0, 50.0],
      [-4.95, 50.05],
      [-4.9, 50.1],
      [-4.85, 50.15],
      [-4.8, 50.2]
    ]
  },
  "properties": {
    "kind": "TRACK",
    "platform_id": "HMS-STYLER",
    "platform_name": "HMS Styler",
    "track_type": "OWNSHIP",
    "start_time": "2026-01-09T10:00:00Z",
    "end_time": "2026-01-09T10:20:00Z",
    "positions": [
      {"time": "2026-01-09T10:00:00Z", "course": 45, "speed": 12},
      {"time": "2026-01-09T10:05:00Z", "course": 46, "speed": 12},
      {"time": "2026-01-09T10:10:00Z", "course": 47, "speed": 11},
      {"time": "2026-01-09T10:15:00Z", "course": 48, "speed": 11},
      {"time": "2026-01-09T10:20:00Z", "course": 45, "speed": 12}
    ],
    "default_position_style": {
      "show_symbol": false,
      "symbol": "circle",
      "show_label": false
    },
    "symbol_interval": "PT5M",
    "label_interval": "PT10M",
    "position_style_overrides": [
      null,
      null,
      {"show_symbol": true, "show_label": true, "label": "Contact Alpha"},
      null,
      null
    ],
    "style": {
      "line": {...},
      "point": {...}
    }
  }
}
```

## Key Concepts

### 1. Coordinates Removed from Positions

**Before (pre-048):**
```json
"positions": [
  {"time": "...", "coordinates": [-5.0, 50.0], "course": 45, "speed": 12}
]
```

**After (048):**
```json
"positions": [
  {"time": "...", "course": 45, "speed": 12}
]
```

Coordinates are now ONLY in `geometry.coordinates[i]`. Position at index `i` corresponds to coordinate at index `i`.

### 2. Default Position Style (Required)

```json
"default_position_style": {
  "show_symbol": false,
  "symbol": "circle",
  "show_label": false
}
```

All positions start with this style. Set `show_symbol: true` to show symbols at every position.

### 3. Interval-Based Display

```json
"symbol_interval": "PT5M",
"label_interval": "PT10M"
```

- `symbol_interval: "PT5M"` → Symbols at 0, 5, 10, 15, 20 minutes
- `label_interval: "PT10M"` → Labels at 0, 10, 20 minutes

ISO 8601 duration format: `PT5M` = 5 minutes, `PT1H` = 1 hour, `P1D` = 1 day.

### 4. Position Overrides

```json
"position_style_overrides": [
  null,
  null,
  {"show_symbol": true, "show_label": true, "label": "Contact Alpha"},
  null,
  null
]
```

- Parallel array (same length as positions)
- Use `null` for positions without overrides
- Override wins over interval rules

### Style Resolution Cascade

```
default_position_style
    ↓ (override if interval matches)
symbol_interval / label_interval
    ↓ (override takes precedence)
position_style_overrides[i]
```

## Minimal Example

Track with symbols every 5 minutes:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-5.0, 50.0], [-4.9, 50.1], [-4.8, 50.2]]
  },
  "properties": {
    "kind": "TRACK",
    "positions": [
      {"time": "2026-01-09T10:00:00Z"},
      {"time": "2026-01-09T10:05:00Z"},
      {"time": "2026-01-09T10:10:00Z"}
    ],
    "default_position_style": {
      "show_symbol": false,
      "symbol": "circle",
      "show_label": false
    },
    "symbol_interval": "PT5M"
  }
}
```

Result: Symbols rendered at positions 0, 1, 2 (all match 5-minute interval).
