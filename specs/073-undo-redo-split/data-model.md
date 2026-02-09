# Data Model: Split Undo/Redo — UI-Only Undo, Data Changes via Log

**Feature**: 073-undo-redo-split
**Date**: 2026-02-09

## Entities

### StateSnapshot (Modified)

The central entity affected by this change. Represents a point-in-time capture of UI display state for undo/redo purposes.

**Before** (12 fields):

| Field | Category | Retained |
|-------|----------|----------|
| currentTime | Temporal/Display | Yes |
| timeRange | Temporal/Display | Yes |
| timeFilter | Temporal/Display | Yes |
| stepSize | Temporal/Display | Yes |
| playbackRate | Temporal/Display | Yes |
| displayMode | Temporal/Display | Yes |
| viewport | Spatial/Display | Yes |
| rotation | Spatial/Display | Yes |
| selection | Feature/Display | Yes |
| hiddenFeatureIds | Feature/Display | Yes |
| featureCollectionUri | Data/Reference | **Removed** |
| savePath | Metadata | **Removed** |

**After** (10 fields):

| Field | Category | Description |
|-------|----------|-------------|
| currentTime | Temporal | Current replay time position |
| timeRange | Temporal | Visible time window boundaries |
| timeFilter | Temporal | Active time filter criteria |
| stepSize | Temporal | Time step increment |
| playbackRate | Temporal | Playback speed multiplier |
| displayMode | Temporal | Display mode (e.g., snail trail, positions) |
| viewport | Spatial | Map center and zoom level |
| rotation | Spatial | Map rotation angle |
| selection | Feature | Currently selected feature IDs |
| hiddenFeatureIds | Feature | Feature IDs hidden from display |

### Undo History (Unchanged structure)

| Attribute | Description |
|-----------|-------------|
| past | Stack of up to 50 StateSnapshot entries (most recent last) |
| future | Stack of StateSnapshot entries for redo (cleared on new change) |

**Relationships**: Each entry in `past` and `future` is a complete StateSnapshot (10 fields after change).

### DIRTY_TRIGGER_FIELDS (Modified)

The set of field names whose changes trigger the "dirty" (unsaved) flag.

**Before** (11 fields): All 10 UI fields + `featureCollectionUri`
**After** (10 fields): Only the 10 UI fields (matches StateSnapshot exactly)

**Note**: `featureCollectionUri` dirty tracking migrates to the Log Service's `markDirty()` callback.

### Exported StateSnapshot Type (Modified)

Public API type consumed by package users.

**Before**: `Omit<SessionState, 'document'> & { document: Pick<DocumentSlice, 'savePath'> }`
**After**: `Omit<SessionState, 'document'>` (no document fields in snapshot)

## State Transitions

```
Session Start
  └─→ Empty undo history (past=[], future=[])
       │
       ├─ UI state change (any of 10 fields)
       │   └─→ Current snapshot pushed to past[], future[] cleared
       │
       ├─ Ctrl+Z (undo)
       │   └─→ Pop from past[], push current to future[], apply popped snapshot
       │
       ├─ Ctrl+Y (redo)
       │   └─→ Pop from future[], push current to past[], apply popped snapshot
       │
       ├─ Data change (tool execution, plot load)
       │   └─→ NO undo entry created (handled by Log Service)
       │
       └─ Clear history
           └─→ past=[], future=[]
```

## Validation Rules

- StateSnapshot MUST contain exactly 10 fields (enforced by new unit test)
- `featureCollectionUri` and `savePath` MUST NOT appear in any snapshot
- Undo history MUST NOT exceed 50 entries (existing constraint, unchanged)
- Duplicate consecutive snapshots MUST be suppressed (existing constraint, unchanged)
- Ephemeral fields (playbackState, dirty, undoStack, redoStack) MUST NOT trigger snapshot creation (existing constraint, unchanged)
