---
layout: future-post
title: "Shipped: Track-Position to Track Range/Bearing Tool Spec"
date: 2026-02-17
track: credibility
author: Ian
reading_time: 3
tags: [tracer-bullet, spec, measurement, maritime, tools]
excerpt: "Spec #055 defines how to compute range and bearing from a point in time on one track to the nearest position on another."
---

## What We Built

Spec #055 defines the `position-range-bearing` tool — a language-neutral specification for computing the range and bearing from a selected position on one track to the nearest matching position on another track. The spec lives at `shared/tools/track/measurement/position-range-bearing.1.0.md` and follows the same nine-section structure introduced in #049: Metadata, MCP interface, Inputs, Outputs, Algorithm, Edge Cases, Examples, Registration, and Changelog.

This brings the track/measurement family to 20 tools. The output is a range in nautical miles (Haversine formula) and a bearing in degrees true (forward-azimuth), both computed against the temporally nearest position on the reference track.

## How It Works

The algorithm has three steps:

- **Temporal match** — scan the reference track for the position whose timestamp is closest to the subject position's timestamp; if two timestamps are equidistant, the earlier index wins
- **Range** — Haversine great-circle distance between the two lat/lon pairs, converted to nautical miles
- **Bearing** — forward-azimuth from the subject position to the matched reference position, normalised to [0°, 360°)

Two golden I/O pairs are included in the spec: a basic temporal match returning 3.57 nm at 32.7°, and a single-position edge case returning 35.42 nm at 31.8°. Both are validated against the pseudocode by hand. The spec builds on #053's nested child selection, which provides the position-level input precision this tool needs.

## Lessons Learned

Snap-to-nearest temporal matching turned out to be the right call. I had initially considered linear interpolation between timestamps — it would give a more precise reference position when the subject timestamp falls between two reference positions. But interpolation adds complexity to both the spec and every downstream implementation, and for typical track data densities the nearest-position answer is within acceptable tolerance. The spec documents this trade-off explicitly so future implementors aren't left wondering whether interpolation was overlooked.

The tiebreaker rule (earlier index wins on equidistant timestamps) came up because I wanted deterministic behaviour on evenly-sampled tracks. It's a small detail but the kind of thing that causes subtle test failures if left unspecified — two implementations making different choices would produce identical results most of the time and diverge in exactly the cases you're trying to validate.

Eleven edge cases are documented: single-position track, empty track, identical coordinates, tracks in opposing hemispheres, and others. Writing them out before drafting the algorithm revealed that the empty-track case needed a distinct error code (`ERR_EMPTY_TRACK`) separate from the single-position handling, which in turn clarified the input validation section.

## What's Next

The spec is written to be unambiguous enough for independent Python and TypeScript implementations without coordination. Next step is running `/tool.implement` against this spec to produce the Python service layer, followed by wiring it into the VS Code extension's measurement command palette.

→ [See the spec](../position-range-bearing.1.0.md)
