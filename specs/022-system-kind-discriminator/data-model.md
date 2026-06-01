# Data Model: SYSTEM Kind Discriminator

**Feature**: 022-system-kind-discriminator
**Date**: 2026-01-23

## Entity Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FeatureKindEnum                          │
│  TRACK | POINT | NARRATIVE | CIRCLE | RECTANGLE | LINE |   │
│  TEXT | VECTOR | SYSTEM (NEW)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SystemState                            │
│  GeoJSON Feature with kind: "SYSTEM", geometry: null        │
├─────────────────────────────────────────────────────────────┤
│  id: string (pattern: ^state\..+)                           │
│  type: "Feature"                                            │
│  geometry: null                                             │
│  properties: SystemStateProperties                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SystemStateProperties                       │
│  Base properties for all SYSTEM features                    │
├─────────────────────────────────────────────────────────────┤
│  kind: "SYSTEM" (required, fixed)                           │
│  state_type: SystemStateTypeEnum (discriminator)            │
│  ... type-specific fields based on state_type               │
└─────────────────────────────────────────────────────────────┘
```

## Enums

### SystemStateTypeEnum (NEW)

| Value | Description |
|-------|-------------|
| `temporal` | Time viewport state |
| `spatial` | Map viewport state |
| `selection` | Feature selection state |

### FeatureKindEnum (MODIFIED)

Add new value:

| Value | Description |
|-------|-------------|
| `SYSTEM` | Non-spatial system state (null geometry) |

## Classes

### SystemStateProperties (NEW)

Base properties for all SYSTEM features.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | FeatureKindEnum | Yes | Always "SYSTEM" |
| `state_type` | SystemStateTypeEnum | Yes | Discriminator for state variant |

### TemporalViewportProperties (NEW)

Extends SystemStateProperties for temporal viewport state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | FeatureKindEnum | Yes | "SYSTEM" |
| `state_type` | SystemStateTypeEnum | Yes | "temporal" |
| `start_time` | datetime | Yes | Viewport start (ISO8601) |
| `end_time` | datetime | Yes | Viewport end (ISO8601) |

### SpatialViewportProperties (NEW)

Extends SystemStateProperties for spatial viewport state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | FeatureKindEnum | Yes | "SYSTEM" |
| `state_type` | SystemStateTypeEnum | Yes | "spatial" |
| `viewport` | ViewportPolygon | Yes | 4-corner polygon [NW, NE, SE, SW], each `{longitude, latitude}`, with optional `zoom` |
| `rotation` | float | No | Map rotation in degrees (0-360) |

### SelectionStateProperties (NEW)

Extends SystemStateProperties for selection state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | FeatureKindEnum | Yes | "SYSTEM" |
| `state_type` | SystemStateTypeEnum | Yes | "selection" |
| `selected_ids` | string[] | Yes | Array of selected feature IDs |

### SystemState (NEW)

GeoJSON Feature for system state storage.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always "Feature" |
| `id` | string | Yes | Pattern: `^state\..+` (e.g., `state.temporal`) |
| `geometry` | null | Yes | Always null for SYSTEM features |
| `properties` | SystemStateProperties | Yes | Type-specific properties |

## Validation Rules

1. **ID Pattern**: SystemState `id` must match `^state\.[a-z]+$`
2. **Null Geometry**: SystemState `geometry` must be `null`
3. **Kind Consistency**: `properties.kind` must equal `"SYSTEM"`
4. **State Type Validity**: `properties.state_type` must be valid enum value
5. **Temporal Range**: `start_time` must be before or equal to `end_time`
6. **Viewport Validity**: `viewport.coordinates` must contain exactly 4 corners, each within valid coordinate ranges

## State Transitions

N/A - SYSTEM features are immutable snapshots, not stateful entities.

## Relationships

- **SystemState → Plot**: Many SYSTEM features per plot (one per state type)
- **SystemState ↔ Feature**: `selected_ids` references other feature IDs
- **SystemState is-a GeoJSON Feature**: Follows GeoJSON spec with null geometry
