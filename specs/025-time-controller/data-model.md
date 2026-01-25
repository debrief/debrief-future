# Data Model: Time Controller

**Feature**: 025-time-controller
**Date**: 2026-01-24

## Entities

### TimeRange

Represents the temporal bounds of loaded track data.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| start | ISO 8601 timestamp | Earliest timestamp in loaded data | Required; must be valid date |
| end | ISO 8601 timestamp | Latest timestamp in loaded data | Required; must be >= start |

**Derived Properties**:
- `duration`: Calculated as `end - start` in milliseconds
- `isEmpty`: True when `start === end`

### PlaybackState

Represents the current state of time playback.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| isPlaying | boolean | Whether time is advancing automatically | Required |
| speed | 1 \| 2 \| 4 \| 8 | Playback speed multiplier | Required; must be one of [1, 2, 4, 8] |

### TimePosition

Represents the current position within the time range.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| current | ISO 8601 timestamp | Current time being displayed | Required; must be within TimeRange |

**Constraints**:
- `current >= timeRange.start`
- `current <= timeRange.end`

## State Transitions

### Playback State Machine

```
                    ┌─────────────────────┐
                    │                     │
                    ▼                     │
┌─────────┐  play  ┌─────────┐  pause   │
│ PAUSED  │───────▶│ PLAYING │──────────┘
└─────────┘        └─────────┘
     ▲                  │
     │                  │ reach end
     │                  ▼
     └──────────────────┘
```

**Transitions**:
| From | Event | To | Side Effects |
|------|-------|-----|--------------|
| PAUSED | play() | PLAYING | Start requestAnimationFrame loop |
| PLAYING | pause() | PAUSED | Cancel animation frame |
| PLAYING | reachEnd | PAUSED | Auto-pause at end of range |
| PLAYING | scrubStart | PAUSED | Pause when user starts dragging |
| * | setSpeed(n) | * | Update speed; no state change |

## Data Flow

```
┌─────────────────┐
│  Track Data     │
│  (from service) │
└────────┬────────┘
         │ calculates
         ▼
┌─────────────────┐
│   TimeRange     │
│ {start, end}    │
└────────┬────────┘
         │ constrains
         ▼
┌─────────────────┐     ┌─────────────────┐
│  TimePosition   │◄────│  PlaybackState  │
│   {current}     │     │ {isPlaying,     │
└────────┬────────┘     │  speed}         │
         │              └─────────────────┘
         │ emits
         ▼
┌─────────────────┐
│  onTimeChange   │
│  (callback)     │
└────────┬────────┘
         │ updates
         ▼
┌─────────────────┐
│   Map Display   │
│ (track positions)│
└─────────────────┘
```

## Relationships

- **TimeController** component receives `TimeRange` as prop
- **TimeController** manages internal `PlaybackState`
- **TimeController** reports `TimePosition` changes via `onTimeChange` callback
- **Map component** (external) listens to time changes and renders appropriate positions
