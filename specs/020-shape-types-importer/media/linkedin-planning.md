# LinkedIn Planning Post: Shape Types Importer

**Target Length**: 150-200 words
**Type**: Planning announcement

---

Fifteen shape types, from rotated ellipses to donut-shaped annular regions.

That's the annotation parsing work we're tackling this week on Future Debrief. Phase 1 handled the basics — circles, rectangles, lines. Now we're implementing the rest: POLY, POLYLINE, ELLIPSE, WHEEL (which requires opposite-wound polygon rings to cut a hole), and the dynamic shapes that include millisecond-precision timestamps for time-based animation.

The interesting bit: we're adding a Storybook verification pipeline. A Python script parses test fixtures, outputs GeoJSON, and Storybook renders every shape type on a map. Unit tests tell you the geometry is valid; visual verification tells you it doesn't look like a jumbled mess because you got the winding order backwards.

Some decisions we're weighing:
- Are there shape types analysts use that we haven't documented?
- Does anyone actually need millisecond precision on annotation timestamps?
- What styling options would be most useful?

If you work with REP files and have opinions, we'd welcome the input.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
