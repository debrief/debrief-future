# Epic: Results Visualization

Vega-Lite based results viewing infrastructure for STAC-persisted tool outputs.

## Problem

Tools produce result files (histograms, range plots, speed profiles) but there's no way to view them within VS Code. The E03 Buffer Zone Analysis demo needs a histogram that auto-refreshes — but the visualization capability is a general platform need, not specific to one demo.

## Proposed Solution

Build a results viewing system based on Vega-Lite JSON specs (`.vl.json`):

1. **Vega-Lite Renderer** — shared React component that renders any `.vl.json` spec
2. **Results Bottom Panel** — VS Code panel with tabbed layout, hosts renderer instances
3. **Logical Result ID Registry** — maps stable logical IDs to current result files, emits change events when results update
4. **Custom Editor Provider** — `.vl.json` file type association, enables opening results as editor tabs (supports VS Code's native drag-to-float via auxiliary windows)
5. **Auto-Refresh** — watches logical result IDs for changes, re-renders while preserving viewport state

### Architecture

```
Tool execution → produces .vl.json → stored as STAC asset
                                          ↓
                    Logical Result ID Registry
                    (maps "histogram-zone-counts" → current file path)
                                          ↓
                              Change event emitted
                                          ↓
                    Results Panel / Editor Tab auto-refreshes
                    (viewport preserved)
```

### Key Design Decisions

- **Vega-Lite JSON spec** as the result format — tools output declarative specs, not rendered images
- **Logical result ID** as the stable identity — views bind to IDs like `histogram-zone-counts`, not file paths or version numbers
- **Bottom panel by default** with tabbed layout — familiar VS Code pattern (like terminal tabs)
- **Also openable as editor tab** — supports drag-to-float via VS Code auxiliary windows (1.85+)
- **Auto-refresh preserves viewport** — when a result updates, the chart re-renders but zoom/pan state is maintained

### Absorbs E03 #083

E03 item #083 ("auto-refresh for open STAC result views") is absorbed into this epic as item #089, since the auto-refresh capability is fundamentally a results viewing infrastructure concern.

## Success Criteria

- [ ] Vega-Lite renderer correctly displays bar charts, line charts, scatter plots
- [ ] Results appear in bottom panel tabs, switchable between multiple results
- [ ] Results can be opened as editor tabs and dragged to floating windows
- [ ] Logical result ID registry correctly maps IDs to current file paths
- [ ] When a tool re-runs and updates a result, the open view auto-refreshes
- [ ] Viewport state (zoom, pan) is preserved across refreshes
- [ ] Renderer works in Storybook for development/testing
- [ ] Works offline (CONSTITUTION requirement)

## Constraints

- Vega-Lite is the rendering engine — no fallback to other charting libraries
- Must work within VS Code webview security model (CSP restrictions)
- Bundle size consideration: Vega-Lite + Vega adds ~300KB gzipped
- Logical result IDs are scoped per-plot (not global)

## Out of Scope

- Table/grid result views (future enhancement)
- Interactive chart editing (read-only rendering)
- Real-time streaming data visualization
- Export to PDF/PNG from within VS Code (future)

## Epic Breakdown

| Item | Description | Dependencies |
|------|-------------|--------------|
| 085 | Vega-Lite renderer shared component | None (new shared component) |
| 086 | Results bottom panel with tabbed layout | #085 |
| 087 | Logical result ID registry | #071 (Log Service) |
| 088 | Custom editor provider for .vl.json files | #085 |
| 089 | Result view auto-refresh on logical ID change (absorbs E03 #083) | #086, #087, #088 |
