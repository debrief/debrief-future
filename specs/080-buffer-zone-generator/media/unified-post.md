---
title: "Building Buffer Zone Generator"
date: 2026-02-12
layout: future-post
author: Ian
track: credibility
excerpt: "Detection likelihood zones around vessel tracks, using nothing but stdlib math and a swappable sensor model"
tags:
  - debrief-calc
  - e03-buffer-zone-demo
  - sensor-model
---

## What We're Building

The Buffer Zone Generator creates three nested detection-likelihood polygons around a vessel track. Given a track (a series of timestamped positions), it produces zones at 3nm (75% detection probability), 6nm (50%), and 12nm (25%). The zones are concentric polygons, not annular rings — each encompasses the previous one.

This tool doesn't try to simulate real sensor physics. Instead it uses a stub sensor model with a clean protocol-based interface. The stub returns fixed detection ranges for now, but the architecture means we can swap in sophisticated sensor models later without changing the tool's internals. That separation matters — domain logic stays in the tool, sensor complexity lives elsewhere.

## How It Fits

This is the third tool in Epic E03's five-tool reactive cascade. The sequence: generate random points → move track → buffer zones → classify points (inside/outside zones) → histogram. Moving the track automatically propagates updates through every downstream tool via PROV annotations. The cascade demonstrates that our architecture can handle multi-step analytical workflows where changes ripple through dependencies.

## Key Decisions

- **Great-circle geometry**: Vincenty destination formula for nautical-mile offsets (reusing math from the move-shape tool)
- **Convex hull construction**: Standard library math only, no external geo libraries
- **Nautical miles**: User-facing unit matches maritime domain conventions
- **Protocol-based sensor injection**: Clean dependency inversion — tools depend on abstractions, not concrete sensor implementations
- **Addition/feature result**: Polygon output stored as GeoJSON features with full provenance lineage

The buffer-zone-generator is a calc tool that wraps a vessel track in three concentric detection-likelihood polygons. Hand it a track feature and it returns zones at 3nm (75%), 6nm (50%), and 12nm (25%) — each a proper GeoJSON Polygon with provenance linking back to the source track.

The geometry uses the same Vincenty destination formula from move-shape. For each track vertex, we project 36 points outward at 10-degree intervals, then compute the convex hull with Andrew's monotone chain algorithm. The result: valid polygons that faithfully follow the track's shape, generated with nothing but Python's `math` module.

## How It Works

The tool separates detection ranges from polygon construction through a SensorModel Protocol. The stub returns fixed distances, but any implementation satisfying `get_detection_zones(track) -> list[SensorModelZone]` slots in without touching the generation logic. Three optional parameters (`distance_1_nm`, `distance_2_nm`, `distance_3_nm`) let analysts override distances for what-if exploration — distances are auto-sorted so the highest likelihood always maps to the innermost zone.

This is step 3 of the E03 cascade: generate points, move track, **buffer zones**, classify points, histogram. Each step's output feeds the next via PROV annotations. The tool is stateless — no side effects, no persistence. The caller (PROV system) handles storage.

## Lessons Learned

The convex hull approach works well for straight and gently curving tracks but can slightly over-estimate area on sharp turns. For a stub demonstration this is acceptable, and replacing it with proper Minkowski sum buffering would only require changing `generate_buffer_polygon` — the rest of the tool is indifferent.

Antimeridian handling required shifting longitudes to [0, 360] during computation and normalising back afterward. The same pattern appears in move-shape, suggesting a shared utility would be worth extracting when we have a third consumer.

100% test coverage across 48 tests. The point-in-polygon validation tests (verifying every track point falls inside its corresponding zone) caught an early off-by-one in ring closure.

## What's Next

The classified points tool (#081) consumes these zones to determine which reference points fall inside which detection boundary. After that, the histogram generator (#082) counts points per zone. Together they complete the five-tool E03 cascade.
