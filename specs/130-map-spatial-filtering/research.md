# Research: Map View with Live Spatial Filtering

**Feature**: 130-map-spatial-filtering
**Date**: 2026-03-06

## R1: Spatial Intersection Algorithm

**Decision**: Axis-Aligned Bounding Box (AABB) overlap test

**Rationale**: Exercise footprints are STAC bounding boxes `[west, south, east, north]` and the map viewport is also a rectangle aligned to the coordinate axes (no rotation in CatalogOverview). AABB overlap is O(1) per item with a simple four-comparison check:

```
overlaps = !(itemEast < vpWest || itemWest > vpEast || itemNorth < vpSouth || itemSouth > vpNorth)
```

This handles all overlap cases including partial overlap, containment, and items larger than the viewport.

**Alternatives considered**:
- **Turf.js booleanIntersects**: Full geometric intersection; adds ~50KB dependency for a problem that doesn't need polygon math. Rejected per Constitution IX.1 (minimal dependencies).
- **R-tree spatial index**: Would accelerate filtering for very large datasets (1000+), but at 200 exercise ceiling the linear scan over AABB checks is sub-millisecond. Premature optimisation.

## R2: Antimeridian-Crossing Bounding Boxes

**Decision**: Detect when `west > east` and split into two rectangles for both rendering and intersection testing.

**Rationale**: STAC bounding boxes that cross the antimeridian (date line) have `west > east` (e.g., `[170, -10, -170, 10]` spans from 170°E to 170°W). For rendering, Leaflet handles this naturally when the bbox is split into `[170, -10, 180, 10]` and `[-180, -10, -170, 10]`. For intersection testing, the viewport overlaps the item if it overlaps either half.

**Alternatives considered**:
- **Normalize to [0, 360] range**: Requires transforming all coordinates including viewport bounds; error-prone and breaks Leaflet's assumptions.
- **Ignore antimeridian**: Produces incorrect rendering and filtering for exercises in the Pacific. Unacceptable for a maritime analysis tool.

## R3: Debounce Strategy for Viewport Changes

**Decision**: Custom `useDebouncedCallback` hook with 150ms delay, using `useRef` + `setTimeout` pattern.

**Rationale**: The project already uses this pattern in `FilterDropdown.tsx` (line 31-52) for text input debouncing. A reusable hook standardises the approach. 150ms balances responsiveness (user doesn't perceive delay) with avoiding excessive re-renders during rapid pan/zoom gestures.

The debounce fires on Leaflet's `moveend` event (which already batches during animation). The 150ms is an additional guard for rapid discrete pan/zoom steps.

**Alternatives considered**:
- **lodash.debounce**: Adds a dependency for a 10-line utility. Rejected per Constitution IX.1.
- **requestAnimationFrame**: Fires too frequently (every 16ms); doesn't reduce computation enough during rapid gestures.
- **No debounce (immediate)**: Leaflet's `moveend` fires after each gesture completes, so in practice updates are already somewhat batched. However, programmatic zoom-to-fit or rapid keyboard panning can fire multiple events within 150ms. Debounce is a safety net.

## R4: Colour Assignment Architecture

**Decision**: Add optional `colorMap` prop to CatalogOverview — a `Map<string, string>` from item ID to CSS colour. Default to accent colour when no map provided or item has no entry.

**Rationale**: Feature #134 (Colour Scheme Engine) is approved but not implemented. The spec requires exercise footprints to use assigned colours (FR-006) but also requires a default fallback (FR-007). A pluggable `colorMap` prop satisfies both:

1. Without #134: no `colorMap` passed → all footprints use `var(--co-accent, #007fd4)` (current behaviour preserved).
2. With #134: parent component computes colours and passes `colorMap` → footprints render per-exercise colours.

The `colorMap` is a simple `Map<string, string>` rather than a complex colour scheme object because the CatalogOverview doesn't need to know *why* a colour was chosen — only *what* colour to render.

**Alternatives considered**:
- **Embed colour logic in CatalogOverview**: Violates separation of concerns; the component shouldn't know about vessel classes or age-based gradients.
- **Add colour to CatalogOverviewItem type**: Would require every consumer to populate colour; the current `StacBrowserItem` extends `CatalogOverviewItem` and colour comes from a different dimension.
- **Wait for #134**: Blocks this feature on an unimplemented dependency. The pluggable approach delivers value now and integrates later without changes.

## R5: Cross-View Synchronisation Mechanism

**Decision**: Use the existing session-state Zustand store. CatalogOverview emits viewport bounds via `onViewportChange` callback. The VS Code webview wrapper posts the bounds to the extension host. The extension host (or a parent component in web-shell) applies the spatial filter to the item list before passing items to list/timeline views.

**Rationale**: The session-state store already has `SpatialSlice.viewport` (a `ViewportPolygon` with 4 corners) and `subscribeToViewport()`. However, CatalogOverview's viewport is a simple axis-aligned bounds `[west, south, east, north]`, not a rotated polygon. Two options:

1. **Use ViewportPolygon**: Convert Leaflet bounds to 4-corner polygon (NW, NE, SE, SW). This is what the session-state store expects.
2. **Use Bounds directly**: Add a new `viewportBounds` field to the spatial slice.

Option 1 is preferred because it reuses the existing schema and subscription infrastructure. The conversion from Leaflet bounds to ViewportPolygon is trivial:
```ts
const bounds = map.getBounds();
const viewport: ViewportPolygon = {
  coordinates: [
    [bounds.getWest(), bounds.getNorth()],  // NW
    [bounds.getEast(), bounds.getNorth()],  // NE
    [bounds.getEast(), bounds.getSouth()],  // SE
    [bounds.getWest(), bounds.getSouth()],  // SW
  ],
  zoom: map.getZoom(),
};
```

The spatial filtering itself happens at the integration layer (VS Code webview wrapper or web-shell parent), not inside CatalogOverview. This keeps the shared component pure and testable.

**Alternatives considered**:
- **Filter inside CatalogOverview**: Would require the component to receive all items and emit filtered items, making it a data pipeline rather than a display component. Violates the "thin frontends" principle.
- **Custom event bus**: Adds complexity when Zustand subscriptions already exist for exactly this purpose.

## R6: Empty State / No Matches Indicator

**Decision**: Overlay `<div>` inside the map container with "No exercises in this area" text, shown when `items.filter(hasOverlap).length === 0` and `items.some(hasBbox)`.

**Rationale**: Three distinct empty states need different treatments:

1. **No items at all**: Show "No exercises loaded" — indicates data hasn't been loaded yet.
2. **Items exist but none have bbox**: Show "No spatial data available" — map is present but can't display anything useful.
3. **Items have bbox but none overlap viewport**: Show "No exercises in this area" — the user has panned/zoomed away from all exercises.

The overlay is CSS-positioned inside the Leaflet container, semi-transparent, and non-interactive (pointer-events: none) so the map remains pannable.

**Alternatives considered**:
- **Toast/notification**: Transient; user might miss it.
- **Replace map with full empty state**: Prevents the user from panning back to find exercises; poor UX.
- **Badge count on map tab**: Too subtle for a primary discovery tool.

## R7: Viewport Change Callback Shape

**Decision**: `onViewportChange(bounds: [number, number, number, number] | null)` where bounds is `[west, south, east, north]` matching the STAC bbox format. `null` signals "no viewport constraint" (e.g., map not yet initialised).

**Rationale**: Using the same `[west, south, east, north]` format as STAC bounding boxes eliminates format conversion in the spatial intersection test. The callback fires after debounce on every Leaflet `moveend` event. The parent component receives bounds in STAC format and can directly compare with item bounding boxes.

**Alternatives considered**:
- **Leaflet LatLngBounds object**: Leaflet-specific; would leak the mapping library into the component's public API.
- **ViewportPolygon**: The 4-corner polygon format from session-state. More complex than needed for axis-aligned bounds. Conversion can happen at the integration layer.
