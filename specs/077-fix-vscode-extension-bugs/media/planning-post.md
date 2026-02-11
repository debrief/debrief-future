---
layout: future-post
title: "Planning: Fix VS Code Extension Bugs"
date: 2026-02-10
track: momentum
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, bug-fix]
excerpt: "One type mismatch at a layer boundary caused three temporal bugs to appear simultaneously."
---

## What We're Building

Four regressions crept in after the last batch of feature work. The time slider stopped updating the map. The location marker vanished. Trail mode rendered an empty canvas. And selecting features no longer offered analysis tools. All discovered while running the Exercise Alpha sample file -- the tracks load and render fine as static features, but anything reactive is broken.

Three of those four bugs share a single root cause, and tracking it down was an instructive exercise in what happens when data crosses a layer boundary with the wrong type.

## How It Fits

The VS Code extension uses a multi-webview architecture. The TimeController sends epoch milliseconds through the extension host, into the Zustand session store, across a postMessage boundary to the map webview, and finally down into the shared React rendering components. That chain has six handoff points. I traced through each one and found them all working correctly -- the plumbing was fine. The problem was at the very end: the track data arriving at the rendering layer carried ISO 8601 timestamp strings (`"2024-01-15T10:00:00Z"`), but the binary search function expected epoch milliseconds (`1705315200000`). JavaScript silently compares strings against numbers without throwing, so the binary search returned wrong indices, the coordinate slicing produced empty arrays, and three features all stopped working for the same reason.

The fix is a one-line conversion in `trackToFeature()`, the function that bridges STAC data into the shared component format. That's where the type boundary lives, and that's where the conversion belongs. The shared components are correct -- they've always expected numbers, and the test fixtures prove it. The STAC layer is correct too -- ISO strings are the right format for GeoJSON. The gap was at the bridge between them.

The fourth bug is unrelated. The selection callback that feeds feature IDs to the tool matching system was only registered when creating a new map panel. When a panel was reused for a second plot, the callback was gone. Tools never heard about selections.

## Key Decisions

- **Convert at the bridge, not the consumer**: The ISO-to-epoch conversion goes in `trackToFeature()` in the VS Code webview, not in the shared `temporal-utils.ts`. The shared rendering components shouldn't know about VS Code-specific data formats. The STAC layer shouldn't change its types either. The bridge function is the right place.
- **Add defensive validation in temporal-utils**: Even though the fix prevents bad data from arriving, I'm adding a runtime check that `times[0]` is a number. If strings leak through again in the future, we'll get a console warning instead of silent corruption.
- **Move callback registration outside the panel-creation block**: The selection callback needs to run for both new and reused panels. This is a straightforward structural fix -- move it after the `if (!panel)` block.
- **No new dependencies**: The entire fix is ~20 lines across two files. No architectural changes, no new patterns.

## What We'd Love Feedback On

- **Silent type coercion as a class of bug**: JavaScript's willingness to compare strings and numbers without complaint made this hard to find. Are there other boundary points in the extension where we should add type guards? The shared components have good test fixtures with correct types, but the integration boundary is where reality diverges from test assumptions.
- **Panel reuse patterns**: The callback registration bug suggests we need a clearer convention for what gets wired once (on panel creation) versus what gets re-wired on each plot load. Should we document this as a contributor guideline?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
