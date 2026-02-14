---
layout: future-post
title: "Planning: Generate Reference Points Tool"
date: 2026-02-13
track: [momentum]
author: Ian
reading_time: 4
tags: [tool-spec, e03-demo, buffer-zone-analysis, reference-points]
excerpt: "Specifying the first step in the E03 buffer zone demo: generating grids and scatters of reference points"
---

## What We're Building

Buffer zone analysis starts with a question: for a given area of sea, which points fall inside which zones? Before you can answer that, you need the points.

We're specifying a tool that generates GeoJSON reference points within a bounding box. Two patterns: a regular grid (4 columns by 3 rows gives 12 evenly spaced points) or a scatter (20 pseudo-random points seeded for reproducibility). The analyst provides the bounds, picks a pattern, and gets back a FeatureCollection of Point features ready for downstream classification.

This is the entry point for Epic E03 -- a five-step reactive provenance cascade we're building for stakeholder demonstration. Generate points, classify them against zone boundaries, produce histograms, and let changes propagate through the chain. This tool is step one: create the raw material.

The spec follows our #049 tool documentation model. Nine required sections, golden I/O JSON fixtures, pseudocode algorithm. No implementation code -- just the precise contract that Python and TypeScript implementations will build against.

## How It Fits

E03 is a five-tool chain designed to show how Future Debrief handles reactive analysis. When upstream data changes, downstream results update automatically through recorded provenance. Generate reference points feeds into point-in-zone classification (#081), which feeds into zone histogram generation (#082), and so on.

The tool uses `ContextType.NONE` -- it doesn't consume existing features from the plot. The bounding box and pattern parameters are all it needs. That makes it the natural starting point for any spatial analysis workflow that needs a set of test locations.

The output slots directly into the existing schema. Every generated point carries `FeatureKind.POINT` and `LocationTypeEnum.REFERENCE`, both already defined in `common.yaml`. No new enums, no schema changes. The result type is `addition/reference/generated_points`, following the ToolResponse conventions established in #041.

## Key Decisions

- **Cross-language deterministic PRNG**: The scatter pattern needs to produce identical points from the same seed in both Python and TypeScript. We're using a linear congruential generator (LCG) rather than language-native random libraries. The parameters are fixed in the spec, so any implementation that follows the pseudocode will produce the same sequence. Language-native PRNGs use different algorithms and would diverge.

- **Deterministic feature IDs**: Grid points get IDs like `ref-grid-0`, `ref-grid-1`; scatter points get `ref-scatter-0`, `ref-scatter-1`. Predictable IDs make golden fixture comparison straightforward and help with debugging when points show up in downstream tool results.

- **No new schema types**: We considered adding a dedicated `ReferencePointFeature` type or a new `FeatureKind.REFERENCE_POINT` enum value. Neither is necessary. The combination of `FeatureKind.POINT` and `LocationTypeEnum.REFERENCE` already expresses the semantics precisely. Adding types we don't need would complicate the schema for no gain.

- **Grid spacing includes boundary edges**: A 3-row grid across latitudes 49 to 52 places points at 49, 50.5, and 52 -- not at interior positions only. This matches the intuitive expectation that the grid covers the full extent of the bounding box. A 1x1 grid returns a single point at the centre.

- **Antimeridian handling**: Bounding boxes where west > east (e.g., 170 to -170) are treated as crossing the date line. The effective range becomes west to east+360, and generated longitudes are normalised to [-180, 180]. Same approach as the move-shape spec.

## What We'd Love Feedback On

The E03 chain is designed to be self-contained for demonstration purposes. The reference points it generates are synthetic -- they don't come from real track data. That's deliberate: the demo should work without classified datasets.

Questions worth considering:

1. **Is the LCG sufficient for scatter quality?** A basic linear congruential generator will produce visually uniform distributions for typical point counts (10-100). For very large counts, LCG can exhibit lattice patterns. Since this is a demonstration tool, not a statistical sampler, we think it's acceptable -- but if anyone has concerns about distribution quality, we could specify a more sophisticated algorithm.

2. **Grid boundary inclusion**: The spec places points at the edges of the bounding box. An alternative would be to inset by half a cell width, placing points at cell centres rather than cell boundaries. Which better serves the buffer zone classification use case?

3. **Default marker shape**: Reference points use `PointShapeEnum.square` as their default marker, distinct from the circular markers used for track positions. Is square the right visual convention for generated reference points, or would a different shape (cross, diamond) communicate "synthetic/generated" more clearly?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
