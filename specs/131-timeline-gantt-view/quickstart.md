# Quickstart: Timeline/Gantt View with Temporal Filtering

**Feature**: 131-timeline-gantt-view
**Date**: 2026-03-06

## Prerequisites

- Node.js 18+, pnpm
- Existing `shared/components` package builds and tests pass
- Familiarity with `shared/components/src/CatalogOverview/` component
- #125 mock data fixtures available (100 `StacBrowserItem` entries)

## Getting Started

### 1. Extract timeline utilities

Extract the internal helpers from `CatalogOverview.tsx` into a shared module:

```
shared/components/src/timeline-utils/
├── index.ts           # Re-exports all utilities
├── time-helpers.ts    # parseTime, computeTimeRange, computeBarX, computeBarWidth
├── format-helpers.ts  # formatDate, formatDateRange, formatAxisLabel
└── __tests__/
    └── time-helpers.test.ts  # Migrated from CatalogOverview/__tests__/timeline.test.ts
```

### 2. Create the TimelineView component

```
shared/components/src/TimelineView/
├── TimelineView.tsx       # Main component
├── TimelineView.css       # Styles (extending CatalogOverview patterns)
├── TimelineView.stories.tsx  # Storybook stories
├── TimeBrush.tsx          # Draggable range selection overlay
├── types.ts               # TemporalFilter, TimelineViewProps, ColourFn
├── index.ts               # Public exports
└── __tests__/
    ├── TimelineView.test.tsx  # Component rendering tests
    └── TimeBrush.test.tsx     # Brush interaction tests
```

### 3. Write tests first (Constitution Art. VII)

Start with unit tests for:
1. `itemOverlapsFilter()` — temporal overlap logic
2. `formatAxisLabel()` — multi-granularity formatting
3. `TimeBrush` handle drag — verify filter emission
4. `TimelineView` rendering — bars, points, empty state, no-time-data state

### 4. Implement the component

Key implementation order:
1. **timeline-utils extraction** — move helpers, update CatalogOverview imports
2. **TimelineView static rendering** — bars, labels, time axis (P1 Story 1)
3. **TimeBrush interaction** — draggable handles, filter emission (P1 Story 2)
4. **Item selection** — double-click handler (P2 Story 3)
5. **Colour scheme integration** — optional `colourFn` prop (P3 Story 4)

### 5. Storybook stories

Create stories covering:
- Default (10 items with varied temporal ranges)
- Empty state (no items)
- Single datetime items (point markers)
- Many items (100+ for scroll testing)
- With colour scheme active
- With temporal filter active (brush visible)
- Mixed metadata (some items missing time data)

### 6. Verify

```bash
# Run tests
pnpm --filter @debrief/shared-components test

# Run type check
pnpm --filter @debrief/shared-components typecheck

# Open Storybook
pnpm --filter @debrief/shared-components storybook
```

## Key Integration Points

| Integration | How | When |
|-------------|-----|------|
| Filter state store (#132) | `onTemporalFilterChange` prop wired to store setter | After #132 creates the store |
| Colour scheme (#134) | `colourFn` prop provided by #134 consumer component | After #134 implements colour engine |
| Exercise opening | `onItemSelect` prop wired to VS Code editor open command | Standard wiring, same as CatalogOverview |
| Mock data (#125) | Import `StacBrowserItem` fixtures for Storybook stories | Available now |

## File Changes Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `shared/components/src/timeline-utils/` | Extracted timeline helpers |
| Create | `shared/components/src/TimelineView/` | New component |
| Modify | `shared/components/src/CatalogOverview/CatalogOverview.tsx` | Import from timeline-utils |
| Modify | `shared/components/src/CatalogOverview/__tests__/timeline.test.ts` | Import from timeline-utils |
| Modify | `shared/components/src/index.ts` | Export TimelineView |
