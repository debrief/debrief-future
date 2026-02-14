Shipped the first tool in Future Debrief's reactive provenance chain: generate-reference-points. It creates regular grids or pseudo-random scatter patterns of GeoJSON points within a bounding box — the foundation for buffer zone analysis.

The constraint was interesting: both Python and TypeScript implementations had to produce identical point distributions from the same seed. Rather than pick one language's PRNG (which would diverge across implementations), we defined a portable linear congruential generator with fixed parameters in the spec. Deterministic feature IDs (ref-grid-0, ref-scatter-0) make round-trip testing straightforward.

We added MultiPoint geometry and PointMetadataEntry to the schema, wrote 53 tests (28 Python, 25 TypeScript), and validated the full stack: Python to GeoJSON, that GeoJSON parsed back to TypeScript types, transformed again, and round-tripped back to Python. All passing.

The tool is now live in the calc service. Downstream tools (zone classification, histograms) can build on top of it. Interested in how deterministic PRNGs solve the cross-language testing problem? The spec includes the exact LCG parameters and reference implementations.

Read the shipped post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
