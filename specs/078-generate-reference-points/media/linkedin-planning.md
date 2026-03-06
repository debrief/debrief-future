Buffer zone analysis needs points before it can classify them. Where do those points come from?

We're specifying a generate-reference-points tool for Future Debrief -- the first step in a five-tool reactive provenance chain (Epic E03) built to demonstrate how analysis results propagate automatically when upstream data changes. The tool creates regular grids or pseudo-random scatters of GeoJSON reference points within a bounding box, ready for downstream zone classification and histogram generation.

One interesting constraint: the scatter pattern must produce identical results from the same seed in both Python and TypeScript. Language-native PRNGs use different algorithms and would diverge, so the spec defines a cross-language linear congruential generator with fixed parameters. Deterministic feature IDs (ref-grid-0, ref-scatter-0) make golden fixture comparison straightforward.

No new schema types required. The existing FeatureKind.POINT and LocationTypeEnum.REFERENCE already express the semantics. This is a spec-only feature for now -- a precise contract with pseudocode and golden I/O fixtures that any future implementation can validate against.

Read the full planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
