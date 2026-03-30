# Storage Contract: Thumbnail Assets

**Feature**: 174-thumbnail-capture
**Date**: 2026-03-29

## Python API

### `store_thumbnail()`

**Module**: `debrief_stac.thumbnails`

```python
def store_thumbnail(
    catalog_path: CatalogPath,
    plot_id: str,
    large_png: bytes,
    small_png: bytes,
) -> dict:
    """Write thumbnail PNG files and update STAC item metadata.

    Args:
        catalog_path: Path to the catalog directory.
        plot_id: ID of the plot (STAC item).
        large_png: Raw PNG bytes for 800x600 thumbnail.
        small_png: Raw PNG bytes for 200x150 thumbnail.

    Returns:
        Updated STAC Item dict with new thumbnail asset entries.

    Raises:
        PlotNotFoundError: If the plot doesn't exist.
    """
```

### File Layout

```
{catalog_path}/{plot_id}/
├── item.json           # Updated with thumbnail asset entries
├── thumbnail.png       # 800x600 large thumbnail
├── thumbnail-sm.png    # 200x150 small thumbnail
├── features.geojson
├── assets/
└── results/
```

### STAC Asset Entries

Added to `item["assets"]`:

```json
{
  "thumbnail": {
    "href": "./thumbnail.png",
    "type": "image/png",
    "title": "Plot thumbnail",
    "roles": ["thumbnail"]
  },
  "thumbnail-sm": {
    "href": "./thumbnail-sm.png",
    "type": "image/png",
    "title": "Plot thumbnail (small)",
    "roles": ["thumbnail"]
  }
}
```

### Behavior

- **Idempotent**: Calling `store_thumbnail()` multiple times overwrites both files and asset entries.
- **Atomic per file**: Each PNG is written completely before the next. `item.json` is updated last.
- **No provenance links**: Thumbnails are display artifacts, not analysis results. No `derived_from` links are added.
- **No validation of PNG content**: The function writes raw bytes as-is. Callers are responsible for providing valid PNG data.

## TypeScript Consumption

### Discovering Thumbnail Assets

```typescript
// In stacService.ts listItems():
const thumbnailAsset = Object.entries(item.assets).find(
  ([_key, asset]) => asset.roles?.includes('thumbnail') && !asset.href.includes('-sm')
);
const thumbnailSmAsset = Object.entries(item.assets).find(
  ([_key, asset]) => asset.roles?.includes('thumbnail') && asset.href.includes('-sm')
);
```

### Resolving File Paths

Thumbnail hrefs are relative to the item directory. To resolve to an absolute path:

```typescript
const itemDir = path.dirname(itemPath);  // e.g., "exercises/alpha"
const thumbnailPath = path.join(storeRoot, itemDir, 'thumbnail.png');
```
