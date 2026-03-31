---
layout: future-post
title: "Planning: Result View Auto-Refresh"
date: 2026-02-17
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, results-visualization, e04]
excerpt: "Auto-updating result charts when tools re-run, preserving zoom and pan state"
---

## What We're Building

An analyst runs a zone histogram, zooms into a cluster of interest, then adjusts a parameter and re-runs the tool. Today that means closing the chart, re-opening it, and navigating back to the same zoom region. With auto-refresh (#089), the chart updates in place. The zoom level and pan position stay exactly where they were. The analyst's focus stays on the data, not on window management.

The mechanism is straightforward. The Logical Result ID Registry (#087) already emits change events when a tool re-run produces new output for a known result ID. The auto-refresh controller subscribes to those events, debounces rapid updates (300ms trailing edge), and coordinates with the chart renderer to capture viewport state before re-rendering and restore it after. A `useAutoRefresh` React hook exposes this to the UI layer. No file watchers, no polling -- just the event system we already have.

## How It Fits

This is the capstone of Epic E04 (Results Visualization). It sits on top of four features we have already built or are building: the chart renderer (#085) provides the rendering surface and will be extended with viewport capture/restore via Vega's signal API, the results bottom panel (#086) provides the tabbed view host, the result ID registry (#087) provides the change events, and the custom editor provider (#088) will eventually provide a second view host. The controller itself lives in `services/session-state` following our thick-services pattern -- coordination logic in the service layer, a thin React hook in the component layer.

## Key Decisions

- **Registry events, not file watchers.** The Result ID Registry already knows when a tool re-run updates a result. Subscribing to its change events gives us immediate, precise notifications without duplicating file system concerns.
- **Vega signal API for viewport preservation.** Before re-rendering, we read Vega view signals (`x_domain`, `y_domain`, selection signals) to capture the analyst's current viewport. After the new spec is embedded, we write them back. This preserves interactive zoom and pan state natively.
- **300ms debounce, per result ID.** Batch tool re-runs can produce several updates in quick succession. A trailing-edge debounce ensures we render only the final state, avoiding flicker. Each result ID has its own debounce timer so one burst doesn't delay an unrelated result.
- **Deferred refresh for background tabs.** If a result view isn't visible (behind another tab), we mark it stale and skip the render. When the tab activates, we check the stale flag and refresh then. No wasted rendering cycles.
- **Pause/resume toggle per view.** Analysts studying a chart in detail can pause auto-refresh. Incoming changes are captured but not applied. On resume, the view jumps to the latest state -- no intermediate versions, just the current data.
- **Controller in session-state, hook in shared components.** The orchestration logic (subscriptions, debounce, pause/stale tracking) belongs in the service layer. The UI layer gets a hook that returns state and handlers. This keeps the logic frontend-agnostic -- it works the same in VS Code webviews and the web shell.

## What We'd Love Feedback On

- **Viewport restoration fidelity**: When re-run data changes substantially (different number of bins, shifted axis range), preserving the exact zoom region may show an empty area or clip new data. Should we detect this and offer a "reset view" option, or is preserving the analyst's position always the right default?
- **Stale indicator design**: When a paused view has pending updates, we plan to show a badge on the tab. What about non-obvious staleness -- should background tabs that refresh on activation show a brief visual cue that the data just changed?
- **Debounce interval**: 300ms feels right for typical use, but analysts running parameter sweeps might produce dozens of updates in seconds. Should we expose the debounce interval as a setting, or is a fixed default sufficient?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
