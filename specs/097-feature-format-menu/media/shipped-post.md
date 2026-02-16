---
layout: future-post
title: "Shipped: Feature Format Menu"
date: 2026-02-14
track: [credibility]
author: Ian
reading_time: 3
tags: [vscode-extension, layers-panel, formatting, provenance, tracer-bullet]
excerpt: "Analysts can now change colours, line weights, symbols, and opacity on any feature directly from the Layers panel"
---

## What We Built

The Layers panel now has format icons. Click one, change the colour of a track. Change the line weight. Switch a waypoint to a diamond symbol. Adjust opacity. Pick from 16 naval tactical colours or choose line weights from 1 to 8 pixels.

Every feature row shows a format icon. Every change updates the map immediately. Every change records what it was before in the provenance log.

Tracks expand to show individual positions. Each position has its own format icon. Change one waypoint to red while the rest stay blue. The per-point overrides persist even when you later change the track's overall style.

Select multiple features and format them together. The menu shows only properties that apply to everything selected. Properties that don't work for some features grey out with tooltips explaining why.

## How It Works

The implementation has four pieces: presets, property mapping, the menu component, and the format service.

**Presets** define what analysts can choose. 16 colours from the naval tactical palette. Line weights from 1 to 8 pixels. Opacity from 25% to 100%. Dash patterns for solid, dashed, and dotted lines. Symbols for circles, squares, triangles, diamonds, and crosses.

**Property mapping** connects feature types to editable properties. Tracks get line colour, line weight, dash pattern, and point symbols. Polygons get fill colour, fill opacity, stroke colour, and stroke weight. Points get symbol shape and colours. The map covers all 12 feature types. Narrative text and system features return empty arrays because they don't have editable styles.

**CascadingMenu** is the React component that renders hover-cascade submenus. Hover over "Line Colour" and the colour palette appears 150ms later. Move your mouse away and it closes. Arrow keys navigate up and down within a level. Right arrow opens a submenu. Left arrow closes it. Escape dismisses the whole menu. Enter selects the highlighted item.

The component handles viewport repositioning. If a submenu would extend beyond the right edge of the screen, it opens to the left instead. If it would extend below the bottom, it opens upward.

**FormatService** applies changes. It reads the current value from the feature's style object, captures it for undo, updates the style, increments the style version counter to trigger a map re-render, records a provenance entry with before and after values, and persists the change via stacService.

For batch operations, it loops through all selected features, collects their previous values, applies the change to each, and writes a single provenance entry referencing all affected features.

For per-point changes, it writes to `position_style_overrides[index]` instead of the track-level style. These overrides cascade at render time — the position rendering code checks the override first, then falls back to the track default.

## Screenshots

**Single Feature Format Menu** — showing track properties with colour palette submenu open.

**Batch Format Menu** — showing union of properties for mixed selection with line-specific properties greyed out.

**Per-Point Override** — track with one waypoint formatted as red diamond while others remain blue circles.

## Lessons Learned

**Cascading menus need delay tuning**. We started with instant hover-open and it felt twitchy. 50ms was too fast. 250ms felt sluggish. 150ms hit the right balance — deliberate but not slow.

**Viewport repositioning is harder than expected**. We initially only checked horizontal overflow. Then we found cases where menus opened near the bottom of a short webview and got cut off. The final implementation checks all four edges and repositions both axes independently.

**Dependency injection matters for testability**. FormatService accepts `stacService` and `logService` as constructor parameters rather than importing them directly. All 16 tests run without touching the filesystem because we pass mock implementations.

**The property map needed human review**. We could have generated it from the schema, but the schema doesn't know which properties are user-facing vs system-generated. Manual curation produced a cleaner UX — only 7 properties for tracks, not the full 20+ fields in the GeoJSON.

**Per-point overrides require schema discipline**. We extended `PositionStyleOverride` to include fill colour, stroke colour, and radius. Each field is nullable. The cascade resolver checks for `undefined` vs `null` vs a value. Missing field means "use track default". Null means "explicitly hide". A value means "use this override".

## What's Next

Format menus are complete. The next layer of interaction is context-sensitive tool invocation — right-click a feature and see only the analysis tools that apply to its type. Move Shape for polygons. Bearing Calculator for pairs of tracks. Buffer Zone Generator for any geometry.

Those tools need parameter pickers. The format menu proved that cascading menus with presets work well. We'll extend the pattern to tool parameters: select a feature to operate on, pick a buffer distance, choose a colour for the result.

The groundwork is in place. Tools are registered with type constraints. The property mapping approach transfers directly to parameter mapping. The provenance log already records tool invocations.

We're building toward analysts asking questions and getting answers in three clicks.

→ [View the spec](https://github.com/debrief/debrief-future/blob/main/specs/097-feature-format-menu/spec.md)
