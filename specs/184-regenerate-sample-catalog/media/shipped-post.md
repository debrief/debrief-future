---
layout: future-post
title: "Shipped: Nuke and Regenerate Sample Catalog"
date: 2026-04-13
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, e10-catalog-discovery, import-pipeline, shipped]
excerpt: "73 clean STAC items, zero deprecated flat fields -- the sample catalog now speaks structured platform records"
---

## What Shipped

The sample catalog is rebuilt. 73 STAC items, every one carrying a `debrief:platforms` array, zero carrying the deprecated flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`).

Before regeneration, a grep across all `item.json` files found 72 items using the old flat format. After:

```bash
$ grep -rl "debrief:vessel_classes\|debrief:nationalities\|debrief:track_names" \
    preview/workspace/samples/local-store/*/item.json | wc -l
0

$ grep -l "debrief:platforms" preview/workspace/samples/local-store/*/item.json | wc -l
73
```

Every known platform now carries all seven fields -- `id`, `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain` -- bundled as a single record rather than scattered across three unrelated lists.

## How It Works

One script, three phases. `scripts/regenerate-sample-catalog.py` (roughly 280 lines, typed, pyright-clean):

1. **Stage** -- discovers 72 asset files embedded in the existing catalog plus 5 standalone REP files at the samples root (77 total), copies them to a temp directory
2. **Delete** -- removes the existing catalog at `preview/workspace/samples/local-store/`
3. **Reimport** -- calls `import_legacy_data()` against the staged files; the current pipeline produces `debrief:platforms` by construction, with no migration logic needed
4. **Enrich** -- runs `enrich-legacy-catalog.py` to apply exercise metadata, tags, and feature tags

The pipeline produces 73 items in about 4.8 seconds. Running it twice gives identical counts and warnings -- the enrichment script uses `random.Random(42)` for all randomised assignments.

## By the Numbers

| | |
|---|---|
| Source files processed | 77 |
| Items produced | 73 |
| Items with `debrief:platforms` | 73 |
| Items with deprecated flat fields | 0 |
| Import warnings | 500 |
| Unregistered platform IDs | 380 |
| Unique platforms (enriched) | 375 |
| Vessel classes | 13 |
| Nationalities | 4 (DE, FR, GB, US) |
| pytest | 1,643 passed / 1 skipped / 1 xfailed |
| Playwright E2E | 79 passed |

## What We Learned

**The item count surprised us.** The planning post estimated 63 items -- that was the size of the old catalog. The actual reimport produced 73. The extra 10 come from the 5 standalone REP files at the samples root, which the old catalog had never imported. They were sitting there unprocessed. The new script discovers them explicitly, so they're in now.

**Two files don't import, and that's fine.** `narrative.rep` fails with empty geometry coordinates; `shapes.rep` fails because ELLIPSE is an unsupported feature kind in the current schema. Both are pre-existing data quality issues that have nothing to do with this feature. The script logs them as errors, skips those files, and continues to enrichment. 73 clean items from 75 successful imports out of 77 attempted -- the two failures are documented and understood.

**`derive_vessel_fields` was the one real code change.** The enrichment script already wrote `debrief:platforms` arrays, but it wasn't populating `vessel_type`, `vessel_role`, or `domain` -- those fields were added to the schema in #181. A new helper parses the slash-delimited `vessel_class` path (e.g. `surface/warship/frigate/type23`) to derive the three fields. Everything else was orchestration.

## What's Next

This was step 5 of 11 in the E10 epic. The regenerated catalog is the data foundation everything downstream was waiting for.

The next features in the sequence are:

- **#185** -- CQL2 array filtering against `debrief:platforms` fields (querying by nationality, vessel class, domain)
- **#186** -- filter bar chips for platform facets
- **#187** -- enum extraction from catalog summaries
- **#188** -- natural language search over structured platform records

All four assume clean structured platform records exist in every catalog item. They do now.

Thumbnails are still out of scope -- items are structurally complete but visually bare. That's a separate browser automation concern (#174 covers the mechanism) that we'll schedule when the core E10 discovery work is done.

→ [See the implementation](https://github.com/debrief/debrief-future/pull/184)
