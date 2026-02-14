---
layout: future-post
title: "Planning: Feature Format Menu"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, styling, layers-panel, provenance]
excerpt: "Right-click colour changes are three clicks away -- cascading format menus on every feature row in the Layers panel."
---

## What We're Building

Right now, if you want to change a track's colour in Future Debrief, you run a styling tool with defaults and then fix the result afterward. It works, but it's backwards. The analyst already knows what they want -- they shouldn't have to correct the tool's guess.

We're adding a format icon to every feature row in the Layers panel. Click it, hover over "Line Colour", pick from a 16-colour palette, done. Three clicks, immediate update on the map. The same pattern works for line weight, dash pattern, symbol shape, point size, and opacity. Tracks, points, polygons, annotations -- each feature kind shows only the properties that apply to it. Expand a track to see individual positions, and each point row gets its own format icon for per-point overrides. Select multiple features and use the toolbar format button to batch-change them all at once.

Every format change is recorded in the provenance log. Previous value, new value, which features were affected, when it happened. Undo works because the log captures enough to reverse any change. For batch operations, a single log entry covers the whole group.

## How It Fits

This sits at the intersection of three things we've already built: the styling schemas (LineProperties, PointProperties, PolygonProperties from feature 014), the Layers panel with its per-row actions, and the LogService provenance recording from feature 071. The format menu reads the feature's current style from session-state, presents it via a new CascadingMenu component, writes the updated style back through a `formatService`, and records the change through the existing provenance pipeline. The CascadingMenu itself is generic -- hover-cascade sub-menus with keyboard navigation and viewport repositioning -- so it's reusable for other context menus later.

## Key Decisions

- **Hover-cascade sub-menus, not click-drill or accordion**: Classic desktop pattern. Hover over a property, the value options appear to the right. 150ms delay on hover prevents accidental triggers. Keyboard navigation with arrow keys, Enter, Escape.

- **16-colour preset palette, no custom picker**: Red, dark red, blue, dark blue, green, dark green, yellow, orange, purple, cyan, magenta, brown, white, light grey, dark grey, black. Aligned with naval/military display conventions. A full colour picker can be added later without breaking changes, but presets are faster for 90% of formatting tasks.

- **Per-point style overrides are independent of track defaults**: Changing a track's line colour doesn't overwrite a point you've individually highlighted in red. The `PositionStyleOverride` schema gains `fill_color`, `stroke_color`, `radius`, and opacity fields -- null means "use the track default", an explicit value means "override".

- **Mixed-type batch formatting shows the union**: Select a track and a point location, click the toolbar format button, and you see all possible properties. Properties that don't apply to every feature in the selection are greyed out with a tooltip explaining why. No hidden properties, no confusing omissions.

- **Provenance via existing LogService**: Format changes log as a synthetic tool result (`format-feature-style`) with parameters recording the property name, old value, and new value. Batch operations get a single activity ID. No separate logging mechanism.

- **No new dependencies**: The CascadingMenu is built from scratch in the shared components library. Colour swatches are CSS background-color on div elements. The feature spans three packages (shared components, session-state, VS Code extension) but adds nothing new to `package.json`.

## What We'd Love Feedback On

The 16-colour palette is deliberately conservative -- naval tradition, high contrast on both light and dark backgrounds. But is 16 enough? Legacy Debrief had more, and analysts doing briefings sometimes want specific organisational colours. The question is whether to start with 16 and add later, or invest in a "favourites" mechanism from the beginning.

Per-point formatting currently requires expanding the track in the Layers panel. For tracks with hundreds of positions, that's a lot of scrolling to find the one point you want to highlight. Should we support "format selected point" from the map as well, where clicking a point on the map and then hitting the format shortcut opens the per-point menu? That's a different interaction pattern and would add scope, but it might be the more natural workflow.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
