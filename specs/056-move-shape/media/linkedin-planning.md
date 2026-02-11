How do you move a circle annotation 10 km northeast on a sphere? Not as straightforward as it sounds.

We're writing the tool specification for shape translation in Future Debrief -- a language-neutral document that defines exactly how five annotation types (circles, rectangles, lines, vectors, text) should shift across the Earth's surface using the Vincenty destination formula. The tricky part: each shape kind has different properties that need updating. A circle's center must follow its vertices. A vector's origin moves, but its range and bearing stay fixed.

No code yet -- just a precise spec with pseudocode and golden I/O JSON fixtures, so future Python and TypeScript implementations can validate against the same expected results.

Read the full planning post: https://debrief.github.io/future/2026/02/10/planning-move-shape-tool-spec.html

#FutureDebrief #MaritimeAnalysis #OpenSource
