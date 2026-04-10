---
layout: future-post
title: "Shipped: Sensor Rendering"
date: 2026-04-10
track: [credibility]
author: Ian
reading_time: 5
tags: [sensor-data, mapview, canvas-rendering, e07-sensor-pipeline]
excerpt: "Sensor bearing lines, ambiguous bearings, arcs, and snail mode fading now render on the map via a custom Leaflet canvas layer"
---

## What We Built

Sensor data is visible on the map for the first time. Load a track with embedded sensor contacts and bearing lines appear -- thin lines radiating from the host vessel at the recorded bearing angle, extending to the contact's range. Move the time slider and the contacts filter in real time. Switch to snail mode and older contacts fade to black while the newest stay at full intensity.

This is Phase 3 of the E07 Sensor Data Pipeline. Phase 1 (#116) redesigned the sensor schema with all the display properties. Phase 2 (#117) taught the REP parser to extract sensor contacts and embed them in tracks. This feature reads that data and draws it.

The rendering is a custom `L.Layer` subclass that draws directly to an HTML5 Canvas element. We went with canvas over SVG because a single track can carry hundreds of bearing lines from a towed array, and a busy exercise might have several thousand contacts visible at once. Canvas batches all the line drawing into a single paint call per frame -- no DOM nodes, no layout thrashing.

## How It Works

Each `SensorBearingLayer` component takes a track feature and extracts `properties.sensors[]`. For every visible contact whose timestamp falls within the current time window, it needs to answer two questions: where does the line start, and where does it end?

**Start point**: If the contact has an explicit `origin` coordinate, use it directly. Otherwise, find the host vessel's position at the contact's timestamp. The track stores positions at discrete fixes, so we binary-search for the two fixes bracketing the contact time and linearly interpolate between them. Same O(log n) approach as the temporal track marker from #030.

**End point**: Haversine geodesic destination -- given a start point, bearing, and range in metres, compute the far-end coordinate. For contacts without a range value, the line extends to a default cap equivalent to 5 degrees of latitude, matching legacy Debrief's `MAXIMUM_SENSOR_BEARING_RANGE`.

Everything between those two points is canvas line drawing: `moveTo`, `lineTo`, `stroke`.

## Ambiguous Bearings

Towed-array sonar can't distinguish port from starboard -- a contact at bearing 045 might actually be at 315. When a contact has `has_ambiguous=true`, the layer draws two lines: one at the primary bearing, one at the ambiguous bearing. The ambiguous line renders in a darker shade, computed by multiplying each RGB channel by 0.7 -- the same formula as Java's `Color.darker()`, so legacy data looks the same.

## Snail Mode

In trail display mode, contacts within the trail window fade proportionally:

```
proportion = (trailLength - age) / trailLength
fadedColor = rgb(R * proportion, G * proportion, B * proportion)
```

The newest contact renders at full colour. Older contacts darken progressively. Anything beyond the trail window disappears entirely. This produces the classic "waterfall" effect analysts use for target motion analysis -- bearing drift over time becomes visible at a glance.

## Colour Inheritance

Contacts inherit colour through a four-level chain:

1. Contact-level colour (if set)
2. Sensor-level colour (parent sensor)
3. Track style colour (host track)
4. Application default (`#FF0000`)

This means an analyst can set a colour at the sensor level and have it apply to all contacts, then override individual contacts without losing the cascade. The same pattern legacy Debrief uses, preserved through the schema overhaul in #116.

## Line Styling and Labels

Four line styles map to canvas dash arrays: `SOLID` (continuous), `DASHED` (`[10, 5]`), `DOT` (`[2, 5]`), `DASH_DOT` (`[10, 5, 2, 5]`). Sensor-level `line_thickness` controls stroke width.

Contact labels render at configurable positions along the bearing line -- `START` (near the vessel), `MIDDLE`, or `END` (at the range extent) -- with `LEFT`, `CENTER`, or `RIGHT` text alignment. Label position is computed as a proportion along the line segment, so labels track correctly when the map pans or zooms.

## Viewport Culling

With thousands of contacts potentially in scope, we skip any contact whose bearing line falls entirely outside the current map viewport. The check is a simple bounding-box test against the canvas extent before computing geodesic geometry. For a typical view showing one area of an exercise, this eliminates the majority of off-screen contacts without any geodesic math.

## By the Numbers

| | |
|---|---|
| New tests | 81 |
| Unit tests (sensor-utils) | 67 |
| Component tests | 14 |
| Test suites | 13 (sensor-utils) + 1 (component) |
| Total suite (all features) | 1,259 |
| Tests failing | 0 |

## Lessons Learned

**Binary search came back.** The host-position interpolation uses the same binary search pattern we wrote for temporal track rendering in #030. The `findNearestPointIndex` concept translates directly -- both need to locate a timestamp in an ordered array of positions. The implementation is slightly different (we need the bracketing pair for interpolation, not just the nearest), but the idea is identical.

**Canvas dash arrays need `setLineDash` per segment.** When contacts within the same sensor have different `line_style` values, the canvas dash state has to be set before each `stroke()` call. Batching all contacts into a single path and stroking once -- the obvious optimisation -- only works when they share a line style. We batch by style instead, which still produces far fewer draw calls than one per contact.

**The 0.7 darkening factor is not arbitrary.** Java's `Color.darker()` multiplies each RGB channel by `1/1.4`, which rounds to approximately 0.7. Matching the exact factor means bearing displays from legacy Debrief data look identical without any migration.

## What's Next

Array offset calculations (#119) will add WORM and MEASURED modes for computing bearing line origins from towed-array positions. Right now all origins default to the host track position (PLAIN mode). When #119 ships, the rendering layer picks up the corrected origins automatically -- the `origin` field on each contact is already wired through.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/118-sensor-rendering/spec.md)
→ [E07 Sensor Data Pipeline](https://github.com/debrief/debrief-future/blob/main/docs/ideas/E07-sensor-data-pipeline.md)
