# Feature Specification: STAC 1.1.0 + best-practices upgrade

**Feature Branch**: `241-stac-best-practices-upgrade`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Upgrade Debrief's STAC catalog to align with current STAC best practices and migrate to STAC 1.1.0. Adopt the standard `processing` and `file` extensions for lineage and asset integrity rather than bespoke `debrief:` fields. Add the recommended item-level metadata (`created`, `updated`, `license`, `providers`). Reclassify the large 800×600 thumbnail as an `overview` asset; keep the 200×150 as `thumbnail`. Promote `item_assets` into the Collection (new in 1.1.0) so the catalog self-documents its asset shape. Audit the existing 73-item sample catalog at `preview/workspace/samples/local-store/` and regenerate every item to match. Add a short Playwright E2E test that serves our catalog into an open-source STAC browser (radiantearth/stac-browser) and captures screenshots proving third-party tooling can browse and render our data — those screenshots seed the blog post."

## Background & Context

Debrief stores plots as STAC Items (ADR-003). A 2026-05-02 review cross-checked the current implementation against the STAC 1.0/1.1 spec, the [STAC Best Practices guide](https://github.com/radiantearth/stac-spec/blob/master/best-practices.md), the official extensions registry, and STAC Browser conventions. The implementation is **STAC 1.0-compliant** and structurally sound — asset roles are correct, the `derived_from` link relation is used properly, the custom `debrief:` namespace is registered with a versioned schema URI, and the Item factory emits a stable shape. The review surfaced one architectural pattern and a set of metadata gaps that, if closed, give us **interoperability with the wider STAC ecosystem at low marginal cost**.

The architectural pattern: where standard extensions exist for things we already track (lineage, asset integrity), we currently express the same data under `debrief:`. STAC Browser, `stac-fields`, and any third-party STAC client cannot render `debrief:provenance.tool_version` — but they pretty-print `processing:software` out of the box. Co-publishing the same provenance under both namespaces (no removal of `debrief:*`, just additive standard fields) makes our catalog legible to the ecosystem without breaking our own readers. The same logic applies to `file:size` / `file:checksum` for asset integrity (currently absent) and `created` / `updated` / `license` / `providers` at the Item level (currently absent).

The version bump: STAC 1.1.0 has been stable for some time. For a catalog that doesn't use `eo:bands` / `raster:bands` and doesn't author HTTP-driven links (we don't), 1.1.0 is **strictly additive** — 1.0 items remain valid 1.1 items. The two 1.1 features that matter for us are (a) `item_assets` promoted from extension into the core Collection spec, which lets the Collection self-document the asset shape every Item is expected to have, and (b) the relaxation of "self-link MUST be absolute" — confirming our existing relative `./item.json` self-link as a defensible portable-catalog choice rather than a tolerated departure.

The bundled sample catalog at `preview/workspace/samples/local-store/` is 73 plots strong (the work of #144 + #184). Every one of them lacks the new metadata. A code-only fix would leave the demo content stale; a regeneration of all 73 items is therefore in scope.

The verification angle: the most compelling demonstration that this work delivers value is **opening our catalog in radiantearth/stac-browser and seeing it render correctly** — thumbnails surfacing, processing metadata pretty-printed, file checksums shown alongside assets. A short Playwright test does this end-to-end in CI and captures screenshots that double as the blog post's hero image.

This feature does **not** remove any `debrief:*` field. The bespoke namespace continues to host genuinely Debrief-specific content (`debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, `debrief:provenance_log`, `debrief:overrides`). What changes is that, alongside those, the Item factory also emits the standard equivalents where they exist.

ADR-028 records the policy decision (which standards we conform to and why); this spec implements it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Item factory emits STAC 1.1.0 with standard metadata extensions (Priority: P1)

A maintainer runs the existing plot-creation path (Electron loader → `debrief-stac` → `item.json` on disk). The resulting Item has `stac_version: "1.1.0"`, declares the `processing` and `file` extensions in `stac_extensions[]` alongside the existing `debrief` extension, has `created` and `updated` ISO-8601 timestamps in `properties`, has `processing:software` and `processing:datetime` mirroring the existing `debrief:provenance` data on the source asset, has `file:size` and `file:checksum` (multihash) on every asset whose bytes live on disk, and has the 200×150 thumbnail at `assets.thumbnail` (role `["thumbnail"]`) plus the 800×600 preview at `assets.overview` (role `["overview"]`).

**Why this priority**: This is the "engine room" change. Without the factory emitting the new shape, no other story has anywhere to point. Every regenerated catalog item, every Playwright assertion, every blog screenshot depends on the factory producing the new structure.

**Independent Test**: Run a unit test that loads a single REP file end-to-end through `debrief-stac.create_plot()` + `add_features()` and asserts the resulting `item.json` shape against a golden fixture. No catalog regeneration, no UI, no Playwright required.

**Acceptance Scenarios**:

1. **Given** the Item factory has been upgraded, **When** a new plot is created from a fresh REP file, **Then** the resulting `item.json` has `stac_version: "1.1.0"`, declares the `processing` and `file` extension URIs in `stac_extensions[]`, and has populated `created` + `updated` timestamps.
2. **Given** the upgraded factory, **When** a source asset is attached, **Then** the asset entry contains both `debrief:provenance` (unchanged) **and** `processing:software` (mirroring `tool_version`) **and** `processing:datetime` (mirroring `load_timestamp`) **and** `file:size` (bytes on disk) **and** `file:checksum` (multihash of the file contents).
3. **Given** the upgraded factory captures a thumbnail pair, **When** the assets are written, **Then** the small (200×150) PNG is at `assets.thumbnail` with `roles: ["thumbnail"]`, the large (800×600) PNG is at `assets.overview` with `roles: ["overview"]`, and both have `proj:shape: [H, W]` populated so STAC Browser can reserve layout space.
4. **Given** the upgraded factory, **When** the Item is serialised, **Then** the `properties` object contains a `license` value (SPDX expression or `"other"`; never the deprecated `"proprietary"` or `"various"`) and a `providers[]` array with at least one entry whose `roles` use the standard enum (`producer` / `processor` / `host` / `licensor`).
5. **Given** the upgraded factory, **When** any Item-level write occurs (creation, feature add, metadata patch, asset write), **Then** the `updated` timestamp is refreshed and the `created` timestamp is preserved.

---

### User Story 2 — Collection factory emits STAC 1.1.0 with `item_assets` self-documentation (Priority: P1)

A maintainer creates or rebuilds a Collection. The resulting `catalog.json` (Debrief's promoted-Catalog-as-Collection) has `stac_version: "1.1.0"`, an `item_assets` block declaring the asset shape every Item exposes (`features`, `thumbnail`, `overview`, `source-*`), a `license` value that is SPDX or `"other"` (not `"proprietary"`), a `providers[]` array, and continues to populate the existing `summaries` block. The Collection MUST validate against the STAC 1.1 JSON Schema.

**Why this priority**: Co-equal with US1. The Collection is what STAC Browser lands on first — without the upgraded Collection, the rendered top-level page in the verification step (US3) is missing the headline metadata that proves the catalog is well-formed. Also, `summaries` rebuild logic (`update_collection_summaries`, `rebuild_collection_summaries`) needs touching anyway when the Item shape changes, so it's natural to land both halves together.

**Independent Test**: Create a fresh empty Collection through `debrief-stac.create_collection()`, then add one Item, then assert the Collection JSON validates against the STAC 1.1 Collection JSON Schema and contains an `item_assets` block whose keys match the Item's `assets` keys.

**Acceptance Scenarios**:

1. **Given** the Collection factory has been upgraded, **When** a Collection is materialised, **Then** it has `stac_version: "1.1.0"` and `item_assets` keyed by `features` + `thumbnail` + `overview` + `source-*` (wildcard expression) with each entry declaring `type` and `roles` (no `href`, since `item_assets` describes the shape, not specific URLs).
2. **Given** an upgraded Collection, **When** validated against the official STAC 1.1 Collection JSON Schema (`https://schemas.stacspec.org/v1.1.0/collection-spec/json-schema/collection.json`), **Then** validation passes with zero errors.
3. **Given** an upgraded Collection, **When** `summaries` is recomputed (incremental or full rebuild), **Then** the summary contents are unchanged from the 1.0 baseline (Phase 1 doesn't change which fields are summarised — only the surrounding Collection envelope evolves).
4. **Given** an upgraded Collection, **When** its `license` is read, **Then** the value is a SPDX expression or `"other"` (never `"proprietary"` or `"various"`); when it is `"other"`, a `cite-as` or `license` link is present in `links[]`.

---

### User Story 3 — Catalog regeneration brings all 73 sample items up to the new shape (Priority: P1)

A maintainer runs the catalog regeneration pipeline against `preview/workspace/samples/local-store/`. After the run, every one of the 73 `item.json` files has `stac_version: "1.1.0"`, the new metadata fields populated, `processing:*` mirroring `debrief:provenance`, `file:size` + `file:checksum` on every disk-backed asset, `assets.overview` reclassified from the old `assets.thumbnail` (large variant) plus a new small `assets.thumbnail` if missing, and `created` + `updated` set to the regeneration timestamp (or, ideally, lifted from git history of the previous `item.json` for `created` and the regeneration time for `updated`). The promoted `catalog.json` Collection has its `license` migrated from `"proprietary"` to a SPDX value or `"other"` and gains a `providers[]` array and `item_assets` block.

**Why this priority**: P1 because demo credibility depends on it. Stakeholders judge "does Debrief follow STAC best practices?" by browsing the bundled catalog, not by reading the Item factory's source. Code-only fixes would leave 73 plots speaking the old shape — every demo would show the gap rather than the fix. This story also ensures the verification step (US4) has data to render.

**Independent Test**: Run the regeneration script. Diff the resulting catalog against a golden snapshot of expected shape (a small sampler — three items, plus the catalog) and assert all expected fields are present, all forbidden fields are absent (no remaining `"proprietary"`, no remaining 800×600 PNG at `assets.thumbnail`).

**Acceptance Scenarios**:

1. **Given** the regeneration pipeline has run, **When** any item's `item.json` is loaded, **Then** it has `stac_version: "1.1.0"`, declares `processing` + `file` + `debrief` extensions, has populated `created` + `updated` + `license` + `providers`, has `processing:*` on source assets, has `file:size` + `file:checksum` on every disk-backed asset, has `assets.thumbnail` (200×150) and `assets.overview` (800×600), and has `proj:shape` on both.
2. **Given** regeneration has run, **When** the on-disk thumbnail PNG bytes are inspected, **Then** the previously-named `thumbnail.png` (800×600) has been renamed to `overview.png` and its asset entry path updated; the existing `thumbnail-sm.png` (200×150) has been promoted to `thumbnail.png` (or the asset key updated to point at the existing file). No PNGs are deleted; the thumbnail capture pipeline does not need to re-run.
3. **Given** regeneration has run, **When** `catalog.json` is loaded, **Then** the `license` is no longer `"proprietary"`, an `item_assets` block is present, a `providers[]` array is present, and `stac_version` is `1.1.0`.
4. **Given** regeneration has run, **When** the existing schema-adherence and Item-shape unit tests are executed, **Then** all tests pass (the regenerated catalog must satisfy every existing invariant).
5. **Given** regeneration has run, **When** `git diff --stat` is reviewed, **Then** every item directory has a modified `item.json`, no item directory has a deleted file (rename of `thumbnail.png → overview.png` is via `git mv`, not delete-and-add), and `catalog.json` is modified.

---

### User Story 4 — Open-source STAC browser renders our catalog (Priority: P1)

A short Playwright test serves the regenerated `local-store` catalog and points an instance of `radiantearth/stac-browser` at it. The test drives the browser to (a) the Collection landing page, (b) one Item detail page, (c) the asset list for that Item, then captures screenshots at each stage. The test asserts that thumbnails render, that `processing:*` and `file:*` fields appear in the rendered metadata panels (proof that `stac-fields` is pretty-printing them out of the box, which is the entire point of using standard extensions), and that no console errors are logged. Screenshots are written to `specs/241-stac-best-practices-upgrade/evidence/` as the blog post's hero artefacts.

**Why this priority**: P1 alongside the regeneration. This is the **proof of value** for the whole feature — anyone can see in 30 seconds that our catalog is consumable by industry-standard tooling. Without this, the spec ships an internal cleanup with no external evidence; with it, we have a verifiable claim ("Debrief catalogs work in radiantearth/stac-browser") and three or four screenshots ready for the blog post.

**Independent Test**: After US1+US2+US3 land, the test runs against the regenerated catalog. CI passes, screenshots are committed under `evidence/`. The test must run headlessly (no manual configuration) and complete in under 60 seconds on the CI machine.

**Acceptance Scenarios**:

1. **Given** the regenerated catalog and a configured stac-browser instance, **When** the Playwright test navigates to the Collection landing page, **Then** the page renders within 5 seconds, the Collection title and description are visible, the `item_assets` block is shown in the metadata panel, the `providers[]` are rendered as attribution, and a screenshot is captured at `evidence/stac-browser-collection.png`.
2. **Given** the test has navigated to the Collection, **When** it clicks through to a representative Item (e.g. `core--boat1t`), **Then** the Item detail page renders with the thumbnail (200×150) and the overview (800×600) both displayed, the `processing:*` fields are pretty-printed in the metadata sidebar, the `debrief:platforms` array is rendered (raw JSON acceptable — `stac-fields` doesn't know our extension), and a screenshot is captured at `evidence/stac-browser-item.png`.
3. **Given** the Item detail page, **When** the assets section is expanded, **Then** the `features`, `thumbnail`, `overview`, and `source-*` assets are all listed with their `type`, `title`, `roles`, `file:size`, and `file:checksum` rendered, and a screenshot is captured at `evidence/stac-browser-assets.png`.
4. **Given** the test has run to completion, **When** the captured browser console log is inspected, **Then** there are zero error-level entries (warnings about our custom `debrief:*` fields are acceptable; broken links, 404s, schema-validation failures are not).
5. **Given** the test runs on CI, **When** any of the three screenshots is missing or any of the rendering assertions fails, **Then** the test fails with a clear diagnostic pointing at the specific assertion that broke (e.g. "expected `file:size` to be visible in asset panel — element not found").

---

### Edge Cases

- **Source file no longer exists on disk for `file:checksum` computation**: regeneration may run against legacy items whose `debrief:provenance.source_path` points to a `/tmp/...` location from an earlier import run. In that case, `file:checksum` is computed only for assets stored under the item directory (`./assets/...`); the `derived_from` source URI gets `file:size`/`file:checksum` only if the path is reachable, otherwise both fields are omitted (not faked, not zero, not null). This matches STAC's "omit if unknown" rule rather than misrepresenting integrity.
- **Existing `debrief:provenance.load_timestamp` is the wrong shape for `processing:datetime`**: load_timestamp is RFC 3339 with sub-millisecond precision; `processing:datetime` requires RFC 3339 UTC. If the existing field is timezone-naïve or non-UTC, the regeneration normalises to UTC; the `debrief:provenance` field is left untouched.
- **Multihash dependency for `file:checksum`**: STAC requires multihash-encoded checksums (a binary format wrapping the algorithm identifier + digest). The Python `multihash` package handles this; if the dependency is rejected at review time, fall back to documenting the gap and shipping `file:size` only (a partial conformance is better than no conformance).
- **STAC Browser refuses to load a `file://` catalog**: standard STAC Browser deployments expect `http(s)://` catalogs. The Playwright test serves the catalog over a local HTTP server (Python `http.server` or Node `serve`) on a fixed port, then points stac-browser at that URL. The serve step is part of the test's setup, not assumed pre-existing.
- **Regeneration produces a 73-file noisy git diff**: every `item.json` will be modified. To keep the diff reviewable, regeneration emits the new fields in a stable canonical order (matching the existing key order plus new keys at the end of each section). Reviewers should be told upfront that the diff is large and structural, not semantic.
- **Item factory and regeneration script disagree about `created`**: the factory sets `created` to the current time when a new plot is made; regeneration of an existing plot must NOT overwrite `created` (would falsely claim the plot was created at regeneration time). Regeneration sets `created = file mtime of original item.json` (or `git log --diff-filter=A` for the commit that introduced it, fallback to mtime) and `updated = now`. New plots created post-regeneration use the factory path and get `created = updated = now` on first write.
- **`license: "other"` requires a `license` link**: the spec says when `license` is `"other"`, a link object with `rel: "license"` must be present in `links[]`. We default to `"other"` for the bundled sample catalog (sample/demo data; not redistributable beyond Debrief use); a single internal license-page link is added.
- **Round-trip with VS Code's existing read path**: VS Code currently reads `assets.thumbnail` to render plot tiles. Reclassifying the large variant as `assets.overview` will change which asset the existing reader picks up. The reader needs a one-line update to prefer `assets.thumbnail` (now small) for tile views and `assets.overview` (now large) for full-size renders. This is in scope for US1 (since we own the round-trip surface) and is covered by existing VS Code integration tests.
- **STAC Browser version drift**: `radiantearth/stac-browser` is on a steady release cadence. The Playwright test pins a specific version (declared in `package.json`) and bumps deliberately. A floating dependency would make the screenshots non-reproducible.

## Requirements *(mandatory)*

### Functional Requirements

#### Item factory upgrades (US1)

- **FR-001**: The Item factory MUST emit `stac_version: "1.1.0"` on every new Item.
- **FR-002**: The Item factory MUST add the processing extension URI (`https://stac-extensions.github.io/processing/v1.2.0/schema.json`) and the file-info extension URI (`https://stac-extensions.github.io/file/v2.1.0/schema.json`) to `stac_extensions[]` on every new Item, alongside the existing `debrief` extension URI.
- **FR-003**: The Item factory MUST set `properties.created` and `properties.updated` to RFC 3339 UTC timestamps on Item creation. `created` MUST be preserved across subsequent edits; `updated` MUST be refreshed on any write.
- **FR-004**: The Item factory MUST set `properties.license` to a value that is either a SPDX expression (e.g. `"CC-BY-4.0"`) or the literal `"other"`. The values `"proprietary"` and `"various"` MUST NOT be emitted (deprecated in STAC 1.1.0).
- **FR-005**: The Item factory MUST emit a `properties.providers[]` array with at least one entry. Each entry's `roles` MUST be drawn from the standard enum: `licensor`, `producer`, `processor`, `host`.
- **FR-006**: For every source asset (existing `roles: ["source"]`), the Item factory MUST co-publish `processing:software` (a `Map<string,string>` of name → version, e.g. `{"debrief-stac": "0.1.0"}`) mirroring `debrief:provenance.tool_version`, and `processing:datetime` (RFC 3339 UTC) mirroring `debrief:provenance.load_timestamp`. The existing `debrief:provenance` field MUST be retained unchanged.
- **FR-007**: For every asset whose bytes are stored on disk under the item directory, the Item factory MUST emit `file:size` (bytes, as integer) and `file:checksum` (multihash-encoded SHA-256 of the asset contents). Assets whose bytes are not on disk (e.g. external `derived_from` URIs that cannot be hashed) MUST omit both fields rather than emit zero or null.
- **FR-008**: The Item factory MUST emit two thumbnail-class assets:
  - `assets.thumbnail`: the 200×150 PNG, with `roles: ["thumbnail"]`, `type: "image/png"`, `proj:shape: [150, 200]`.
  - `assets.overview`: the 800×600 PNG, with `roles: ["overview"]`, `type: "image/png"`, `proj:shape: [600, 800]`.
- **FR-009**: The Item factory MUST keep the existing `links[]` self/root/parent/collection/derived_from semantics unchanged. The relative `./item.json` self-link is preserved (defensible under STAC 1.1's relaxed self-link guidance).

#### Collection factory upgrades (US2)

- **FR-010**: The Collection factory MUST emit `stac_version: "1.1.0"` on every Collection (including the promoted `catalog.json`).
- **FR-011**: The Collection factory MUST emit an `item_assets` block declaring the asset shape every Item exposes. Required keys: `features` (`type: "application/geo+json"`, `roles: ["data"]`), `thumbnail` (`type: "image/png"`, `roles: ["thumbnail"]`), `overview` (`type: "image/png"`, `roles: ["overview"]`). Source assets are declared with a single `source` key (using `roles: ["source"]`); per-Item naming variation (`source-boat1t`, `source-foo`) does not need to appear in `item_assets`, since the block describes the contract, not specific instances.
- **FR-012**: The Collection factory MUST emit `license` (SPDX or `"other"`; never `"proprietary"`) and `providers[]` (same constraints as FR-005). When `license` is `"other"`, a `links[]` entry with `rel: "license"` MUST be present.
- **FR-013**: The Collection factory's existing `summaries` computation (incremental + full rebuild) MUST continue unchanged in behaviour. The 1.1 envelope wraps the same summaries; the contents are unchanged.
- **FR-014**: The Collection factory MUST satisfy the official STAC 1.1 Collection JSON Schema. A schema-validation step is added to the existing schema-adherence test suite.

#### Catalog regeneration (US3)

- **FR-015**: A regeneration script MUST update every `item.json` under `preview/workspace/samples/local-store/` to the new shape (FR-001 through FR-009). The script lives at `scripts/upgrade-catalog-to-stac-1.1.py` and is run once at PR time; the script is **not** retained in the repository indefinitely (per the precedent set by #228's regenerator).
- **FR-016**: The regeneration script MUST set `created` to the file's git introduction date (`git log --diff-filter=A --format=%aI -- {path}`, falling back to filesystem mtime if the file is untracked) and `updated` to the regeneration timestamp.
- **FR-017**: The regeneration script MUST rename the existing 800×600 `thumbnail.png` to `overview.png` via `git mv` (preserving git history), update the asset entry from `assets.thumbnail` to `assets.overview` (key change, not just role change), and either rename the existing `thumbnail-sm.png` to `thumbnail.png` (so the small variant takes the conventional key) **or** update `assets.thumbnail.href` to point at `thumbnail-sm.png` (keeping the file name). The choice is the implementer's; consistency across all 73 items is what the test enforces.
- **FR-018**: The regeneration script MUST update `catalog.json` to STAC 1.1.0 with the new `license`, `providers[]`, and `item_assets` block. The `summaries` block is unchanged.
- **FR-019**: The regeneration script MUST be idempotent — running it twice produces zero diff on the second run.
- **FR-020**: The regeneration script MUST validate every produced Item and the Collection against the STAC 1.1 JSON Schema as a final step. Any validation failure halts the script with a clear error.
- **FR-021**: The existing schema-adherence and Item-shape unit tests MUST pass against the regenerated catalog without modification (only the test fixtures may need to be updated, not the test logic).

#### STAC Browser verification (US4)

- **FR-022**: A new Playwright test at `tests/e2e/stac-browser-interop.spec.ts` (or equivalent location for the test runner) MUST serve the regenerated `preview/workspace/samples/local-store/` catalog over a local HTTP server, launch an instance of `radiantearth/stac-browser` configured to read from that URL, and drive the browser through Collection → Item → assets.
- **FR-023**: The test MUST capture three PNG screenshots at `specs/241-stac-best-practices-upgrade/evidence/stac-browser-collection.png`, `.../stac-browser-item.png`, `.../stac-browser-assets.png`. Screenshots are committed to the repository as evidence artefacts and as blog post material.
- **FR-024**: The test MUST assert the following render correctly: the Collection title and description, at least one provider, the thumbnail image element, the overview image element, the `processing:datetime` value (or any `processing:*` field rendered by `stac-fields`), the `file:size` value (or `file:checksum`), and the asset list with all expected role-tagged entries.
- **FR-025**: The test MUST assert zero browser-console errors during the navigation. Warnings about unknown `debrief:*` extensions are tolerated; HTTP 404s, JSON parse failures, schema validation errors, and JavaScript exceptions are not.
- **FR-026**: The test MUST run headlessly and MUST complete in under 60 seconds on the CI machine. The stac-browser version MUST be pinned in the test's package config (no floating major version).
- **FR-027**: The test MUST be wired into `task verify` and the CI workflow alongside the existing Playwright tests, with the same retry/flakiness budget as siblings.

#### Reader compatibility (cross-cutting)

- **FR-028**: VS Code's existing tile-rendering path (currently reading `assets.thumbnail` to render the small tile in the catalog browser) MUST be updated to continue rendering the small (200×150) variant — i.e. it still reads `assets.thumbnail`, which under the new convention IS the small variant. Any path that currently reads the 800×600 from `assets.thumbnail` (e.g. preview panes) MUST be updated to read `assets.overview`.
- **FR-029**: The web-shell's existing STAC reader paths (`shared/components/`, `apps/web-shell/`) MUST be audited for the same `assets.thumbnail` / `assets.overview` distinction and updated where they currently assume the large variant lives at `assets.thumbnail`.

### Key Entities

- **Standard STAC extensions adopted** (declared in every Item's `stac_extensions[]`):
  - **Processing extension** (`processing` v1.2.0): `processing:software` (Map<string,string>), `processing:datetime` (RFC 3339 UTC). Optionally `processing:level`, `processing:facility`, `processing:lineage` (free text).
  - **File-info extension** (`file` v2.1.0): `file:size` (bytes, integer), `file:checksum` (multihash-encoded SHA-256). Optionally `file:header_size`, `file:byte_order`, `file:local_path`.
- **STAC 1.1.0 Collection-level addition**: `item_assets` (now in core spec, not extension). Block describes the contract for every Item's `assets`; values use the same Asset Object shape as Items, minus `href`.
- **Existing Debrief STAC extension** (unchanged): `debrief:platforms`, `debrief:tags`, `debrief:feature_tags`, `debrief:overrides`, `debrief:provenance_log`, `debrief:provenance` (asset-level). Schema URI continues at `https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json`.

## Current Catalog Audit

A scan of the bundled `preview/workspace/samples/local-store/` catalog (73 items + `catalog.json`) on 2026-05-02:

| Convention | Compliant items / 73 | Gap |
|---|---:|---|
| `stac_version: "1.1.0"` | 0 | All items on 1.0.0 |
| `stac_extensions` includes `processing` | 0 | Standard lineage extension not declared |
| `stac_extensions` includes `file` | 0 | Standard asset-integrity extension not declared |
| `stac_extensions` includes `debrief` | 73 | ✓ |
| `properties.created` | 0 | Not emitted |
| `properties.updated` | 0 | Not emitted |
| `properties.license` (Item-level) | 0 | Not emitted (Catalog has it) |
| `properties.providers[]` | 0 | Not emitted |
| `processing:software` on source assets | 0 | Equivalent data lives under `debrief:provenance.tool_version` |
| `processing:datetime` on source assets | 0 | Equivalent data lives under `debrief:provenance.load_timestamp` |
| `file:size` on disk-backed assets | 0 | Asset integrity not declared |
| `file:checksum` on disk-backed assets | 0 | Asset integrity not declared |
| `assets.thumbnail` (200×150) | 73 | ✓ — but currently called `thumbnail-sm` with the 800×600 occupying the canonical `thumbnail` key |
| `assets.overview` (800×600) | 0 | The 800×600 PNG exists but is keyed as `assets.thumbnail`, mis-classifying it |
| `proj:shape` on thumbnail assets | 0 | STAC Browser can't reserve layout space |
| `derived_from` link | 73 | ✓ |

| Catalog (`catalog.json`) field | Current | New target |
|---|---|---|
| `stac_version` | `1.0.0` | `1.1.0` |
| `license` | `"proprietary"` (deprecated in 1.1.0) | SPDX or `"other"` |
| `providers[]` | absent | present, with `roles` from standard enum |
| `item_assets` | absent | present, declaring `features`/`thumbnail`/`overview`/`source` shape |
| `summaries` | present | unchanged |
| Self-link href | relative (`./catalog.json`) | unchanged (STAC 1.1 allows relative) |

The audit data above is the current ground truth as of 2026-05-02 and seeds the spec's Acceptance Scenarios.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 73/73 sample-catalog items validate against the STAC 1.1.0 Item JSON Schema. The `catalog.json` validates against the STAC 1.1.0 Collection JSON Schema. Both validations are wired into the schema-adherence test suite as a permanent gate.
- **SC-002**: 0/73 items contain the deprecated `license` values `"proprietary"` or `"various"`. 0/73 items have the 800×600 PNG keyed as `assets.thumbnail` (it lives at `assets.overview`).
- **SC-003**: The Playwright STAC Browser test (FR-022 → FR-027) passes deterministically on three consecutive CI runs with zero retries needed. The three captured screenshots are present in `evidence/` and are byte-stable across runs (modulo timestamp overlays from stac-browser itself, if any).
- **SC-004**: A reviewer pointing the public radiantearth/stac-browser instance (`https://radiantearth.github.io/stac-browser/#/external/`) at our HTTP-served local catalog can browse Collection → Item → assets without seeing any "extension not understood" errors above the warning level (warnings about `debrief:*` are acceptable; no errors). This is a one-shot manual check, not an automated assertion, but is a qualitative success criterion for the blog post claim.
- **SC-005**: The blog post (drafted in Phase 4 per `tasks.md`) leads with the `evidence/stac-browser-collection.png` screenshot as its hero image, and references the other two evidence screenshots in the body. Publication of the blog post is an explicit success criterion: this work is partly motivated by the media story.
- **SC-006**: Every consumer of the Item shape (VS Code tile renderer, web-shell catalog browser, properties panel, MCP tool layer) continues to function correctly against the regenerated catalog. Any regression in existing E2E tests halts the PR.
- **SC-007**: Running the regeneration script a second time after the first completes produces zero git diff (idempotency).
- **SC-008**: Total time from `git checkout` of the merged feature to a working, validated, regenerated catalog (for a fresh contributor) is under 5 minutes — the regeneration is `task verify` plus one extra script invocation, no manual tweaking.

## Out of Scope

- **STAC API**: this work covers static catalogs only. Adding a STAC API (search endpoint, transactions extension) remains out of scope; the existing Vite middleware for `/stac-store/` GET is not extended.
- **Migrating the `debrief:` extension to a different namespace**: the schema URI at `https://debrief.info/stac-extensions/debrief/v1.0.0/schema.json` continues to host Debrief-specific extension content. Re-publishing it under a different domain or version is not in scope.
- **Adopting the Versioning extension** (`version`, `deprecated`, `experimental` fields): worth doing but separate spec — would benefit Storyboard scene revisions and metadata patches, not in scope here.
- **Adopting the Scientific Citation extension** (`sci:doi`, `sci:citation`): no DOIs in our catalog today.
- **Replacing `debrief:provenance` and `debrief:provenance_log` with a standard provenance extension**: there is no standard provenance extension in the official registry. The W3C-PROV-aligned STACD proposal (PROPL 2025) is research, not standard. We continue to use the bespoke fields.
- **Changing the `summaries` schema or behaviour**: the Collection summaries machinery (#136) is unchanged. Only the Collection envelope evolves.
- **Migrating `stac_version` past 1.1.0**: when a stable 1.2 lands, that's a separate spec.
- **Changing the `assets.thumbnail` capture pipeline** (#174's modern-screenshot + sharp): the capture machinery is reused as-is; only how the resulting PNGs are labelled in the Item changes.

## Dependencies

- ADR-028 must land first (or in the same PR), as the spec implements its policy.
- Optional: install `multihash` Python package for `file:checksum` encoding. If review rejects the new dependency, fall back to `file:size` only and document the gap.
- The Playwright test (US4) requires `radiantearth/stac-browser` as a dev dependency, version pinned. If the dev-dep budget is tight, an alternative is to inline a minimal stac-browser-equivalent snapshot test, but the marketing value of using the real browser is what makes this story P1.

## Constitution Check

| Article | Compliance |
|---|---|
| **I.1 Offline by default** | ✅ — no new network requirements; STAC Browser runs locally over HTTP for the test, the catalog is static files. |
| **II.1 Schema tests mandatory** | ✅ — STAC 1.1 Collection + Item JSON Schema validation added to the adherence suite. The `debrief:` LinkML schema is unchanged. |
| **III.1 Provenance always** | ✅ — no provenance is removed. `debrief:provenance` and `debrief:provenance_log` remain authoritative; standard `processing:*` fields are co-published as a legibility layer. |
| **III.2 Source preservation** | ✅ — `derived_from` links unchanged; source assets unchanged. |
| **III.3 Audit trail immutable** | ✅ — `debrief:provenance_log` rotation/archive is unchanged. |
| **IV Services never touch UI** | ✅ — this is a service-layer change. UI consumers only update which asset key they read (`thumbnail` for small, `overview` for large). |
| **V Tests required** | ✅ — every functional requirement has a test in `tasks.md`. |
| **VI Specs before code** | ✅ — this spec, plus ADR-028, lands before implementation. |
| **XV Strict type safety** | ✅ — Pydantic models for new asset properties (`processing:*`, `file:*`) come from existing extension JSON Schemas; LinkML continues to source `debrief:*`. |
