---
layout: future-post
title: "Planning: Colour Scheme Engine with Legend"
date: 2026-03-07
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, e08, colour-engine]
excerpt: "A headless colour engine so analysts can colour-code exercises by age, vessel class, or tag across map and timeline views"
---

## What We're Building

When you are staring at 80 exercises on a map, they all look the same. You know the metadata is there -- vessel classes, date ranges, tags your team assigned -- but it is locked inside tooltips and detail panels. You have to click each one to understand what you are looking at.

The colour scheme engine gives analysts a single dropdown: colour by Age, Vessel Class, or Tag. Choose one, and every exercise on the map and timeline immediately updates. Destroyers go blue, submarines go orange, frigates go green. Or switch to Age and the most recent exercises glow vivid while older ones fade. A shared legend sits alongside both views so the encoding is never ambiguous.

The engine itself is headless -- pure TypeScript functions that take a list of exercises and a colour dimension, and return two things: a pre-computed colour map for the map view (#130) and a colour function for the timeline (#131). Two thin React components (a dimension selector and a legend) sit on top.

## How It Fits

This is feature #134 in Epic E08 (STAC Stack Browser Discovery UI). The Stack Browser has three synchronised views -- list, map, and timeline -- that already share filter state through a common store. The colour engine adds a new piece of shared state: which colour dimension is active.

The module lives in `shared/components/src/colour-engine/`, right alongside the CQL2 filter engine (#126). It follows the same architectural pattern: headless logic with co-located React components, no service dependencies, no network calls. The map view (#130) consumes a `ReadonlyMap<string, string>` mapping exercise IDs to CSS colours. The timeline (#131) consumes a `colourFn` that maps an exercise item to a colour string. Both views are already designed to accept these props -- the timeline spec explicitly reserves an optional `colourFn` parameter.

Exercises missing metadata for the active dimension get a neutral "unclassified" colour, and the legend includes an entry for them. No exercise disappears because it lacks a vessel class tag.

## Key Decisions

- **Headless engine, thin components.** The core logic is pure functions with no React dependency. `computeColourAssignment` takes items, a dimension, and a palette, and returns a colour map, a colour function, and a legend model. The two React components (selector and legend) are thin wrappers that render from this output. This means the engine is testable without a DOM and reusable outside React if we ever need it.

- **Hand-curated 12-colour palette, zero dependencies.** We considered pulling in a colour library like d3-scale-chromatic, but it is a large dependency for a constrained problem. Instead, we are hand-picking 12 perceptually distinct colours. When categories exceed 12, the palette recycles with modified brightness. The palette lives in a single `palette.ts` file that is easy to swap if accessibility testing reveals problems.

- **Dual export format.** The map view works with pre-computed lookups (item ID to colour). The timeline works with per-item functions (item to colour). Rather than force one view to adapt to the other's preferred format, the engine produces both. This keeps the consumers simple and avoids coupling the colour engine to either view's internals.

- **Extensible dimension registry.** The three built-in dimensions (Age, Vessel Class, Tag) cover known analyst needs. But the architecture is a simple registry: define a `ColourDimension` with an ID, label, type (gradient or categorical), and a resolve function, then register it. It appears in the selector automatically. This is how organisation-specific dimensions (exercise type, classification level) can be added without touching the core module.

- **Gradient vs. categorical rendering.** Age is continuous, so it gets a gradient legend (faded-to-vivid bar with date range labels). Vessel Class and Tag are categorical, so they get discrete swatches. The legend component reads the dimension type and switches rendering mode. This distinction is baked into the `ColourDimension` type definition, so new dimensions declare their rendering mode upfront.

- **Session-scoped state only.** The active colour dimension is not persisted. It resets when you close the browser panel. This is deliberate -- colour coding is an exploration tool, not a configuration preference. If analysts consistently want a default, we can add persistence later without changing the engine.

## What We'd Love Feedback On

- **Which dimensions matter most?** We are starting with Age, Vessel Class, and Tag because they cover the most common "what am I looking at" questions. Are there other properties -- exercise type, geographic region, classification level -- that analysts reach for when scanning a large catalogue?

- **Palette preferences.** The 12-colour palette needs to work on both light and dark VS Code themes and remain distinguishable for analysts with colour vision deficiencies. We plan to test against WCAG contrast ratios, but if there are existing colour conventions in maritime analysis (e.g., red for hostile, blue for friendly), we would rather align with those than invent our own.

- **Legend placement.** The legend needs to be visible alongside both the map and timeline. Options include: a collapsible panel within the browser sidebar, a floating overlay on the map, or an inline section between the dimension selector and the views. Where would it be least intrusive while still being glanceable?

- **Gradient interpretation.** For the Age dimension, "most recent = vivid, oldest = faded" seemed intuitive. But it could equally be "oldest = dark, newest = light" or a diverging scheme. Is there a convention analysts already use for temporal encoding?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
