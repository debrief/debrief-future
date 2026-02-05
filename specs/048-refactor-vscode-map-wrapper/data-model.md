# Data Model: VS Code Map Wrapper

**Feature**: 048-refactor-vscode-map-wrapper
**Date**: 2026-02-04

## Overview

This document defines the data model for the thin VS Code map wrapper. The wrapper acts as a bridge between:
- **Extension backend** (TypeScript, sends messages via postMessage)
- **Shared MapView component** (React, receives props)

## Entity Definitions

### WrapperState

Local state maintained by the wrapper React component:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| features | DebriefFeature[] | loadPlot, updateTracks, addResultLayer | All features to display |
| selectedIds | Set<string> | setSelection, clearSelection | Currently selected feature IDs |
| currentTime | number \| undefined | setCurrentTime | Temporal position (epoch ms) |
| displayMode | 'full' \| 'trail' | setDisplayMode | Track rendering mode |
| initialCenter | [number, number] | setViewport, persisted state | Map center [lat, lng] |
| initialZoom | number | setViewport, persisted state | Map zoom level |
| timeExtent | [number, number] \| null | loadPlot | Data time bounds [start, end] |
| uiState | 'empty' \| 'loading' \| 'ready' | derived | Component display state |

### PersistedState

State saved via `vscode.setState()` for webview lifecycle:

| Field | Type | Description |
|-------|------|-------------|
| center | [number, number] | Last map center |
| zoom | number | Last zoom level |
| trackColors | Record<string, string> | Custom track color overrides |
| timeRange | { start: string, end: string } | Last time filter range |

### MapViewProps (Shared Component)

Props passed to `@debrief/components/MapView`:

| Prop | Type | Wrapper Source |
|------|------|----------------|
| features | DebriefFeatureCollection \| DebriefFeature[] | state.features |
| selectedIds | Set<string> | state.selectedIds |
| currentTime | number \| undefined | state.currentTime |
| displayMode | DisplayMode | state.displayMode |
| initialCenter | [number, number] | state.initialCenter |
| initialZoom | number | state.initialZoom |
| autoFitBounds | boolean | true on initial load |
| onSelect | (id, event) => void | → selectionChanged message |
| onBackgroundClick | () => void | → clear selection |
| onZoomChange | (zoom) => void | → viewStateChanged message |
| onBoundsChange | (bounds) => void | → viewStateChanged message |

## State Transitions

### Feature Loading Flow

```
[loadPlot message]
    ↓
Parse tracks, locations, otherFeatures
    ↓
Merge into unified features array
    ↓
Set state.features
    ↓
MapView renders GeoJSON
```

### Selection Flow

```
[User clicks feature in MapView]
    ↓
onSelect callback fires
    ↓
Wrapper calls vscode.postMessage('selectionChanged')
    ↓
Extension updates outline, tools panel
    ↓
Extension may send 'setSelection' back
    ↓
Wrapper updates state.selectedIds
    ↓
MapView re-renders with new selection
```

### Temporal Flow

```
[TimeController sends 'setCurrentTime']
    ↓
Wrapper updates state.currentTime
    ↓
MapView receives currentTime prop
    ↓
TemporalTrackLayer renders positions
```

## Data Transformations

### Track → DebriefFeature

The wrapper transforms Track messages into DebriefFeature format:

```typescript
// Input (Track from extension)
{
  id: string,
  name: string,
  geometry: { type: 'LineString', coordinates: [...] },
  times: string[],
  startTime: string,
  endTime: string,
  color?: string,
  visible?: boolean
}

// Output (DebriefFeature for MapView)
{
  type: 'Feature',
  id: string,
  geometry: { type: 'LineString', coordinates: [...] },
  properties: {
    kind: 'TRACK',
    platform_name: name,
    start_time: startTime,
    end_time: endTime,
    times: times,  // For temporal rendering
    style: { color }
  }
}
```

### ReferenceLocation → DebriefFeature

```typescript
// Input (ReferenceLocation from extension)
{
  id: string,
  name: string,
  geometry: { type: 'Point', coordinates: [...] },
  symbol?: string
}

// Output (DebriefFeature for MapView)
{
  type: 'Feature',
  id: string,
  geometry: { type: 'Point', coordinates: [...] },
  properties: {
    kind: 'POINT',
    name: name,
    location_type: 'REFERENCE'
  }
}
```

## Validation Rules

1. **Feature IDs must be unique**: Wrapper maintains ID → feature mapping
2. **Temporal data optional**: Features without `times` render statically
3. **Selection IDs must exist**: Invalid IDs in setSelection are ignored
4. **Bounds must be valid**: [south, west, north, east] with south < north, west < east (allowing wrap)

## Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────────┐  │
│  │  Plot    │────│ Session  │────│    Message Protocol   │  │
│  │ Manager  │    │  State   │    │ (ExtensionToWebview)  │  │
│  └──────────┘    └──────────┘    └──────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │ postMessage
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Map Webview (Thin Wrapper)                 │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ Message     │────│ WrapperState │────│ postMessage   │  │
│  │ Handlers    │    │              │    │ to Extension  │  │
│  └─────────────┘    └──────┬───────┘    └───────────────┘  │
│                            │ props                          │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              @debrief/components/MapView            │   │
│  │  (React component - fully testable in isolation)    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
