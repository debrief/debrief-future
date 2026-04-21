# Usage Example: Unified `@debrief/utils` Bounds Module

All nine bounds helpers now live in `@debrief/utils`. Import them from the unified location:

```typescript
import {
  calculateBounds,
  expandBounds,
  isPointInBounds,
  bboxOverlapsViewport,
  viewportToBounds,
  filterBySpatialExtent,
  mergeBounds,
  boundsToLeaflet,
  isValidBounds,
} from '@debrief/utils';
```

## `calculateBounds` — three feature-type families, no casts

### (a) `DebriefFeature[]` (LinkML-generated, from `@debrief/schemas`)

```typescript
import type { DebriefFeature } from '@debrief/schemas';

const features: DebriefFeature[] = loadFeatures();
const bounds = calculateBounds(features);
// bounds: [minLon, minLat, maxLon, maxLat] | null
// e.g. [-5.0, 50.0, 2.5, 52.0]
```

### (b) `SafeFeature[]` (from `@debrief/utils/types`, geometry may be null)

```typescript
import type { SafeFeature } from '@debrief/utils';

const safeFeatures: SafeFeature[] = parseMcpResponse();
const bounds = calculateBounds(safeFeatures);
// null-geometry features are skipped silently
// all-null input returns null (no throw)
```

### (c) `GeoJSONFeature[]` (raw JSON parse boundary)

```typescript
const geoJsonFeatures = JSON.parse(rawJson) as Array<{
  type: 'Feature';
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}>;
const bounds = calculateBounds(geoJsonFeatures);
// Structural subtyping — no cast needed
```

## Fast-path vs slow-path

When features carry a pre-computed `bbox`, `calculateBounds` uses it directly
and skips the per-coordinate walk for that feature:

```typescript
// Fast-path: feature.bbox is trusted when present and valid
const fastFeatures = [
  { geometry: { type: 'Point', coordinates: [0, 0] }, bbox: [10, 20, 30, 40] as Bounds },
];
calculateBounds(fastFeatures);
// → [10, 20, 30, 40]   (bbox-derived, coordinate walk skipped)

// Slow-path: no bbox — falls back to coordinate walk
const slowFeatures = [
  { geometry: { type: 'Point', coordinates: [10, 20] } },
];
calculateBounds(slowFeatures);
// → [10, 20, 10, 20]   (coordinate-derived)
```

Invalid bboxes fall back silently (no throw):

```typescript
calculateBounds([{ geometry: { type: 'Point', coordinates: [3, 7] }, bbox: null }]);
// → [3, 7, 3, 7]  (null bbox → coordinate walk)

calculateBounds([{ geometry: { type: 'Point', coordinates: [3, 7] }, bbox: [NaN, 0, 10, 10] as any }]);
// → [3, 7, 3, 7]  (NaN bbox → coordinate walk)
```

## Other helpers

```typescript
// Expand bounds by 10% padding
expandBounds([-5, 50, -3, 52], 0.1);
// → [-5.2, 49.8, -2.8, 52.2]

// Point-in-bounds check
isPointInBounds(-4, 51, [-5, 50, -3, 52]);
// → true

// Viewport spatial filter
filterBySpatialExtent(items, viewportBbox);
// → items whose bbox overlaps the viewport

// Viewport polygon → axis-aligned bounds
viewportToBounds(viewport);
// → [minLon, minLat, maxLon, maxLat] or null if degenerate

// AABB overlap (with antimeridian support)
bboxOverlapsViewport(itemBbox, viewportBbox);
// → true if they overlap
```

## Barrel re-export compatibility

Existing `import { calculateBounds } from '@debrief/components'` call sites
continue to work without any changes — the `shared/components` barrel
re-exports the four previously-local symbols from `@debrief/utils`:

```typescript
// Before (still works, no change needed):
import { calculateBounds, bboxOverlapsViewport } from '@debrief/components';

// After (preferred for new code):
import { calculateBounds, bboxOverlapsViewport } from '@debrief/utils';
```
