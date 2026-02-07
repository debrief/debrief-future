Selecting "position 4 on this track" instead of "the whole track" -- a small distinction that changes what analysts can do with their data.

We shipped nested child selection in Future Debrief this week. The selection model now holds path strings that target elements at any depth: `track-hms-defender/positions/4`, or three levels deep for segments within tracks. The paths are plain strings in the existing feature ID array, so nothing breaks -- the 22 existing selection tests passed without modification.

The implementation is about 170 lines of pure TypeScript. No new dependencies. 117 new tests, 270 total, zero regressions. The key decision was leaf-only semantics: selecting a position does not implicitly select its parent track, which keeps tool matching unambiguous.

[Read the full shipped post](https://debrief.github.io/future/2026/02/07/shipped-nested-child-selection.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
