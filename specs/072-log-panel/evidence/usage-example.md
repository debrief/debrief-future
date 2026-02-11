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

## Storybook Preview

To preview the LogPanel component interactively:

```bash
pnpm storybook
```

Then navigate to **LogPanel** in the sidebar. Available stories:

| Story | URL Path |
|-------|----------|
| Timeline Default | `/iframe.html?id=logpanel--timeline-default` |
| Empty (No Plot) | `/iframe.html?id=logpanel--empty-no-plot` |
| Empty (No Entries) | `/iframe.html?id=logpanel--empty-no-entries` |
| Entry Selected | `/iframe.html?id=logpanel--entry-selected` |
| Deleted Feature | `/iframe.html?id=logpanel--entry-with-deleted-feature` |
| Compact Mode | `/iframe.html?id=logpanel--compact-mode` |
| Normal Mode | `/iframe.html?id=logpanel--normal-mode` |
| Detailed Mode | `/iframe.html?id=logpanel--detailed-mode` |
| Filter Active | `/iframe.html?id=logpanel--filter-active` |
| By-Feature View | `/iframe.html?id=logpanel--by-feature-view` |
| Actions Disabled | `/iframe.html?id=logpanel--actions-disabled` |

All stories are interactive — click entries to select/deselect, switch modes, toggle filters, and invoke action buttons.

## Web-Shell Integration

The Log Panel is also integrated into the web-shell demo with a tab-panel sidebar:

```bash
pnpm --filter web-shell dev
```

1. Open a plot from the catalog
2. Select a track on the map
3. Run a tool from the Activity tab
4. Switch to the **Log** tab to see the recorded entry

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
