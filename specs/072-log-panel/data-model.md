# Data Model: Log Panel (072)

**Date**: 2026-02-09
**Feature**: 072-log-panel

## Entities

### TimelineEntry (derived from LogEntry)

A display-oriented representation of a LogEntry for rendering in the panel. Assembled from the raw LogEntry returned by `getTimeline()`.

| Field | Type | Description |
|-------|------|-------------|
| activityId | string (UUID) | Unique operation identifier |
| timestamp | string (ISO 8601) | When the operation occurred |
| toolName | string | Human-readable tool name (from `wasGeneratedBy.tool`) |
| toolVersion | string | Tool version (from `wasGeneratedBy.toolVersion`) |
| parameters | Record<string, ParameterValue> | Typed parameter values with default/tunable metadata |
| usedFeatureIds | string[] | Input feature IDs (from `used`) |
| generatedFeatureIds | string[] | Output feature/artifact IDs (from `generated`) |
| executionDuration | string (ISO 8601 duration) | How long the tool took |
| generatedResultId | string or null | Stable result ID for artifact-producing tools |
| operationCategory | OperationCategory | Derived: calculation, import, property-edit, export |

### OperationCategory (enum)

Derived from `wasGeneratedBy.tool` via static mapping.

| Value | Meaning |
|-------|---------|
| calculation | Analysis/measurement tool (default) |
| import | File import or data loading operation |
| property-edit | Direct property modification |
| export | Data export or file generation |

### PresentationMode (enum)

| Value | Displayed Fields |
|-------|-----------------|
| compact | toolName, primary feature name |
| normal | + parameters, before/after change summary |
| detailed | + timestamp, executionDuration, attachment count, file size |

### ViewMode (enum)

| Value | Meaning |
|-------|---------|
| timeline | Flat chronological list, most recent first |
| by-feature | Grouped under feature headings, chronological within each group |

### FilterState

| Field | Type | Description |
|-------|------|-------------|
| searchText | string | Free text search (matches tool name, feature name, parameter values) |
| toolType | string or null | Selected tool type filter (null = all tools) |
| operationCategory | OperationCategory or null | Selected category filter (null = all categories) |
| isExpanded | boolean | Whether the filter row is visible |

### LogPanelState (webview-persisted)

| Field | Type | Description | Persisted |
|-------|------|-------------|-----------|
| presentationMode | PresentationMode | Current display density | Yes (globalState) |
| viewMode | ViewMode | Timeline or By-Feature | Yes (webview state) |
| filterState | FilterState | Current filter values | No (reset on panel close) |
| selectedEntryId | string or null | Currently selected activityId | No (transient) |

### FeatureDisplayInfo

Resolved feature name and availability for display in timeline entries.

| Field | Type | Description |
|-------|------|-------------|
| featureId | string | The feature's ID |
| displayName | string | Human-readable name (or "(deleted)" if not found) |
| exists | boolean | Whether the feature still exists in the current plot |

## Relationships

```
LogPanelViewProvider
  ├── subscribes to → SessionManager.onActiveSessionChange
  ├── calls → logService.getTimeline() → LogEntry[]
  ├── calls → store.setSelection() (on entry click)
  └── sends messages → LogPanel webview
        ├── timeline:update (LogEntry[] serialized)
        ├── selection:update (current map selection)
        └── session:change (active plot changed)

LogPanel (React component)
  ├── receives → TimelineEntry[] (transformed from LogEntry[])
  ├── manages → FilterState (local state)
  ├── manages → PresentationMode, ViewMode (persisted state)
  └── emits → onMessage callbacks
        ├── entry:select (activityId)
        ├── entry:deselect
        └── action:invoke (actionType — returns "not available")
```

## State Transitions

```
Panel State Machine:

  [No Plot Open] ──(session activated)──> [Loading]
  [Loading] ──(timeline assembled)──> [Active]
  [Loading] ──(assembly failed)──> [Error]
  [Active] ──(entries exist)──> [Timeline View] or [By-Feature View]
  [Active] ──(no entries)──> [Empty (no entries)]
  [Active] ──(session deactivated)──> [No Plot Open]
  [Error] ──(retry clicked)──> [Loading]
  [Timeline View] ──(filter applied)──> [Filtered]
  [Filtered] ──(filters cleared)──> [Timeline View]
```
