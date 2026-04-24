---
title: "Building Track-Position to Track Range/Bearing Tool Spec"
date: 2026-02-17
layout: future-post
author: Ian
track: credibility
excerpt: "Spec #055 defines how to compute range and bearing from a point in time on one track to the nearest position on another."
tags:
  - measurement
  - spec
  - tools
---

## What We're Building

Debrief has always been able to measure range and bearing between two tracks. But that's whole-track to whole-track -- summary statistics across entire passages. Analysts often need something more specific: "at the moment I've selected on this track, how far away was the other vessel, and in which direction?" That question requires position-level precision, and until now there hasn't been a clean way to express it.

We're specifying a tool that takes a single selected track position (via the nested child selection path from feature #053) and a second track, finds the position on that second track with the closest timestamp, then computes the Haversine range in nautical miles and the forward-azimuth bearing in degrees. One measurement. Two positions. No interpolation -- it snaps to the nearest recorded position, with an earlier-position tiebreaker when two candidates are equidistant in time.

## How It Fits

This is a spec-only deliverable following the #049 tool documentation model: a markdown specification with pseudocode algorithm and golden I/O JSON fixtures. It extends the existing measurement tool family (19 tools in `shared/tools/track/measurement/`) with position-granularity measurement. The math references the same Haversine and bearing functions already in `range_bearing.py`. The input model builds directly on #053's selection paths -- `track-hms-defender/positions/4` becomes a first-class tool input. When implemented, the tool will slot into the `track/measurement` category and appear in the VS Code Run dropdown whenever an analyst has a position selected on one track and a second track available.

## Key Decisions

- **Snap-to-nearest, no interpolation**: The matched position on the second track is the one with the smallest absolute time difference. No linear interpolation between positions. This keeps the math simple, the results reproducible, and avoids inventing data points that don't exist in the source.
- **Earlier-position tiebreaker**: When two positions on the second track are equidistant in time from the selected position, the earlier one (lower index) wins. Deterministic, predictable, easy to test.
- **Single measurement output, not a time series**: This tool answers one question about one moment. Whole-track time-series range/bearing is a different tool with different semantics.
- **Result type `artifact/measurement/position_range_bearing`**: Follows the established artifact taxonomy. The result is a measurement, not a geometry or a modified track.
- **Provenance includes matched-position metadata**: The output records which position on the second track was matched, its index, timestamp, and coordinates. An analyst can always trace exactly which two points were compared.
- **No minimum temporal proximity**: If the closest position on the second track is four hours away, the tool still returns a result. Real-world data has gaps. Imposing an arbitrary proximity threshold would make the tool fragile without adding safety.

Spec #055 defines the `position-range-bearing` tool — a language-neutral specification for computing the range and bearing from a selected position on one track to the nearest matching position on another track. The spec lives at `shared/tools/track/measurement/position-range-bearing.1.0.md` and follows the same nine-section structure introduced in #049: Metadata, MCP interface, Inputs, Outputs, Algorithm, Edge Cases, Examples, Registration, and Changelog.

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
