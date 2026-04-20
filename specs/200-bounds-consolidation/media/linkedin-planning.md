Reviews are supposed to shrink a PR. This one grew.

The original plan was a tidy cleanup: two copies of `calculateBounds` had drifted (a null-guard landed in one and not the other), so we'd delete the duplicate and lift the guard into the canonical utility. About 116 lines disappear. Nothing user-visible changes.

Then `/speckit.review` ran and caught something sitting one function away from the code we were already touching. The VS Code map's "zoom to selection" has a fourth, inline copy of "compute bounds from features" that only handles points and lines. If your selection contains a polygon, the map has been silently zooming to the wrong place. For years. Nobody filed a bug because "the map didn't zoom quite where I expected" is the kind of failure that's easier to shrug off than to report.

We folded the fix in. One line at the call site, verified by tests we were already writing. The constitution forbids silent failures, and this PR removes one.

Specs-first discipline earns its keep on days like this.

https://debrief.github.io/2026/04/20/planning-bounds-consolidation.html

#TechDebt #MaritimeAnalysis #OpenSource
