# Contract: VS Code Commands

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15
**Type**: VS Code Extension API

---

## Overview

This contract defines all commands registered by the Debrief VS Code extension. Commands are registered in `package.json` and implemented in the extension host.

---

## Command Categories

### Plot Commands

#### `debrief.openPlot`

Open a plot from a STAC store.

| Property | Value |
|----------|-------|
| Command ID | `debrief.openPlot` |
| Title | "Debrief: Open Plot" |
| Category | "Debrief" |
| Keybinding | `Ctrl+Shift+O` (when extension active) |
| Context | Command Palette, Explorer context menu |

**Arguments**:
```typescript
interface OpenPlotArgs {
  /** URI of the plot item (optional - shows picker if not provided) */
  uri?: string;
}
```

**Behavior**:
- If `uri` provided: Opens the plot directly
- If no `uri`: Shows QuickPick with all plots from registered stores

---

#### `debrief.closePlot`

Close the current plot panel.

| Property | Value |
|----------|-------|
| Command ID | `debrief.closePlot` |
| Title | "Debrief: Close Plot" |
| Category | "Debrief" |
| Context | Command Palette (when plot open) |

---

### Store Commands

#### `debrief.addStore`

Register a new STAC store.

| Property | Value |
|----------|-------|
| Command ID | `debrief.addStore` |
| Title | "Debrief: Add STAC Store" |
| Category | "Debrief" |
| Context | Command Palette, Welcome view button |

**Behavior**:
1. Shows folder picker dialog
2. Validates selected path contains STAC catalog
3. Prompts for display name (optional)
4. Adds store to debrief-config
5. Refreshes Explorer tree

---

#### `debrief.removeStore`

Remove a registered STAC store.

| Property | Value |
|----------|-------|
| Command ID | `debrief.removeStore` |
| Title | "Remove Store" |
| Category | "Debrief" |
| Context | Explorer context menu (on store item) |

**Arguments**:
```typescript
interface RemoveStoreArgs {
  storeId: string;
}
```

---

#### `debrief.refreshStore`

Refresh a STAC store (re-read catalog).

| Property | Value |
|----------|-------|
| Command ID | `debrief.refreshStore` |
| Title | "Refresh" |
| Category | "Debrief" |
| Context | Explorer context menu (on store item) |

**Arguments**:
```typescript
interface RefreshStoreArgs {
  storeId: string;
}
```

---

### Selection Commands

#### `debrief.selectAll`

Select all tracks in the current plot.

| Property | Value |
|----------|-------|
| Command ID | `debrief.selectAll` |
| Title | "Select All Tracks" |
| Category | "Debrief" |
| Keybinding | `Ctrl+A` (when map focused) |
| Context | Command Palette (when plot open) |

---

#### `debrief.clearSelection`

Clear the current selection.

| Property | Value |
|----------|-------|
| Command ID | `debrief.clearSelection` |
| Title | "Clear Selection" |
| Category | "Debrief" |
| Keybinding | `Escape` (when map focused) |
| Context | Command Palette (when plot open) |

---

### View Commands

#### `debrief.fitToAll`

Fit map view to all tracks.

| Property | Value |
|----------|-------|
| Command ID | `debrief.fitToAll` |
| Title | "Debrief: Fit to All Tracks" |
| Category | "Debrief" |
| Keybinding | `Ctrl+0` (when map focused) |
| Context | Command Palette, map toolbar |

---

#### `debrief.fitToSelection`

Fit map view to current selection.

| Property | Value |
|----------|-------|
| Command ID | `debrief.fitToSelection` |
| Title | "Debrief: Fit to Selection" |
| Category | "Debrief" |
| Context | Command Palette (when selection exists) |

---

#### `debrief.zoomIn`

Zoom in on the map.

| Property | Value |
|----------|-------|
| Command ID | `debrief.zoomIn` |
| Title | "Zoom In" |
| Category | "Debrief" |
| Keybinding | `Ctrl+=` (when map focused) |
| Context | Map toolbar |

---

#### `debrief.zoomOut`

Zoom out on the map.

| Property | Value |
|----------|-------|
| Command ID | `debrief.zoomOut` |
| Title | "Zoom Out" |
| Category | "Debrief" |
| Keybinding | `Ctrl+-` (when map focused) |
| Context | Map toolbar |

---

### Export Commands

#### `debrief.exportPng`

Export current map view as PNG.

| Property | Value |
|----------|-------|
| Command ID | `debrief.exportPng` |
| Title | "Debrief: Export as PNG" |
| Category | "Debrief" |
| Context | Command Palette, map toolbar |

**Behavior**:
1. Shows save file dialog
2. Captures map canvas
3. Saves PNG to selected location

---

### Tool Commands

#### `debrief.executeTool`

Execute an analysis tool on current selection.

| Property | Value |
|----------|-------|
| Command ID | `debrief.executeTool` |
| Title | "Execute Tool" |
| Category | "Debrief" |
| Context | Tools panel (per-tool button) |

**Arguments**:
```typescript
interface ExecuteToolArgs {
  toolName: string;
  params?: Record<string, unknown>;
}
```

---

#### `debrief.cancelToolExecution`

Cancel a running tool execution.

| Property | Value |
|----------|-------|
| Command ID | `debrief.cancelToolExecution` |
| Title | "Cancel" |
| Category | "Debrief" |
| Context | Progress notification |

**Arguments**:
```typescript
interface CancelToolArgs {
  executionId: string;
}
```

---

### Layer Commands

#### `debrief.toggleLayerVisibility`

Toggle visibility of a layer.

| Property | Value |
|----------|-------|
| Command ID | `debrief.toggleLayerVisibility` |
| Title | "Toggle Visibility" |
| Category | "Debrief" |
| Context | Layers panel checkbox |

**Arguments**:
```typescript
interface ToggleLayerArgs {
  layerId: string;
}
```

---

#### `debrief.removeResultLayer`

Remove a result layer.

| Property | Value |
|----------|-------|
| Command ID | `debrief.removeResultLayer` |
| Title | "Remove Layer" |
| Category | "Debrief" |
| Context | Layers panel context menu (on result layer) |

**Arguments**:
```typescript
interface RemoveLayerArgs {
  layerId: string;
}
```

---

#### `debrief.clearAllResults`

Remove all result layers.

| Property | Value |
|----------|-------|
| Command ID | `debrief.clearAllResults` |
| Title | "Clear All Results" |
| Category | "Debrief" |
| Context | Layers panel button |

---

### Track Commands

#### `debrief.changeTrackColor`

Change the color of a track.

| Property | Value |
|----------|-------|
| Command ID | `debrief.changeTrackColor` |
| Title | "Change Color" |
| Category | "Debrief" |
| Context | Map context menu (on track), Layers panel context menu |

**Arguments**:
```typescript
interface ChangeColorArgs {
  trackId: string;
}
```

**Behavior**:
1. Shows VS Code color picker
2. Updates track color in webview
3. Saves color to plot metadata

---

### Time Range Commands

#### `debrief.setTimeRange`

Set custom time range filter.

| Property | Value |
|----------|-------|
| Command ID | `debrief.setTimeRange` |
| Title | "Set Time Range" |
| Category | "Debrief" |
| Context | Time range panel |

**Arguments**:
```typescript
interface SetTimeRangeArgs {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}
```

---

#### `debrief.resetTimeRange`

Reset time range to full data extent.

| Property | Value |
|----------|-------|
| Command ID | `debrief.resetTimeRange` |
| Title | "Full Range" |
| Category | "Debrief" |
| Context | Time range panel button |

---

## package.json Commands Section

```json
{
  "contributes": {
    "commands": [
      {
        "command": "debrief.openPlot",
        "title": "Open Plot",
        "category": "Debrief",
        "icon": "$(folder-opened)"
      },
      {
        "command": "debrief.addStore",
        "title": "Add STAC Store",
        "category": "Debrief",
        "icon": "$(add)"
      },
      {
        "command": "debrief.selectAll",
        "title": "Select All Tracks",
        "category": "Debrief"
      },
      {
        "command": "debrief.clearSelection",
        "title": "Clear Selection",
        "category": "Debrief"
      },
      {
        "command": "debrief.fitToAll",
        "title": "Fit to All Tracks",
        "category": "Debrief",
        "icon": "$(screen-full)"
      },
      {
        "command": "debrief.exportPng",
        "title": "Export as PNG",
        "category": "Debrief",
        "icon": "$(export)"
      },
      {
        "command": "debrief.zoomIn",
        "title": "Zoom In",
        "category": "Debrief",
        "icon": "$(zoom-in)"
      },
      {
        "command": "debrief.zoomOut",
        "title": "Zoom Out",
        "category": "Debrief",
        "icon": "$(zoom-out)"
      }
    ]
  }
}
```

---

## Keybindings

```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "debrief.selectAll",
        "key": "ctrl+a",
        "when": "debrief.mapFocused"
      },
      {
        "command": "debrief.clearSelection",
        "key": "escape",
        "when": "debrief.mapFocused && debrief.hasSelection"
      },
      {
        "command": "debrief.fitToAll",
        "key": "ctrl+0",
        "when": "debrief.mapFocused"
      },
      {
        "command": "debrief.zoomIn",
        "key": "ctrl+=",
        "when": "debrief.mapFocused"
      },
      {
        "command": "debrief.zoomOut",
        "key": "ctrl+-",
        "when": "debrief.mapFocused"
      }
    ]
  }
}
```

---

## Context Keys

The extension sets these context keys for conditional command availability:

| Context Key | Type | Description |
|-------------|------|-------------|
| `debrief.plotOpen` | boolean | A plot panel is open |
| `debrief.mapFocused` | boolean | Map webview has focus |
| `debrief.hasSelection` | boolean | Selection is not empty |
| `debrief.hasResultLayers` | boolean | Result layers exist |
| `debrief.calcAvailable` | boolean | debrief-calc service is available |
