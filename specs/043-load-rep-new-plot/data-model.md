# Data Model: 043 - Load REP Files into New Plot

## Entities

### StacItem (created by this feature)

The new STAC Item written to `{storePath}/{itemId}/item.json`:

```json
{
  "type": "Feature",
  "stac_version": "1.0.0",
  "id": "<uuid>",
  "geometry": null,
  "bbox": [minLon, minLat, maxLon, maxLat],
  "properties": {
    "title": "<user-provided title>",
    "datetime": null,
    "start_datetime": "<earliest track point ISO>",
    "end_datetime": "<latest track point ISO>",
    "created": "<ISO timestamp of creation>"
  },
  "links": [
    { "rel": "root", "href": "../catalog.json", "type": "application/json" },
    { "rel": "parent", "href": "../catalog.json", "type": "application/json" },
    { "rel": "self", "href": "./item.json", "type": "application/json" }
  ],
  "assets": {
    "<itemId>": {
      "href": "./<itemId>.geojson",
      "type": "application/geo+json",
      "title": "Plot data",
      "roles": ["data"]
    },
    "<rep-filename>": {
      "href": "./assets/<rep-filename>.rep",
      "type": "text/plain",
      "title": "<rep-filename>.rep",
      "roles": ["source"]
    }
  }
}
```

### CatalogLink (added to catalog.json)

```json
{
  "rel": "item",
  "href": "./<itemId>/item.json",
  "type": "application/json",
  "title": "<user-provided title>"
}
```

### GeoJSON FeatureCollection (written as data asset)

```json
{
  "type": "FeatureCollection",
  "features": [
    // Merged features from all parsed REP files
    // Each feature retains its original properties (track name, platform, etc.)
  ]
}
```

## Folder Structure (created)

```
{storePath}/
  catalog.json              ← updated with new item link
  {itemId}/                 ← new folder
    item.json               ← STAC Item metadata
    {itemId}.geojson        ← merged GeoJSON data
    assets/                 ← source file copies
      file1.rep
      file2.rep
```

## TypeScript Interfaces

### CreateItemOptions (new)

```typescript
interface CreateItemOptions {
  title: string;
  id?: string;  // auto-generated UUID if omitted
}

interface CreateItemResult {
  itemPath: string;  // relative path: "{itemId}/item.json"
  itemId: string;    // the generated or provided ID
}
```

### QuickPickItem extension (modified)

```typescript
interface ImportPickItem extends vscode.QuickPickItem {
  storeId: string;
  itemPath?: string;      // undefined = "new plot" option
  storePath?: string;     // set for "new plot" options
  kind?: 'newPlot' | 'existingPlot';
}
```

## State Transitions

```
No item exists
  → createItem() called
    → item.json written (bbox: null, no assets, no data)
      → REP files parsed (no state change)
        → addFeatures() called
          → GeoJSON written, bbox updated
            → addAsset() called (per file)
              → .rep copied to assets/, asset registered in item.json
                → Item complete and visible in tree view
```

## Validation Rules

| Field | Rule |
|-------|------|
| title | Non-empty string; whitespace-only rejected |
| id | Valid filesystem directory name (auto-generated UUID satisfies this) |
| bbox | Computed from merged GeoJSON; null if no spatial data |
| start_datetime | Earliest datetime across all parsed features; null if no temporal data |
| end_datetime | Latest datetime across all parsed features; null if no temporal data |
