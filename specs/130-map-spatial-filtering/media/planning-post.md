---
layout: future-post
title: "Planning: Map View with Live Spatial Filtering"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, spatial-filtering, leaflet]
excerpt: "Pan and zoom the map to filter exercises by geography — no query language needed, just navigate"
---

## What We're Building

The Discovery UI already shows exercise footprints on a map. What it does not do is let you use the map as a filter. This feature changes that: pan into the North Atlantic, and the exercise list and timeline instantly narrow to show only exercises that took place there. Zoom out, and they reappear. The map becomes a spatial query tool that requires no query syntax — just navigation.

The implementation adds an `onViewportChange` callback to the existing `CatalogOverview` component. When the viewport settles (after a 150ms debounce), it emits bounds in STAC `[west, south, east, north]` format. A companion `filterBySpatialExtent()` utility tests each exercise's bounding box against the viewport using an AABB overlap check. Parent components wire this into the session-state store so the list and timeline views stay in sync.

Zero new runtime dependencies. The spatial intersection is four comparisons per item — sub-millisecond for our 200-exercise ceiling.

## How It Fits

This is part of Epic E08 (STAC Stack Browser Discovery UI), alongside #126 (CQL2 Filter Engine) and #125 (STAC Extension mock data). The CQL2 engine handles metadata filtering — vessel class, tags, nationality, duration. This feature adds a spatial dimension that composes with those filters. An analyst can say "show me UK exercises in the North Atlantic longer than 72 hours" by combining a nationality filter, a duration filter, and a map viewport.

Cross-view synchronisation runs through the existing Zustand session-state store. CatalogOverview emits viewport bounds, the parent applies the spatial filter, and the filtered item list flows to the list and timeline components. The same architecture that already synchronises time ranges and metadata filters now carries spatial state.

## Key Decisions

- **AABB overlap test, not a geometry library.** Exercise footprints and viewports are both axis-aligned rectangles. The overlap test is four comparisons — no need for Turf.js or any polygon intersection library. If we ever need geodesic intersection, we can add it without changing the component API.

- **Antimeridian crossing handled by splitting.** A STAC bbox where `west > east` (like `[170, -10, -170, 10]`) crosses the date line. We split it into two rectangles for both rendering and intersection testing. This matters for a maritime analysis tool — exercises in the Pacific are not optional.

- **150ms debounce on viewport changes.** This matches the debounce pattern already used in FilterDropdown for text input. Leaflet's `moveend` event already batches during animation, so the 150ms is a safety net for rapid discrete gestures, not the primary batching mechanism.

- **Pluggable `colorMap` prop for per-exercise colours.** The Colour Scheme Engine (#134) is designed but not yet built. Rather than block on it, CatalogOverview accepts an optional `Map<string, string>` from item ID to CSS colour. No map provided? All footprints use the accent colour. When #134 arrives, the parent component passes a colour map and everything lights up — no changes to CatalogOverview needed.

- **Three distinct empty states.** "No exercises loaded" (data not available), "No spatial data available" (items exist but none have bounding boxes), and "No exercises in this area" (user has panned away from all data). Each gets its own message because each calls for a different user response.

- **Filtering happens outside the component.** CatalogOverview emits viewport bounds and renders what it receives. It does not filter its own items. The parent component (VS Code webview wrapper or web-shell) owns the filtering logic. This keeps the shared component pure and testable, consistent with the "thick services, thin frontends" architecture.

## What We'd Love Feedback On

- **Should the map auto-refit when metadata filters change?** If you apply a nationality filter and the matching exercises are all in the Mediterranean, should the map zoom to the Mediterranean? Or should it hold position and let the analyst decide? Auto-refit is helpful for discovery but disorienting if you have deliberately framed a region.

- **Viewport persistence across sessions.** The session-state store holds viewport bounds, but should we restore the last viewport when the Discovery UI reopens? Or always start at "show all"? Restoring state feels right for a single catalog, but if the analyst switches catalogs, a stale viewport could hide all exercises.

- **Filtering items without spatial data.** Currently, exercises without bounding boxes are excluded from the map but remain visible in the list and timeline regardless of viewport. This means the list shows a mix of spatially-filtered and unfiltered items. Should items without spatial data be hidden when a spatial filter is active, or always shown with a visual indicator that they were not spatially filtered?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
