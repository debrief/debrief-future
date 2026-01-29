# Data Model: Save Analysis Results to STAC

**Feature**: #040 Save Analysis Results to STAC
**Date**: 2026-01-29

## Entities

### Result Item (STAC Item)

A STAC Item representing a persisted calc tool result.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Execution ID (UUID) from the tool run |
| type | "Feature" | STAC required |
| stac_version | "1.0.0" | STAC required |
| geometry | GeoJSON Geometry / null | Bounding polygon of result features |
| bbox | [number, number, number, number] / null | Bounding box of result features |
| properties.title | string | Auto-generated: "{tool_name}: {source_names}" |
| properties.datetime | string (ISO 8601) | Execution timestamp |
| properties.debrief:kind | "calc-result" | Discriminator for result items |
| properties.debrief:tool | string | Tool identifier (e.g., "range-bearing") |
| properties.debrief:tool_version | string | Tool version |
| properties.debrief:parameters | object | Tool parameters used |
| properties.debrief:duration_ms | number | Execution duration in milliseconds |
| links[] | Link[] | Standard STAC links + derived_from links |
| assets.features | Asset | GeoJSON FeatureCollection of result features |

### Provenance Link (STAC Link)

A link from a Result Item to a source STAC Item.

| Field | Type | Description |
|-------|------|-------------|
| rel | "derived_from" | STAC link relation type |
| href | string | Relative path to source item (e.g., "../plot-id/item.json") |
| type | "application/geo+json" | Media type |
| title | string | Source item title or ID |

### Result Asset (STAC Asset)

The GeoJSON FeatureCollection stored within a Result Item.

| Field | Type | Description |
|-------|------|-------------|
| href | "./features.geojson" | Relative path to asset file |
| type | "application/geo+json" | Media type |
| title | "Result Features" | Asset title |
| roles | ["data"] | Asset role |

### Extended ToolProvenance (TypeScript)

Extension to existing `ToolProvenance` interface to include source item IDs.

| Field | Type | Description |
|-------|------|-------------|
| toolId | string | Tool identifier |
| toolName | string | Tool display name |
| toolVersion | string | Tool version |
| executionTime | string (ISO 8601) | Execution timestamp |
| sourceFeatureIds | string[] | Source feature IDs (existing) |
| **sourceItemIds** | **string[]** | **NEW: Source STAC Item IDs** |
| durationMs | number | Execution duration |

### Extended ResultLayer (TypeScript)

Extension to existing `ResultLayer` interface to track save state.

| Field | Type | Description |
|-------|------|-------------|
| savedItemId | string / undefined | **NEW: Set when result is saved to STAC** |

## Relationships

```
ResultItem ──derived_from──► SourceItem (1:N)
ResultItem ──has_asset──► ResultAsset (1:1)
ResultLayer ──persisted_as──► ResultItem (1:0..1)
```

## State Transitions

```
ResultLayer:
  [transient] ──save──► [saved]
  [saved] ──save──► [saved] (no-op, idempotent)
```

## Validation Rules

1. `debrief:kind` MUST be `"calc-result"` for result items
2. At least one `derived_from` link MUST exist (results always have sources)
3. `debrief:tool` and `debrief:tool_version` MUST be non-empty strings
4. `features.geojson` asset MUST be valid GeoJSON FeatureCollection
5. Each feature in the collection MUST have `properties.provenance` metadata
