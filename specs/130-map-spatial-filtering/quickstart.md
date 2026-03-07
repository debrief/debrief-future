# Quickstart: Map View with Live Spatial Filtering

**Feature**: 130-map-spatial-filtering

## Prerequisites

- Node.js 18+, pnpm 8+
- Project dependencies installed: `pnpm install`

## 1. Run unit tests (spatial filtering logic)

```bash
# Run all tests for shared components
pnpm --filter @debrief/components test

# Run only CatalogOverview and spatial tests
pnpm --filter @debrief/components test -- --grep "CatalogOverview|spatial|bboxOverlaps"
```

## 2. View in Storybook

```bash
# Start Storybook dev server
pnpm --filter @debrief/components storybook

# Open in browser: http://localhost:6006
# Navigate to: Components → CatalogOverview → SpatialFilter
```

### Key stories to verify

| Story | What to check |
|-------|---------------|
| `Default` | Footprints render at correct positions |
| `SpatialFilter` | Pan/zoom and observe filtered item count in action log |
| `ColourScheme` | Footprints use distinct colours per exercise |
| `EmptyCatalog` | "No exercises loaded" message shown |
| `ManyItems` | 20 footprints render without lag |

## 3. Test in VS Code extension

```bash
# Build extension
pnpm --filter debrief-vscode build

# Launch Extension Development Host (F5 in VS Code)
# Open a STAC catalog → right-click → "Open Catalog Overview"
# Pan/zoom the map → verify list updates
```

## 4. Verify spatial intersection

```typescript
import { bboxOverlapsViewport, filterBySpatialExtent } from '@debrief/components'; // from utils/bounds.ts

// Basic overlap test
const overlaps = bboxOverlapsViewport(
  [-5, 49, 1, 52],     // Exercise in English Channel
  [-10, 45, 5, 55],    // Viewport covering Western Europe
);
// → true

// Antimeridian crossing
const crossesDateLine = bboxOverlapsViewport(
  [170, -10, -170, 10],  // Exercise crossing date line
  [165, -15, 175, 15],   // Viewport near date line
);
// → true

// Filter a collection
const visible = filterBySpatialExtent(items, [-10, 45, 5, 55]);
// → only items whose bbox overlaps the viewport
```

## 5. Run full verification

```bash
# Lint + typecheck + test (same as CI)
task verify
```

## Architecture overview

```
┌──────────────────────────────────────────────────────┐
│            CatalogOverview Component                  │
│                                                       │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │ MAP PANE             │  │ TIMELINE PANE           │ │
│  │ Shows ALL items      │  │ Filters internally:     │ │
│  │ with bbox            │  │ items overlapping       │ │
│  │                      │  │ viewport + items        │ │
│  │ moveend → debounce   │  │ without bbox (FR-005)   │ │
│  └──────────┬───────────┘  └─────────▲──────────────┘ │
│             │  viewport bounds        │                │
│             └─────────────────────────┘                │
│                                                       │
│  onViewportChange(Bounds | null) ─────────────────────┼──► Parent
└───────────────────────────────────────────────────────┘       │
                                                                ▼
                                                    session-state store
                                                    (setViewport)
                                                                │
                                                                ▼
                                                    External list views
                                                    (future consumers)
```

## Files changed

| File | Change |
|------|--------|
| `shared/components/src/CatalogOverview/types.ts` | Add `onViewportChange`, `colorMap` props (uses existing `Bounds` type) |
| `shared/components/src/CatalogOverview/CatalogOverview.tsx` | Internal timeline filtering, viewport events, colorMap, empty overlay, memoized Rectangles |
| `shared/components/src/CatalogOverview/CatalogOverview.css` | Empty state overlay styles |
| `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx` | New stories: SpatialFilter, ColourScheme |
| `shared/components/src/CatalogOverview/CatalogOverview.test.tsx` | Unit tests for viewport callback, colour, empty state, timeline filtering |
| `shared/components/src/utils/bounds.ts` | Add `bboxOverlapsViewport`, `filterBySpatialExtent` |
| `apps/vscode/src/webview/web/catalogOverview.tsx` | Wire `onViewportChange` to postMessage |
| `apps/vscode/src/panels/catalogOverviewPanel.ts` | Handle viewport messages |
