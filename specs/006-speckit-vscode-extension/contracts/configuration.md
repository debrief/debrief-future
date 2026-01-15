# Contract: VS Code Configuration Schema

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15
**Type**: VS Code Extension API

---

## Overview

This contract defines the VS Code settings exposed by the Debrief extension. Settings are defined in `package.json` and accessed via `vscode.workspace.getConfiguration('debrief')`.

---

## Configuration Properties

### Display Settings

#### `debrief.display.selectionGlow`

Enable animated glow effect on selected tracks.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Default | `true` |
| Scope | `window` |

**Description**: When enabled, selected tracks show an animated glow effect for enhanced visibility. Disable for better performance on older hardware.

---

#### `debrief.display.trackLabelSize`

Font size for track labels.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `12` |
| Minimum | `8` |
| Maximum | `24` |
| Scope | `window` |

**Description**: Font size in pixels for track labels displayed at track start points.

---

#### `debrief.display.defaultTrackWidth`

Default line width for tracks.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `2` |
| Minimum | `1` |
| Maximum | `10` |
| Scope | `window` |

**Description**: Default line width in pixels for unselected tracks.

---

#### `debrief.display.selectedTrackWidth`

Line width for selected tracks.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `4` |
| Minimum | `2` |
| Maximum | `12` |
| Scope | `window` |

**Description**: Line width in pixels for selected tracks (should be larger than default).

---

### Color Settings

#### `debrief.colors.trackPalette`

Default color palette for tracks.

| Property | Value |
|----------|-------|
| Type | `array` of `string` |
| Default | `["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33"]` |
| Scope | `window` |

**Description**: Array of hex colors used for track display. Colors are assigned cyclically to tracks.

---

#### `debrief.colors.resultLayer`

Default color for result layers.

| Property | Value |
|----------|-------|
| Type | `string` |
| Default | `"#9467bd"` |
| Scope | `window` |

**Description**: Default color for analysis result layers.

---

#### `debrief.colors.referenceLocation`

Color for reference location markers.

| Property | Value |
|----------|-------|
| Type | `string` |
| Default | `"#17becf"` |
| Scope | `window` |

**Description**: Color for reference location point markers.

---

### Map Settings

#### `debrief.map.defaultZoom`

Default zoom level when fitting bounds.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `10` |
| Minimum | `1` |
| Maximum | `18` |
| Scope | `window` |

**Description**: Maximum zoom level when fitting map to track bounds (prevents over-zooming on small areas).

---

#### `debrief.map.fitPadding`

Padding when fitting to bounds.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `50` |
| Minimum | `0` |
| Maximum | `200` |
| Scope | `window` |

**Description**: Padding in pixels around tracks when fitting map to bounds.

---

### Service Settings

#### `debrief.calc.autoConnect`

Automatically connect to debrief-calc on activation.

| Property | Value |
|----------|-------|
| Type | `boolean` |
| Default | `false` |
| Scope | `machine` |

**Description**: When enabled, the extension connects to debrief-calc MCP server on activation instead of on first tool request.

---

#### `debrief.calc.pythonPath`

Path to Python executable for debrief-calc.

| Property | Value |
|----------|-------|
| Type | `string` |
| Default | `""` (auto-detect) |
| Scope | `machine` |

**Description**: Path to Python executable. Leave empty to use system Python. Use this if debrief-calc is installed in a virtual environment.

---

#### `debrief.calc.timeout`

Timeout for tool execution.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `60000` |
| Minimum | `5000` |
| Maximum | `600000` |
| Scope | `window` |

**Description**: Maximum time in milliseconds to wait for tool execution before timeout.

---

### Recent Files Settings

#### `debrief.recentPlots.maxCount`

Maximum number of recent plots to remember.

| Property | Value |
|----------|-------|
| Type | `number` |
| Default | `10` |
| Minimum | `1` |
| Maximum | `50` |
| Scope | `window` |

**Description**: Maximum number of recently opened plots shown in the welcome view.

---

## package.json Configuration Section

```json
{
  "contributes": {
    "configuration": {
      "title": "Debrief",
      "properties": {
        "debrief.display.selectionGlow": {
          "type": "boolean",
          "default": true,
          "description": "Enable animated glow effect on selected tracks",
          "scope": "window"
        },
        "debrief.display.trackLabelSize": {
          "type": "number",
          "default": 12,
          "minimum": 8,
          "maximum": 24,
          "description": "Font size for track labels (pixels)",
          "scope": "window"
        },
        "debrief.display.defaultTrackWidth": {
          "type": "number",
          "default": 2,
          "minimum": 1,
          "maximum": 10,
          "description": "Line width for unselected tracks (pixels)",
          "scope": "window"
        },
        "debrief.display.selectedTrackWidth": {
          "type": "number",
          "default": 4,
          "minimum": 2,
          "maximum": 12,
          "description": "Line width for selected tracks (pixels)",
          "scope": "window"
        },
        "debrief.colors.trackPalette": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33"],
          "description": "Default color palette for tracks (hex values)",
          "scope": "window"
        },
        "debrief.colors.resultLayer": {
          "type": "string",
          "default": "#9467bd",
          "description": "Default color for analysis result layers",
          "scope": "window"
        },
        "debrief.colors.referenceLocation": {
          "type": "string",
          "default": "#17becf",
          "description": "Color for reference location markers",
          "scope": "window"
        },
        "debrief.map.defaultZoom": {
          "type": "number",
          "default": 10,
          "minimum": 1,
          "maximum": 18,
          "description": "Maximum zoom level when fitting to bounds",
          "scope": "window"
        },
        "debrief.map.fitPadding": {
          "type": "number",
          "default": 50,
          "minimum": 0,
          "maximum": 200,
          "description": "Padding around tracks when fitting to bounds (pixels)",
          "scope": "window"
        },
        "debrief.calc.autoConnect": {
          "type": "boolean",
          "default": false,
          "description": "Automatically connect to debrief-calc on activation",
          "scope": "machine"
        },
        "debrief.calc.pythonPath": {
          "type": "string",
          "default": "",
          "description": "Path to Python executable (empty for auto-detect)",
          "scope": "machine"
        },
        "debrief.calc.timeout": {
          "type": "number",
          "default": 60000,
          "minimum": 5000,
          "maximum": 600000,
          "description": "Tool execution timeout in milliseconds",
          "scope": "window"
        },
        "debrief.recentPlots.maxCount": {
          "type": "number",
          "default": 10,
          "minimum": 1,
          "maximum": 50,
          "description": "Maximum recent plots to remember",
          "scope": "window"
        }
      }
    }
  }
}
```

---

## Accessing Configuration

```typescript
import * as vscode from 'vscode';

// Get entire debrief configuration
const config = vscode.workspace.getConfiguration('debrief');

// Get specific values
const glowEnabled = config.get<boolean>('display.selectionGlow', true);
const trackPalette = config.get<string[]>('colors.trackPalette', []);
const timeout = config.get<number>('calc.timeout', 60000);

// Listen for configuration changes
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('debrief.display')) {
    // Update webview with new display settings
  }
  if (e.affectsConfiguration('debrief.calc')) {
    // Reconnect to MCP server if settings changed
  }
});
```

---

## Settings Scope Reference

| Scope | Description | Storage |
|-------|-------------|---------|
| `window` | Per-window setting | Synced via Settings Sync |
| `machine` | Machine-specific | Local only |
| `resource` | Per-workspace | .vscode/settings.json |
