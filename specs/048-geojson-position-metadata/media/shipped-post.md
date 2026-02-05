---
layout: future-post
title: "Shipped: Per-Position Styling for Track Data"
date: 2026-02-05
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, geojson, shipped]
excerpt: "Legacy Debrief's position formatting is back — with cleaner data and smarter intervals"
---

## What We Built

Per-position styling for track data is now live. This brings back a core capability from legacy Debrief: the ability to mark specific positions along a track with custom symbols and labels, while also supporting interval-based display rules.

Three capabilities shipped:

1. **Default position style** — Set baseline styling (symbol shape, whether to show symbols/labels) that applies to all positions unless overridden
2. **Interval-based symbols and labels** — Configure symbols to appear every N minutes/hours using ISO 8601 durations (`PT5M` = 5 minutes)
3. **Per-position overrides** — Mark specific positions with custom styling or labels ("Contact Alpha detected here")

## How It Works

The style resolution follows a cascade:

```
default_position_style → interval rules → position_style_overrides
```

Start with defaults, apply interval rules for positions that match, then apply explicit overrides. Overrides always win.

Here's a track with symbols every 5 minutes and a custom label at position 2:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-5.0, 50.0], [-4.95, 50.05], [-4.9, 50.1], [-4.85, 50.15], [-4.8, 50.2]]
  },
  "properties": {
    "kind": "TRACK",
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
    "position_style_overrides": [
      null,
      null,
      {"show_symbol": true, "show_label": true, "label": "Contact Alpha"},
      null,
      null
    ]
  }
}
```

## Data Model Cleanup

While adding position styling, we fixed a data hygiene issue: coordinates were previously stored in two places (`geometry.coordinates` and `positions[].coordinates`). Now coordinates live only in geometry. The arrays are parallel:

```
geometry.coordinates[i] ↔ positions[i] ↔ position_style_overrides[i]
```

Same length, same order. Position `i` metadata describes coordinate `i`.

## Implementation Highlights

**Schema changes** (LinkML → Pydantic → TypeScript → JSON Schema):
- Removed `coordinates` from `TimestampedPosition`
- Added `PositionStyle` and `PositionStyleOverride` classes
- Added `default_position_style`, `symbol_interval`, `label_interval`, `position_style_overrides` to `TrackProperties`

**Renderer updates** (VS Code extension):
- ISO 8601 duration parser for interval specifications
- Interval position matching algorithm (finds nearest position to each interval mark)
- Style cascade resolution
- Leaflet layer groups for position symbols and labels

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Schema (Python) | 125 | Pass |
| REP Handler | 24 | Pass |
| VS Code Extension | 313 | Pass |

Key scenarios verified:
- Symbols appear at correct interval positions
- Overrides take precedence over interval rules
- Custom labels render correctly
- Parallel array constraint enforced (coordinates == positions == overrides)

## What's Next

This foundation enables the Outline view to show expandable position lists with formatting options — matching legacy Debrief's workflow where analysts expand tracks to see individual fixes. The map rendering is ready; the UI integration comes next.

---

*Feature 048 implementation complete. 42 tasks across 6 phases.*
