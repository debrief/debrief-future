---
layout: future-post
title: "Shipped: Point-in-Zone Classifier"
date: 2026-02-17
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, buffer-zone-analysis, e03-demo]
excerpt: "Step 4 of E03 is done: 22 tests passing, zero external dependencies, ray-casting in ~20 lines."
---

## What We Built

The point-in-zone classifier is step 4 of the E03 buffer zone analysis chain. It takes a MultiPoint grid of reference coordinates (from generate-reference-points, step 1) and a set of concentric detection zone polygons (from buffer-zone-generator, step 3), tests each point against the polygons innermost-first, and writes zone membership and colour back onto the feature. Purple for 75% detection likelihood, red for 50%, orange for 25%, grey for outside everything.

The output is a `pointColors` array running parallel to the MultiPoint coordinates. `pointColors[i]` is the hex colour for the i-th point. The renderer iterates once and draws each point; no zone lookups at render time, no indirection.

Implementation is in both Python (registered via `@tool` in `services/calc`) and TypeScript (web-shell map and VS Code barrel). Same algorithm in both. 22 Python tests pass across five test classes: basic classification, metadata preservation, determinism, edge cases, and golden example validation.

Two golden I/O pairs are checked in: the basic classification example (6 points: 3 in the 75% zone, 1 in the 50% zone, 2 outside) and an all-outside example (4 points, all grey). These double as regression fixtures — if the algorithm changes and the golden output doesn't update, the tests fail.

## Lessons Learned

**Hand-authored polygon vertices don't always contain the points you think they do.** When I wrote the golden examples, I placed points that I expected to fall "in the middle zone" by eyeballing coordinates. The ray-casting algorithm disagreed. The fix was to run the algorithm against the candidate points first, check actual containment, then write the expected output from that — not the other way around. Obvious in retrospect, but it cost time.

**`structuredClone` is not available at the VS Code tsconfig target.** The TypeScript implementation needs to deep-clone the input feature to satisfy the no-mutation requirement, and `structuredClone` is the natural choice in modern JS. The VS Code extension targets ES2020, where it doesn't exist. Switched to `JSON.parse(JSON.stringify(...))` — verbose, but it works everywhere the code needs to run and doesn't require a polyfill.

**Innermost-first ordering is load-bearing.** The zones from buffer-zone-generator are ordered innermost (index 0, highest detection likelihood) to outermost. A point near the track centre is geometrically inside all three zone polygons simultaneously — the 25% zone physically contains the 50% zone, which contains the 75% zone. Testing innermost-first means the first match is always the most specific. If I'd tested outermost-first, every point near the centre would have come out labelled 25% because the outer polygon contains them too.

## What's Next

Step 5 is the zone histogram generator (#082): count classified points per zone and produce a Vega-Lite histogram showing detection probability distribution across the analysis area. When that's done, the E03 chain is complete and the reactive PROV cascade — move the track, watch steps 3 through 5 rerun automatically — can be demonstrated end-to-end.
