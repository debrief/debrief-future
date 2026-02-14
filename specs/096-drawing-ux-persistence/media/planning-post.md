---
layout: future-post
title: "Planning: Drawing UX Guidance and STAC Persistence"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, e05-shape-drawing, stac, provenance]
excerpt: "Making drawn shapes durable -- guidance overlays, a sequential colour palette, and automatic STAC persistence with provenance."
---

## What We're Building

Features 093 through 095 gave us a drawing toolbar and conversion logic for four shape types. But right now, drawn shapes vanish when you close the plot. That makes drawing a demo feature, not a real annotation capability. Feature 096 fixes this with three additions: context-sensitive guidance text that tells analysts how to draw each shape type, a sequential colour palette so consecutive shapes are visually distinct, and automatic persistence to the local STAC catalog so drawn annotations survive close-reopen cycles.

The guidance overlay is a React component positioned at the bottom-centre of the map -- the same spot Google Maps uses for its measurement tool and Figma uses for mode indicators. When you activate rectangle mode, it says "Click and drag to draw rectangle" with a "Press Esc to cancel" hint. Switch to polygon mode, it updates to "Click to add vertices, double-click to finish". Complete or cancel the shape, the overlay disappears. All guidance strings are extracted to a constants file so they are ready for translation without introducing an i18n dependency.

The colour palette is eight cartographic colours chosen for visibility against both light and dark map tiles. Each new shape gets the next colour in the sequence regardless of shape type. After eight shapes, the palette cycles. The palette index lives in the Zustand session store as an ephemeral field -- it survives re-renders but resets with each new session.

Persistence happens immediately on shape creation. No batching, no deferred save. The drawn feature goes through the existing `stacService.addFeatures()` write path, then `appendProvenance()` records a provenance entry with `source: "user-drawn"`, a UTC timestamp, and the operator identifier. If the write fails, the shape stays visible on the map and the analyst gets a notification. The feature follows the provenance pattern from feature 071, so every drawn annotation has the same lineage metadata as imported and calculated data.

## How It Fits

This is the final feature in Epic E05 (Shape Drawing Tools). Feature 093 built the toolbar and state management. Features 094 and 095 implemented the conversion logic for all four geometry types. Feature 096 closes the loop -- shapes are now guided, styled distinctly, and permanent. After this, an analyst can draw annotations on a plot and find them there next week.

The persistence path is deliberately not new. Drawn features flow through the same `stacService` write methods that imported data uses. The provenance pattern is the same one the log recording service (071) established. The cursor crosshair is a CSS class toggle on the Leaflet container. No new dependencies, no new services, no new storage mechanisms.

## Key Decisions

- **Immediate persistence, not batch**: Each shape is written to the local STAC catalog the moment it is created. Local disk writes are fast enough that debouncing adds complexity without benefit. And the constitution requires provenance to be recorded immediately -- delaying it risks loss.
- **Bottom-centre guidance position**: Follows the map-tool convention (Google Maps, Figma). A cursor-following tooltip was considered but rejected because it obscures the exact area the analyst is drawing in. Toolbar-adjacent positioning was rejected due to clipping risk in narrow panels.
- **Eight-colour sequential palette**: Colours cycle through blue, orange, teal, purple, green, red, brown, and blue-grey. The first three match the per-type defaults from 094/095, so existing colours feel familiar. Sequential assignment means two rectangles drawn back-to-back get different colours, which the old per-type approach could not do.
- **Palette index in Zustand, not derived from feature count**: If we derived the next colour from the number of existing features, deleting a shape would shift all subsequent colours. A simple counter in the session store avoids this and follows the same ephemeral-state pattern as `drawingMode`.
- **Provenance follows the 071 pattern**: Each drawn feature gets a `provenance` array entry with source, timestamp, operator, and action fields. Same structure as imported data, so downstream queries and audit trails do not need special cases for user-drawn shapes.
- **I18N-ready without a new dependency**: Guidance strings are in a typed constants file (`drawingGuidance.ts`). When a project-wide i18n solution is adopted, these become translation keys. Until then, no additional library is needed.

## What We'd Love Feedback On

The guidance text is terse by design -- "Click and drag to draw rectangle" rather than a multi-step tutorial. Is that enough for analysts encountering the drawing tools for the first time, or should the overlay include a brief animation or diagram showing the gesture?

On persistence timing: immediate write-on-create means every drawn shape hits disk individually. For a typical session of 5-10 shapes this is fine. If you anticipate sessions with 50+ annotations, would a "save when idle" approach feel safer, or does the guarantee of immediate persistence matter more?

The colour palette has eight entries. That is enough for most annotation sessions, but it means the ninth shape repeats the first colour. Would a configurable palette (letting analysts define their own annotation colours) be worth the UI complexity, or is cycling through eight sufficient?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
