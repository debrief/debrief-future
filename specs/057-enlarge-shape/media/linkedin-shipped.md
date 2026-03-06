How should a shape scale on a sphere? Sometimes the answer is: don't overthink it.

The enlarge-shape tool spec shipped this week for Future Debrief -- a language-neutral specification for scaling annotation shapes by a multiplicative factor. It's the sibling of the move-shape tool, which needed Vincenty great-circle math. Scaling is different: it multiplies coordinate differences, and for shapes spanning a few kilometres, simple linear interpolation in lat/lon introduces under 0.1% error. The straightforward approach turned out to be the correct one.

The spec covers five annotation kinds, each with its own rules. Vectors are the interesting case again: geometry and origin scale, but range and bearing stay fixed because they define meaning, not position. Three golden I/O fixture pairs serve as the cross-language contract -- any future Python or TypeScript implementation either matches the expected output or it doesn't.

Two of three shape manipulation tools now specified. Rotation is next.

Read the full post: https://debrief.github.io/future/2026/02/13/shipped-enlarge-shape-tool-spec.html

#FutureDebrief #MaritimeAnalysis #OpenSource
