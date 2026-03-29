# Data Model: Thumbnail Capture and Gallery Preview

**Feature**: 174-thumbnail-capture
**Date**: 2026-03-29

## Entities

### Thumbnail Asset (STAC Item Extension)

Two new assets added to the STAC item's `assets` dictionary:

| Asset Key | Href | Type | Title | Roles | Dimensions |
|-----------|------|------|-------|-------|------------|
| `thumbnail` | `./thumbnail.png` | `image/png` | Plot thumbnail | `["thumbnail"]` | 800x600 px |
| `thumbnail-sm` | `./thumbnail-sm.png` | `image/png` | Plot thumbnail (small) | `["thumbnail"]` | 200x150 px |

Both assets follow the STAC specification's standard `"thumbnail"` role convention.

**Example STAC Item assets section** (after thumbnail capture):

```json
{
  "assets": {
    "source-exercise-data": {
      "href": "./assets/exercise.rep",
      "type": "application/octet-stream",
      "title": "exercise.rep",
      "roles": ["source"]
    },
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
}
```

### CatalogOverviewItem (TypeScript Extension)

Two new optional fields added to `CatalogOverviewItem` in `shared/components/src/filter-engine/types.ts`:

| Field | Type | Description |
|-------|------|-------------|
| `thumbnailHref` | `string \| null` | Relative path to large thumbnail PNG (800x600). Resolved relative to store root. |
| `thumbnailSmHref` | `string \| null` | Relative path to small thumbnail PNG (200x150). Resolved relative to store root. |

These fields propagate to `StacBrowserItem` and `ExerciseListItem` which extend `CatalogOverviewItem`.

### Thumbnail Capture Message (Webview Protocol)

New request/response pair for the VS Code webview message protocol:

**Request** (Extension → Webview):
```typescript
interface RequestThumbnailCaptureMessage {
  type: 'requestThumbnailCapture';
  requestId: string;  // Correlation ID
}
```

**Response** (Webview → Extension):
```typescript
interface ThumbnailCaptureResponseMessage {
  type: 'thumbnailCaptureResponse';
  requestId: string;
  largePngBase64: string | null;  // 800x600 PNG as base64, null on failure
  smallPngBase64: string | null;  // 200x150 PNG as base64, null on failure
  error?: string;                 // Error message if capture failed
}
```

## State Transitions

### Thumbnail Lifecycle

```
[No Thumbnail] ──(Save plot)──> [Thumbnail Exists]
[Thumbnail Exists] ──(Save plot again)──> [Thumbnail Updated] (overwrite)
[Thumbnail Exists] ──(Run backfill)──> [Thumbnail Updated] (overwrite)
```

Thumbnails have no independent lifecycle — they are always derived from the current map state at save time. There is no "delete thumbnail" operation; thumbnails are always overwritten on re-save.

### Preview Pane Selection State

```
[No Selection] ──(click item)──> [Item Selected, Preview Shown]
[Item Selected] ──(click next/→)──> [Next Item Selected]
[Item Selected] ──(click prev/←)──> [Previous Item Selected]
[Item Selected] ──(filter changes, item still in set)──> [Same Item Selected]
[Item Selected] ──(filter changes, item removed from set)──> [First Filtered Item Selected]
[Item Selected] ──(double-click item)──> [Plot Opens in Analysis View]
```

## Validation Rules

- Thumbnail PNG files MUST be valid PNG format (magic bytes: `\x89PNG\r\n\x1a\n`)
- Large thumbnail MUST be 800x600 pixels
- Small thumbnail MUST be 200x150 pixels
- Asset hrefs MUST be relative paths starting with `./`
- Asset roles MUST include `"thumbnail"` (STAC convention)
- Asset type MUST be `"image/png"`

## Scale Assumptions

- Typical catalog: 50-200 plots
- Thumbnail file sizes: ~100-300KB for large PNG, ~10-30KB for small PNG
- Total storage per plot: ~150-350KB additional for thumbnails
- Total catalog overhead: ~7-70MB for thumbnails across entire catalog
- Gallery preview loads one image at a time (no pre-fetching needed at this scale)
