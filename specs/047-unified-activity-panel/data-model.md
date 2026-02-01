# Data Model: Unified Debrief Activity Panel

**Date**: 2026-02-01
**Feature**: 047-unified-activity-panel

## Entities

### ActivityPanelState

Represents the persistent state of the unified panel within a session.

| Field | Type | Description |
|-------|------|-------------|
| timeControllerCollapsed | boolean | Whether the time controller section is collapsed |
| toolsCollapsed | boolean | Whether the tools section is collapsed |
| layersCollapsed | boolean | Whether the layers section is collapsed |

**Persistence**: Session-scoped only via `vscode.setState()` / `vscode.getState()`. Not persisted across VS Code restarts.

**Default**: All sections expanded (`false`).

### WebviewMessage

Typed message protocol between extension host and webview. Follows the existing pattern from `timeRangeView.ts`.

| Field | Type | Description |
|-------|------|-------------|
| type | string (enum) | Message discriminator |
| payload | object | Type-specific data |

**Message types (host → webview)**:

| Type | Payload | Purpose |
|------|---------|---------|
| `temporal:update` | `{ currentTime, startTime, endTime, rate, playing }` | Time controller state |
| `tools:update` | `{ tools: ToolMatch[] }` | Available tools for current selection |
| `layers:update` | `{ layers: LayerItem[] }` | Layer tree with visibility state |
| `selection:update` | `{ selectedIds: string[] }` | Current selection context |

**Message types (webview → host)**:

| Type | Payload | Purpose |
|------|---------|---------|
| `temporal:seek` | `{ time: number }` | User scrubbed to time |
| `temporal:play` | `{ rate: number }` | Play/pause/speed change |
| `tool:run` | `{ toolId: string }` | Run selected tool |
| `layer:toggleVisibility` | `{ layerId: string }` | Toggle layer on/off |
| `layer:reorder` | `{ layerId: string, newIndex: number }` | Reorder layer (future) |

### ToolMatch

Existing entity from `ToolMatchAdapter`. No changes needed.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Tool identifier |
| name | string | Display name |
| description | string | Tool description |
| applicable | boolean | Whether tool applies to current selection |

### LayerItem

Existing entity from `LayersTreeProvider`. Adapted for React rendering.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Layer identifier |
| label | string | Display name |
| type | enum | `track` / `reference` / `shape` / `result` |
| visible | boolean | Current visibility state |
| children | LayerItem[] | Nested items (e.g., track segments) |

## State Transitions

### Panel Lifecycle

```
Sidebar Closed → Panel Opening → All Sections Loaded → User Interacting → Panel Closing
                                                                              ↓
                                                          State saved via vscode.setState()
```

### Section Collapse

```
Expanded ←→ Collapsed  (toggle on header click)
```

State preserved in `ActivityPanelState` and restored on panel reopen within the same session.
