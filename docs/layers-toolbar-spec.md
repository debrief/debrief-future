# Layers Panel Toolbar Specification

## Overview

Add a toolbar above the Layers tree view in the VS Code extension's Debrief Activity Bar. The toolbar provides quick access to selection-scoped actions and plot-scoped utilities.

## Context

The Layers panel displays features in the current plot. Analysts need efficient access to common operations without navigating menus. This toolbar surfaces frequently-used commands while maintaining access to the full tool ecosystem via dropdowns.

## Design

### Layout

```
[ 🗑 ] [ 👁 ] [ ▶ Run ▼ ]  ···  [ 🔍 ▼ ] [ 📎 ▼ ]
|___ selection scope ___|       |___ plot scope ___|
```

Visual whitespace separates selection-scoped buttons (left) from plot-scoped buttons (right).

### Toolbar Buttons

| Button | Icon | State indicator | Tooltip | Scope |
|--------|------|-----------------|---------|-------|
| Delete | `trash` | — | "Delete selected features" | Selection |
| Visibility | `eye` | — | "Toggle visibility" | Selection |
| Run | `play` | Yellow halo on tool change | "Run command..." | Selection |
| Filter | `search` | Icon variant when filtered | "Filter" | Plot |
| Associated | `paperclip` | Yellow halo on new Results | "Associated Files" | Plot |

All tooltips must be externalisable for I18N (Constitution Article X).

---

## Run Dropdown

### Structure

Nested context menu with standard menu categories plus Analysis tools from debrief-calc.

```
File
├── Export Selection...
├── Export to GeoJSON
└── Export to CSV
Edit
├── Duplicate
├── Rename
└── Lock/Unlock
View
├── Zoom to Selection
├── Pan to Feature
└── Center Map
Analysis
├── TMA
│   └── [context-sensitive tools]
├── Track Processing
│   └── [context-sensitive tools]
├── Statistics
│   └── [context-sensitive tools]
└── [contrib categories...]
```

### Context Sensitivity

- VS Code command visibility controlled via `when` clauses based on selection type
- Analysis submenu populated dynamically from debrief-calc tool registry
- Tool categories mirror debrief-calc organisation; contrib libraries add branches

### Change Indicator

- Yellow halo appears when available tools change (due to selection change)
- Halo clears after ~3 seconds OR when dropdown is opened
- Halo implemented via CSS animation on toolbar button

---

## Filter Dropdown

### Structure

```
┌─────────────────────────┐
│ Filter                  │
├─────────────────────────┤
│ [________________] 🔍   │
│ Scope                   │
│ ☑ Name                  │
│ ☑ Type                  │
│ ☑ Platform              │
│ ☐ Attachments           │
╞═════════════════════════╡
│ Filters                 │
├─────────────────────────┤
│ Feature Type            │
│ ☐ Tracks                │
│ ☐ Contacts              │
│ ☐ Zones                 │
│ ☐ Annotations           │
├─────────────────────────┤
│ Visibility              │
│ ☐ Show hidden only      │
│ ☐ Show visible only     │
╞═════════════════════════╡
│ Temporal                │
│ Features before [____]  │
│ Features after  [____]  │
╞═════════════════════════╡
│ Apply to Selection      │
│   Select matched items  │
│   Add matched to sel.   │
│   Remove matched from   │
└─────────────────────────┘
```

### Behaviour

- Text search + Scope: Quick filter on feature properties (Name, Type, Platform checked by default)
- Attachments scope: Extends search to Sources/Results file names
- Feature Type filters: Checkboxes, multi-select, additive with search
- Visibility filters: Checkboxes, multi-select
- Temporal filters: Datetime pickers for "before" and "after"
- All filters are additive — analyst combines as needed
- Apply to Selection: Actions operate on currently matched (filtered) items

### Filter State Indicator

- When any filter is active, search icon changes to filtered variant (e.g., `search` → `filter`)
- Indicates to analyst that layer list is not showing all features

---

## Associated Files Dropdown

### Structure

```
Sources
├── original-track-data.rep
├── reference-points.csv
└── chart-overlay.geojson
Results
├── 20251012-tma-solution.geojson
├── 20251014-range-analysis.2d.json
└── 20251015-detection-stats.table.json
```

### Behaviour

- Lists contents of `sources/` and `results/` subfolders in current STAC Item
- Click on item → context menu:
  - **Open** — suffix-sensitive viewer selection
  - **Open With...** — manual viewer choice
  - **Reveal in Explorer** — show in VS Code file explorer
  - **Delete** — remove file (Sources show warning: "This will remove original source data and break provenance chain")

### Multi-Suffix Convention

Files use `<freeform>.<viewer-type>.<format>` naming:

| Suffix | Data shape | Viewer |
|--------|-----------|--------|
| `.geojson` | Spatial features | Map overlay |
| `.1d.json` | Reference axis + one series | Line chart |
| `.2d.json` | Reference axis + multiple series | Multi-line chart |
| `.table.json` | Rows × columns | Table viewer |
| `.text.json` | Narrative/structured | Text/markdown |
| `.grid-3d.json` | 2D grid with intensity | Heatmap |

Convention documented in `/shared/schemas/` — extend as viewers are implemented.

### Change Indicator

- Yellow halo appears when new file added to Results (typically after tool execution)
- Halo clears after ~3 seconds OR when dropdown is opened

---

## Constitution Compliance

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| I.3 | No silent failures | Delete/visibility actions show explicit success/error |
| IV.1 | Services never touch UI | Toolbar orchestrates; debrief-calc provides tool metadata only |
| IV.2 | Frontends never persist | All writes go through debrief-stac service |
| V.1 | Fail-safe loading | Broken contrib tools cannot crash menu rendering |
| V.2 | Schema compliance | Tool metadata follows schema; Results follow multi-suffix convention |
| X.1 | I18N from start | All menu labels externalisable, not hardcoded |

---

## Deliverables

1. **Toolbar component** — React component in `/shared/components/` for reuse
2. **VS Code integration** — Toolbar rendered above Layers tree view
3. **Run dropdown** — VS Code menu with nested structure, debrief-calc integration
4. **Filter dropdown** — Custom dropdown component with filter state management
5. **Associated Files dropdown** — STAC asset browser with context menu
6. **Icon assets** — Standard + filtered variants for search/filter icon
7. **I18N strings** — All labels in externalisable format

## Exit Criteria

1. Toolbar renders above Layers panel with all five buttons
2. Delete and Visibility operate on current selection with feedback
3. Run dropdown shows context-sensitive tools from debrief-calc
4. Filter dropdown filters Layers list; icon indicates active filter
5. Associated Files dropdown lists Sources/Results with working context menu
6. Yellow halo appears/clears correctly on Run and Associated Files
7. Multi-suffix files open in appropriate viewer
8. All strings externalisable (no hardcoded English in components)

## Out of Scope

- Map toolbar (navigation controls)
- Right-click context menu on Layers items (separate spec)
- Viewer implementations for .1d, .2d, .grid-3d (separate specs)
- Results provenance/delete policy (deferred)

## Risks

| Risk | Mitigation |
|------|------------|
| VS Code tree view toolbar API limitations | May need custom webview toolbar; investigate API first |
| Dropdown complexity in VS Code context | Use QuickPick for simple cases; custom webview for Filter |
| debrief-calc tool discovery latency | Cache tool metadata; update on selection change only |

---

## Document Control

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | January 2026 | Initial specification from design discussion |
