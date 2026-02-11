# Epic: Results Visualization

Results viewing infrastructure for STAC-persisted tool outputs, with Vega-Lite as the initial (swappable) renderer.

## Problem

Tools produce result files (histograms, range plots, speed profiles) but there's no way to view them within VS Code. The E03 Buffer Zone Analysis demo needs a histogram that auto-refreshes — but the visualization capability is a general platform need, not specific to one demo.

## Proposed Solution

Build a results viewing system with a clean separation between tool output (standard result datasets) and rendering (Vega-Lite, initially):

1. **Dataset-to-Spec Transformer** — converts standard result datasets (e.g. `dataset/zone_histogram`, `dataset/range_bearing_series`) into Vega-Lite specs. This is the ONLY component that knows about Vega-Lite — swapping renderers means replacing this transformer.
2. **Chart Renderer** — shared React component that renders Vega-Lite specs (initially). Swappable behind the transformer.
3. **Results Bottom Panel** — VS Code panel with tabbed layout, hosts renderer instances
4. **Logical Result ID Registry** — maps stable logical IDs to current result files, emits change events when results update
5. **Custom Editor Provider** — opens result datasets as editor tabs (supports VS Code's native drag-to-float via auxiliary windows)
6. **Auto-Refresh** — watches logical result IDs for changes, re-renders while preserving viewport state

### Architecture

```
Tool execution → outputs dataset (standard schema) → stored as STAC asset
                                                          ↓
                          Logical Result ID Registry
                          (maps "histogram-zone-counts" → current file path)
                                                          ↓
                                            Change event emitted
                                                          ↓
                          Dataset-to-Spec Transformer (knows about Vega-Lite)
                                                          ↓
                          Results Panel / Editor Tab renders chart
                          (viewport preserved)
```

### Key Design Decisions

- **Tools output standard result datasets** — using existing `artifact` and `dataset` result types from `tool-result.yaml`. Tools have zero knowledge of the rendering library.
- **Transformer as abstraction boundary** — only the transformer knows about Vega-Lite. Swapping to a different renderer (e.g. Observable Plot, ECharts) means replacing the transformer, not the tools.
- **Vega-Lite as initial renderer** — chosen for schema-first philosophy (JSON specs), but explicitly designed to be replaceable.
- **Logical result ID** as the stable identity — views bind to IDs like `histogram-zone-counts`, not file paths or version numbers
- **Bottom panel by default** with tabbed layout — familiar VS Code pattern (like terminal tabs)
- **Also openable as editor tab** — supports drag-to-float via VS Code auxiliary windows (1.85+)
- **Auto-refresh preserves viewport** — when a result updates, the chart re-renders but zoom/pan state is maintained

### Absorbs E03 #083

E03 item #083 ("auto-refresh for open STAC result views") is absorbed into this epic as item #089, since the auto-refresh capability is fundamentally a results viewing infrastructure concern.

## Success Criteria

- [ ] Transformer correctly converts known dataset types to Vega-Lite specs
- [ ] Renderer correctly displays bar charts, line charts, scatter plots from transformed specs
- [ ] Results appear in bottom panel tabs, switchable between multiple results
- [ ] Results can be opened as editor tabs and dragged to floating windows
- [ ] Logical result ID registry correctly maps IDs to current file paths
- [ ] When a tool re-runs and updates a result, the open view auto-refreshes
- [ ] Viewport state (zoom, pan) is preserved across refreshes
- [ ] Renderer works in Storybook for development/testing
- [ ] Works offline (CONSTITUTION requirement)
- [ ] Vega-Lite is isolated behind the transformer — no Vega-Lite imports outside #085

## Constraints

- Vega-Lite is the initial rendering engine, but must be swappable via the transformer
- Must work within VS Code webview security model (CSP restrictions)
- Bundle size consideration: Vega-Lite + Vega adds ~300KB gzipped
- Logical result IDs are scoped per-plot (not global)
- Tools must NOT output Vega-Lite specs directly — they output standard schema datasets

## Out of Scope

- Table/grid result views (future enhancement)
- Interactive chart editing (read-only rendering)
- Real-time streaming data visualization
- Export to PDF/PNG from within VS Code (future)

## Epic Breakdown

| Item | Description | Dependencies |
|------|-------------|--------------|
| 085 | Chart renderer shared component (Vega-Lite) + dataset-to-spec transformer | None (new shared component) |
| 086 | Results bottom panel with tabbed layout | #085 |
| 087 | Logical result ID registry | #071 (Log Service) |
| 088 | Custom editor provider for result dataset files | #085 |
| 089 | Result view auto-refresh on logical ID change (absorbs E03 #083) | #086, #087, #088 |
