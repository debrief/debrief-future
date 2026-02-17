---
layout: future-post
title: "Planning: Point-in-Zone Classifier"
date: 2026-02-17
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, buffer-zone-analysis, e03-demo]
excerpt: "Step 4 of the E03 chain: classify reference points by detection zone and recolor them — pure geometry, no external dependencies."
---

## What We're Building

The point-in-zone classifier is step 4 of the E03 buffer zone analysis chain. It takes two features — a grid of reference points (MultiPoint, from step 1) and a set of concentric detection zone polygons (MultiPolygon, from step 3) — and assigns each point to the zone it falls within. Points that fall inside the 75% detection zone come out purple. The 50% zone gets red, the 25% zone orange, and anything outside all zones turns grey. The classified points feed directly into the histogram in step 5.

The classifier writes two things back onto the reference feature: a `zone` and `color` field per point in the existing `pointMetadata` array, and a new `pointColors` array that runs parallel to the MultiPoint coordinates. The renderer uses `pointColors[i]` to colour the i-th point — no zone lookups, no indirection.

This is a mutation-type result: it modifies the existing reference point feature rather than creating a new one. The STAC item for the reference point set is updated in place, and provenance records the zone feature that drove the reclassification.

## How It Fits

The E03 chain is built to demonstrate reactive PROV cascading: move the track in step 2, and every downstream tool in the chain reruns automatically, producing a new histogram from new zone geometry and newly classified points.

The classifier sits in the middle of that cascade. It consumes the output of the buffer-zone-generator (#080), which itself reruns when the track moves. When zones change — different radii, different centre positions — the classifier sees new polygons and the point assignments change accordingly. The histogram (#082) then sees a different colour distribution.

For the E03 demo to make its point about cascade reactivity, this tool has to be stateless and deterministic. Same inputs must always produce identical outputs. That means no mutable state, no timestamps in the algorithm, and no randomness. The provenance system handles the "when did this run" question; the tool itself is a pure function.

The classifier also has to preserve whatever metadata the generate-reference-points tool (#078) put on each point — index, name, and anything else. Only `zone` and `color` are added or overwritten. Downstream tools can rely on all upstream fields surviving the classification step.

## Key Decisions

**Ray-casting for point-in-polygon.** The even-odd ray-casting algorithm casts a horizontal ray rightward from each point and counts polygon edge crossings. Odd count means inside, even means outside. It handles concave polygons correctly, which matters because buffer zone polygons from the buffer-zone-generator are convex hulls rather than perfect circles. The algorithm is also language-neutral — the same logic runs in both the Python service and the TypeScript frontend implementations with no shared code needed.

I considered the winding number algorithm, which is more robust for self-intersecting polygons, but buffer zones don't self-intersect. I also looked at Shapely (Python) and turf.js (TypeScript) — both would have made this trivial to implement — but they're external dependencies, and the constitution requires offline-first operation with minimal external dependencies. Ray-casting in stdlib is around 20 lines; it's not worth a library for that.

**Innermost zone wins.** Zones in the MultiPolygon are ordered innermost (index 0, highest detection likelihood) to outermost. For each point, the classifier tests zone 0 first. If the point is inside, it stops there. This means a point that is geometrically inside both the 75% zone and the 50% zone (because the 50% zone contains the 75% zone) gets assigned to 75%. The first match is always the most specific.

**Colours come from the zone feature, not from a hardcoded map.** The buffer-zone-generator stores per-zone styling in its output, including fill colour. The classifier reads `zones[i].style.fill_color` from the zone feature rather than maintaining its own colour table. If someone regenerates zones with different colours, the classifier picks them up automatically. There's no configuration needed and no divergence between what the polygons look like on the map and what the points get coloured.

**Mutation result type, not addition.** The tool returns a `mutation` response rather than an `addition`. This reflects what actually happens: the reference point feature already exists in the STAC catalog (put there by generate-reference-points), and the classifier updates it. Creating a new feature would mean two versions of the point set in the catalog, with the old one becoming stale. Mutation keeps the catalog clean and makes the provenance lineage straightforward — one item, updated by one tool.

**`pointColors` array, parallel to coordinates.** Rather than embedding colour in the zone lookup metadata or using a class-based approach, the classifier writes a flat `pointColors` array directly onto the feature. `pointColors[i]` is the hex colour for the i-th coordinate. The renderer can iterate once and draw each point in its assigned colour with no additional lookups. It mirrors the existing `pointMetadata` parallel array pattern, so the data structure stays consistent across the tool chain.

## What We'd Love Feedback On

The antimeridian case is handled by documentation rather than special-casing. The ray-casting algorithm works correctly as long as the point and polygon are in the same coordinate space, and the buffer-zone-generator already accounts for antimeridian wrapping in its polygon output. But I haven't tested a real track that crosses the antimeridian, so I'm curious whether that assumption holds in practice for maritime analysis scenarios.

The other open question is the bounding box pre-filter. For the expected point counts — 25 to 625 reference points, 3 zones — pure ray-casting completes well under the 1-second target. But some use cases might push toward 10,000 points. Adding a bbox check before the full polygon test would cut the work substantially for points far outside all zones. I left it out for simplicity, but it's easy to add if profiling shows it's needed.

If you work in maritime SIGINT or surface picture analysis and have thoughts on how detection likelihood zones actually get used in practice — whether the concentric ring model maps to your workflow, or whether you'd want something different from the classification output — I'd be interested to hear it.
