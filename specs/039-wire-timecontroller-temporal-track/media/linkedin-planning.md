**Interactive replay comes to maritime analysis** — Wiring up the time slider to actually move things on the map. This bug fix connects Debrief's TimeController UI to the TemporalTrackLayer renderer, letting analysts scrub through track positions in real-time.

Core work: ported binary-search timestamp lookups to vanilla JS, cached epoch values for O(log n) frame updates, and leveraged Leaflet's efficient `setLatLngs()` for smooth rendering. The message pipeline was already half-built; we completed the last mile.

What's next: multi-track time-boundary handling, trail rendering optimisation for long tracks, and keyboard shortcuts. Come share your tactical analysis workflows — we're building for DSTL scientists and defence practitioners.

Read the full design thinking: [blog-link]

#DefenceTech #MaritimeAnalysis #TacticalData #OpenSource
