---
layout: future-post
title: "Planning: Timeline/Gantt View with Temporal Filtering"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, e08, timeline]
excerpt: "Adding a Gantt-style timeline to the Stack Browser so analysts can filter exercises by dragging a time range"
---

## What We're Building

Maritime exercises pile up. An archive of 50 or 100 exercises spanning several years becomes hard to navigate with a flat list, even with good metadata filters. The question analysts keep coming back to is temporal: "What was happening in the second half of 2024?" or "Show me the exercises that overlapped with JOINT WARRIOR."

The next piece of the Stack Browser is a Gantt-style timeline view. Each exercise gets a horizontal bar showing when it started and ended. A draggable "brush" overlay lets you grab the edges of a time window and narrow it -- the list and map views update live as you drag. No submit button, no round-trip. Drag the handle, see the results.

Double-clicking a bar opens that exercise in an editor tab. The browser stays open with your filters intact, so you can keep exploring.

## How It Fits

This is feature #131 in Epic E08 (STAC Stack Browser Discovery UI). The Stack Browser is built around three synchronised views -- list, map, and timeline -- all sharing filter state through a common store (#132). The timeline owns temporal filtering: it writes a `TemporalFilter` (start and end timestamps in epoch milliseconds) to the shared store, and the other views subscribe.

The component lives in `shared/components`, the same home as the CatalogOverview panel and the CQL2 filter engine (#126). It is a pure React component that works in both the VS Code webview and the web-shell. No service dependencies, no network calls -- just SVG and pointer events.

We already have timeline rendering code. The CatalogOverview component has helpers for parsing ISO 8601 timestamps, computing time ranges, and positioning bars. Rather than duplicate that logic, we are extracting it into a shared `timeline-utils` module that both components import. The existing tests in `timeline.test.ts` validate these helpers, so the extraction is low-risk.

## Key Decisions

- **SVG with pointer events, no new dependencies.** The brush interaction (dragging handles to narrow a time range) is a common Gantt chart pattern. d3-brush would give us this for free, but it is a large dependency for a simple interaction. We are implementing the brush with three SVG elements and pointer event handlers. If that proves brittle, d3-brush is an easy fallback.

- **Multi-granularity time axis.** The axis labels adapt based on how much time the view spans. Under 24 hours you see `HH:mm`. Under 90 days, `dd MMM`. Over two years, just `yyyy`. This uses `Intl.DateTimeFormat` for locale-aware formatting -- no date library needed.

- **Scrollable rows, fixed axis.** With 100 exercises, the timeline needs vertical scrolling. The time axis stays fixed at the bottom so you always have a reference. We validated the 100-item target against the existing CatalogOverview "Many Items" Storybook story -- SVG handles it without virtualization.

- **Colour via function prop, not direct coupling.** The colour scheme engine (#134) will map exercise metadata to colours. The timeline accepts an optional `colourFn` prop -- a function from item to CSS colour string. When it is not provided, bars use the default theme colour. This keeps the timeline independent of how colour schemes are implemented.

- **Epoch milliseconds for filter state.** The temporal filter uses epoch ms internally, matching the output of `parseTime()`. ISO strings are more readable, but every consumer would need to parse them. CQL2 serialisation can happen at the store boundary when we need it.

- **Handles cannot cross.** Dragging the left handle past the right handle (or vice versa) is clamped. No inverted ranges, no confusing state.

## What We'd Love Feedback On

- **What time scales matter most?** The adaptive axis formatting covers hours through decades. Are there specific granularities -- weeks, fiscal quarters, NATO exercise periods -- that analysts would expect to see as natural breakpoints?

- **Selection behaviour.** We are using double-click to open an exercise from the timeline (consistent with file explorers). Single-click is reserved for future use (multi-select, highlight). Does double-click feel natural for this interaction, or would analysts expect something different?

- **Brush vs. zoom.** The current plan is drag-to-filter: you set a window and everything outside it is filtered out. An alternative is scroll-to-zoom on the time axis, which changes the visible range without filtering. These serve different purposes. Is filtering the right default, or should zooming come first?

- **Bar ordering.** The spec does not prescribe how exercises are ordered vertically. Options include: sorted by start date (earliest at top), sorted by duration, grouped by collection, or matching the list view's current sort. Which ordering would make temporal patterns most visible?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
