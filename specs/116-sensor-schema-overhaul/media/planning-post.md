---
layout: future-post
title: "Planning: Sensor Schema Overhaul"
date: 2026-04-10
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, sensor-data]
excerpt: "Redesigning SensorContact and SensorData schemas to capture the full legacy sensor model — Phase 1 of 7"
---

## What We're Building

Legacy Debrief has roughly 10,000 lines of Java across 30+ files handling sensor data — towed arrays, bearing lines, frequency measurements, array offset calculations. Our current schema captures a fraction of that: 7 fields on SensorContact and 5 on SensorData. Enough to store a bearing and a timestamp, but not enough to faithfully represent what analysts actually configure and rely on.

This week we're expanding the schema to close that gap. SensorContact goes from 7 fields to 16: display properties (color, visibility, line style, label placement), boolean presence flags (has_bearing, has_ambiguous, has_frequency), and an explicit origin coordinate override for when the sensor location differs from the platform position. SensorData goes from 5 to 10 fields, gaining array centre mode (PLAIN, WORM, MEASURED), display defaults, and a new measured_positions array for recording actual towed array locations.

There are also 4 new enumerations (ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum) and a new MeasuredArrayPosition class. And because 9 existing sensor tool specifications reference SensorContact and SensorData shapes, we're updating 62 golden fixture JSON files to match.

All new fields are optional. Zero breaking changes. Existing valid fixtures continue to validate without modification.

## How It Fits

This is Phase 1 of a 7-phase Sensor Data Pipeline epic. The schema is the foundation — every subsequent phase depends on it. Phase 2 (REP sensor import) needs these fields to have somewhere to write the parsed data. Phase 3 (sensor rendering on maps) needs the display properties and array centre modes to know how to draw bearing lines. Phase 4 (array offset calculations) needs the measured positions and offset fields.

The existing schema got us through early prototyping, but it was always a placeholder. Without display properties, an analyst's visual customizations vanish on save/reload. Without array centre mode, every bearing line originates from the platform position, which is wrong for towed arrays. Without presence flags, there's no way to distinguish "this contact has no bearing data" from "the bearing is zero degrees."

## Key Decisions

- **Display properties live in the schema, not a separate styling layer.** Legacy Debrief stores color, line style, and label placement alongside the data in the REP file. Customizations persist with the data. We're matching that behavior rather than introducing a separate rendering configuration. The trade-off is a larger schema, but the alternative is a persistence fidelity problem where display settings get lost.

- **Boolean presence flags default to true.** In legacy, sensor data is assumed present unless explicitly flagged otherwise. A contact with has_bearing=false but a bearing value of 045 is valid — the flag controls display, not data presence. The raw value is always stored.

- **SensorContact origin uses a [lon, lat] array**, consistent with the existing pattern in CircleAnnotation and VectorAnnotation. MeasuredArrayPosition currently uses separate latitude/longitude fields — whether to align that with the [lon, lat] convention is an open question (see below).

- **All 4 new enums go in common.yaml** alongside existing project enums, not in a sensor-specific file. They may be reused by other feature types later.

- **Purely additive changes** — every new field is optional, every new enum is referenced only by optional fields. Backward compatibility is preserved by design.

## What We'd Love Feedback On

- **Display properties at the schema level vs. a separate rendering configuration.** We chose schema-level for persistence fidelity — if it's in the REP file, it should be in the schema. But this means the data model carries visual concerns. For a domain where analysts spend significant time customizing displays and expect those customizations to survive save/reload cycles, that feels right. But there's a legitimate argument that rendering concerns should be separated. What's the right boundary?

- **MeasuredArrayPosition coordinate format.** We're using separate latitude/longitude fields here, which is inconsistent with the [lon, lat] array pattern used elsewhere in the schema. The spec calls for separate fields because measured positions are standalone records (not embedded in GeoJSON geometry), but consistency has value. Should we use [lon, lat] arrays for MeasuredArrayPosition too?

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
