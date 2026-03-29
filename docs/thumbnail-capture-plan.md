# Thumbnail Capture for STAC Catalog Browser

## Context

The STAC Catalog Browser (StacBrowser component) has placeholder space for thumbnails, but they're blank because no thumbnails have been captured. Currently, `SpatialThumbnail` renders ephemeral SVG track geometry client-side — nothing is persisted to disk and there are no thumbnail assets in STAC items.

This feature adds:
1. **Thumbnail capture on Save** — when a user saves a plot, capture the Leaflet map as a PNG screenshot, downscale it, and store both sizes as STAC assets
2. **Gallery preview pane** — split view in the catalog browser with a large thumbnail preview panel and prev/next navigation
3. **Playwright backfill script** — CLI tool to regenerate all thumbnails by opening each plot in the web-shell (run locally with tile access)

### Thumbnail Specs
- **Large**: 800x600 PNG (Leaflet map with basemap tiles, track styling, labels)
- **Small**: 200x150 PNG (downscaled from large)
- **Storage**: Inside STAC item directory as `./thumbnail.png` (large) and `./thumbnail-sm.png` (small)
- **STAC roles**: `"thumbnail"` (standard STAC convention)
- **Basemap**: Required — thumbnails must show map tiles for land/sea context

---

## Phase 1: STAC Data Model & Storage Layer

### 1A. Python thumbnail storage function
**Create**: `services/stac/src/debrief_stac/thumbnails.py`

Follow the pattern in `services/stac/src/debrief_stac/artifacts.py` (uses `read_plot()` / `_save_plot()` from `plot.py`):

```python
def store_thumbnail(
    catalog_path: CatalogPath,
    plot_id: str,
    large_png: bytes,   # 800x600
    small_png: bytes,    # 200x150
) -> dict:
```

- Writes `thumbnail.png` and `thumbnail-sm.png` to item directory root (not `./results/`)
- Adds assets to item.json with keys `"thumbnail"` and `"thumbnail-sm"`, role `["thumbnail"]`, type `"image/png"`
- Returns updated STAC item dict

### 1B. Add `thumbnailHref` to CatalogOverviewItem
**Modify**: `shared/components/src/filter-engine/types.ts` (line ~47)

Add to `CatalogOverviewItem`:
```typescript
/** Relative path to small thumbnail PNG, if available */
thumbnailSmHref?: string | null;
/** Relative path to large thumbnail PNG, if available */
thumbnailHref?: string | null;
```

This propagates to `StacBrowserItem` and `ExerciseListItem` which extend it.

### 1C. Update stacService to extract thumbnail hrefs
**Modify**: `apps/vscode/src/services/stacService.ts` — in `listItems()`, extract assets with `"thumbnail"` role and populate the new fields.

### 1D. Update web-shell mock stac service
**Modify**: `apps/web-shell/src/mocks/stacService.ts` — in `toOverviewItem()`, read thumbnail asset hrefs from item data.

### 1E. Python tests
**Create**: `services/stac/tests/test_thumbnails.py` — test store, overwrite, and item.json asset entries.

---

## Phase 2: In-App Capture on Save

### Capture Mechanism: `leaflet-image`

| Approach | Verdict |
|----------|---------|
| `canvas.toDataURL()` | Only gets overlay canvas, NOT basemap tiles |
| `html2canvas` | Cross-origin tile issues, heavy dependency |
| `dom-to-image` | Same cross-origin problems |
| **`leaflet-image`** | **Built for Leaflet, handles tile compositing** |

`leaflet-image` composites all tile and overlay layers onto a single canvas. For cross-origin tiles (OSM), we may need `crossOrigin: 'anonymous'` on the TileLayer — OSM supports this.

Downscaling uses an offscreen `<canvas>` in the webview (no server-side dependency needed).

### 2A. Add dependency
**Modify**: `shared/components/package.json` — add `leaflet-image`

### 2B. Create capture utility
**Create**: `shared/components/src/MapView/captureMap.ts`

```typescript
export async function captureMapAsDataUrl(map: L.Map): Promise<string>
// Returns data:image/png;base64,... at current map size
```

### 2C. Create downscale utility
**Create**: `shared/components/src/MapView/resizeImage.ts`

```typescript
export function downscaleDataUrl(
  dataUrl: string, targetWidth: number, targetHeight: number
): Promise<string>
// Uses offscreen <canvas> — works in browser and webview
```

### 2D. Extend webview message protocol
**Modify**: `apps/vscode/src/webview/messages.ts`

Add `RequestThumbnailCaptureMessage` (extension -> webview) and `ThumbnailCaptureResponseMessage` (webview -> extension) following the existing `RequestExportPngRequest` pattern at line 197.

### 2E. Handle capture in webview
**Modify**: `apps/vscode/src/webview/mapPanel.ts`

Add message handler for `requestThumbnailCapture`:
1. Call `captureMapAsDataUrl()` on current Leaflet map
2. Downscale to 200x150
3. Send both base64 PNGs back to extension

### 2F. Integrate with Save command
**Modify**: `apps/vscode/src/commands/saveSession.ts`

After successful session save:
1. Send `requestThumbnailCapture` to webview
2. Await response with both PNGs
3. Decode base64 and call `store_thumbnail()` via STAC service
4. **Non-blocking**: if capture fails, save still succeeds (log warning)

---

## Phase 3: Playwright Backfill Script

Runs locally (not CI) — tile access guaranteed.

### 3A. Create script
**Create**: `apps/web-shell/scripts/generate-thumbnails.ts`

Flow for each plot:
1. Navigate to catalog (`CatalogPage.goto()`)
2. Open plot (`catalogPage.openItem()` -> `AnalysisPage`)
3. Wait for map + tiles loaded
4. Click fit-to-window button
5. Set viewport to 800x600
6. `page.locator('.leaflet-container').screenshot()` -> large PNG buffer
7. Downscale with `sharp` -> small PNG buffer
8. Write both PNGs to item directory, update item.json
9. Navigate back to catalog, repeat

### 3B. Add dev dependencies
**Modify**: `apps/web-shell/package.json` — add `sharp` as devDependency

### 3C. Add npm script
**Modify**: `apps/web-shell/package.json`:
```json
"generate-thumbnails": "tsx scripts/generate-thumbnails.ts"
```

### 3D. Add `data-testid` to fit-to-window button
**Modify**: `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` — add `data-testid="fit-to-window"` to the fit button element.

### 3E. Add `fitToWindow()` to AnalysisPage POM
**Modify**: `apps/web-shell/playwright/pages/AnalysisPage.ts`

```typescript
async fitToWindow(): Promise<void> {
  await this.page.locator('[data-testid="fit-to-window"]').click();
  await this.page.waitForTimeout(500); // settle animation
}
```

### 3F. Tile loading wait strategy
Wait for all tiles:
```typescript
await page.waitForFunction(() => {
  const tiles = document.querySelectorAll('.leaflet-tile-container img');
  return tiles.length > 0 && [...tiles].every(t => t.complete);
});
```

---

## Phase 4: Gallery Preview UX

Split view: filtered list on left, large thumbnail preview on right.

### 4A. Create ThumbnailPreview component
**Create**: `shared/components/src/StacBrowser/ThumbnailPreview.tsx`

Props:
- `selectedItem: StacBrowserItem | null`
- `items: readonly StacBrowserItem[]` (filtered set for prev/next)
- `onSelectItem: (item: StacBrowserItem) => void`

Renders:
- Large thumbnail `<img>` (800x600) from `thumbnailHref`
- Item title + metadata overlay
- Prev/next buttons + keyboard arrow support
- Fallback to `SpatialThumbnail` SVG when no PNG exists

### 4B. Create CSS
**Create**: `shared/components/src/StacBrowser/ThumbnailPreview.css`

### 4C. Integrate into StacBrowser GoldenLayout
**Modify**: `shared/components/src/StacBrowser/StacBrowser.tsx`

Add ThumbnailPreview as a new GoldenLayout panel (right side). Wire to a `selectedItemId` state:
- Single-click an item in ExerciseListView -> update preview
- Double-click -> open the plot (existing behavior)

### 4D. Update ExerciseListItemRow for PNG thumbnails
**Modify**: `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`

When `item.thumbnailSmHref` is available, render `<img>` instead of `SpatialThumbnail`. Fallback to SVG when no PNG.

### 4E. Component tests
**Create**: `shared/components/src/StacBrowser/__tests__/ThumbnailPreview.test.tsx`

---

## Phase 5: Integration Testing

### 5A. E2E test for thumbnail display
**Create**: `apps/web-shell/playwright/tests/thumbnail-preview.spec.ts`
- Verify gallery preview panel renders
- Verify prev/next navigation cycles through filtered items

### 5B. Update test fixtures
**Modify**: `apps/vscode/test-data/local-store/exercise-alpha/item.json`
- Add sample thumbnail asset entries for testing

---

## Dependency Graph

```
Phase 1 (STAC model) ──┬── Phase 2 (In-app capture on Save)
                        ├── Phase 3 (Playwright backfill)
                        └── Phase 4 (Gallery preview UX)

Phase 5 (Integration tests) depends on all above
```

Phases 2, 3, and 4 are independent after Phase 1 and can be worked in parallel.

---

## Verification

1. **Phase 1**: Run `uv run pytest services/stac/tests/test_thumbnails.py` — verify store/overwrite
2. **Phase 2**: Open a plot in VS Code, Save, verify `thumbnail.png` and `thumbnail-sm.png` appear in item directory
3. **Phase 3**: Run `pnpm --filter @debrief/web-shell generate-thumbnails` locally, verify all items get thumbnails
4. **Phase 4**: Open catalog in web-shell, click an item, verify large preview appears; test prev/next navigation
5. **Full CI**: `task verify` passes (lint + typecheck + tests)
