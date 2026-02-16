# Usage Example — Results Bottom Panel

## Scenario: View Analysis Results After Tool Execution

### 1. Run an Analysis Tool

1. Open a plot in Debrief
2. Select two tracks
3. Execute "Range & Bearing" tool from the Activity Panel

The tool persists a DatasetEnvelope JSON to the plot's `assets/` directory.

### 2. Auto-Open in Results Panel

After the tool completes and persists the result:

- The **Results** bottom panel opens automatically
- A new tab appears titled "Range & Bearing" (derived from `DatasetEnvelope.title`)
- The Vega-Lite chart renders in the content area

### 3. Open Additional Results

Run another tool (e.g., "Track Statistics"):

- A second tab appears in the tab bar
- Click between tabs to switch views
- Each tab preserves its content

### 4. Live Update

Re-run the Range & Bearing tool with different parameters:

- The result file is overwritten
- The file system watcher detects the change within 200ms
- The tab content re-renders automatically (no manual refresh needed)
- Tab position and selection are preserved

### 5. Close Tabs

- Click the `×` button on any tab to close it
- Closing the active tab activates the nearest neighbor
- Closing the last tab shows the empty state

### 6. Open from Activity Panel

- In the Activity Panel, right-click a result layer with an artifact
- Click "Open Result Artifact"
- The result opens in the Results Panel (not a raw text editor)
- If the tab is already open, it activates the existing tab (de-duplication)

### 7. Manual Access

- Open Command Palette (`Ctrl+Shift+P`)
- Type "Show Results Panel"
- The panel opens showing previously opened tabs or empty state

## Content Types

| File Type | Rendered As |
|-----------|-------------|
| `.json` (DatasetEnvelope) | Vega-Lite chart via ChartRenderer |
| `.png`, `.jpg`, `.svg` | Inline image viewer |
| Other files | File summary with "Open in VS Code" button |

## Multi-Plot Disambiguation

When results are open from multiple plots simultaneously:

- Tab titles include the plot name: `Zone Histogram — Exercise Alpha`
- This prefix appears only when tabs from 2+ plots are open
- Closing tabs from one plot removes the prefix when only one plot remains
