# Research: Three-View Synchronization and Filter State

**Feature**: 132-three-view-sync
**Date**: 2026-03-07

## R1: Filter State Architecture — Single Store vs Lifted Props

**Decision**: Add a `BrowserFilterSlice` to the existing Zustand session-state store.

**Rationale**: The project already uses Zustand (^5.0.0) with `subscribeWithSelector` middleware and a well-established slice composition pattern (`createTemporalSlice`, `createSpatialSlice`, etc.). Adding a new slice follows this pattern exactly. The `subscribeWithSelector` middleware enables fine-grained subscriptions so views only re-render when their relevant filter state changes.

**Alternatives considered**:
- **React Context + useReducer**: Simpler but lacks fine-grained subscriptions. All consumers re-render on any state change, violating the 200ms performance target.
- **Lifted props only (no store)**: The `CatalogOverview` currently uses `useState` + `useMemo` for viewport filtering. This works for two views but does not scale to four views with three filter axes. Prop drilling through the `StacBrowser` parent is possible but couples the parent to all filter logic.
- **Separate Zustand store**: A standalone store for browser filter state. Rejected because the spatial (`viewport`) and temporal (`timeFilter`) state already lives in the session store — splitting would cause dual-ownership.

**Key insight**: The session store already has `viewport` (spatial) and `timeFilter` (temporal) fields. The browser filter slice adds `metadataFilteredIds` (metadata axis) and a derived `browserFilteredItems` selector. Spatial and temporal filtering reuse existing store fields.

---

## R2: Filter Composition Strategy — Where to Compute the Intersection

**Decision**: A `useBrowserFilter` hook in the `StacBrowser` component computes the intersection of all three filter axes using `useMemo`.

**Rationale**: The composition must be reactive (update when any axis changes) and efficient (avoid recomputation when unrelated state changes). A `useMemo` in the composition hook, subscribed to the three relevant store slices via `useStore(store, selector)`, achieves both. The hook returns `filteredItems: StacBrowserItem[]` which is passed as props to child views.

**Alternatives considered**:
- **Compute in store (derived state)**: Zustand doesn't natively support derived state. We could add a middleware, but this adds complexity and the computation depends on the full item list which is React state (not store state).
- **Compute in each view**: Each view independently filters. Rejected because it duplicates logic and risks inconsistency between views.
- **RxJS observable pipeline**: Over-engineered for this use case. The project doesn't use RxJS.

**Key insight**: The `useBrowserFilter` hook takes the full `items` array and returns filtered items. Each view receives the filtered array as a prop. The hook subscribes to three store selectors: `metadataFilteredIds`, `viewport`, and `timeFilter`.

---

## R3: Spatial Intersection Algorithm — Bbox Overlap

**Decision**: Use axis-aligned bounding box (AABB) intersection test: two bboxes overlap if and only if no separating axis exists.

**Rationale**: The existing `bboxOverlapsViewport` utility in `shared/components/src/utils/bounds.ts` already implements this. The CatalogOverview uses it for timeline filtering. This feature reuses the same utility.

**Alternatives considered**:
- **Point-in-polygon**: More precise but exercises are represented as bounding boxes, not points. Unnecessary complexity.
- **PostGIS/Turf.js spatial operations**: Server-side or library-heavy. Violates offline-by-default and minimal-dependencies principles.

**Note**: The session store uses `ViewportPolygon` (4-corner polygon supporting rotated views) while the filter bar uses `Bounds` ([west, south, east, north]). The spatial filter utility must convert between these formats. For non-rotated views, extract the axis-aligned bounding box from the polygon corners.

---

## R4: Temporal Overlap Algorithm — Range Intersection

**Decision**: Two temporal ranges overlap if `start_a <= end_b AND start_b <= end_a`. Exercises with a single `datetime` (no range) are treated as zero-length ranges.

**Rationale**: Standard interval overlap test. The existing `computeTimeRange` utility in `shared/components/src/utils/timeline-helpers.ts` already parses exercise times. The temporal filter uses `TimeFilter` from the session store (`start: TimeInstant | null`, `end: TimeInstant | null`).

**Alternatives considered**:
- **Allen's interval algebra**: Full 13-relation model. Overkill — we only need "overlaps".
- **Epoch comparison only**: Would work but loses timezone awareness. Using `TimeInstant` (which has both `epoch` and `iso`) preserves formatting capability.

---

## R5: Debounce Strategy — Spatial vs Metadata vs Temporal

**Decision**:
- **Spatial (map viewport)**: 150ms debounce (already implemented in `CatalogOverview`'s `ViewportTracker`)
- **Metadata (filter bar)**: No debounce needed — filter bar emits on discrete user actions (add/remove lozenge), not continuous input
- **Temporal (timeline range)**: No debounce — range handles emit on drag end, which is already discrete

**Rationale**: Only the map viewport generates continuous events (moveend fires during pan/zoom). The 150ms debounce is already proven in `CatalogOverview`. Filter bar and timeline fire discrete events that don't need throttling.

**Alternative**: Debounce all axes uniformly at 100ms. Rejected because it adds latency to already-discrete events without benefit.

---

## R6: Handling Exercises Without Spatial or Temporal Data

**Decision**: Exercises missing an axis are excluded from that axis's filter but included in other axes. Specifically:
- No bbox → excluded from spatial filter, always passes spatial test
- No datetime/start/end → excluded from temporal filter, always passes temporal test

**Rationale**: Per spec FR-009 and FR-010. The current `CatalogOverview` already handles this pattern: "Items without bbox are always shown in the timeline" (line 167 of CatalogOverview.tsx).

**Implementation**: The filter composition returns an item if:
```
metadataPass(item) AND (item.bbox === null OR spatialPass(item)) AND (item.hasTime === false OR temporalPass(item))
```

---

## R7: CatalogOverview Migration Path

**Decision**: Create a new `StacBrowser` component that composes `FilterBar`, `ExerciseListView`, `MapView`, and `TimelineView`. Do not modify `CatalogOverview` — it continues to work for simple two-view (map + timeline) scenarios. The VS Code extension's browser panel will switch from `CatalogOverview` to `StacBrowser`.

**Rationale**: Replacing `CatalogOverview` in-place risks breaking existing consumers. A new component provides a clean boundary and makes the migration explicit.

**Alternatives considered**:
- **Extend CatalogOverview**: Add filter bar and list view to the existing component. Rejected because the component would become too complex (4 views + 3 filter axes + drag bar + split ratios).
- **Delete CatalogOverview**: Premature. Other features may still reference it. Deprecation can happen in a follow-up.
