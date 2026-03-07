The vessel class filter in Future Debrief now speaks human. Instead of showing raw taxonomy paths like `surface/warship/frigate/type23`, lozenges display "Type 23 Frigate" -- and the dropdown has type-ahead search so you can find an Astute-class SSN without navigating four menu levels.

Each node also shows live match counts reflecting the current filter state. "Warship (26)" tells you there are 26 matching exercises before you commit to that selection. Zero-count nodes are dimmed and not selectable, so no dead-end filter choices.

72 new tests, zero new dependencies, three new source files. Built on top of the filter bar (#127) and STAC mock data (#125) shipped earlier this week.

https://debrief.github.io/blog/2026/03/07/shipped-vessel-taxonomy-and-hierarchical-filtering

#FutureDebrief #MaritimeAnalysis #OpenSource
