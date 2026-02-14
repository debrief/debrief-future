---
layout: future-post
title: "Planning: Polygon and Polyline Drawing"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, shape-drawing, e05]
excerpt: "Extending the conversion layer to handle multi-vertex shapes -- same pure factory pattern, six files modified, zero new dependencies."
---

## What We're Building

Feature 094 gave us point and rectangle drawing by introducing `createDrawnFeature()` -- a pure factory function that converts Geoman geometry events to schema-compliant GeoJSON. Feature 095 extends that same function to handle polygons and polylines. Same architecture, same validation pattern, same styling defaults approach. The difference is vertex count: polygons need at least three unique vertices, polylines need at least two, and Geoman fires a double-click event when the analyst finishes placing them.

A polygon becomes a `PolyAnnotation` feature (kind=POLY) with orange fill and darker stroke. A polyline becomes a `LineAnnotation` feature (kind=LINE) with teal stroke and no fill. Both get UUIDs, default names ("Drawn Polygon" or "Drawn Path"), and automatic selection after creation. The conversion logic validates minimum vertex counts, checks for finite coordinates, and calculates metadata fields like `vertex_count` (excluding the ring closure point for polygons). Zero new files, six existing modules modified, ~100 lines added total.

## How It Fits

This is the third feature in Epic E05 (Shape Drawing Tools). Feature 093 built the shape palette toolbar. Feature 094 implemented point and rectangle conversion. Feature 095 adds polygon and polyline support. The final feature (096) will add STAC persistence and guidance text, completing the epic. The architecture remains the same: the Geoman library handles user interaction, `createDrawnFeature()` handles conversion, and the caller (VS Code webview or Storybook) handles state management. Shared components stay generic; consumers own their state.

The schema types already exist. `PolyAnnotation` and `PolyAnnotationProperties` were added in feature 091-E05 (the schema spec for E05). `LineAnnotation` has existed since the early schema releases and supports multi-vertex LineStrings with no upper bound on vertex count. The toolbar's shape palette already includes polygon and polyline options (added in 093). The only missing piece is the conversion logic.

## Key Decisions

- **Polylines use the existing LINE FeatureKind**: No new POLYLINE enum value. The LINE kind supports multi-vertex LineString geometries per the schema spec (091-poly-featurekind). A golden fixture with 5+ vertices validates this. Adding a new FeatureKind would require schema changes, type regeneration, and fixture updates with zero functional benefit.
- **Distinct colours for each shape type**: Points are green, rectangles blue. Polygons get orange (#FF9800 fill with #E65100 stroke at 15% opacity) to distinguish them from rectangles. Polylines get teal/cyan (#00BCD4 stroke, no fill) to clearly signal they're lines, not areas. All colours chosen for contrast against maritime map backgrounds.
- **vertex_count excludes the closure point**: A polygon with coordinates `[[A, B, C, D, A]]` (5 points including the auto-added closure) has `vertex_count: 4`. This matches the PolyAnnotationProperties schema definition and Geoman's output behaviour.
- **Same prompt mechanism as points and rectangles**: The VS Code webview uses `window.prompt()` with mode-specific defaults. Polygons prompt "Name this polygon:" with default "Drawn Polygon". Polylines prompt "Name this path:" with default "Drawn Path". No UX changes, just additional switch cases.
- **No topological validation**: Polygons are accepted even if self-intersecting or thin. The schema permits this, and analysts may intentionally create complex shapes for annotation purposes. Validation only checks minimum vertex counts and finite coordinates.
- **Zero new files**: All changes extend existing modules in `shared/components/src/MapView/drawing/` and `apps/vscode/src/webview/web/`. The infrastructure from 094 was designed to handle additional shape types without architectural changes.

## What We'd Love Feedback On

Should there be a minimum vertex count higher than the schema floor (3 for polygons, 2 for polylines)? We could require 4+ vertices for polygons (rejecting triangles) or 3+ for polylines if analysts find minimal-vertex shapes too easy to create accidentally. The trade-off is simplicity versus preventing unintended geometry.

The default naming convention is generic ("Drawn Polygon", "Drawn Path" with auto-incrementing suffixes). Would coordinate-based names be more useful (e.g., "Polygon at 50.2N 1.5W") or landmark-based prompts ("Exclusion Zone", "Patrol Route") presented as suggestions? We can surface this as a configuration option later, but want to understand analyst workflow expectations now.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
