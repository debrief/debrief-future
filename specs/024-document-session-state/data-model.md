# Data Model: Session State Management

**Feature**: 024-document-session-state
**Date**: 2026-01-24
**Source**: [spec.md](./spec.md)

## Overview

The session state data model organizes state into four logical slices (FR-002):
- **Temporal**: Time navigation and playback
- **Spatial**: Map viewport and orientation
- **Features**: Selection and visibility
- **Document**: Dirty tracking and persistence

Each slice contains both persistent state (saved to file) and ephemeral state (runtime only).

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SessionState                             │
│  (composite root - one per editor session)                       │
├─────────────────────────────────────────────────────────────────┤
│  temporal: TemporalSlice                                         │
│  spatial: SpatialSlice                                           │
│  features: FeaturesSlice                                         │
│  document: DocumentSlice                                         │
└─────────────────────────────────────────────────────────────────┘
         │            │            │            │
         ▼            ▼            ▼            ▼
┌─────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐
│TemporalSlice│ │SpatialSl.│ │FeaturesSl.│ │DocumentSl. │
├─────────────┤ ├──────────┤ ├───────────┤ ├────────────┤
│currentTime  │ │viewport  │ │collection │ │dirty       │
│timeRange    │ │rotation  │ │selection  │ │savePath    │
│timeFilter   │ │center*   │ │hiddenIds  │ │history*    │
│stepSize     │ └──────────┘ └───────────┘ │undoStack*  │
│playbackRate │      │                      │redoStack*  │
│playbackState│      │                      └────────────┘
│displayMode  │      │
└─────────────┘      │
      │              │
      ▼              ▼
┌───────────┐  ┌──────────────┐
│TimeInstant│  │ViewportPolygon│
├───────────┤  ├──────────────┤
│epoch      │  │coordinates[4]│
│iso        │  └──────────────┘
└───────────┘

Legend:
  * = ephemeral (not persisted)
  ─▶ = contains
```

---

## Core Entities

### SessionState

Root entity representing all state for a single editor session.

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| temporal | TemporalSlice | Yes | Time-related state |
| spatial | SpatialSlice | Yes | Geographic view state |
| features | FeaturesSlice | Yes | Feature-related state |
| document | DocumentSlice | Partial | Editor state (dirty/history ephemeral) |

**Validation Rules**:
- A session manages exactly one feature collection reference
- All time values must be in UTC

---

### TemporalSlice

Time-related state including navigation, playback, and filtering.

| Field | Type | Persisted | Default | Description |
|-------|------|-----------|---------|-------------|
| currentTime | TimeInstant | Yes | null | Current playback/display time (FR-005) |
| timeRange | TimeRange | Yes | null | Full temporal extent of loaded data (FR-006) |
| timeFilter | TimeFilter \| null | Yes | null | Optional visible time window constraint (FR-007) |
| stepSize | TimeStep | Yes | {value: 1, unit: 'minute'} | Step size for discrete navigation (FR-008) |
| playbackRate | number | Yes | 1.0 | Playback speed multiplier (FR-009) |
| playbackState | PlaybackState | **No** | 'stopped' | Current playback state (FR-010) |
| displayMode | DisplayMode | Yes | 'normal' | Track visualization mode (FR-011) |

**Validation Rules**:
- `playbackRate` must be in range [0.1, 100.0] (FR-009)
- `playbackState` is ephemeral - not recorded in undo history (FR-023)
- Zero-duration `timeRange` (start equals end) is valid (Edge Case)

**State Transitions (playbackState)**:
```
stopped ──▶ playing ──▶ paused ──▶ stopped
   │                      │
   └──────────────────────┘
```

---

### SpatialSlice

Geographic view state for the map display.

| Field | Type | Persisted | Default | Description |
|-------|------|-----------|---------|-------------|
| viewport | ViewportPolygon \| null | Yes | null | Visible map area as 4-corner polygon (FR-012) |
| rotation | number | Yes | 0 | Map rotation in degrees (FR-013) |
| center | Coordinate \| null | **No** | derived | Derived from viewport (not stored) |

**Validation Rules**:
- `viewport` coordinates must be within valid geographic bounds:
  - Longitude: [-180, 180]
  - Latitude: [-90, 90]
- Invalid coordinates trigger validation error (Edge Case)
- `rotation` in degrees, normalized to [0, 360)

---

### FeaturesSlice

Feature selection and visibility state.

| Field | Type | Persisted | Default | Description |
|-------|------|-----------|---------|-------------|
| featureCollectionUri | string \| null | Yes | null | Reference to external feature collection (FR-016) |
| selection | FeatureSelection | Yes | empty | Currently selected features (FR-017) |
| hiddenFeatureIds | Set\<string\> | Yes | empty | Features hidden from display (FR-018) |

**Validation Rules**:
- When loading session, `featureCollectionUri` must reference existing collection
- If collection no longer exists, load fails with error (Edge Case)
- No enforced limit on selection size (per Assumptions)

---

### DocumentSlice

Editor lifecycle state including dirty tracking and undo history.

| Field | Type | Persisted | Default | Description |
|-------|------|-----------|---------|-------------|
| dirty | boolean | **No** | false | Unsaved changes exist (FR-020) |
| savePath | string \| null | Yes | null | Last save location |
| undoStack | StateSnapshot[] | **No** | [] | Undo history (FR-021) |
| redoStack | StateSnapshot[] | **No** | [] | Redo history (FR-021) |
| savedStateHash | string \| null | **No** | null | Hash of last saved state for dirty comparison |

**Validation Rules**:
- `undoStack` limited to 50 entries (SC-005)
- History cleared after save (FR-022)
- Ephemeral state changes don't affect `dirty` flag (FR-023)

**State Transitions (dirty)**:
```
false ──(modify persistent state)──▶ true
true ──(save)──▶ false
true ──(undo to saved state)──▶ false
```

---

## Supporting Types

### TimeInstant

A point in time with dual representations.

| Field | Type | Description |
|-------|------|-------------|
| epoch | number | Milliseconds since Unix epoch (FR-032) |
| iso | string | ISO 8601 UTC format (FR-033) |

**Example**:
```json
{
  "epoch": 1706097600000,
  "iso": "2024-01-24T12:00:00.000Z"
}
```

---

### TimeRange

A temporal interval with inclusive start and end.

| Field | Type | Description |
|-------|------|-------------|
| start | TimeInstant | Start of interval |
| end | TimeInstant | End of interval |

**Validation Rules**:
- `start.epoch` <= `end.epoch`
- Zero duration (`start.epoch` === `end.epoch`) is valid

---

### TimeFilter

Constraints on the visible time window.

| Field | Type | Description |
|-------|------|-------------|
| start | TimeInstant \| null | Filter start (null = unbounded) |
| end | TimeInstant \| null | Filter end (null = unbounded) |

---

### TimeStep

Step size for discrete time navigation.

| Field | Type | Description |
|-------|------|-------------|
| value | number | Numeric step value |
| unit | TimeUnit | Unit of the step |

**TimeUnit Enum**: `'millisecond' | 'second' | 'minute' | 'hour' | 'day'`

---

### ViewportPolygon

Geographic area as a 4-corner polygon supporting rotated views.

| Field | Type | Description |
|-------|------|-------------|
| coordinates | Coordinate[4] | Four corners in clockwise order [NW, NE, SE, SW] |

**Coordinate**: `[longitude: number, latitude: number]`

**Validation Rules**:
- Exactly 4 coordinates
- Each longitude in [-180, 180]
- Each latitude in [-90, 90]

---

### FeatureSelection

Set of selected feature identifiers with metadata.

| Field | Type | Description |
|-------|------|-------------|
| featureIds | Set\<string\> | Selected feature IDs |
| primary | string \| null | Primary selection (for properties display) |
| timestamp | TimeInstant | When selection was made |

---

### PlaybackState

Enumeration of playback states.

```typescript
type PlaybackState = 'stopped' | 'playing' | 'paused';
```

---

### DisplayMode

Enumeration of track display modes.

```typescript
type DisplayMode = 'normal' | 'snailTrail';
```

---

## Persistence Schema

Session files use JSON format with schema versioning.

### File Structure

```json
{
  "$schema": "https://debrief.io/schemas/session-state/v1.json",
  "version": "1.0.0",
  "savedAt": "2026-01-24T12:00:00.000Z",
  "temporal": {
    "currentTime": { "epoch": 1706097600000, "iso": "2024-01-24T12:00:00.000Z" },
    "timeRange": { /* TimeRange */ },
    "timeFilter": null,
    "stepSize": { "value": 1, "unit": "minute" },
    "playbackRate": 1.0,
    "displayMode": "normal"
  },
  "spatial": {
    "viewport": {
      "coordinates": [
        [-5.0, 55.0], [5.0, 55.0], [5.0, 50.0], [-5.0, 50.0]
      ]
    },
    "rotation": 0
  },
  "features": {
    "featureCollectionUri": "stac://local/plots/exercise-alpha/features.geojson",
    "selection": {
      "featureIds": ["track-001", "track-002"],
      "primary": "track-001",
      "timestamp": { "epoch": 1706097600000, "iso": "2024-01-24T12:00:00.000Z" }
    },
    "hiddenFeatureIds": ["track-003"]
  }
}
```

### Version Migration

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial schema |

Future versions will include migration functions. Incompatible (future) versions are rejected with error (Edge Case).

---

## State Categories

### Persistent State (saved to file)
- `temporal.currentTime`
- `temporal.timeRange`
- `temporal.timeFilter`
- `temporal.stepSize`
- `temporal.playbackRate`
- `temporal.displayMode`
- `spatial.viewport`
- `spatial.rotation`
- `features.featureCollectionUri`
- `features.selection`
- `features.hiddenFeatureIds`
- `document.savePath`

### Ephemeral State (runtime only)
- `temporal.playbackState` - Reset to 'stopped' on load (FR-027)
- `document.dirty` - Reset to false on load (FR-027)
- `document.undoStack` - Cleared on load (FR-027)
- `document.redoStack` - Cleared on load (FR-027)
- `spatial.center` - Derived from viewport

### Tracked in Undo History
- All persistent state EXCEPT `temporal.playbackState` (FR-023)

---

## TypeScript Type Definitions

```typescript
// Core types (generated from LinkML schema)
interface SessionState {
  temporal: TemporalSlice;
  spatial: SpatialSlice;
  features: FeaturesSlice;
  document: DocumentSlice;
}

interface TemporalSlice {
  currentTime: TimeInstant | null;
  timeRange: TimeRange | null;
  timeFilter: TimeFilter | null;
  stepSize: TimeStep;
  playbackRate: number;
  playbackState: PlaybackState;
  displayMode: DisplayMode;
}

interface SpatialSlice {
  viewport: ViewportPolygon | null;
  rotation: number;
}

interface FeaturesSlice {
  featureCollectionUri: string | null;
  selection: FeatureSelection;
  hiddenFeatureIds: Set<string>;
}

interface DocumentSlice {
  dirty: boolean;
  savePath: string | null;
  undoStack: StateSnapshot[];
  redoStack: StateSnapshot[];
}

// Supporting types
interface TimeInstant {
  epoch: number;
  iso: string;
}

interface TimeRange {
  start: TimeInstant;
  end: TimeInstant;
}

interface TimeFilter {
  start: TimeInstant | null;
  end: TimeInstant | null;
}

interface TimeStep {
  value: number;
  unit: TimeUnit;
}

type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';

interface ViewportPolygon {
  coordinates: [Coordinate, Coordinate, Coordinate, Coordinate];
}

type Coordinate = [number, number]; // [longitude, latitude]

interface FeatureSelection {
  featureIds: Set<string>;
  primary: string | null;
  timestamp: TimeInstant;
}

type PlaybackState = 'stopped' | 'playing' | 'paused';
type DisplayMode = 'normal' | 'snailTrail';

// Undo history snapshot (persistent state only)
type StateSnapshot = Pick<SessionState, 'temporal' | 'spatial' | 'features'>;
```
