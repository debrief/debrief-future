---
feature: 174-thumbnail-capture
task: T036a
captured_at: 2026-04-17T00:00:00Z
git_sha: 1409acbe
plots_total: 73
plots_with_thumbnail_png: 73
plots_with_thumbnail_sm_png: 73
plots_with_asset_thumbnail: 73
plots_with_asset_thumbnail_sm: 73
coverage_pct: 100
---

# T036a Retro-capture Count Check

One-off run of `pnpm --filter @debrief/web-shell generate-thumbnails` against
the committed demo STAC catalog at `preview/workspace/samples/local-store/`.

## Count check

| Check | Count |
|---|---|
| Plot directories (`core--*/`) | 73 |
| Directories containing `thumbnail.png` | 73 |
| Directories containing `thumbnail-sm.png` | 73 |
| `item.json` files with `assets.thumbnail` entry | 73 |
| `item.json` files with `assets.thumbnail-sm` entry | 73 |
| **Coverage** | **100% (73 / 73)** |

Meets SC-007: 100% thumbnail coverage across all sample plots.

## How the counts were obtained

```sh
TOTAL=$(ls -d preview/workspace/samples/local-store/core--*/ | wc -l)
PNG_LG=$(find preview/workspace/samples/local-store/core--*/thumbnail.png | wc -l)
PNG_SM=$(find preview/workspace/samples/local-store/core--*/thumbnail-sm.png | wc -l)
ASSET_LG=$(grep -l '"thumbnail":' preview/workspace/samples/local-store/core--*/item.json | wc -l)
ASSET_SM=$(grep -l '"thumbnail-sm":' preview/workspace/samples/local-store/core--*/item.json | wc -l)
```

## Output dimensions (spot-check)

- `thumbnail.png`: 596 x 541 px (map viewport size produced by the backfill
  script's Playwright run; consistent across all 73 plots).
- `thumbnail-sm.png`: 200 x 150 px (matches FR-002).

Note: the large size diverges from the FR-002 target of 800 x 600. The backfill
script captures the live map viewport rather than resizing to a fixed 800 x 600;
all 73 outputs are consistent. Tracked separately — outside the scope of this
one-off retro-capture run.
