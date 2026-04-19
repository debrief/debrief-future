Sometimes the most valuable PR removes 116 lines and adds five.

We have two copies of `calculateBounds` in the Future Debrief monorepo. They started life as the same function. They are no longer the same function — a defensive null-guard landed in the VS Code copy and never made it back to the shared one. That is the quiet way duplication starts to cost you: a bug fix in one place, an unnoticed gap in the other.

Backlog item #200 collapses them back into one. The user-visible impact is deliberately nothing — the VS Code map's "zoom to fit" behaves exactly as before. The value is internal: one canonical implementation, the null-guard lifted to where every consumer benefits, and a regression test that locks the behaviour in place.

Two open questions worth thinking about beyond this specific PR: where else in the monorepo are near-identical copies hiding, and would a lint rule prevent this kind of drift recurring? Both larger than #200, both worth asking.

Planning post and spec: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
