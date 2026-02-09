# Usage Example: Log Panel (072)

**Date**: 2026-02-09

## Walkthrough: Reviewing Analytical History

### 1. Open the Log Panel

Click the clock icon in the VS Code activity bar (left sidebar). The Log Panel opens in the sidebar, showing the timeline of all recorded operations for the current plot.

### 2. Browse the Timeline

The timeline shows entries in reverse chronological order (most recent first). Each entry displays:
- **Tool name** (e.g., "Range & Bearing")
- **Primary affected feature** (e.g., "Track Alpha +1")
- **Parameters** (in Normal/Detailed mode)

### 3. Select an Entry

Click any entry to select it. The affected features are highlighted on the map by replacing the current selection. Click the entry again to deselect and clear the map selection.

### 4. Switch Presentation Modes

Use the toggle in the action bar to switch between:
- **Compact**: Just tool name and feature name — for rapid scanning
- **Normal**: Adds parameter values — for working review
- **Detailed**: Adds timestamp, duration, result ID — for deep investigation

The selected mode persists across panel close/reopen and application restart.

### 5. Filter Entries

Click "Show filters" to expand the filter row. Use:
- **Text search**: Type to filter by tool name, feature name, or parameter values
- **Tool type dropdown**: Select a specific tool (populated dynamically)
- **Category dropdown**: Filter by calculation, import, property-edit, or export

Filters combine with AND logic. The "N of M entries" indicator shows how many are visible.

### 6. Switch to By-Feature View

Click "By Feature" in the view toggle to see entries grouped under feature headings. Multi-feature operations appear under each affected feature's group. Switch back to "Timeline" for the flat chronological view.

### 7. Action Buttons (Phase 2 Placeholders)

The action bar shows: Revert to here, Revert this, Tune, Snapshot, Rationale. All show "not yet available" messages when clicked. Buttons are disabled when no entry is selected.

## Component Structure

```
LogPanel (root)
├── LogActionBar — action buttons + view/mode toggles
├── LogFilterRow — collapsible search/filter controls
└── LogTimeline or LogByFeature — entry list
    └── LogEntry — individual timeline entry
```

## Message Flow

```
Extension Host                    Webview
────────────                      ────────
                    webviewReady ←
  timeline:update →
  session:change  →
  mode:init       →
                    entry:select ←
                    entry:deselect ←
                    action:invoke ←
  action:result   →
                    mode:change ←
```
