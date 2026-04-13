# Quickstart: Nuke and Regenerate Sample Catalog

**Feature**: 184-regenerate-sample-catalog  
**Date**: 2026-04-13

## What This Does

Deletes the existing sample STAC catalog and regenerates it from scratch through the enriched import pipeline. The result: every item carries `debrief:platforms` structured arrays instead of deprecated flat aggregate fields.

## Prerequisites

- Python 3.11+ with `uv` installed
- All workspace dependencies installed (`uv sync`)
- On branch `184-regenerate-sample-catalog` or later

## Running the Regeneration

```bash
# Single command — extracts source files, nukes catalog, reimports, enriches
uv run python scripts/regenerate-sample-catalog.py
```

The script:
1. Extracts all `.rep`/`.dpf`/`.dsf` source files from `preview/workspace/samples/local-store/*/assets/` into a temporary staging directory
2. Deletes `preview/workspace/samples/local-store/` entirely
3. Reimports all source files via `import_legacy_data()`, creating a fresh STAC catalog
4. Enriches items with exercise metadata and `debrief:platforms` via `enrich-legacy-catalog.py`
5. Reports results: item count, warning count, duration

## Verifying the Result

```bash
# Full CI check (lint + typecheck + test)
task verify

# Quick spot-check: confirm no flat aggregate fields remain
grep -r "debrief:vessel_classes\|debrief:nationalities\|debrief:track_names" \
  preview/workspace/samples/local-store/*/item.json
# Expected: no output (no matches)

# Confirm debrief:platforms present on all items
grep -l "debrief:platforms" preview/workspace/samples/local-store/*/item.json | wc -l
# Expected: ~63 (one per item)
```

## What Changed

| Before | After |
|--------|-------|
| `debrief:vessel_classes` on items | Removed |
| `debrief:nationalities` on items | Removed |
| `debrief:track_names` on items | Removed |
| No `debrief:platforms` array | `debrief:platforms` on every item |
| Mixed summaries in catalog.json | Clean summaries (platforms only) |
| Thumbnails present | Thumbnails absent (regenerate separately via #174) |

## Known Limitations

- **No thumbnails**: The regenerated catalog does not include thumbnail images. These are generated separately by the thumbnail capture feature (#174).
- **Derived-from links**: The `derived_from` links in item.json will reference the temporary staging directory path, not the original source location.
- **Deterministic but seeded**: The enrichment uses `random.Random(42)`, so exercise names and tag assignments are deterministic but not meaningful — they're realistic-looking metadata for demo purposes.

## Troubleshooting

**Import fails with "Catalog path already exists"**: Delete `preview/workspace/samples/local-store/` manually and re-run.

**"No supported files found"**: The source file extraction failed. Check that the staging directory was populated from the existing catalog assets.

**Schema test failures after regeneration**: Run `uv run python shared/schemas/scripts/generate-stac-fixtures.py` to regenerate schema fixtures, then re-run `task verify`.
