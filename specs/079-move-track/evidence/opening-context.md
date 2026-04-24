## What We're Building

A tool that takes a vessel track and slides it across the sea surface. You give it a compass bearing and a distance in nautical miles, and every position in the track shifts by that amount using great-circle math. Timestamps, altitude, course metadata -- all preserved. Only the geographic coordinates move.

This is step two of the E03 buffer zone analysis cascade. Step one generates reference points. This tool repositions the track. Step three wraps buffer zones around it. Steps four and five classify those reference points against the zones and produce a histogram. The interesting part: editing the move-track parameters in the provenance log causes steps three through five to re-execute automatically. Change the bearing from 090 to 180 and the entire downstream analysis updates.

The tool itself is deliberately simple -- accept direction and range, translate coordinates, return the result. It's stateless. The reactive cascade behaviour comes from the PROV system that orchestrates the tools, not from the tools themselves. That separation is the architectural point the demo is designed to illustrate.

## How It Fits

The E03 cascade is our first multi-tool reactive workflow. Each tool in the chain records its parameters and inputs in a provenance log entry. When any entry is edited, everything downstream re-executes. Move-track sits in the middle of the chain, which makes it the natural place for the "edit and watch it cascade" interaction during the stakeholder demo.

The tool follows the same pattern as move-shape (#056), which translates annotation geometry. The core math is identical -- Vincenty destination formula, ~15 lines of code. We're copying it rather than extracting a shared utility. Two uses doesn't justify the coupling, and when tools eventually get reorganised, each should be self-contained.

Both Python and TypeScript implementations are needed. The Python version runs in `debrief-calc` services; the TypeScript version runs in the VS Code extension and web-shell. The language-neutral tool spec in `shared/tools/` is the source of truth that both implement against.

## Key Decisions

- **Nautical miles, not kilometres**: Maritime analysts think in nautical miles. The move-shape tool used kilometres, but for the E03 cascade -- where every tool is maritime-domain-specific -- nautical miles are the right unit. Internal conversion to km for the Vincenty formula is a one-liner (`range_nm * 1.852`).

- **Copy the Vincenty function, don't share it**: The `translate_point` function is about 15 lines. Extracting it to a `geo_utils` module creates a dependency between tools that are otherwise independent. Two uses isn't enough to justify shared code. If a third tool needs it, we'll reconsider.

- **Result type `mutation/track/moved`**: Follows the `{top_type}/{domain}/{specific_type}` convention. We considered "translated" (more mathematical) and "offset" (more technical), but "moved" is what an analyst would say.

- **Preserve everything except lon/lat**: Track coordinates carry altitude and timestamp data as extra tuple elements. The tool modifies only the first two values and leaves the rest bit-identical. Downstream tools that depend on temporal data (like the histogram) get exactly what they expect.

- **ContextType.MULTI**: Accepts one or more tracks in a single invocation. The E03 demo uses one track, but there's no reason to artificially limit the tool. Non-track features in the input are silently skipped.

- **Antimeridian normalisation**: Translated longitudes are clamped to [-180, 180]. Tracks near the date line won't produce coordinates outside the valid range.
