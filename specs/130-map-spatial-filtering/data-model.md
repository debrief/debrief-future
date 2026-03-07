# Data Model: Map View with Live Spatial Filtering

**Feature**: 130-map-spatial-filtering
**Date**: 2026-03-06

## Entities

### 1. CatalogOverviewItem (existing — unchanged)

The base STAC item representation consumed by `CatalogOverview`. No schema changes required.

```typescript
interface CatalogOverviewItem {
  id: string;
  title: string;
  itemPath: string;
  bbox: [number, number, number, number] | null;  // [west, south, east, north]
  datetime: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
}
```

### 2. StacBrowserItem (existing — unchanged)

Extended item with metadata fields for CQL2 filtering. No changes needed — spatial filtering operates on the `bbox` field already present in `CatalogOverviewItem`.

```typescript
interface StacBrowserItem extends CatalogOverviewItem {
  readonly vesselClasses: readonly string[];
  readonly tags: readonly string[];
  readonly featureTags: readonly string[];
  readonly author: string | null;
  readonly trackNames: readonly string[];
  readonly nationalities: readonly string[];
  readonly collection: string | null;
}
```

### 3. Bounds (existing — reused)

The existing `Bounds` type from `utils/types.ts` is reused for both exercise footprints and map viewport bounds. No new type introduced.

```typescript
/** Bounds as [minLon, minLat, maxLon, maxLat] — already defined in utils/types.ts:103 */
export type Bounds = [number, number, number, number];
```

This is the same tuple used by `calculateBounds`, `expandBounds`, `isPointInBounds`, and `CatalogOverviewItem.bbox`.

### 4. ViewportPolygon (existing — reused)

The session-state store's viewport representation. CatalogOverview emits `Bounds`, which the integration layer converts to `ViewportPolygon` for the store.

```typescript
interface ViewportPolygon {
  coordinates: [Coordinate, Coordinate, Coordinate, Coordinate];  // [NW, NE, SE, SW]
  zoom?: number;
}
```

### 5. CatalogOverviewProps (extended)

New optional props added to the existing interface.

```typescript
interface CatalogOverviewProps {
  // Existing props (unchanged)
  items: CatalogOverviewItem[];
  onItemSelect?: (itemPath: string) => void;
  initialSplitRatio?: number;
  onSplitRatioChange?: (ratio: number) => void;
  className?: string;

  // New props
  /** Callback when the map viewport changes (debounced). Bounds in STAC format, null if map uninitialised. */
  onViewportChange?: (bounds: Bounds | null) => void;

  /** Map from item ID to CSS colour string. Items not in the map use the default accent colour. */
  colorMap?: ReadonlyMap<string, string>;
}
```

## Relationships

```
                     ┌────────────────────────────────────┐
                     │       CatalogOverview              │
                     │                                    │
CatalogOverviewItem  │  MAP: renders ALL items with bbox  │
    .bbox ───────────│                                    │
                     │  TIMELINE: filters internally      │
                     │  (shows only viewport-overlapping  │
                     │   items + items without bbox)      │
                     │                                    │
                     │  onViewportChange(Bounds | null) ──┼──► Parent / integration layer
                     └────────────────────────────────────┘           │
                                                                     ▼
                                                              ViewportPolygon
                                                              (session-state store)
                                                                     │
                                                                     ▼
                                                          External list views
                                                          (future consumers)
```

## Data Flow

1. **Input**: Parent provides `items: CatalogOverviewItem[]` (ALL items) to CatalogOverview
2. **Map render**: Items with bbox rendered as Rectangles on map (ALL items, memoized); items coloured via `colorMap` lookup
3. **Interaction**: User pans/zooms map → Leaflet `moveend` (guarded against uninitialised map) → debounced 150ms → updates internal viewport state
4. **Timeline render**: Timeline filters items internally using `bboxOverlapsViewport` against current viewport. Items without bbox are always included (FR-005). Items with bbox outside viewport are hidden.
5. **External callback**: `onViewportChange(bounds)` emits debounced viewport bounds for parent/integration layer
6. **Session state**: Parent converts bounds to `ViewportPolygon` → `store.setViewport()` → external views subscribe
7. **Unmount**: Debounce timer cleaned up to prevent setState-on-unmounted

## Validation Rules

- `Bounds`: west in [-180, 180], south in [-90, 90], east in [-180, 180], north in [-90, 90]. South must be ≤ north. West may be > east (antimeridian crossing).
- `colorMap` values: Must be valid CSS colour strings (hex, rgb, hsl, named). No validation at runtime — invalid colours silently fall back to browser defaults.
- `onViewportChange` debounce: 150ms from last `moveend` event.

## State Transitions

The map viewport has three states:

| State | Condition | Behaviour |
|-------|-----------|-----------|
| **Uninitialised** | Map not yet rendered | `onViewportChange(null)` — no spatial filter applied |
| **Active** | Map rendered with bounds | `onViewportChange([w, s, e, n])` — spatial filter active |
| **Empty viewport** | Active but no items overlap | Empty state overlay shown; `onViewportChange` still emits bounds |
