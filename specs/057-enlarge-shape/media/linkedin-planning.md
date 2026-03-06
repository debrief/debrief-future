How should a shape scale on a sphere? It depends on what you're willing to approximate.

We just shipped the move-shape tool spec for Future Debrief, using Vincenty great-circle math to translate annotations. Now we're writing the sibling spec: enlarge-shape, which scales annotation shapes by a multiplicative factor relative to an origin point.

The interesting design choice: move-shape needed spherical geometry because it translates by bearing and distance. Scaling is different -- it multiplies coordinate differences. For annotation shapes spanning a few kilometres, simple lat/lon interpolation introduces less than 0.1% error at mid-latitudes. Sometimes the straightforward approach is the right one.

The spec covers five annotation kinds -- circles, rectangles, lines, vectors, text labels -- each with their own quirks. Vectors are the interesting case: the geometry and origin scale, but range and bearing stay fixed because they define what the vector means, not just where it sits.

This is spec-only -- a Markdown document with pseudocode and golden I/O JSON fixtures, no code. Any future Python or TypeScript implementation validates against the same expected outputs.

Read the full planning post: https://debrief.github.io/future/2026/02/13/planning-enlarge-shape-tool-spec.html

#FutureDebrief #MaritimeAnalysis #OpenSource
