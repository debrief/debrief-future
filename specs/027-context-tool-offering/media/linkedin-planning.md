Select two tracks on the map. The system shows "Range Calculation". Select a track and a point. "Bearing to Point" appears. Only tools that match your selection.

We're building the matching logic for Future Debrief's analysis tools — a constraint satisfaction algorithm that compares tool requirements against current selections. Tools declare what they need ("2 tracks"), the system filters accordingly.

The interesting part: verification without VS Code. Unit tests first, then a Storybook harness with Playwright automation. Visual confirmation that selection → tool matching works correctly, all with fixture data. VS Code integration comes later.

Planning post with full details: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
