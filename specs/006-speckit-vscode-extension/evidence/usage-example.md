# Usage Example: Debrief VS Code Extension

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15

This document demonstrates the end-to-end workflow of the Debrief VS Code extension.

## Workflow Overview

```
1. Add STAC Store → 2. Browse Plots → 3. Open Plot → 4. Select Tracks → 5. Execute Tool → 6. View Results
```

## Step 1: Add a STAC Store

### Using Command Palette

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "Debrief: Add STAC Store"
3. Select the command

### Using UI

1. Click the **+** button in the STAC Stores panel
2. Browse to your STAC catalog folder
3. Click "Select STAC Store"

**Result**: Store appears in Explorer panel with "STAC:" prefix

```
Explorer
├── Project Files
└── STAC: Maritime Data
    └── Exercise Alpha
        ├── Plot 2024-01-15 (2 tracks)
        └── Plot 2024-01-14 (3 tracks)
```

## Step 2: Open a Plot

### Double-click in Explorer

Simply double-click any plot item in the tree view.

### Using Command Palette

1. Press `Ctrl+Shift+O`
2. Select plot from QuickPick list
3. Recently opened plots appear at the top

**Result**: Map panel opens with tracks displayed

## Step 3: View Plot Data

The map displays:
- **Tracks**: Colored polylines showing vessel movements
- **Reference Locations**: Point markers for significant locations
- **Labels**: Track names at start points
- **Scale**: Distance scale in bottom-right corner

### Map Controls

- **Zoom**: Scroll wheel or +/- buttons
- **Pan**: Click and drag
- **Fit All**: Click [] button to see all tracks

### Track Information

Hover over any track to see:
- Track name
- Platform type
- Point count
- Time range

## Step 4: Select Tracks

### Single Selection
Click a track to select it. The track highlights with a glow effect.

### Multi-Select
- **Shift+Click**: Add track to selection
- **Ctrl+Click**: Toggle track in selection

### Clear Selection
- Click empty map space, or
- Press `Escape`

**Visual Feedback**:
- Selected tracks show animated glow
- Selection appears in VS Code Outline panel

## Step 5: Execute Analysis Tool

### View Available Tools

1. Open the Debrief sidebar (anchor icon)
2. Expand "TOOLS" section
3. Tools are filtered by selection context

### Execute Tool

1. Select 2+ tracks on the map
2. Click **Range & Bearing Calculator** in Tools panel
3. Watch progress notification

**Example Output**:
```
Selection: 2 tracks (HMS Defender, USS Freedom)

Available Tools:
- Range & Bearing Calculator [Execute]
- Closest Point of Approach [Execute]
- Relative Motion Analysis [Execute]
```

## Step 6: View Results

### Result Layer

Analysis results appear as:
- Dashed lines connecting relevant points
- Different color from source tracks
- Entry in Layers panel

### Manage Layers

In the Layers panel:
- **Toggle visibility**: Click eye icon
- **Remove layer**: Right-click → Remove
- **Clear all**: Click "Clear Results" button

## Complete Workflow Example

```
Session: Maritime Exercise Analysis

1. Added STAC store: /data/exercises/2024
2. Opened plot: "Exercise Alpha - 2024-01-15"
   - 2 tracks: HMS Defender, USS Freedom
   - 1 location: Alpha Point

3. Selected both tracks (Shift+click)
   - Selection context: multi-track
   - 3 tools available

4. Executed "Closest Point of Approach"
   - Result: CPA at 14:23, distance 450m
   - Marker shows CPA location on map

5. Exported map view as PNG
   - File: exercise-alpha-analysis.png
   - Used for briefing document
```

## Keyboard Shortcuts Reference

| Action | Shortcut |
|--------|----------|
| Open Plot | `Ctrl+Shift+O` |
| Select All | `Ctrl+A` |
| Clear Selection | `Escape` |
| Fit to All | `Ctrl+0` |
| Zoom In | `Ctrl+=` |
| Zoom Out | `Ctrl+-` |

## Tips

1. **Recent Plots**: Your last 10 opened plots appear at the top of the Open Plot picker
2. **Track Colors**: Right-click a track in Layers panel to customize its color
3. **Time Filter**: Use the Time Range slider to focus on specific time periods
4. **Performance**: Canvas renderer (default) handles 10,000+ points smoothly

## Troubleshooting

### Store shows "Path not found"
- Click "Update Path" to select new location
- Or remove and re-add the store

### No tools available
- Ensure debrief-calc is installed and running
- Check `debrief.calc.pythonPath` setting

### Map is blank
- Check webview developer tools for errors
- Ensure plot contains valid GeoJSON data
