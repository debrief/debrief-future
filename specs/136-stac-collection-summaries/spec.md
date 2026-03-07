# Feature Specification: STAC Collection Summaries for Browser Backend

**Feature Branch**: `136-stac-collection-summaries`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: Promote Catalogs to Collections with auto-generated summaries (temporal range, spatial extent, extension field enumerations); enables efficient CQL2 filtering (requires #125)
**Traceability**: SRD action item BP-3 (docs/stac-browser-srd.md §13.3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Automatic Collection Summaries on Item Mutation (Priority: P1)

When an analyst saves a new plot or adds features to an existing plot, the parent catalog automatically updates its summaries to reflect the current aggregate state of all contained items. This eliminates the need for a separate "rebuild summaries" step and ensures that the Browser Discovery UI always has up-to-date metadata for filtering.

**Why this priority**: Without automatic summary generation, the Browser Discovery UI (#127–#134) cannot display accurate filter ranges or enumerations. Every UI filter component depends on Collection summaries to populate dropdowns (vessel classes, nationalities), set slider ranges (temporal extent), and compute spatial bounds (map viewport).

**Independent Test**: Create a catalog, add multiple items with varying properties (temporal ranges, bounding boxes, vessel classes), then read the catalog and verify that its summaries accurately reflect the aggregate of all contained items.

**Acceptance Scenarios**:

1. **Given** an empty catalog, **When** a new plot is created with a bounding box and temporal range, **Then** the catalog becomes a Collection with summaries matching that single item's spatial extent, temporal range, and extension properties.
2. **Given** a Collection containing 3 items, **When** a 4th item is added with a later end date and a new vessel class, **Then** the Collection summaries expand the temporal range and add the new vessel class to the enumeration, without re-reading the existing 3 items.
3. **Given** a Collection containing 5 items, **When** features are added to one item that expand its bounding box beyond the current Collection extent, **Then** the Collection's spatial extent is updated to include the new bounds.

---

### User Story 2 — Backwards-Compatible Catalog Loading (Priority: P2)

When the system encounters a pre-existing catalog that was created before Collection support was added, it continues to load and function correctly. On the next write operation, the catalog is silently promoted to a Collection with freshly computed summaries.

**Why this priority**: Existing STAC stores contain catalogs without summaries. The system must not break when opening them, ensuring a smooth transition with no manual migration required.

**Independent Test**: Load a catalog.json file with `type: "Catalog"` (no summaries), verify it loads without errors, then perform a write operation and verify it has been promoted to a Collection with correct summaries.

**Acceptance Scenarios**:

1. **Given** a pre-existing catalog.json with `type: "Catalog"` and no `summaries` field, **When** the system reads it, **Then** it loads successfully and all existing functionality (list plots, open plot, add features) continues to work.
2. **Given** a pre-existing catalog without summaries, **When** a new plot is created in it, **Then** the catalog is promoted to a Collection with summaries computed from all existing items plus the new one.
3. **Given** a Collection created by the new system, **When** it is opened by older code that only expects Catalogs, **Then** the `links` array and item references remain compatible (STAC Collections are a superset of Catalogs).

---

### User Story 3 — Summary Data Available for CQL2 Filter Validation (Priority: P3)

The CQL2 filter engine (#126) needs Collection summaries to validate filter ranges and populate filter UI elements. When a user opens the Browser Discovery UI, Collection summaries provide the min/max temporal range, the spatial envelope, and the list of filterable property values — all without loading individual items.

**Why this priority**: This is the primary consumer of summaries within E08. The filter bar (#127), map view (#130), and timeline (#131) all rely on summaries for range validation and UI population. However, this story is P3 because the summary data structure must be correct first (P1) and backwards compatibility established (P2).

**Independent Test**: Read a Collection's summaries and verify they contain the temporal range, spatial extent, and extension property enumerations needed by the CQL2 filter model.

**Acceptance Scenarios**:

1. **Given** a Collection with 10 items spanning 2020–2025 with bounding boxes across the North Atlantic, **When** the CQL2 filter engine reads the summaries, **Then** it can determine the valid temporal filter range (2020–2025) and spatial filter bounds without loading any individual items.
2. **Given** a Collection with items tagged with 5 distinct vessel classes, **When** the filter bar UI requests the list of available vessel classes, **Then** it receives exactly those 5 classes from the Collection summaries.
3. **Given** a Collection with items spanning 3 distinct nationalities, **When** the filter bar UI requests available nationalities, **Then** it receives exactly those 3 values from the summaries.

---

### User Story 4 — Summary Accuracy After Item Deletion (Priority: P4)

When an item is removed from a Collection, the summaries must be recalculated to reflect the remaining items. Unlike additions (which can be merged incrementally), deletions may shrink the temporal range or spatial extent, requiring a recomputation from remaining items.

**Why this priority**: Deletion is less frequent than creation in typical analyst workflows, but incorrect summaries after deletion would cause filter ranges to be misleadingly wide.

**Independent Test**: Create a Collection with 3 items where one item defines the maximum temporal extent, delete that item, and verify summaries contract to match the remaining items.

**Acceptance Scenarios**:

1. **Given** a Collection with 3 items where item A has the latest end date, **When** item A is deleted, **Then** the Collection's temporal range contracts to match the remaining items' extent.
2. **Given** a Collection with 3 items where item B has a unique vessel class, **When** item B is deleted, **Then** that vessel class is removed from the summaries enumeration.
3. **Given** a Collection reduced to zero items after all deletions, **When** the summaries are read, **Then** temporal range and spatial extent are absent (null/empty) and property enumerations are empty arrays.

---

### Edge Cases

- What happens when an item has no bounding box (null geometry, e.g. a plot with only system-kind features)? The item is excluded from the spatial extent calculation; Collection bbox reflects only items with valid geometry.
- What happens when an item has `datetime` but no `start_datetime`/`end_datetime`? The single datetime is used as both start and end for temporal range calculations.
- What happens when two items have identical temporal ranges? The summary temporal range remains unchanged; no duplicate processing occurs.
- What happens when extension properties are missing from an item (pre-#125 items without `debrief:` properties)? The item contributes nothing to extension property enumerations; it does not cause errors.
- What happens when the catalog.json file is manually edited and summaries become stale? The system does not detect staleness automatically; the next write operation will update summaries incrementally from the current state. A full rebuild can be triggered explicitly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST promote a Catalog to a Collection by changing `type` from `"Catalog"` to `"Collection"` and adding `extent` and `summaries` fields when the first item with spatial or temporal data is written.
- **FR-002**: The Collection `extent.spatial.bbox` MUST contain the union bounding box of all contained items' bounding boxes, as a single `[west, south, east, north]` array.
- **FR-003**: The Collection `extent.temporal.interval` MUST contain a single `[start, end]` interval representing the earliest start datetime and latest end datetime across all items.
- **FR-004**: The Collection `summaries` MUST include enumeration arrays for each extension property defined by #125 (vessel classes, nationalities, tags, track names) containing the distinct values across all items.
- **FR-005**: When a new item is created, the parent Collection's summaries MUST be updated to incorporate the new item's properties without re-reading all existing items.
- **FR-006**: When features are added to an item, and the item's bounding box or temporal range expands, the parent Collection's summaries MUST be updated to reflect the expanded extent.
- **FR-007**: When an item is deleted, the system MUST recompute summaries from all remaining items, since deletions can contract ranges that cannot be updated incrementally.
- **FR-008**: The system MUST load pre-existing catalog.json files that have `type: "Catalog"` and no summaries, without errors.
- **FR-009**: When a write operation occurs on a pre-existing Catalog (without summaries), the system MUST compute summaries from all contained items (full scan) and persist the promoted Collection.
- **FR-010**: The Collection MUST retain all existing link relations (`root`, `self`, `child`, `item`) and remain structurally compatible with consumers that expect Catalog-shaped JSON.
- **FR-011**: The summaries MUST NOT include values from items that have null or missing extension properties; only non-null values contribute to enumerations.
- **FR-012**: The promoted Collection MUST conform to the STAC 1.0.0 Collection specification, including required fields: `type`, `stac_version`, `id`, `description`, `links`, `extent`, `license`.
- **FR-013**: The `license` field MUST default to `"proprietary"` for Debrief Collections, as the data is user-owned maritime analysis.

### Key Entities

- **STAC Collection**: An extension of STAC Catalog that adds `extent` (spatial and temporal bounds) and `summaries` (aggregated property values). Replaces the root Catalog when items are present.
- **Extent**: Spatial and temporal bounds of a Collection. Spatial is a bounding box; temporal is a datetime interval. Both are computed from contained items.
- **Summaries**: Pre-aggregated distinct values for extension properties (vessel classes, nationalities, tags, track names). Enables filter UI population without loading individual items.
- **Collection Promotion**: The process of upgrading a `type: "Catalog"` to `type: "Collection"` by adding extent and summaries. Triggered automatically on write operations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All catalogs containing at least one item with spatial or temporal data are valid STAC 1.0.0 Collections, passing validation against the STAC Collection specification.
- **SC-002**: Adding a new item to a Collection with N existing items updates summaries without reading more than the new item and the current Collection metadata (O(1) reads for additions, not O(N)).
- **SC-003**: The CQL2 filter engine can determine valid filter ranges for temporal, spatial, and all extension properties by reading only the Collection summaries — zero individual items loaded for range/enumeration queries.
- **SC-004**: Pre-existing catalogs without summaries continue to load and function correctly, with promotion occurring transparently on the next write operation.
- **SC-005**: After any sequence of item additions and deletions, the Collection summaries accurately reflect the aggregate state of all remaining items, with no stale or phantom values.
- **SC-006**: Summary updates on item creation complete within the same operation, adding no perceptible delay to existing save workflows.

## Assumptions

- The STAC Extension properties from #125 define which fields appear in `summaries`. This spec assumes `debrief:vessel_classes`, `debrief:nationalities`, `debrief:tags`, and `debrief:track_names` as the extension properties, consistent with the #125 spec.
- The `license` field uses `"proprietary"` as a reasonable default for user-owned maritime analysis data. No formal licensing workflow is needed.
- Incremental summary updates for additions are achieved by merging the new item's values with existing summaries (union for enumerations, min/max for ranges). Full recomputation is only needed on deletions.
- A single flat Collection per catalog root is sufficient for the initial implementation. Nested Collection hierarchies (sub-collections) are out of scope.
- The TypeScript consumer (VS Code extension, web-shell) reads summaries from the Collection JSON but does not modify them directly; all summary mutations happen through the Python service layer.
- Items without spatial data (null bbox) or temporal data (null datetime) are valid Collection members but do not contribute to the corresponding extent fields.

## Dependencies

- **#125 — STAC Extension spec + mock data fixtures**: Defines the extension property names and types that appear in Collection summaries. Must be completed before this feature can enumerate extension properties.
