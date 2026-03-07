# Usage Example: Map View with Live Spatial Filtering

## Basic Usage with Spatial Filtering

```tsx
import { CatalogOverview } from '@debrief/components';
import type { CatalogOverviewItem, Bounds } from '@debrief/components';

function CatalogBrowser({ items }: { items: CatalogOverviewItem[] }) {
  const handleViewportChange = (bounds: Bounds | null) => {
    console.log('Viewport changed:', bounds);
    // bounds is [west, south, east, north] or null when map not initialised
    // Use this to update external views (list, other panels)
  };

  const handleItemSelect = (itemPath: string) => {
    console.log('Open exercise:', itemPath);
  };

  return (
    <CatalogOverview
      items={items}
      onItemSelect={handleItemSelect}
      onViewportChange={handleViewportChange}
    />
  );
}
```

## With Colour Map

```tsx
import { CatalogOverview } from '@debrief/components';

// Map from item ID to CSS colour string
const colorMap = new Map<string, string>([
  ['exercise-alpha', '#e74c3c'],
  ['exercise-bravo', '#2ecc71'],
  ['patrol-charlie', '#3498db'],
]);

function ColouredCatalog({ items }) {
  return (
    <CatalogOverview
      items={items}
      colorMap={colorMap}
    />
  );
}
```

## Spatial Filtering Utilities

```tsx
import { bboxOverlapsViewport, filterBySpatialExtent } from '@debrief/components';
import type { Bounds } from '@debrief/components';

// Check if a single item overlaps a viewport
const itemBbox: Bounds = [-5, 49, 2, 52];   // English Channel
const viewport: Bounds = [-10, 45, 5, 55];  // Western Europe
const overlaps = bboxOverlapsViewport(itemBbox, viewport); // true

// Filter a list of items to those overlapping a viewport
const items = [
  { id: 'a', bbox: [-5, 49, 2, 52] as Bounds },    // overlaps
  { id: 'b', bbox: [100, 0, 110, 10] as Bounds },   // does not overlap
  { id: 'c', bbox: null },                           // excluded (no bbox)
];
const filtered = filterBySpatialExtent(items, viewport);
// filtered = [{ id: 'a', bbox: [-5, 49, 2, 52] }]
```

## VS Code Extension Integration

```tsx
// In VS Code webview entry point
import { CatalogOverview } from '@debrief/components';
import type { Bounds } from '@debrief/components';

const vscode = acquireVsCodeApi();

function CatalogOverviewApp() {
  const handleViewportChange = (bounds: Bounds | null) => {
    // Post viewport changes to the extension host
    vscode.postMessage({
      type: 'overviewViewportChanged',
      bounds,
    });
  };

  return (
    <CatalogOverview
      items={catalogData.items}
      onViewportChange={handleViewportChange}
    />
  );
}
```

## Key Behaviours

1. **Map shows ALL items** — panning/zooming the map does not hide footprints from the map itself
2. **Timeline filters internally** — only items whose bounding boxes overlap the current viewport are shown in the timeline
3. **Items without bbox are always shown in the timeline** — spatial filtering only affects items with spatial data (FR-005)
4. **Debounced updates** — viewport change callbacks fire 150ms after the user stops panning/zooming
5. **Three empty states** — "No items in this catalog", "No spatial data available", "No exercises in this area"
