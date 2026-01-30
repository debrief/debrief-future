# Data Model: 041 STAC Catalog Overview Panel

## Entities

### CatalogOverviewItem

Lightweight metadata extracted from a STAC `item.json` for display in the overview panel. No GeoJSON assets are loaded.

| Field | Type | Source | Required | Notes |
|-------|------|--------|----------|-------|
| id | string | `item.id` | yes | STAC item identifier |
| title | string | `item.properties.title` or `item.id` | yes | Display name; falls back to id |
| itemPath | string | relative path to `item.json` | yes | Used for navigation to plot view |
| bbox | `[number, number, number, number]` \| null | `item.bbox` | no | `[west, south, east, north]` in WGS84 |
| datetime | string \| null | `item.properties.datetime` | no | ISO 8601; single-instant items |
| startDatetime | string \| null | `item.properties.start_datetime` | no | ISO 8601; range start |
| endDatetime | string \| null | `item.properties.end_datetime` | no | ISO 8601; range end |

**Temporal resolution**:
- If `startDatetime` and `endDatetime` are present → render as a bar (range)
- Else if `datetime` is present → render as a point marker
- Else → render with "no time data" label

### CatalogOverview

Container for all items in a catalog, sent from the extension host to the webview.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | yes | Catalog identifier |
| title | string | yes | Catalog display name |
| storePath | string | yes | Absolute path to the STAC store root |
| items | CatalogOverviewItem[] | yes | All items in the catalog |

## Relationships

```
StacStore (existing)
  └── has many → Catalog (existing)
       └── has many → CatalogOverviewItem (new — read from item.json)
```

## State

The overview panel is stateless beyond:
- **Split ratio**: persisted to webview `localStorage` (ratio of map vs timeline height)
- **No selection state**: double-clicking an item navigates away; no persistent selection

## Validation Rules

- `bbox` must have exactly 4 numbers if present: `[west, south, east, north]`
- `west` ≤ `east`, `south` ≤ `north`
- Datetime strings must be valid ISO 8601 if present
- `startDatetime` ≤ `endDatetime` if both present
- Items failing validation are displayed with "invalid metadata" tooltip, not filtered out
