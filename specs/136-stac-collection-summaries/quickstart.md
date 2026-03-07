# Quickstart: STAC Collection Summaries

**Feature**: 136-stac-collection-summaries

## What This Feature Does

Automatically promotes STAC Catalogs to Collections with pre-aggregated summaries when items are added. This provides the Browser Discovery UI with efficient access to filter ranges and property enumerations without loading individual items.

## Before (Current)

```json
{
  "type": "Catalog",
  "stac_version": "1.0.0",
  "id": "my-analysis",
  "description": "Debrief analysis catalog",
  "links": [
    {"rel": "root", "href": "./catalog.json"},
    {"rel": "self", "href": "./catalog.json"},
    {"rel": "item", "href": "./plot-001/item.json"}
  ]
}
```

No aggregate metadata. To determine the temporal range or available vessel classes, every item must be loaded individually.

## After (With This Feature)

```json
{
  "type": "Collection",
  "stac_version": "1.0.0",
  "id": "my-analysis",
  "description": "Debrief analysis catalog",
  "license": "proprietary",
  "extent": {
    "spatial": {
      "bbox": [[-5.5, 49.0, 2.0, 58.5]]
    },
    "temporal": {
      "interval": [["2024-01-15T08:00:00Z", "2024-03-20T16:30:00Z"]]
    }
  },
  "summaries": {
    "debrief:vessel_classes": ["surface/warship/frigate/type23", "subsurface/submarine/ssn/astute"],
    "debrief:tags": ["exercise", "training", "atlantic"],
    "debrief:feature_tags": ["checkpoint-alpha", "patrol-zone"],
    "debrief:track_names": ["HMS Defender", "HMS Astute"],
    "debrief:nationalities": ["GB", "US"]
  },
  "links": [
    {"rel": "root", "href": "./catalog.json"},
    {"rel": "self", "href": "./catalog.json"},
    {"rel": "item", "href": "./plot-001/item.json"},
    {"rel": "item", "href": "./plot-002/item.json"}
  ]
}
```

Filter bar can populate dropdowns and ranges directly from Collection metadata. Zero individual items loaded.

## How It Works

### 1. Automatic Promotion

Creating a plot with temporal/spatial data triggers promotion:

```python
# This already exists — no API changes needed
metadata = PlotMetadata(title="Day 1 Analysis")
plot_id = create_plot("/data/catalog", metadata)
# catalog.json is now type: "Collection" with extent and summaries
```

### 2. Incremental Updates

Adding features to an item incrementally updates summaries:

```python
# This already exists — summary update happens internally
add_features("/data/catalog", plot_id, features)
# Collection summaries expanded to include new bbox and properties
```

### 3. Reading Summaries

TypeScript consumers read summaries from the Collection JSON:

```typescript
const catalog = await stacService.loadCatalog(storePath);
if (catalog.type === 'Collection' && catalog.summaries) {
  const vesselClasses = catalog.summaries['debrief:vessel_classes'];
  const temporalRange = catalog.extent.temporal.interval[0];
  // Populate filter bar directly
}
```

### 4. Backwards Compatibility

Pre-existing catalogs continue to work:

```python
# Old catalog.json with type: "Catalog" loads fine
catalog = open_catalog("/data/old-catalog")
# On next write, it's automatically promoted
create_plot("/data/old-catalog", metadata)
# Now it's a Collection with summaries
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Update strategy | Incremental for adds, full scan for deletes | O(1) for common case (adds), O(N) only for rare case (deletes) |
| Promotion trigger | First write with temporal/spatial data | Empty catalogs stay as Catalogs; Collections always have valid extents |
| License default | `"proprietary"` | User-owned maritime analysis data |
| Summary format | Array enumerations | Aligns with CQL2 filter engine consumption pattern |
