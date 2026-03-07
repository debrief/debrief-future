---
feature: "131-timeline-gantt-view"
captured_at: "2026-03-07T11:46:00Z"
git_sha: "6cfbab7"
tests_passed: 728
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Timeline/Gantt View with Temporal Filtering

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 728 |
| Passed | 728 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a |

## Test Breakdown

### Timeline Utility Helpers (`utils/__tests__/timeline-helpers.test.ts`)

| Test | Status |
|------|--------|
| computeTimeRange — returns null for empty items | Pass |
| computeTimeRange — returns null when no items have temporal data | Pass |
| computeTimeRange — computes range from start/end datetimes | Pass |
| computeTimeRange — falls back to datetime when start/end not available | Pass |
| computeTimeRange — pads by ±1h when all items share identical datetimes | Pass |
| computeTimeRange — handles mixed items (some with time, some without) | Pass |
| computeTimeRange — handles single item with only datetime | Pass |
| computeBarX — positions bar at start/end/midpoint of range | Pass |
| computeBarWidth — proportional width, min 4px, full-width | Pass |
| formatTimeByRange — 5 granularity tiers (<24h, <7d, <90d, <2y, >=2y) | Pass |
| formatDateRange — range, single datetime, missing data, same dates | Pass |
| itemOverlapsFilter — overlap, partial, contains, before, after, no-data, point | Pass |

### CatalogOverview Timeline Tests (refactored — `CatalogOverview/__tests__/timeline.test.ts`)

| Test | Status |
|------|--------|
| All 10 existing tests pass after import refactoring | Pass |

### TimelineView Component (`TimelineView/__tests__/TimelineView.test.tsx`)

| Test | Status |
|------|--------|
| US1: renders bars for items with start/end datetimes | Pass |
| US1: renders point markers for single-datetime items | Pass |
| US1: displays "No matches" empty state | Pass |
| US1: displays "no time data" label for items without temporal metadata | Pass |
| US1: shows tooltip with title and date range on hover | Pass |
| US1: renders time axis labels | Pass |
| US1: supports vertical scroll with 100+ items | Pass |
| US2: brush handle interaction wired up | Pass |
| US3: double-click bar calls onItemSelect with correct itemPath | Pass |
| US3: double-click point marker calls onItemSelect | Pass |
| US4: bars use colourFn return value for fill colour | Pass |
| US4: colourFn returning null falls back to default colour | Pass |
| US4: no colourFn prop → all bars use default colour | Pass |
| US4: colourFn that throws → bars fall back to default colour (Art. V.1) | Pass |

### TimeBrush Component (`TimelineView/__tests__/TimeBrush.test.tsx`)

| Test | Status |
|------|--------|
| Left handle drag emits updated filter | Pass |
| Right handle drag emits updated filter | Pass |
| Body drag pans the filter window | Pass |
| Handles cannot cross (no inverted range, FR-013) | Pass |
| Clearing brush emits null filter on double-click | Pass |

## Key Scenarios Verified

- **Bar rendering accuracy**: Bars positioned proportionally on the time axis using computeBarX/computeBarWidth
- **Point markers**: Single-datetime items render as circles instead of bars
- **Empty/no-data states**: "No matches" for empty items, "no time data" for items without temporal metadata
- **Vertical scrolling**: 100+ items render in a scrollable area with fixed time axis
- **Brush interaction**: Left/right handle drags, body panning, handle clamping (FR-013), double-click to clear
- **Exercise selection**: Double-click on bars and point markers triggers onItemSelect
- **Colour scheme**: colourFn integration with try/catch fallback for Art. V.1 compliance
- **Backward compatibility**: CatalogOverview tests pass after timeline helper extraction

## Known Issues

- None

## Environment

- Runner: vitest 1.x (jsdom environment)
- Branch: claude/implement-speckit-131-DoKVd
- Date: 2026-03-07
