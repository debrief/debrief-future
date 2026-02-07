---
layout: future-post
title: "Planning: Completing the Shape Parser"
date: 2026-01-27
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, debrief-io, annotations, storybook]
excerpt: "Implementing 15 remaining annotation shapes with visual verification via Storybook"
---

## What We're Building

REP files can contain annotations — circles, rectangles, polygons, text labels. Phase 1 of debrief-io handles six of these. This week we're tackling the remaining fifteen.

Some are straightforward extensions of what we have. POLY and POLYLINE follow the same pattern as RECT but with variable vertices. TIMETEXT and PERIODTEXT add timestamps to our existing TEXT parser.

Others require new geometry. ELLIPSE needs a 32-point polygon approximation with a rotation matrix to handle arbitrary orientations (0-360 degrees, nautical convention). WHEEL produces a donut shape — a GeoJSON polygon with two rings wound in opposite directions so the inner ring cuts a hole.

The most interesting are the dynamic shapes. DYNAMIC_RECT, DYNAMIC_CIRCLE, and DYNAMIC_POLY include millisecond-precision timestamps and group names. A series of DYNAMIC_RECT entries with the same group name represents one feature moving through time. For now, we'll parse these as separate features with the group_name stored in properties — that gives us the data we need for future time-animation without complicating the parser.

## How It Fits

All fifteen shapes extend the existing builder pattern in debrief-io. Each shape type gets a `_build_X()` function that returns a GeoJSON Feature. The dispatcher routes based on the annotation type prefix.

The work also extends our LinkML schemas. Each shape type gets a discriminated union entry with its specific properties — orientation angles, semi-axes, time ranges. Generated Pydantic models and TypeScript types follow automatically.

The new piece is a Storybook verification pipeline. A Python script runs the parser on a comprehensive test file containing every shape type, outputs GeoJSON, and the result gets rendered on a MapView in Storybook. This catches rendering problems that unit tests miss — a valid GeoJSON polygon that renders as a jumbled mess because the winding order was wrong, for example.

## Key Decisions

- **Ellipse uses parametric equations with rotation matrix** — Converting metres to degrees at the centre latitude, generating points around the perimeter, then rotating. Considered using Shapely's buffer with affine transform, but it's an unnecessary dependency for this.

- **Wheel (annular) shapes use opposite-wound rings** — GeoJSON spec requires exterior ring counter-clockwise, holes clockwise. We generate the inner ring the same way as the outer, then reverse it.

- **Dynamic shapes parse as individual features** — Each timestamped entry becomes its own Feature with group_name in properties. Merging into MultiPolygon was considered but loses temporal information.

- **Storybook fixtures are static JSON checked into the repo** — Python script generates, developers commit the result. This keeps Storybook's build simple (no Python runtime required) and makes fixture changes visible in review.

## What We'd Love Feedback On

- Are there shape types we're missing that analysts commonly use? The fifteen we have cover what's documented, but real-world REP files sometimes have surprises.

- Would millisecond-precision timestamps on dynamic shapes be useful for your workflows? We're preserving them, but don't know if anyone actually uses sub-second timing in annotations.

- What styling options would make annotations more useful? We're parsing the Debrief symbol codes, but there may be display preferences we should capture.

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
