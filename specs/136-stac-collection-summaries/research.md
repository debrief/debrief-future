# Research: STAC Collection Summaries for Browser Backend

**Feature**: 136-stac-collection-summaries
**Date**: 2026-03-06

## R1: STAC Collection vs Catalog Structure

**Decision**: Promote Catalogs to Collections by changing `type`, adding `extent`, `summaries`, and `license` fields.

**Rationale**: STAC Collections are a superset of Catalogs. The STAC 1.0.0 spec defines Collections as Catalogs with additional metadata: `extent` (required), `summaries` (strongly recommended), and `license` (required). Existing Catalog consumers that only read `links`, `id`, `description` continue to work because those fields are unchanged.

**Alternatives considered**:
- Separate Collection JSON alongside catalog.json — rejected as it duplicates structure and creates sync issues
- Always use Collections from catalog creation — rejected because empty catalogs (no items) don't have meaningful extents

## R2: Extent Object Structure

**Decision**: Use standard STAC extent structure with single bbox and single interval:

```json
{
  "extent": {
    "spatial": {
      "bbox": [[-180, -90, 180, 90]]
    },
    "temporal": {
      "interval": [["2020-01-01T00:00:00Z", "2026-03-06T00:00:00Z"]]
    }
  }
}
```

**Rationale**: The STAC spec requires `bbox` as `number[][]` (array of arrays) where the first entry describes overall spatial extent. Similarly, `interval` is `(string|null)[][]`. Single-entry arrays suffice for our use case (one contiguous collection per catalog root).

**Alternatives considered**:
- Multiple bbox entries for distinct geographic clusters — deferred; single overall bbox is sufficient for initial implementation
- Null end dates for open-ended collections — supported when no items have end dates

## R3: Summaries Structure for Extension Properties

**Decision**: Use array-type summaries for extension properties (enumerations of distinct values):

```json
{
  "summaries": {
    "debrief:vessel_classes": ["surface/warship/frigate/type23", "subsurface/submarine/ssn/astute"],
    "debrief:tags": ["exercise", "analysis", "operational"],
    "debrief:feature_tags": ["checkpoint", "patrol-area"],
    "debrief:track_names": ["HMS Defender", "USS Winston Churchill"],
    "debrief:nationalities": ["GB", "US", "FR"]
  }
}
```

**Rationale**: The STAC summaries spec supports three formats: arrays (for enumerations), Range Objects (for min/max), and JSON Schema objects. Array-type summaries align with how the CQL2 filter engine (#126) and filter bar UI (#127) will consume these values — as dropdown/checkbox options. Temporal and spatial ranges are already captured in `extent`.

**Alternatives considered**:
- Range objects for temporal/spatial — already covered by `extent`, no need to duplicate
- JSON Schema objects for type validation — over-engineered for enumeration use case

## R4: Incremental vs Full Recomputation

**Decision**: Incremental updates for additions (merge new values); full recomputation for deletions.

**Rationale**:
- **Additions**: New item's values can be merged with existing summaries — union for arrays, min/max expansion for extents. This avoids O(N) item reads on every add.
- **Deletions**: Cannot incrementally shrink ranges or remove enumeration values without knowing which items contributed them. Full scan of remaining items is necessary. Deletions are infrequent in analyst workflows.

**Alternatives considered**:
- Reference counting per summary value — tracks which items contribute each value, enabling incremental deletion. Rejected as premature complexity; requires additional metadata storage and introduces sync risk.
- Always full recomputation — simple but O(N) on every add. Unacceptable for large catalogs.

## R5: Promotion Trigger

**Decision**: Promote Catalog → Collection on the first write operation that provides spatial or temporal data. Specifically:
- `create_plot` promotes if the new item has a datetime
- `add_features` promotes if bbox is computed from the added features

**Rationale**: An empty catalog has no meaningful extent to summarise. Promotion on first meaningful data ensures the Collection always has valid extent fields. Pre-existing catalogs without summaries are promoted lazily on next write.

**Alternatives considered**:
- Always create as Collection — rejected because an empty Collection would need null/empty extent fields, which doesn't conform to STAC spec requirements
- Explicit promote command — rejected because manual steps violate the "automatic summaries" requirement

## R6: Backwards Compatibility Strategy

**Decision**: Three-layer compatibility:
1. `open_catalog()` accepts both `type: "Catalog"` and `type: "Collection"` transparently
2. On write to a Catalog (no summaries), perform full scan of existing items and promote
3. Promoted Collections retain all existing link structures

**Rationale**: The STAC spec defines Collections as a superset of Catalogs. TypeScript consumers using `StacCatalog` interface can read Collections because all Catalog fields are present. The `type` field changes from `"Catalog"` to `"Collection"` but consumers should handle this gracefully.

**Alternatives considered**:
- Migration script to convert all existing catalogs — rejected; lazy promotion is more robust and doesn't require coordination

## R7: License Field Default

**Decision**: Default to `"proprietary"` for all Debrief Collections.

**Rationale**: The STAC spec requires the `license` field in Collections. Debrief data is user-owned maritime analysis — not open data. The SPDX identifier `"proprietary"` is the standard way to indicate non-open data in STAC.

**Alternatives considered**:
- Configurable license per catalog — deferred; can be added later if needed
- `"other"` — less descriptive than `"proprietary"`

## R8: Mutation Hook Architecture

**Decision**: Implement summary updates as an internal function `_update_collection_summaries()` called from `create_plot()`, `add_features()`, `update_features()`, and `delete_features()`. For deletions, call `_rebuild_collection_summaries()` which performs a full scan.

**Rationale**: Keeping summary updates inside the existing module functions ensures they're always called. No external hooks or event systems needed. The catalog module already has `_save_catalog()` as the write path — summary updates happen just before save.

**Alternatives considered**:
- Event/observer pattern — over-engineered for synchronous file operations
- Decorator approach — harder to understand data flow
- Separate "summary service" — violates single-module principle for catalog operations
