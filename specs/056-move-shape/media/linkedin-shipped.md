How do you translate a circle annotation 5 km east on a sphere? Not with simple coordinate addition.

The move-shape tool landed this week in Future Debrief -- spec, Python implementation, TypeScript mirror, 18 tests passing, available in all three frontends. It uses the Vincenty destination formula (standard library math only) to shift five annotation types across the Earth's surface with great-circle accuracy.

The interesting part: we wrote the language-neutral spec first, with pseudocode and golden I/O fixtures. The Python and TypeScript implementations came out nearly identical -- when the spec is precise enough, there is not much room to diverge. Both languages produce matching output to IEEE 754 double precision.

First tool in a new `shape/manipulation` category. Rotate and scale will follow the same pattern.

Read the full post: https://debrief.github.io/future/2026/02/11/shipped-move-shape-tool.html

#FutureDebrief #MaritimeAnalysis #OpenSource
