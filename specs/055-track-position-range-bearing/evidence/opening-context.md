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
