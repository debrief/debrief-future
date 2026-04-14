---
layout: future-post
title: "Planning: Array Offset Calculations"
date: 2026-04-10
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, sensor-pipeline, towed-array]
excerpt: "Three modes for calculating where a towed array actually is behind the vessel -- Phase 4 of 7"
---

## What We're Building

When a warship tows a sonar array, the sensor isn't at the ship -- it's hundreds of metres behind it, trailing through the water on a cable. Every bearing line drawn from that sensor should originate from the array's actual position, not the vessel's. Getting this wrong shifts the geometry of the entire tactical picture.

This week we're implementing three modes for calculating where the array centre really is, each suited to different data availability and accuracy needs:

**PLAIN** backtracks from the vessel's position along its current heading by the offset distance. Simple geometry -- take the ship's course, reverse it, walk back 500 metres. This is the baseline and the fallback when nothing better is available.

**WORM** ("worm in hole") traces backward along the vessel's actual track path. When a ship turns, the towed array doesn't instantly change direction -- it follows the path the vessel took, like a worm through a hole. So WORM mode walks backward along the recorded track geometry, accumulating geodesic distance segment by segment until it reaches the offset distance. The result is a point on the track path that accurately reflects where the cable would have dragged the array through the turn.

**MEASURED** uses actual instrumented position data when available. Some sensors record the array's real geographic position. When that data covers the contact's timestamp, we interpolate between the two nearest measurements. When it doesn't, we fall back to PLAIN.

## How It Fits

This is Phase 4 of a 7-phase Sensor Data Pipeline epic. Phase 1 (#116) added the schema fields we need -- `SensorData.offset`, `array_centre_mode`, `measured_positions`. Phase 3 (#118) built the sensor rendering pipeline that currently draws bearing lines from the vessel's position. This feature slots into the existing `prepareSensorContacts()` function, replacing the vessel position with the calculated array centre as the bearing line origin.

The integration point is narrow. Currently the rendering pipeline does:

```
origin = contact.origin ?? interpolateTrackPosition(...)
```

After this feature:

```
hostPosition = interpolateTrackPosition(...)
origin = contact.origin ?? computeArrayCentre(hostPosition, sensor, track, contactTime)
```

Explicit contact origin overrides still take precedence. When no mode is set or offset is zero, `computeArrayCentre` returns the vessel position unchanged. No architectural changes, no new dependencies.

## Key Decisions

- **Pure functions in both TypeScript and Python.** The browser needs array centres for rendering bearing lines in real time. Python calc tools (range plots, arc insertion) need them for analysis. Rather than a single-language implementation with cross-process calls, we're writing the same algorithms in both languages and validating parity with golden test cases. The math is roughly 200 lines -- not worth the complexity of code generation or WASM.

- **Geodesic distance, not Euclidean.** WORM mode accumulates distances along track segments. At high latitudes, Euclidean approximations introduce meaningful errors. We're using haversine throughout, which is accurate for the offsets we care about (tens to hundreds of metres). No external geo libraries -- just the formula implemented in ~20 lines.

- **No explicit caching.** The rendering pipeline is already stateless -- `prepareSensorContacts()` recomputes on every React render. When an analyst changes the array centre mode or offset distance, React re-renders with new props, which triggers a fresh calculation. The existing architecture handles 1000+ contacts without performance issues. If profiling later shows WORM mode is slow for very long tracks, we can add memoisation without changing the API.

- **MEASURED mode falls back to PLAIN, not WORM.** When measured data doesn't cover a contact's timestamp, we use the simple heading-based backtrack rather than the track-path calculation. This matches legacy Debrief behaviour. The reasoning: if you've selected MEASURED mode, you're saying "I have real position data." For the gaps, the simple approximation is more honest than pretending the WORM model is what you intended.

- **No schema changes.** Everything we need was added in #116. This feature reads `offset`, `array_centre_mode`, and `measured_positions` from the existing SensorData model.

## What We'd Love Feedback On

- **Which mode matters most in practice?** We've prioritised PLAIN as P1 (it's the foundation everything falls back to) and WORM/MEASURED as P2. But in real analysis workflows, is WORM mode the one analysts reach for first? If most towed-array work uses WORM, we should make sure it gets the most testing attention.

- **WORM mode edge cases during manoeuvres.** When the offset distance places the array centre exactly at a turn point, or when the vessel is mid-turn with closely spaced fixes, the backtrack algorithm interpolates between track segments. Are there tactical scenarios where this interpolation matters enough to warrant special handling -- or is segment-level accuracy sufficient?

- **Measured position data in the wild.** How common is actual instrumented array position data? Is MEASURED mode something analysts use routinely, or is it rare enough that the PLAIN/WORM fallback is what really matters? This affects how much effort we put into edge cases like unsorted timestamps and single-measurement datasets.

- **Accuracy tolerance.** We're targeting 1 metre accuracy for offsets up to 1000 metres. For the tactical scenarios this serves, is that sufficient? Overkill? The haversine formula is accurate to about 0.3% at these scales -- if sub-metre precision matters, we'd need to move to Vincenty or Karney's geodesic algorithms.

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
