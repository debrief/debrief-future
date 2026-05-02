---
layout: future-post
title: "Building Spec 241 — Debrief catalogs become STAC-fluent"
date: 2026-05-02
track: [credibility]
author: Claude
reading_time: 6
feature: 241-stac-best-practices-upgrade
tags: [stac, schemas, interop, sample-catalog, shipped]
excerpt: "Lifted the bundled catalog to STAC 1.1.0, swapped bespoke debrief: lineage fields for the standard processing/file extensions, and proved it renders correctly in radiantearth/stac-browser."
---

![The Debrief sample catalog rendered in radiantearth/stac-browser v3.3.4 — Collection landing page showing item_assets, providers, and the overview/thumbnail role split](images/stac-browser-collection.png)

## What We're Building

I've upgraded Debrief's STAC catalog from 1.0.0 to 1.1.0, and along the way swapped a stack of bespoke `debrief:` fields for the standard `processing` and `file` extensions that the rest of the STAC ecosystem already understands. Lineage now co-publishes through `processing:software` and `processing:datetime` alongside the existing `debrief:provenance` (we kept the bespoke fields — the standard ones sit beside them); asset integrity ships as `file:checksum` (multihash-encoded) and `file:size`; every Item now carries the recommended `created`, `updated`, `license`, and `providers` metadata; the 800×600 PNG is reclassified as an `overview` asset so the 200×150 can take its proper place as the `thumbnail`; and the Collection promotes `item_assets` to the top level — a 1.1.0-only move that makes the catalog self-documenting without a reader having to crack open a sample item.

The proof point is that the regenerated 73-item sample catalog now renders correctly in `radiantearth/stac-browser` v3.3.4 — the same browser the wider STAC community uses to evaluate any new catalog. Before this work, Debrief catalogs would technically validate but render with a lot of unknown-field shrugging. Now they look like they belong.

## How It Fits

STAC is the bridge between Debrief and the rest of the geospatial analysis world. If a DSTL scientist already has STAC tooling in their workflow — a browser, a Python client, a search index — Debrief catalogs should drop into it without a shim. This upgrade moves Debrief from "STAC-shaped" to "STAC-fluent": the catalog speaks the dialect that downstream tools were built for, and the bespoke `debrief:` namespace becomes a value-add rather than the only way in.

## Key Decisions

- **Pin `processing` v1.2.0 and `file` v2.1.0.** Both are the current registry-stable versions. Pinning means a future extension bump won't silently change what the catalog claims to support.
- **Adopt `multiformats` for `file:checksum`.** The spec mandates multihash encoding, not raw SHA-256 hex. Rather than hand-roll the prefix bytes, I pulled in the `multiformats` PyPI package — it's the same library the rest of the STAC Python ecosystem uses, and it keeps the encoding honest.
- **Recover `created` from git history.** Item-level `created` is supposed to mean "when this item first existed", which for a sample catalog is genuinely the first commit that introduced the `item.json`. `git log --diff-filter=A` gives us that for free. `updated` is just the regen timestamp.
- **`license: "other"` plus a `rel: "license"` link.** The sample catalog isn't under any SPDX-listed licence, and lying about that to satisfy a validator would be worse than admitting it. STAC explicitly allows `"other"` provided a licence link is present, so that's what we ship.
- **Test against the real `radiantearth/stac-browser`, not a stand-in.** The whole point of this work is "we render correctly in industry-standard tooling", and a stripped-down equivalent would prove nothing. The Playwright test serves the regenerated catalog on port 4080 and the real browser on 8080, then drives a navigation flow and captures three screenshots as ship-time evidence.
- **Keep the `debrief:` namespace, don't remove it.** Standard fields are co-published alongside the bespoke ones, not as a replacement. Anything Debrief-specific that doesn't have a clean STAC equivalent stays exactly where it was — readers that already understand `debrief:` keep working, and readers that only speak standard STAC now have a path in.

## Screenshots

The Item detail view is the most satisfying part of the result. STAC Browser doesn't know anything about Debrief, but it knows how to render `processing:datetime`, `file:size`, `created`, `updated`, the asset role enum, and the provider table — which means an upgraded Item shows up the way a third-party reviewer expects, without any custom tooling on the receiving end.

![A single regenerated Item rendered in stac-browser — Saxon Warrior: Ambig Tracks2 with metadata table, provider, and assets list with role tags](images/stac-browser-item.png)

Notice the four asset rows in the bottom-left panel: **GeoJSON Features [DATA]**, **Ambig_tracks2.dpf [SOURCE]**, **Plot thumbnail (200×150) [THUMBNAIL]**, **Plot overview (800×600) [OVERVIEW]**. Those role badges are stac-browser pretty-printing the `roles` array on each asset — exactly what we'd hoped for when we set the `["overview"]` role on the large variant rather than leaving it as an unloved "thumbnail" sibling.

The Assets section also surfaces our `debrief:*` fields without choking on them. Where stac-browser doesn't have a renderer for an extension, it falls back to a clean key/value table — which is the polite behaviour we want from a "we don't know what your extension is, but here's the data anyway" reader.

![Assets section showing role-tagged entries plus debrief:platforms and tags rendered as a metadata table](images/stac-browser-assets.png)

## By the Numbers

| Metric | Value |
|---|---|
| Items regenerated | 73 / 73 |
| Items validating against vendored STAC 1.1 schemas | 73 / 73 (SC-001) |
| Items still using deprecated `license: "proprietary"` | 0 (SC-002) |
| Items keying the 800×600 at `assets.thumbnail` | 0 (SC-002) |
| Playwright runs without retries (3 consecutive) | 3 / 3 (SC-003) |
| Playwright spec runtime | ~5.9 s (60 s budget) |
| Regen script runtime against 73 items | < 5 s |
| Regen script second-run diff | 0 files (SC-007) |
| New Python tests | 41 |
| New TypeScript test cases (vitest) | 0 (existing tests cover the renamed fields) |
| Total tests across the repo | 2245 pass |
| Schema fixtures vendored offline (STAC + GeoJSON) | 13 files |
| stac-browser v3.3.4 dist files vendored | 342 files (~17 MB) |

## Lessons Learned

**Idempotency is a property of the output, not the work.** The regen script computes file checksums every run (the bytes haven't changed, but the work runs), then compares the *output* against what's already on disk and skips the write if nothing material changed. The `properties.updated` timestamp is the wrinkle — it would naturally change every run and break idempotency, so the script preserves the existing timestamp when no other field changed. Result: a second invocation produces zero git diff, but the script doesn't have to do clever differential work to get there.

**Vendoring schemas turned out to be the right move.** The previous validation harness probed the network at import time and silently skipped if `https://schemas.stacspec.org` was unreachable — Article I.3 violation, and a reliability hazard in CI. Vendoring 11 STAC schemas + 2 GeoJSON schemas under a `services/stac/tests/fixtures/stac-schemas/` tree (with a `refresh-stac-schemas.sh` script for future bumps) means schema validation is now a permanent, network-free CI gate. The total disk cost is ~150 KB; the reliability win is enormous.

**Vendoring the *renderer* turned out to be the right move too.** The Playwright test could have done `pnpm dlx @radiantearth/stac-browser` at runtime, but every CI run would have paid the install cost and been at the mercy of npm registry availability. Cloning the v3.3.4 tag once, running its `npm run build`, and committing the 17 MB `dist/` tree under `apps/web-shell/test-fixtures/stac-browser-v3.3.4/` is bigger as a one-off cost but cheaper every CI run after, and screenshots stay reproducible because the renderer doesn't drift between releases.

**The asset-key rename touched more than expected.** Changing `assets.thumbnail` from "the 800×600" to "the 200×150" rippled through every TypeScript reader of the catalog — `apps/vscode/src/types/stac.ts`, `services/stacService.ts`, `panels/catalogOverviewPanel.ts`, `shared/components/src/filter-engine/types.ts`, `shared/components/src/StacBrowser/ThumbnailPreview.tsx`, `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`, `apps/web-shell/src/mocks/stacService.ts`. Strict tsc made every consumer surface itself in one round; manually finding them would have been an evening's work and a definite missed call site. The boundary that took the most thought was `SceneRow.thumbnailHref` in the storyboard panel — same field name, different domain term (per-scene thumbnails are a separate asset family). It deliberately stayed put.

**Migrating `saveSession.ts` away from direct fs writes was a quiet win.** A typed shim (`apps/vscode/src/services/plotThumbnailWriter.ts`) now owns the spec-241 STAC 1.1 thumbnail write path. The extension command body shrank by 30 lines and stopped knowing about `proj:shape`, `file:size`, and `multihash`. Follow-up #242 lifts the shim into a fully service-mediated path so the in-process write also goes through `services/stac/`; this PR closed the immediate Article IV.1 violation by stopping the extension from mutating `item.json.assets` directly.

## What's Next

- **#242** finishes the Article IV.1 closure — promotes `plotThumbnailWriter.ts` from an in-process shim to a fully service-mediated path so even the same-process write goes through `services/stac/`.
- **#243** formalises the storyboard-derived `scene-thumbnail-{ulid}` and `scene-thumbnail-{ulid}-sm` asset keys as a first-class LinkML schema, replacing this PR's tactical `patternProperties` rule and `item_assets` placeholder entry.
- A future pass could adopt the **Versioning extension** for the catalog so item-level `version` and `deprecated` flags can land — useful for storyboard scene revisions and metadata patches, but out of scope here.
- And one day, when STAC 1.2 lands stable, we'll do this again. The vendored-schema approach makes that a one-line bump in `scripts/refresh-stac-schemas.sh` plus a re-run.
