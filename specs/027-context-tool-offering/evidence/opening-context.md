## What We're Building

When an analyst selects tracks on the map, the system should show which analysis tools apply to that selection. Select two tracks, see "Range Calculation". Select a track and a reference point, see "Bearing to Point". The idea is simple: reduce cognitive load by surfacing only what's relevant.

The core is a matching algorithm. Each tool declares its requirements — "I need exactly 2 tracks" or "I need at least 1 reference location". The system compares these requirements against the current selection and shows which tools match. For tools that don't match, we show why: "Requires 2 tracks (1 selected)".

## How It Fits

This connects debrief-calc (where tools live) to the VS Code extension (where analysts work). We're building the ToolMatchService as a standalone TypeScript library that can run in both a Storybook harness and eventually VS Code. The matching logic is pure — no network calls, no side effects, just "given these tools and this selection, what's applicable?"

The phased approach means we'll have confidence in the algorithm before touching VS Code. Unit tests verify edge cases. Storybook lets us visually check selection → tool mapping. Only then do we wire it into the extension.

## Key Decisions

- **Constraint satisfaction for matching**: A tool is applicable when all its requirements are met and no extra feature kinds exist in the selection. Simple, predictable, testable.

- **First-unmet-requirement explanations**: Rather than listing everything wrong, we show the first reason a tool doesn't match. "Requires 2 tracks (1 selected)" is more actionable than a wall of unmet criteria.

- **Storybook for visual verification**: We're using Storybook stories with Playwright tests rather than building a separate test harness. The component renders standalone with fixture data — no backend needed.

- **Phase 3 deferred**: VS Code integration happens only after Phases 1-2 are verified. This keeps iteration cycles fast and avoids debugging matching logic through extension architecture.
