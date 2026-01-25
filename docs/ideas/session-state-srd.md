# Session State Management - Software Requirements Document

**Project:** DebriefNG  
**Component:** Session State Management  
**Version:** 0.1.0  
**Date:** January 2026  
**Status:** Draft

---

## 1. Overview

### 1.1 Purpose

Define the requirements for managing session state within the VS Code extension editor. Session state encompasses temporal navigation, spatial viewport, feature data, and document lifecycle (dirty/save/undo).

### 1.2 Scope

This component provides:

- Centralised state management for a single open editor
- Reactive subscriptions for UI components (temporal slider, properties window, outline)
- Python accessibility via MCP wrapper
- Persistence contract for save/load operations
- Undo/redo history for user actions

### 1.3 Design Constraints

| Constraint | Rationale |
|------------|-----------|
| Frontend-centric state | Enables reuse in future browser-based Debrief deployments |
| Schema-first types | LinkML master schema ensures Python/TypeScript alignment |
| Thick services, thin frontends | State logic is reusable; hosting apps provide only orchestration |

---

## 2. Architecture Decisions

The following decisions were made during requirements analysis:

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| State location | Frontend (TypeScript) | Service-centric (Python), Hybrid |
| State library | Zustand with slices | Redux Toolkit, Jotai, Vanilla Context |
| Schema scope | Domain + persistence boundary | Minimal schema, Comprehensive schema |
| Slice structure | 4 slices by concern | By persistence (3), Fine-grained (6) |
| Time representation | Epoch milliseconds (internal), ISO 8601 (wire) | ISO strings only, Custom object, Temporal API |
| Viewport representation | GeoJSON Polygon (4 corners) | BBox array, Corner points, Center + dimensions |
| History mechanism | Immer patches, persist-boundary scoped | Full snapshots, Command pattern |
| MCP tool granularity | Fine-grained tools | CRUD per slice, Single generic tool |
| Dirty tracking | Any persist-boundary change | Feature changes only, User-configurable |

---

## 3. State Structure

### 3.1 Slice Overview

The Zustand store comprises four slices, each independently subscribable:

| Slice | Responsibility | Persisted |
|-------|----------------|-----------|
| `temporal` | Time navigation and playback | Yes (except `playbackState`) |
| `spatial` | Map viewport and orientation | Yes |
| `features` | Feature collection reference and selection | Yes |
| `document` | Dirty flag, save path, undo/redo history | Metadata only |

### 3.2 Temporal Slice

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `currentTime` | TimeInstant | Yes | Current playback/display time |
| `timeRange` | TimeRange | Yes | Full temporal extent of loaded data |
| `timeFilter` | TimeFilter \| null | Yes | Optional constraint on visible time window |
| `timeStep` | TimeStep | Yes | Step size for discrete navigation |
| `playbackRate` | number (0.1–100) | Yes | Playback speed multiplier |
| `playbackState` | enum | No | `stopped` \| `playing` \| `paused` |
| `displayMode` | enum | Yes | `normal` \| `snail` |

### 3.3 Spatial Slice

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `viewport` | GeoJSON Polygon | Yes | Visible map area as 4-corner polygon |
| `rotation` | number | Yes | Degrees clockwise from north (0 = north up) |
| `center` | Position \| null | Yes | Viewport center (derived, cached) |

The polygon representation supports rotated views (e.g., Primary Centred/North Oriented mode from legacy Debrief).

### 3.4 Features Slice

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `featureCollectionUri` | URI | Yes | Reference to GeoJSON FeatureCollection |
| `selection` | FeatureSelection | Yes | Currently selected feature IDs |
| `hiddenFeatureIds` | string[] | Yes | Features hidden from display |

Note: The FeatureCollection itself is stored externally (STAC Item asset). This slice tracks references and view state only.

### 3.5 Document Slice

| Field | Type | Persisted | Description |
|-------|------|-----------|-------------|
| `dirty` | boolean | No | Unsaved changes exist |
| `savePath` | string \| null | Meta | File path for save operations |
| `history.undoStack` | Patch[][] | No | Immer patches for undo |
| `history.redoStack` | Patch[][] | No | Immer patches for redo |

---

## 4. Type Definitions

### 4.1 Schema Boundary

Types crossing the Python/TypeScript boundary or included in persistence shall be defined in LinkML. Implementation-only types remain TypeScript-only.

**LinkML-defined types:**

- `TimeInstant`
- `TimeRange`
- `TimeFilter`
- `TimeStep`
- `Position`
- `ViewportPolygon`
- `FeatureSelection`
- `SessionState` (composite)

**TypeScript-only types:**

- `PlaybackState` enum (ephemeral)
- History stack structures (internal)
- UI-specific state (drag-in-progress, hover)

### 4.2 Time Representation

| Context | Format | Example |
|---------|--------|---------|
| Internal (memory) | Unix epoch milliseconds | `1705329000000` |
| Wire (JSON/MCP) | ISO 8601 UTC string | `"2024-01-15T14:30:00.000Z"` |
| Persistence (save file) | ISO 8601 UTC string | `"2024-01-15T14:30:00.000Z"` |

The `TimeInstant` type carries both representations:

```
TimeInstant {
  epoch: number    // Required, canonical
  iso?: string     // Optional in memory, required on wire
}
```

### 4.3 Viewport Polygon

GeoJSON Polygon geometry with 5 coordinates (4 corners + closing point):

```json
{
  "type": "Polygon",
  "coordinates": [[
    [-5.0, 50.0],
    [-5.0, 51.0],
    [-4.0, 51.0],
    [-4.0, 50.0],
    [-5.0, 50.0]
  ]]
}
```

Coordinate order: `[longitude, latitude]` per GeoJSON specification.

---

## 5. Operations

### 5.1 Temporal Operations

| Operation | Description | Affects History |
|-----------|-------------|-----------------|
| `setCurrentTime(time)` | Set playback position | Yes |
| `setTimeRange(range)` | Set data extent | Yes |
| `setTimeFilter(filter)` | Apply/clear time filter | Yes |
| `stepForward()` | Advance by one time step | Yes |
| `stepBackward()` | Retreat by one time step | Yes |
| `setPlaybackRate(rate)` | Change playback speed | Yes |
| `play()` | Start playback | No (ephemeral) |
| `pause()` | Pause playback | No (ephemeral) |
| `stop()` | Stop and reset playback state | No (ephemeral) |
| `setDisplayMode(mode)` | Switch normal/snail | Yes |

### 5.2 Spatial Operations

| Operation | Description | Affects History |
|-----------|-------------|-----------------|
| `setViewport(polygon)` | Set visible area | Yes |
| `setRotation(degrees)` | Set map rotation | Yes |
| `zoomToSelection()` | Fit viewport to selected features | Yes |
| `fitToData()` | Fit viewport to all features | Yes |

### 5.3 Features Operations

| Operation | Description | Affects History |
|-----------|-------------|-----------------|
| `setSelection(ids)` | Set selected features | Yes |
| `clearSelection()` | Deselect all | Yes |
| `toggleFeatureVisibility(id)` | Show/hide feature | Yes |

### 5.4 Document Operations

| Operation | Description |
|-----------|-------------|
| `undo()` | Revert last persist-boundary change |
| `redo()` | Reapply last undone change |
| `save()` | Persist to file, clear dirty flag and history |
| `load(path)` | Load from file, reset state |
| `markClean()` | Clear dirty flag without saving |

---

## 6. History and Dirty Tracking

### 6.1 Dirty Flag Semantics

The document becomes dirty when any persist-boundary state changes. This includes:

- All `temporal` slice fields except `playbackState`
- All `spatial` slice fields
- All `features` slice fields

The document becomes clean when:

- `save()` completes successfully
- `load()` completes successfully
- `markClean()` is called explicitly

### 6.2 Undo/Redo Mechanism

History uses Immer patches for memory efficiency:

1. Each mutating action produces forward and inverse patches
2. Only changes to persist-boundary state are recorded
3. Inverse patches are pushed to `undoStack`
4. `undo()` applies inverse patches and moves them to `redoStack`
5. `redo()` reapplies forward patches
6. New changes clear `redoStack`
7. `save()` clears both stacks

### 6.3 Exclusions from History

The following are ephemeral and not recorded:

- `playbackState` changes (`play`, `pause`, `stop`)
- UI interaction state (drag-in-progress, hover)
- Computed/derived values

---

## 7. MCP Interface

### 7.1 Overview

The session state is exposed to Python via FastMCP server running in the hosting application (VS Code extension or Electron app). Tools are fine-grained for discoverability and natural analyst workflows.

### 7.2 Tool Catalogue

#### Temporal Tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `get_current_time` | — | `{epoch, iso}` |
| `set_current_time` | `epoch: number` | `{success, epoch}` |
| `get_time_range` | — | `{start, end}` |
| `set_time_range` | `start, end` | `{success}` |
| `get_time_filter` | — | `TimeFilter \| null` |
| `set_time_filter` | `filter: TimeFilter \| null` | `{success}` |
| `step_forward` | — | `{newTime}` |
| `step_backward` | — | `{newTime}` |
| `get_playback_rate` | — | `{rate}` |
| `set_playback_rate` | `rate: number` | `{success, rate}` |
| `play` | — | `{playbackState}` |
| `pause` | — | `{playbackState}` |
| `stop` | — | `{playbackState}` |
| `get_display_mode` | — | `{mode}` |
| `set_display_mode` | `mode: string` | `{success, mode}` |

#### Spatial Tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `get_viewport` | — | `{viewport, rotation, center}` |
| `set_viewport` | `viewport, rotation?` | `{success}` |
| `zoom_to_selection` | — | `{viewport}` |
| `fit_to_data` | — | `{viewport}` |

#### Features Tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `get_features_uri` | — | `{uri}` |
| `get_selection` | — | `{featureIds}` |
| `set_selection` | `featureIds: string[]` | `{success, count}` |
| `clear_selection` | — | `{success}` |
| `get_hidden_features` | — | `{hiddenIds}` |
| `toggle_feature_visibility` | `featureId: string` | `{featureId, isHidden}` |

#### Document Tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `is_dirty` | — | `{dirty}` |
| `get_history_length` | — | `{undoSteps, redoSteps}` |
| `undo` | — | `{success, remainingUndoSteps}` |
| `redo` | — | `{success, remainingRedoSteps}` |
| `get_session_state` | — | Full `SessionState` object |
| `load_session_state` | `state: SessionState` | `{success}` |

---

## 8. Persistence Format

### 8.1 File Structure

Session files are JSON documents conforming to the `SessionState` schema:

```json
{
  "schemaVersion": "0.1.0",
  "metadata": {
    "savePath": "/path/to/session.debrief",
    "createdAt": {"epoch": 1705329000000, "iso": "2024-01-15T14:30:00.000Z"},
    "modifiedAt": {"epoch": 1705330800000, "iso": "2024-01-15T15:00:00.000Z"}
  },
  "temporal": { ... },
  "spatial": { ... },
  "features": { ... }
}
```

### 8.2 Exclusions

The following are not persisted:

- `playbackState` (reset to `stopped` on load)
- `document.dirty` (reset to `false` on load)
- `document.history` (reset to empty on load)

### 8.3 Schema Versioning

The `schemaVersion` field enables future migrations. Loaders shall:

1. Check version compatibility
2. Apply migrations for older versions
3. Reject incompatible future versions

---

## 9. UI Integration

### 9.1 Component Subscriptions

| Component | Subscribes To | Actions |
|-----------|---------------|---------|
| Temporal Slider | `temporal.currentTime`, `temporal.timeRange`, `temporal.timeFilter` | `setCurrentTime`, `stepForward`, `stepBackward` |
| Playback Controls | `temporal.playbackState`, `temporal.playbackRate` | `play`, `pause`, `stop`, `setPlaybackRate` |
| Map View | `spatial.viewport`, `spatial.rotation`, `features.selection`, `features.hiddenFeatureIds` | `setViewport`, `setSelection` |
| Properties Window | `features.selection` | (read-only) |
| Outline | `features` (full slice) | `setSelection`, `toggleFeatureVisibility` |
| Title Bar | `document.dirty` | (read-only, shows unsaved indicator) |

### 9.2 Subscription Optimisation

Components subscribe only to required slice subsets using Zustand selectors. This prevents unnecessary re-renders when unrelated state changes.

---

## 10. Testing Requirements

### 10.1 Schema Validation

| Test Type | Description |
|-----------|-------------|
| Golden fixtures | Valid and invalid JSON fixtures for each type |
| Round-trip | Python → JSON → TypeScript → JSON → Python |
| Schema comparison | Generated JSON Schema from Pydantic matches LinkML output |

### 10.2 Store Behaviour

| Test Type | Description |
|-----------|-------------|
| Action correctness | Each operation produces expected state change |
| History recording | Persist-boundary changes recorded, ephemeral excluded |
| Undo/redo | Patches apply and reverse correctly |
| Dirty tracking | Flag set/cleared appropriately |
| Serialization | `toPersistedState()` excludes ephemeral fields |

### 10.3 MCP Integration

| Test Type | Description |
|-----------|-------------|
| Tool availability | All tools discoverable via MCP |
| Parameter validation | Invalid inputs rejected with clear errors |
| State synchronisation | MCP mutations reflect in store, subscriptions fire |

---

## 11. Dependencies

### 11.1 Runtime Dependencies

| Dependency | Purpose |
|------------|---------|
| Zustand | State management |
| Immer | Immutable updates, patch generation |
| FastMCP | MCP server wrapper |
| Zod | Runtime validation for MCP parameters |

### 11.2 Build Dependencies

| Dependency | Purpose |
|------------|---------|
| LinkML | Schema authoring |
| linkml-runtime | Pydantic model generation |
| gen-json-schema | JSON Schema generation |
| (custom generator) | TypeScript interface generation |

---

## 12. Open Questions

1. **Time step auto mode** — How is step size calculated from data density?
2. **Viewport change debouncing** — Should rapid viewport changes (during pan/zoom) be coalesced before recording to history?
3. **Selection limit** — Is there a maximum number of features that can be selected?
4. **Multi-editor support** — Future requirement for multiple plots open simultaneously?

---

## 13. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | January 2026 | — | Initial draft |
