# Usage Example: Context-Sensitive Tool Offering

**Feature**: #038 context-tool-vscode

This document demonstrates the full workflow for discovering and executing analysis tools based on feature selection.

## Prerequisites

1. VS Code with Debrief extension installed
2. A plot open with tracks and reference points
3. debrief-calc service running (for tool execution)

## Workflow 1: Single Track Analysis

### Step 1: Select a Single Track

Click on a track (e.g., "HMS Defender") on the map.

**Result**: The Tools panel updates to show applicable tools:
- Track Statistics (calculates speed, course, distance statistics)
- Feature Information (displays detailed info)

### Step 2: Execute Track Statistics

Click "Track Statistics" in the Tools panel.

**Result**:
- Progress notification: "Running Track Statistics..."
- Success notification: "Analysis complete: Track Statistics"
- Result layer appears in Layers panel with provenance metadata

### Step 3: View Provenance

Hover over the result layer in the Layers panel.

**Result**: Tooltip shows:
- Tool: Track Statistics v1.0.0
- Execution time: 2026-01-27T...
- Source features: ["track-hms-defender"]
- Duration: 523ms

## Workflow 2: Two-Track Analysis

### Step 1: Select Two Tracks

Ctrl+Click to select "HMS Defender" and "USS Freedom".

**Result**: The Tools panel updates to show:
- Range & Bearing (requires exactly 2 tracks)
- Closest Point of Approach (requires exactly 2 tracks)
- Relative Motion Analysis (requires exactly 2 tracks)
- Feature Information (works with any selection)

### Step 2: Execute Range & Bearing

Click "Range & Bearing" in the Tools panel.

**Result**:
- Progress notification with cancellation option
- Result layer showing range/bearing measurements over time
- Provenance includes both track IDs

## Workflow 3: Mixed Selection (Track + Point)

### Step 1: Select a Track and a Reference Point

Select "HMS Defender" track and "Alpha Point" location.

**Result**: The Tools panel shows:
- Distance to Point (requires 1 track + 1 point)
- Feature Information

### Step 2: Execute Distance to Point

Click "Distance to Point" in the Tools panel.

**Result**:
- Analysis calculates distance from track to point over time
- Result layer shows distance measurements at each track position

## Workflow 4: Understanding Inactive Tools

### Step 1: Enable "Show Inactive Tools"

Click the filter icon in the Tools panel title bar.

**Result**: Toggle notification: "Showing inactive tools"

### Step 2: View Inactive Tool Explanations

With 1 track selected, see the inactive tools section:
- **Range & Bearing** (inactive): Need 2 TRACK, have 1
- **Closest Point of Approach** (inactive): Need 2 TRACK, have 1
- **Distance to Point** (inactive): Need 1 POINT, have 0

### Step 3: Understand What's Needed

Click on an inactive tool.

**Result**: Information message: "Tool 'range-bearing' is inactive: Need 2 TRACK, have 1"

## Workflow 5: Command Palette Access

### Step 1: Open Command Palette

Press Ctrl+Shift+P (Cmd+Shift+P on Mac).

### Step 2: Search for Tools

Type "Debrief:" to see available tool commands.

**Result**: Only applicable tools appear:
- With 2 tracks: "Debrief: Range & Bearing", "Debrief: Closest Point of Approach", etc.
- With 1 track: "Debrief: Track Statistics"
- Inapplicable tools are not shown (filtered by enablement clause)

### Step 3: Execute via Command Palette

Select "Debrief: Range & Bearing".

**Result**: Same execution flow as clicking in the Tools panel.

## Workflow 6: Context Menu Access

### Step 1: Right-Click on Selection

Right-click on the selected features in the map.

### Step 2: Access Tools Submenu

The context menu shows "Tools" submenu with applicable tools.

**Result**: Same tools as shown in the Tools panel.

## Key Features Demonstrated

1. **Real-time Updates**: Tools panel updates immediately when selection changes
2. **Intelligent Filtering**: Only applicable tools are shown based on selection
3. **Clear Explanations**: Inactive tool reasons help users understand requirements
4. **Multiple Access Points**: Sidebar panel, command palette, and context menu
5. **Provenance Tracking**: All results include source feature IDs and execution metadata
6. **Graceful Degradation**: When calc service is unavailable, panel shows helpful message

## Integration Points

| Component | Responsibility |
|-----------|---------------|
| ToolMatchAdapter | Bridges session-state selection to tool matching |
| ToolsTreeProvider | Displays tools in sidebar panel |
| Extension.ts | Wires selection subscription to tree refresh |
| Package.json | Defines commands and menu contributions |
| CalcService | Executes tools and creates result layers |
