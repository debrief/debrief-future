How do you test that a drag operation actually changed a track's coordinates when the data lives inside a map canvas?

We've been working on this problem for Future Debrief. The map renders geometry as pixels, which means test frameworks like Playwright can't just query a coordinate value and assert against it. Our solution: an "info" button on every feature row in the Layers panel that opens a dialog showing the feature's geometry type and coordinates as structured, accessible text. Each value gets a data-testid attribute, so a test script can open the dialog, read the geometry, and verify -- no canvas parsing required.

The button follows the same hover-visibility pattern as the format icon we shipped last week. The dialog follows established positioning and dismissal patterns. No new dependencies, just a clean extension of what's already there.

One interesting design question we're still working through: how to handle tracks with thousands of coordinate pairs without making the dialog unwieldy.

https://debrief.github.io/debrief-future/blog/planning-feature-info-button

#FutureDebrief #Playwright #MaritimeAnalysis
