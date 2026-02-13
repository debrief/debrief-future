---
layout: future-post
title: "Shipped: POLY FeatureKind for Arbitrary Polygons"
date: 2026-02-13
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, schemas, linkml, shape-drawing]
excerpt: "Schema support for freeform polygon annotations unblocks downstream drawing tools and validates REP file parsing output"
---

## What We Built

The POLY FeatureKind now exists in the LinkML schema. We added `POLY` to `FeatureKindEnum`, created a `PolyAnnotationProperties` class with vertex metadata and styling, and defined `PolyAnnotation` as a GeoJSON Feature with Polygon geometry.

This is a schema-only change. No UI code. No drawing tools yet. Just the foundational model that lets the system recognize and validate arbitrary polygons that analysts draw.

We wrote the LinkML definitions, generated Pydantic models and JSON Schema, created golden fixtures demonstrating valid and invalid POLY features, and ran the full test suite. All 76 fixture tests pass. Zero regressions.

## Why It Matters

The REP file parser already produces polygon features with `kind: "POLY"`. But the schema didn't include POLY in the FeatureKindEnum. That meant the system could parse a polygon, but validation would fail—the kind value wasn't legal.

This mismatch is now fixed. POLY features produced by the IO service pass validation. Downstream tools can assume POLY is a valid, tested kind.

## Key Numbers

- 4 golden fixtures created (2 valid, 2 invalid)
- 76 fixture tests: 76 passed, 0 failed
- 0 regressions — all existing tests continue to pass
- New Pydantic model, JSON Schema, and TypeScript types generated and validated

## What We Added

**PolyAnnotationProperties:**
- `kind` constrained to `"POLY"` (required, discriminated)
- `vertex_count` integer — number of unique vertices in the polygon
- `label` optional string — analyst-provided annotation
- `symbol` optional string — REP color code (e.g., `"009900"`)
- `style` required PolygonProperties — fill color, opacity, border styling
- `source_file` optional string — lineage tracking
- `line_number` optional integer — provenance for REP parsing

**PolyAnnotation GeoJSON Feature:**
- `type` constrained to `"Feature"`
- `id` required string identifier
- `geometry` required Polygon (closed ring with 4+ coordinate pairs)
- `properties` required PolyAnnotationProperties

The model follows the established annotation pattern we use for circles and rectangles. Structurally similar, but distinguished by kind and the addition of `vertex_count` metadata.

## What We Confirmed

The existing `LINE` FeatureKind already supports multi-vertex polylines (LineString geometries with 5+ points). We created a fixture with 5 vertices to verify. No new POLYLINE kind is needed. LINE handles freeform paths correctly.

## Lessons Learned

Starting with schema alignment rather than UI code forced clarity. We asked: what does the REP parser already produce? How should it be represented? What metadata is essential? Answering these questions first meant downstream developers know exactly what they're building against.

The `vertex_count` field is metadata, not geometry validation. The ring coordinates define the actual polygon shape. The count is informational — useful for the UI to show "4 vertices" without parsing GeoJSON. This separation of concerns makes both simpler.

## What's Next

E05 shape drawing tools now have schema support for all shape types:

- E05 #092: Geoman integration — the drawing library now has a valid schema to save polygons into
- E05 #093: Drawing toolbar — can dispatch to polygon drawing UI
- E05 #095: Polygon/polyline drawing — has validated POLY and LINE kinds in the schema

The schema is ready. The tools aren't yet. But they can build with confidence that their output will validate.

→ [View the schema](https://github.com/debrief/debrief-future/blob/main/shared/schemas/src/linkml/annotations.yaml)
→ [Browse the fixtures](https://github.com/debrief/debrief-future/tree/main/shared/schemas/fixtures/annotations/poly)
