---
layout: future-post
title: "Planning: MultiPoint and MultiPolygon Feature Schemas"
date: 2026-02-13
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, schemas, geojson]
excerpt: "Wiring up the multi-geometry classes our styling schemas already expect"
---

## What We're Building

The styling schemas already describe multi-geometry support. PointProperties says "Styling schema for Point and MultiPoint geometries." PolygonProperties says "Styling schema for Polygon and MultiPolygon geometries." The documentation has been there from the start. The geometry classes haven't.

We're adding GeoJSONMultiPoint and GeoJSONMultiPolygon to the LinkML master schema, along with corresponding Feature types that pair them with those existing styling classes. Two new FeatureKindEnum values -- MULTI_POINT and MULTI_POLYGON -- complete the picture. Tools currently in development that return point clusters (intercept finders, rendezvous planners) or polygonal regions (coverage analysers, zone generators) will be able to emit validated, styled GeoJSON Features that flow through the same schema pipeline as everything else.

Zero new dependencies. Zero changes to existing styling classes. The pattern is identical to what we did for GeoJSONMultiLineString when compound tracks needed it -- add the geometry class, add the feature type, wire them together.

## How It Fits

This follows the schema-first pipeline: LinkML definition first, then generated Pydantic models, JSON Schema, and TypeScript types. The new classes are purely additive. Existing features remain valid. The generators produce the code, and golden fixtures validate the output.

The feature properties include `source_tool` and `source_features` fields for provenance tracking, connecting to the PROV schema foundation from feature 070. When a tool produces a MultiPoint result, the feature records which tool created it and which input features it was derived from. Provenance always, per the constitution.

## Key Decisions

- **Follow the existing pattern exactly.** GeoJSONMultiLineString was added for compound tracks. GeoJSONMultiPoint and GeoJSONMultiPolygon follow the same structural approach: `type` constrained by `equals_string`, `coordinates` as a multivalued float array with nesting validated through Pydantic and golden fixtures rather than LinkML (which cannot express nested array structures).

- **Reuse existing styling classes.** PointProperties and PolygonProperties already document multi-geometry support in their descriptions. No changes needed -- the styling schemas were designed for this from the beginning.

- **Properties follow the tool result pattern.** Each feature type gets a Properties class with `kind` discriminator, required `label` and `style`, and optional provenance fields (`source_tool`, `source_features`, `description`). Same shape as existing features like ReferenceLocation and CircleAnnotation.

- **Single style per feature, not per element.** A MultiPoint feature applies one PointProperties to all its points. Per-element styling (different colours for individual points within a multi-geometry) is not in scope. If the need arises, it's a separate feature.

- **Coordinate nesting handled outside LinkML.** LinkML models coordinates as flat `float[]` with `multivalued: true`. The actual GeoJSON nesting structure -- `[[lon, lat], ...]` for MultiPoint, `[[[[lon, lat], ...]], ...]` for MultiPolygon -- is validated by Pydantic models and golden fixture files. This is the same approach used for every other geometry class in the schema.

## What We'd Love Feedback On

A few things I'm still thinking through:

1. **Should MultiPolygon require at least one polygon?** An empty coordinates array is technically valid in the flat LinkML model but semantically meaningless. GeoJSON RFC 7946 doesn't prohibit it. The spec currently says "at least one polygon required" -- but is there a case for allowing empty multi-geometries as placeholders?

2. **FeatureKindEnum naming.** The existing values are TRACK, POINT, CIRCLE, RECTANGLE, LINE, SYSTEM. We're adding MULTI_POINT and MULTI_POLYGON. An alternative would be POINT_SET and POLYGON_SET, which reads more naturally in tool output descriptions. The SCREAMING_SNAKE_CASE convention is settled, but the words themselves are open.

3. **Are there other multi-geometry types we should add now?** GeoJSONMultiLineString already exists. With MultiPoint and MultiPolygon, we'd cover the full GeoJSON multi-geometry set. Should we add a GeometryCollection type too, or leave that until there's a concrete need?

--> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
