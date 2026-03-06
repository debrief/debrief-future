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

### 3. SpatialBounds (new type alias)

A STAC-format bounding box used for both exercise footprints and map viewport bounds.

```typescript
/** Axis-aligned bounding box in STAC format: [west, south, east, north] */
type SpatialBounds = [number, number, number, number];
```

This is a type alias for documentation clarity — it uses the same `[number, number, number, number]` tuple as `CatalogOverviewItem.bbox`.

### 4. ViewportPolygon (existing — reused)

The session-state store's viewport representation. CatalogOverview emits `SpatialBounds`, which the integration layer converts to `ViewportPolygon` for the store.

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
  onViewportChange?: (bounds: SpatialBounds | null) => void;

  /** Map from item ID to CSS colour string. Items not in the map use the default accent colour. */
  colorMap?: ReadonlyMap<string, string>;
}
```

## Relationships

```
CatalogOverviewItem.bbox ──[intersects]──> Map Viewport (SpatialBounds)
                                              │
                                              ▼
                                        ViewportPolygon
                                        (session-state store)
                                              │
                                              ▼
                                   List/Timeline views
                                   (consume filtered items)
```

## Data Flow

1. **Input**: Parent provides `items: CatalogOverviewItem[]` to CatalogOverview
2. **Render**: Items with bbox rendered as Rectangles on map; items coloured via `colorMap` lookup
3. **Interaction**: User pans/zooms map → Leaflet `moveend` → debounced → `onViewportChange(bounds)`
4. **Integration**: Parent receives bounds → runs `filterBySpatialExtent(items, bounds)` → passes filtered items to list/timeline
5. **Session state**: Parent converts bounds to `ViewportPolygon` → `store.setViewport()` → other views subscribe

## Validation Rules

- `SpatialBounds`: west in [-180, 180], south in [-90, 90], east in [-180, 180], north in [-90, 90]. South must be ≤ north. West may be > east (antimeridian crossing).
- `colorMap` values: Must be valid CSS colour strings (hex, rgb, hsl, named). No validation at runtime — invalid colours silently fall back to browser defaults.
- `onViewportChange` debounce: 150ms from last `moveend` event.

## State Transitions

The map viewport has three states:

| State | Condition | Behaviour |
|-------|-----------|-----------|
| **Uninitialised** | Map not yet rendered | `onViewportChange(null)` — no spatial filter applied |
| **Active** | Map rendered with bounds | `onViewportChange([w, s, e, n])` — spatial filter active |
| **Empty viewport** | Active but no items overlap | Empty state overlay shown; `onViewportChange` still emits bounds |
