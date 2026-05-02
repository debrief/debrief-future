# Research: STAC 1.1.0 + best-practices upgrade

**Feature**: 241-stac-best-practices-upgrade
**Date**: 2026-05-02
**Inputs**: spec.md, ADR-028 (already merged in `docs/project_notes/decisions.md`), 2026-05-02 audit of `preview/workspace/samples/local-store/`

The spec arrives with most of the analytical work already done — ADR-028 ratified the conformance profile, the audit table fixed the gap inventory, and the User Stories named the four moving parts (Item factory, Collection factory, regeneration, browser-interop test). What remained was to decide *how* each gets implemented inside the existing `debrief-stac` shape. The decisions below close every NEEDS CLARIFICATION the technical context surfaced.

---

## Decision 1 — `processing` extension version pin

**Decision**: pin `https://stac-extensions.github.io/processing/v1.2.0/schema.json` and adopt only `processing:software` (`Map<string,string>`) and `processing:datetime` (RFC 3339 UTC).

**Rationale**: v1.2.0 is the current stable release on the official extensions registry as of 2026-05-02 and is what `stac-fields` (the library STAC Browser uses for pretty-printing) ships with. `processing:software` and `processing:datetime` are the two fields whose semantics map exactly onto our existing `debrief:provenance.tool_version` and `debrief:provenance.load_timestamp`; the optional `processing:level` / `processing:facility` / `processing:lineage` fields don't have unambiguous Debrief equivalents and would be guesswork.

**Alternatives considered**:
- *Adopt `processing:lineage` populated from `debrief:provenance_log`*: rejected — `processing:lineage` is free text and our log is structured. We'd be lossily flattening it. Better to keep `debrief:provenance_log` as the audit-trail source of record (Constitution Article III.3).
- *Wait for processing v2*: rejected — no v2 in flight on the registry; v1.2 is the long-stable choice.

---

## Decision 2 — `file` extension version pin and checksum encoding

**Decision**: pin `https://stac-extensions.github.io/file/v2.1.0/schema.json`. Encode `file:checksum` using the `multiformats` Python package (multihash representation, SHA-256 — `0x12` algorithm code + `0x20` length + 32-byte digest, hex-encoded). `file:size` is a plain integer (bytes).

**Rationale**: v2.1.0 is the registry's current stable release. The STAC spec mandates multihash encoding for `file:checksum`, not bare hex SHA-256. The `multiformats` package on PyPI (current maintained successor of the deprecated `multihash` package the spec mentions) handles the encoding correctly with no transitive C extensions, and pinning it as a `debrief-stac` dep adds a single ~50 KB pure-Python module — well within Article IX's "minimal, vetted" bar.

**Alternatives considered**:
- *Use the deprecated `multihash` package*: rejected — unmaintained, last release 2017, has a known issue with Python 3.11+ asyncio. `multiformats` is the upstream-blessed replacement.
- *Hand-roll multihash*: rejected — 8 lines of code is tempting but the spec is explicit about the wire format and a third-party reader would catch any mistake. Library handles it.
- *Ship only `file:size`, skip `file:checksum`*: documented as a fallback in the spec's edge cases, but not the primary plan. Both fields together prove integrity; size alone doesn't.

---

## Decision 3 — `created` recovery for the existing 73 items

**Decision**: regeneration script computes `created` per item as the UTC ISO 8601 timestamp of the item's git introduction (`git log --diff-filter=A --format=%aI -- "{path}/item.json" | tail -1`), with a fallback to filesystem mtime when git history reports nothing. `updated` is set to the regeneration timestamp.

**Rationale**: the spec's edge case explicitly forbids overwriting `created` with the regeneration time (would falsely backdate every plot to mid-2026). Git introduction time is the most accurate "when did this plot first exist in our world" we have for items born of #144 + #184. The `--diff-filter=A` picks the commit that *added* the file, which is what `created` semantically means. `tail -1` is needed because `git log` reports newest-first by default; the *first* commit (oldest) is the introduction.

**Alternatives considered**:
- *Use `properties.datetime` (the plot's mission datetime)*: rejected — `created` is the catalog metadata's lifecycle, not the captured event. Mixing them would make `created` jump backwards to 1995 for historical exercises.
- *Use a single global `created` (commit date of regeneration PR)*: rejected — same false-backdate problem at the per-item level. Stakeholders looking at the catalog's "newest plot" sort order would see all 73 collapse onto one timestamp.

---

## Decision 4 — `license` value and `providers[]` content

**Decision**:
- `license = "other"` at both Item and Collection level for the bundled sample catalog. Add a single `links[]` entry with `rel: "license"`, `href: "https://debrief.info/license/sample-catalog"`, `type: "text/html"`, `title: "Debrief sample catalog license"` — page does not need to exist yet (link target is informational).
- `providers[]` for the sample catalog: one entry, `{ "name": "Debrief", "roles": ["producer", "host"], "url": "https://debrief.info" }`. Item-level `providers` carry the same single entry by default; downstream contrib catalogs can override.

**Rationale**: `"proprietary"` was deprecated in STAC 1.1 because it conveys nothing rendering-wise — STAC Browser shows it as plain text with no link. `"other"` plus a `cite-as`/`license` link tells consumers "see this URL for terms" and is the spec-blessed escape hatch when the data isn't under a recognised SPDX licence. Sample data is for-Debrief-use-only, not redistributable, which is what we want to convey.

**Alternatives considered**:
- *Pick an SPDX value like `"CC-BY-4.0"`*: rejected — sample data is not actually under CC-BY. Misrepresenting the licence is worse than `"other"`.
- *Omit `license` entirely*: rejected — the STAC 1.1 Collection Schema requires `license` as a top-level field, and Item-level `license` is a recommended best practice (and the audit shows zero coverage).
- *Make `providers` an empty array*: rejected — `providers[]` exists to attribute the data; an empty array is a code smell. The single-entry default is the lowest-friction baseline.

---

## Decision 5 — `item_assets` shape

**Decision**: the Collection's `item_assets` block declares four logical asset types every Item exposes:

| Key | `type` | `roles` | `title` |
|---|---|---|---|
| `features` | `application/geo+json` | `["data"]` | `Plot features` |
| `thumbnail` | `image/png` | `["thumbnail"]` | `Thumbnail (200×150)` |
| `overview` | `image/png` | `["overview"]` | `Overview (800×600)` |
| `source` | (omitted — varies per item) | `["source"]` | `Source data` |

**Rationale**: `item_assets` is a contract block — it describes what every Item *should* have, not what specific files live where. The four logical types are stable across all 73 items. Per-item source asset *names* vary (`source-boat1t`, `source-foo`, etc.); we declare a single `source` placeholder and let per-item Items disambiguate via key suffixes. The keys we use in the block must match the keys an Item uses *unless* the item key is a per-item suffix; `stac-fields` and STAC Browser tolerate the suffix-pattern convention without complaint.

**Alternatives considered**:
- *Wildcard `source-*` syntax in `item_assets`*: rejected — not part of the spec; would invite reader confusion.
- *Declare every per-item source key in `item_assets`*: rejected — `item_assets` would balloon to dozens of entries describing one-of-a-kind files. The block is meant to declare a contract, not an inventory.

---

## Decision 6 — Thumbnail rename: rename or rekey?

**Decision**: rename files. The 800×600 PNG (currently `thumbnail.png` on disk) is renamed via `git mv` to `overview.png`. The 200×150 PNG (currently `thumbnail-sm.png`) is renamed via `git mv` to `thumbnail.png`. Asset `href` values are updated to match, so `assets.thumbnail.href` now points to `./thumbnail.png` (the small one) and `assets.overview.href` points to `./overview.png` (the large one).

**Rationale**: (a) On-disk filenames now mirror their STAC role — easier for any contributor reading the catalog directly. (b) The current `thumbnail-sm` suffix becomes a vestigial naming choice; renaming purges it. (c) `git mv` preserves blame history through the rename. (d) The factory's thumbnail-emit code (`thumbnails.py`) gets the same naming on go-forward, so new plots and old regenerated plots share filenames.

**Alternatives considered**:
- *Keep filenames, just rekey*: simpler patch, but leaves `thumbnail-sm.png` on disk forever. Filename and asset key would disagree, costing future contributors a head-scratch.
- *Delete + re-emit during regeneration*: rejected — destroys git history of the PNGs and wastes capture cycles. The spec's edge case explicitly forbids re-running the capture pipeline.

---

## Decision 7 — STAC Browser version pin and serving harness

**Decision**:
- Pin `@radiantearth/stac-browser` to `v3.3.4` (current stable, matches the spec's PR-time release window) as a dev-dep on the Playwright test workspace. Use the `pnpm dlx` install path; the package brings `webpack`-bundled assets and Vue 3.
- Serve the regenerated catalog from `preview/workspace/samples/local-store/` over a local Node `http-server` (added as a dev-dep) on port `4080` during the test. The Playwright test starts both servers (catalog on `:4080`, stac-browser dev server on `:8080`) inside `globalSetup`, navigates to `http://localhost:8080/?catalogUrl=http://localhost:4080/catalog.json`, and tears them down in `globalTeardown`.

**Rationale**: pinning `v3.3.4` makes screenshots reproducible (Constitution Article I.4). Two local servers is the supported stac-browser deployment shape — it's a SPA that fetches the catalog at runtime via CORS-permissive HTTP, which is exactly what `http-server` ships. Using the existing `apps/web-shell/playwright/` pattern (config + page-objects under `playwright/pages/`) keeps the new test in the established harness.

**Alternatives considered**:
- *Use the public hosted instance at `https://radiantearth.github.io/stac-browser/`*: rejected — needs the catalog to be on a public CORS-permissive URL. Won't run offline (Article I.1 violation). Public instance also drifts independently — tomorrow's screenshots could differ.
- *Drive a stripped-down stac-browser-equivalent snapshot test*: rejected — defeats the demo's marketing value. The spec explicitly notes "the marketing value of using the real browser is what makes this story P1".
- *Use `serve` instead of `http-server`*: equivalent functionally, but `http-server` is already implicitly familiar from npm-land and has fewer flags. Either would work.

---

## Decision 8 — Where the regeneration script lives

**Decision**: `scripts/upgrade-catalog-to-stac-1.1.py` (Python 3.11, follows the precedent of `scripts/regenerate-sample-catalog.py` and `scripts/enrich-legacy-catalog.py`). The script is committed for one PR cycle so reviewers can audit it, then deleted in a follow-up cleanup commit on the same branch (matches #228's regenerator pattern). Idempotent: a second run produces no diff.

**Rationale**: a one-shot, throwaway script keeps the long-lived codebase free of migration cruft. Inlining the migration in `debrief-stac` itself would create dead code paths once the catalog is upgraded.

**Alternatives considered**:
- *Add a `migrate v1_0 → v1_1` function inside `debrief-stac`*: rejected — the migration is a one-time event, not a runtime concern. Future plots come from the upgraded factory, not from migration.
- *Hand-edit each item.json*: rejected — 73 files, error-prone, no idempotency guarantee.

---

## Decision 9 — Schema validation harness

**Decision**: extend `services/stac/tests/test_stac_validation.py` with a new test `test_collection_validates_against_stac_1_1_schema()` and another `test_items_validate_against_stac_1_1_schema()` that fetch the official STAC 1.1 JSON Schemas (`https://schemas.stacspec.org/v1.1.0/...`) once per test run, cache them in `services/stac/tests/.schema-cache/`, and validate every regenerated artifact against them. The cache invalidates monthly (mtime-based).

**Rationale**: STAC Browser validates client-side against the same schemas; the test catches regressions at CI time before they reach the Playwright test. Cached schema fetch keeps Article I.1 satisfied — the schemas are bundled in the cache after first run, so subsequent CI runs are offline-capable. Existing tests already use `stac_validator.StacValidate()`; we keep that API and just bump its schema-version target.

**Alternatives considered**:
- *Vendor the schemas into the repo*: equivalent functionally, but a future STAC 1.1.x patch release would diverge silently. Cached-with-monthly-bust is the better tradeoff.
- *Run schema validation only inside the Playwright test*: rejected — moves the gate too late. CI catches it earlier this way.

---

## Decision 10 — VS Code reader update scope

**Decision**: in `apps/vscode/src/types/stac.ts`, the `StacItemSummary` type's `thumbnailHref` and `thumbnailSmHref` fields are renamed to `overviewHref` (was `thumbnailHref`, holds the 800×600) and `thumbnailHref` (was `thumbnailSmHref`, holds the 200×150). All consumers are updated in lockstep — the rename is enforced by tsc's strict mode. The catalog reader reads `assets.overview.href` for the large variant and `assets.thumbnail.href` for the small variant. No backwards-compat shim is added (Article XIV — pre-release freedom).

**Rationale**: the rename moves the type closer to STAC's vocabulary, and tsc immediately surfaces every consumer that needs updating. A grep of `thumbnailHref` in `apps/vscode/` returns ~12 hits, all of which migrate cleanly. The same audit + rename applies to `shared/components/` and `apps/web-shell/`.

**Alternatives considered**:
- *Add new fields, deprecate old ones, keep both for one cycle*: rejected — explicitly out of scope per Article XIV's pre-release freedom.
- *Read both keys with a fallback (`assets.overview ?? assets.thumbnail`)*: rejected — papers over the migration and keeps confusion alive.

---

## Open questions (none blocking)

All NEEDS CLARIFICATION items from the planning template are resolved by Decisions 1–10. No remaining unknowns.
