# LinkedIn Post: Feature Info Button

**Type**: Shipped Post
**Date**: 2026-02-17
**Feature**: 098-feature-info-button

---

How do you test that a drag operation actually moved a track to the right coordinates when all you have is a map canvas?

We added an info button to every feature row in the Layers panel. Click it, and a dialog shows the geometry type and coordinates. Points show a lat/lon pair. LineStrings show an ordered position list. MultiPolygons show their constituent rings.

The immediate use case is automated testing. Playwright can now open the info dialog and assert coordinate values directly -- no image comparison, no canvas parsing. Drag a track, check the new position. Run a calculation, verify the result geometry. Undo, confirm reversion.

The implementation reused the hover-visibility and viewport collision patterns from last week's format menu, keeping it to about 200 lines of new code. The dialog carries both `role="dialog"` for accessibility and `data-testid` for automation. 26 new tests, 597 total, zero failures.

[Blog post URL when published]

#FutureDebrief #MaritimeAnalysis #OpenSource

---

**Link**: [Blog post URL when published]
