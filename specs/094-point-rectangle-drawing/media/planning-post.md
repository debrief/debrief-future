---
layout: future-post
title: "Planning: Point and Rectangle Drawing"
date: 2026-02-13
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, shape-drawing, annotations, geoman]
excerpt: "Turning raw Geoman geometry events into schema-compliant GeoJSON features -- a pure function sitting between the drawing library and the data model."
---

## What We're Building

Feature 093 gave us the shape palette: click '+', pick a geometry type, draw on the map. But that palette doesn't know anything about our data model. Geoman fires a `pm:create` event containing a raw Leaflet layer, and 093's job was done once drawing mode reset. What happens between "analyst finishes a drag gesture" and "a proper GeoJSON feature appears in the plot" is what 094 handles.

The core of this feature is a pure factory function called `createDrawnFeature()`. It takes raw GeoJSON from Geoman plus the active drawing mode, and returns a schema-compliant feature -- a `ReferenceLocation` for points (kind=POINT) or a `RectangleAnnotation` for rectangles (kind=RECTANGLE). It generates a UUID, applies default styling, populates required fields, and validates the geometry. If the geometry is degenerate (a zero-area rectangle from a click without drag), it returns null and the shape is silently discarded. The function is pure -- no side effects, no state mutations, no DOM access -- which makes it straightforward to test without spinning up a map.

## How It Fits

This is the second feature in Epic E05 (Shape Drawing Tools). Feature 093 handles entering and exiting drawing mode. Feature 094 handles converting raw output to data. Feature 096 will handle persisting drawn features to STAC. Each layer does one thing. The conversion function sits in `shared/components/src/MapView/drawing/`, co-located with the map components it serves but decoupled from any specific frontend. The VS Code webview and Storybook stories both call the same function -- the only difference is where the resulting feature ends up (VS Code's feature collection state vs. a Storybook `useState` array).

## Key Decisions

- **Reuse existing schema types, no new classes**: Drawn points use `ReferenceLocation` with defaults (`name="Drawn Point"`, `location_type="REFERENCE"`). Drawn rectangles use `RectangleAnnotation`. Introducing new schema types would require LinkML changes and regeneration across all consumers -- not justified when the existing types fit.
- **Distinct default colours**: Points get green (#4CAF50), rectangles get blue (#2196F3). These are deliberately different from track colours (blue=#0066cc for ownship, red=#cc0000 for contacts) so drawn annotations are visually distinguishable from loaded data.
- **Callback-based integration**: The toolbar emits raw GeoJSON via an `onShapeCreated` callback. The consumer (VS Code webview or Storybook) calls `createDrawnFeature()` and decides what to do with the result. The shared component library stays generic; the consumer owns the state update.
- **Silent discard for degenerate geometry**: A zero-area rectangle (click without drag) returns null. No error toast, no minimum-size snapping. The analyst didn't intend a shape, so we don't create one.
- **Auto-select after creation**: The newly drawn feature is immediately selected in session state, so the analyst can inspect or label it without an extra click.
- **No persistence yet**: Drawn features live in the webview's React state. They disappear when the panel closes. Persistence to STAC is feature 096 -- keeping it separate lets us ship drawing without coupling to the storage layer.

## What We'd Love Feedback On

The default styling values (green points, blue rectangles, specific opacities and stroke weights) are constants in a `drawingDefaults.ts` module. Should these be configurable via a user preference, or are fixed defaults acceptable for the initial version? We can refactor to config-driven later, but want to know if anyone has strong feelings about annotation colours now.

When a point is created, it gets the name "Drawn Point" (with auto-incrementing suffix for duplicates). Is that naming convention useful, or would you prefer coordinates-based names (e.g., "Point at 50.3N 1.2W") or no default name at all?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
