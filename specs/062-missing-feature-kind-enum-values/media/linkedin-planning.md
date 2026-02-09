We were about to add seven new top-level feature types to Debrief's GeoJSON schema. Then we modelled the domain properly and realised we needed zero.

Sensors, TMA segments, and Target Uncertainty Areas don't exist independently of the tracks they belong to. A sensor bearing originates from the host track's interpolated position. A TMA segment composes the track itself. Representing them as peers of the track -- separate GeoJSON features -- would mean duplicating data, complicating queries, and fighting the domain model instead of working with it.

So TrackFeature is evolving instead. Compound geometry (MultiLineString) with per-segment metadata. Embedded sensor and TUA arrays within track properties. Backward compatible -- existing simple tracks stay valid. And it unblocks 30+ tools that depend on these data types.

Sometimes the right answer to "what new things do we need?" is "none -- make the existing thing richer."

[Read the full planning post](https://debrief.github.io/future/2026/02/08/planning-compound-track-model-with-embedded-children.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
