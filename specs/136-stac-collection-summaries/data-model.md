# Data Model: STAC Collection Summaries

**Feature**: 136-stac-collection-summaries
**Date**: 2026-03-06

## Entity: STACCollection

A STAC Collection extends a Catalog with spatial/temporal extents and property summaries. Stored as `catalog.json` (replacing the Catalog when items are present).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"Collection"` | Yes | Changed from `"Catalog"` on promotion |
| `stac_version` | `"1.0.0"` | Yes | Unchanged from Catalog |
| `id` | `string` | Yes | Unchanged from Catalog |
| `description` | `string` | Yes | Unchanged from Catalog |
| `title` | `string` | No | Unchanged from Catalog |
| `license` | `string` | Yes | Default: `"proprietary"`. Added on promotion. |
| `extent` | `Extent` | Yes | Computed from contained items. Added on promotion. |
| `summaries` | `Summaries` | No | Computed from contained items. Added on promotion. |
| `links` | `StacLink[]` | Yes | Unchanged from Catalog |

### Promotion Rules

1. A Catalog becomes a Collection when the first item with `datetime` or `bbox` is written
2. The `type` field changes from `"Catalog"` to `"Collection"`
3. `license`, `extent`, and `summaries` are added
4. All existing fields (`id`, `description`, `title`, `links`) are preserved unchanged

## Entity: Extent

Spatial and temporal bounds of a Collection, computed from all contained items.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `spatial.bbox` | `number[][]` | Yes | Single entry: `[[west, south, east, north]]`. Union of all item bboxes. |
| `temporal.interval` | `(string\|null)[][]` | Yes | Single entry: `[["<earliest>", "<latest>"]]`. Min start, max end across items. |

### Computation Rules

- **Spatial**: `west = min(all item west)`, `south = min(all item south)`, etc.
- **Temporal**: `start = min(all item start_datetime or datetime)`, `end = max(all item end_datetime or datetime)`
- Items with `null` bbox are excluded from spatial computation
- Items with `null` datetime are excluded from temporal computation
- If all items lack bbox: `spatial.bbox` = `[[-180, -90, 180, 90]]` (global fallback)
- If all items lack datetime: `temporal.interval` = `[[null, null]]`

## Entity: Summaries

Pre-aggregated distinct values for extension properties. Computed from all contained items.

| Field | Type | Notes |
|-------|------|-------|
| `debrief:vessel_classes` | `string[]` | Distinct vessel class paths across all items |
| `debrief:tags` | `string[]` | Distinct plot-level tags across all items |
| `debrief:feature_tags` | `string[]` | Distinct feature-level tags across all items |
| `debrief:track_names` | `string[]` | Distinct track names across all items |
| `debrief:nationalities` | `string[]` | Distinct nationality codes across all items |

### Computation Rules

- Each array is the union of values from all items' corresponding `item.properties` fields
- Arrays are sorted alphabetically for deterministic output
- Empty arrays are included (not omitted) when no items have that property
- Items missing a property (pre-#125 items) contribute nothing to that summary

### Incremental Update (Additions)

When an item is added or modified:
```
summaries[field] = sorted(set(summaries[field]) | set(item.properties[field]))
extent.spatial.bbox = union_bbox(extent.spatial.bbox, item.bbox)
extent.temporal.interval = [min(start, item.start), max(end, item.end)]
```

### Full Recomputation (Deletions / Promotion)

When an item is deleted or a Catalog is first promoted:
```
for each remaining item:
    merge item properties into fresh summaries
    expand extent to include item
```

## Entity: STACCollection (TypeScript)

TypeScript consumer interface for the VS Code extension and web-shell.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `'Catalog' \| 'Collection'` | Yes | Discriminated union with existing StacCatalog |
| `stac_version` | `string` | Yes | |
| `id` | `string` | Yes | |
| `description` | `string` | Yes | |
| `title` | `string` | No | |
| `license` | `string` | No | Present only on Collections |
| `extent` | `StacExtent` | No | Present only on Collections |
| `summaries` | `StacSummaries` | No | Present only on Collections |
| `links` | `StacLink[]` | Yes | |

### Relationship to Existing Types

- The existing `StacCatalog` interface (`type: 'Catalog'`) remains unchanged for backwards compatibility
- A new `StacCollection` interface adds `extent`, `summaries`, `license`
- A union type `StacCatalogOrCollection = StacCatalog | StacCollection` handles both cases
- The existing `Catalog` interface (used in tree views) gains optional `summaries` for filter bar consumption
