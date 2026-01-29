# Data Model: Temporal Track Rendering

**Feature**: 030-temporal-track-rendering
**Date**: 2026-01-27

## Overview

This document defines the data structures used for temporal track rendering. The model extends existing Debrief schema types without introducing new persistent entities.

## Entities

### TemporalTrackData

Represents a track feature with temporal metadata extracted for efficient rendering.

| Field | Type | Description |
|-------|------|-------------|
| trackId | string | Unique identifier from feature.id |
| coordinates | [number, number][] | Array of [lon, lat] coordinate pairs |
| timestamps | number[] | Array of epoch milliseconds, same length as coordinates |
| timeExtent | [number, number] | [minTime, maxTime] tuple for this track |

**Invariants**:
- `coordinates.length === timestamps.length`
- `timestamps` should be monotonically increasing (but algorithm handles non-monotonic)
- `timeExtent[0] <= timeExtent[1]`

### DisplayMode

Enumeration for track visualization mode.

| Value | Description |
|-------|-------------|
| `'full'` | Show entire track path with highlight marker at current time |
| `'trail'` | Show only track path from start to current time (snail-trail) |

### TemporalRenderState

Computed state for a single track at a specific point in time.

| Field | Type | Description |
|-------|------|-------------|
| nearestIndex | number | Index of coordinate nearest to current time |
| nearestTime | number | Timestamp of the nearest point (epoch ms) |
| visibleCoordinates | [number, number][] | Coordinates to render (full or sliced) |
| showMarker | boolean | Whether to show highlight marker |
| markerPosition | [number, number] \| null | [lon, lat] of marker position, or null |

**Derivation Rules**:
- In `'full'` mode: `visibleCoordinates = coordinates`, `showMarker = true`
- In `'trail'` mode: `visibleCoordinates = coordinates[0..nearestIndex]`, `showMarker = false`
- `markerPosition = coordinates[nearestIndex]` when `showMarker = true`

### HighlightMarkerStyle

Style configuration for the position marker.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| radius | number | 8 | Marker radius in pixels |
| fillColor | string | `'#ff6b6b'` | Marker fill color |
| fillOpacity | number | 1.0 | Fill opacity (0-1) |
| strokeColor | string | `'#ffffff'` | Border color |
| strokeWeight | number | 2 | Border width in pixels |

## Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         MapView                                  │
│  ┌─────────────────┐                                            │
│  │ Props:          │                                            │
│  │ - features      │──────────────────────────────────────┐     │
│  │ - currentTime   │──────────────────────────┐           │     │
│  │ - displayMode   │──────────────────┐       │           │     │
│  └─────────────────┘                  │       │           │     │
│                                       ▼       ▼           ▼     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TemporalTrackLayer (for each track)         │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │               useTemporalTrack hook                  │ │   │
│  │  │  - Extract TemporalTrackData from feature           │ │   │
│  │  │  - Compute TemporalRenderState                      │ │   │
│  │  │  - Memoize sliced coordinates                       │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                            │                              │   │
│  │              ┌─────────────┴──────────────┐               │   │
│  │              ▼                            ▼               │   │
│  │  ┌──────────────────┐         ┌────────────────────┐     │   │
│  │  │   GeoJSON Track  │         │ TrackHighlightMarker│     │   │
│  │  │ (visibleCoords)  │         │ (full mode only)    │     │   │
│  │  └──────────────────┘         └────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## State Transitions

### Time Change

When `currentTime` changes:
1. For each track, compute new `nearestIndex` via binary search
2. If `nearestIndex` unchanged, no re-render needed
3. If changed, recompute `TemporalRenderState`
4. Update visible coordinates and marker position

### Display Mode Change

When `displayMode` changes:
1. Keep `nearestIndex` unchanged
2. Recompute `visibleCoordinates` based on new mode
3. Toggle `showMarker` based on mode
4. Re-render all tracks

## Validation Rules

| Rule | Constraint | Error Handling |
|------|------------|----------------|
| Valid coordinates | All coordinates within [-180, 180] × [-90, 90] | Skip invalid points |
| Timestamp presence | Each coordinate must have a timestamp | Exclude track from temporal rendering |
| Array length match | coordinates.length === timestamps.length | Exclude track from temporal rendering |
| Non-empty track | coordinates.length > 0 | Skip rendering |

## Example Data

### Input Track Feature

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-4.0, 50.0],
      [-4.1, 50.1],
      [-4.2, 50.2],
      [-4.3, 50.3]
    ]
  },
  "properties": {
    "name": "OWNSHIP",
    "times": [
      1706352000000,
      1706352060000,
      1706352120000,
      1706352180000
    ]
  }
}
```

### Computed State (currentTime = 1706352090000, mode = 'full')

```json
{
  "nearestIndex": 1,
  "nearestTime": 1706352060000,
  "visibleCoordinates": [
    [-4.0, 50.0],
    [-4.1, 50.1],
    [-4.2, 50.2],
    [-4.3, 50.3]
  ],
  "showMarker": true,
  "markerPosition": [-4.1, 50.1]
}
```

### Computed State (currentTime = 1706352090000, mode = 'trail')

```json
{
  "nearestIndex": 1,
  "nearestTime": 1706352060000,
  "visibleCoordinates": [
    [-4.0, 50.0],
    [-4.1, 50.1]
  ],
  "showMarker": false,
  "markerPosition": null
}
```
