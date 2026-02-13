---
layout: future-post
title: "Planning: Buffer Zone Generator"
date: 2026-02-12
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, debrief-calc, e03-buffer-zone-demo, sensor-model]
excerpt: "Building the third tool in our reactive cascade — turning track geometry into detection likelihood zones"
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

## What We'd Love Feedback On

Does the concentric-vs-annular decision match analyst expectations? We chose concentric polygons (each zone includes the inner zones) because most questions are "was it inside the 6nm zone", not "was it in the ring between 3nm and 6nm". If your workflow needs annular rings, that's a 20-line change.

The stub sensor model returns the same range regardless of aspect angle, sea state, or target characteristics. What factors would make a minimally-useful-but-still-simple sensor model for your analysis scenarios?
