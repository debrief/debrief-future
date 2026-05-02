## Hook

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
