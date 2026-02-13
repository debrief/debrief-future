Most detection zone tools give you a circle at a fixed range. That's geometrically simple but analytically weak — real sensors don't have uniform detection probability at all ranges, and vessel tracks aren't points.

We're building a buffer zone generator that wraps polygons around entire tracks at multiple detection-likelihood thresholds (3nm/75%, 6nm/50%, 12nm/25%). The interesting part: it uses a stub sensor model with protocol-based dependency injection. The tool doesn't care about sensor physics — it just asks "what's your detection range at this likelihood?" That separation means we can start with a trivial model and swap in sophisticated ones later without rewriting the tool.

This is the third piece in a five-tool reactive cascade where moving a track automatically updates every downstream analysis.

[Read the full post](https://debrief.github.io/future-debrief/planning-buffer-zone-generator)

#FutureDebrief #MaritimeAnalysis #OpenSource
