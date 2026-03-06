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
import { bboxOverlapsViewport, filterBySpatialExtent } from '@debrief/components';

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
┌─────────────────────────────────────────────────┐
│  Parent Component (VS Code webview / web-shell)  │
│                                                   │
│  ┌──────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ CatalogOverview│  │ List View│  │Timeline View│ │
│  │ (map + timeline)│  │          │  │            │ │
│  └───────┬──────┘  └────▲─────┘  └─────▲──────┘ │
│          │               │              │         │
│    onViewportChange      │              │         │
│    (debounced 150ms)     │              │         │
│          │               │              │         │
│          ▼               │              │         │
│  filterBySpatialExtent ──┼──────────────┘         │
│  (pure function)         │                        │
│          │               │                        │
│          ▼               │                        │
│  session-state store ────┘                        │
│  (setViewport)                                    │
└───────────────────────────────────────────────────┘
```

## Files changed

| File | Change |
|------|--------|
| `shared/components/src/CatalogOverview/types.ts` | Add `onViewportChange`, `colorMap` props, `SpatialBounds` type |
| `shared/components/src/CatalogOverview/CatalogOverview.tsx` | Emit viewport events, use colorMap, show empty overlay |
| `shared/components/src/CatalogOverview/CatalogOverview.css` | Empty state overlay styles |
| `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx` | New stories: SpatialFilter, ColourScheme |
| `shared/components/src/CatalogOverview/CatalogOverview.test.tsx` | Unit tests for viewport callback, colour, empty state |
| `shared/components/src/filter-engine/spatial.ts` | `bboxOverlapsViewport`, `filterBySpatialExtent` |
| `shared/components/src/utils/useDebouncedCallback.ts` | Reusable debounce hook |
| `apps/vscode/src/webview/web/catalogOverview.tsx` | Wire `onViewportChange` to postMessage |
| `apps/vscode/src/panels/catalogOverviewPanel.ts` | Handle viewport messages |
