---
layout: future-post
title: "Shipped: Drawing UX Guidance and STAC Persistence"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, drawing-toolbar, shape-palette, provenance, spatial-slice]
excerpt: "Context-sensitive drawing guidance, 8-colour sequential palette, and provenance metadata for every user-drawn shape."
---

## What We Built

Feature 096 completes the drawing toolchain with three capabilities that make drawing shapes feel deliberate and traceable.

**DrawingGuidanceOverlay** shows context-sensitive instructions at the bottom-centre of the map. Click to place a point. Click and drag to draw a rectangle. Click to add vertices, double-click to finish for polygons and polylines. Press Esc to cancel always appears. The overlay uses `role="status"` and `aria-live="polite"` for accessibility, positioned to avoid toolbar conflicts following the Google Maps and Figma pattern.

**8-Colour Sequential Palette** assigns visually distinct colours to consecutive shapes. Blue, orange, cyan, purple, green, red, brown, grey. The palette cycles after eight shapes. The index lives in the Zustand store and resets each session rather than persisting — ephemeral by design.

**Provenance Metadata** embeds `source="user-drawn"`, timestamp, operator, and action in the `properties.provenance` array for every drawn shape. This follows the pattern from feature 071, ensuring every transformation records lineage. The `createDrawnFeature` function handles this as a pure function extension — just a conditional spread.

## How It Works

The DrawingGuidanceOverlay subscribes to the drawing mode state. When the mode changes, it displays the corresponding instruction text. The component lives in the webview package and integrates with the DrawingToolbar.

The colour palette index increments in the spatial slice when a new shape is created. The `createDrawnFeature` function reads the current index, assigns the corresponding colour, and increments the index for the next shape. The palette is defined as a constant array in the types package.

Provenance metadata gets added in `createDrawnFeature` using the same pattern as imported features. The function now accepts optional provenance parameters (operator, action) and conditionally spreads them into the properties object. If no operator is provided, it defaults to "user-drawn" with a timestamp.

The crosshair cursor toggles via a CSS class `debrief-drawing-active` on the Leaflet container. The DrawingToolbar adds and removes this class based on the active drawing mode.

## Lessons Learned

Extending the SpatialSlice type required updating four files: types, slice, subscriptions, and persistence save/load. The session-state package has thorough type coverage that catches incomplete changes immediately. This is good — the compiler prevents partial implementations.

The `createDrawnFeature` function's pure function design made it easy to extend with provenance. No state manipulation, no side effects, just inputs and outputs. Adding the provenance parameters and conditional spread took about ten lines of code.

Bottom-centre positioning for the guidance overlay works well. It avoids toolbar conflicts and follows established patterns from Google Maps and Figma. Users know where to look.

All guidance strings live in a constants file, making them i18n-ready for future translation. This was a small upfront cost for a clear benefit later.

The ephemeral palette index was a deliberate choice. Persisting it across sessions would create confusion when reopening a project — why does the first shape I draw get colour five? Resetting each session keeps the behaviour predictable.

## What's Next

The drawing toolchain is now complete. Shapes can be created, styled, guided, and provenance-tracked. The next step is chart rendering (feature 085) to visualise tabular data from STAC Items.

565 component tests pass, 528 session-state tests pass, zero new dependencies. All constitution gates pass.

→ [See the spec](https://github.com/debrief/debrief-future/blob/main/specs/096-drawing-ux-persistence/spec.md)
