---
layout: future-post
title: "Planning: POLY FeatureKind for Arbitrary Polygons"
date: 2026-02-13
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, shape-drawing, schemas, linkml, geojson]
excerpt: "Add POLY to the schema so arbitrary polygons pass validation. First step toward interactive shape drawing."
---

## What We're Building

Right now, the IO service can build polygons from raw shape data and output them as GeoJSON features. But when those features try to enter the STAC catalog, the schema rejects them: `FeatureKindEnum` doesn't include POLY.

We're adding POLY as a new feature kind. It's simple in isolation -- one enum value, a Properties class, and a Feature class following the pattern we've already established for CIRCLE and RECTANGLE. The schema will validate arbitrary user-defined polygons: patrol zones, exclusion areas, search grids, anything the analyst draws on the map.

This unblocks the shape drawing tools that come next. Those tools will be interactive -- drag vertices on the map, the polygon updates in real time, click "save" and it flows through IO and into STAC. But that drawing UI needs the schema to accept polygons first.

## How It Fits

We're building Epic E05 — Shape Drawing Tools — in stages. This feature is the first stage: schema alignment. The epic roadmap is:

1. **Add POLY to schema** (this feature) — prerequisite for downstream tools
2. **Interactive map polygon drawing** (feature 094) — use Geoman library, wire to the map
3. **Save polygon results as STAC items** (feature 095) — use the IO service and STAC catalog

The IO service already has `build_polygon()` output that generates valid GeoJSON. By adding POLY to `FeatureKindEnum`, we align the schema with what the service produces. Nothing breaks downstream; we're just expanding what the schema will accept.

This also connects to the broader shape drawing context from feature 056 (`move_shape` tool). That tool moves existing shapes. The new drawing tools will create them. Both need POLY in the schema.

## Key Decisions

- **Follow the established annotation pattern.** POLY gets a PolyProperties class and a PolyFeature class, just like CIRCLE and RECTANGLE. Consistent structure means consistent code generation and testing.

- **Include vertex_count as metadata.** The IO service includes this in polygon output. We're adding it as an optional metadata property on PolyProperties, matching the pattern from existing shape kinds. Analysts may want to filter or reference polygon complexity.

- **LINE kind supports polylines.** We reviewed the schema and confirmed LINE already accepts both LineString and MultiLineString geometries. No new POLYLINE kind needed -- a line with multiple segments is already valid.

- **Additive-only change.** POLY is new; nothing existing changes. All current tests remain valid. The change is purely schema expansion.

## What We'd Love Feedback On

- **Polygon validity constraints.** Should the schema enforce that a polygon has at least 3 vertices? LinkML can't express this at the schema level, so it would be a Pydantic validator. Is documenting it in the spec and validating in the models sufficient, or would you want stricter enforcement earlier?

- **Ring topology.** GeoJSON polygons support exterior and interior rings (holes). Should PolyProperties include a `holes` array for complex shapes, or keep it simple (solid polygons only) for now? Drawing holes on the map is more complex and can be added later if needed.

- **Shape naming and provenance.** Should PolyFeature include a `source` field (e.g., "drawn", "imported", "computed") to track how the polygon was created? Or is that better handled as a higher-level STAC item property?

--> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
