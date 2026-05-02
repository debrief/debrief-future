# Tasks: STAC 1.1.0 + best-practices upgrade

**Input**: Design documents from `/specs/241-stac-best-practices-upgrade/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Constitution**: Articles I (offline-first), II (schema integrity), III (provenance), IV (services-thick / frontends-thin), VI (testing), XV (strict types) all engaged.

**Tests**: Required throughout. Article VI mandates schema tests, unit tests, and integration tests on every codepath. Schema validation against vendored STAC 1.1 schemas is a permanent CI gate (Article I.3 — no silent skip).

**Organization**: Tasks are grouped by user story (P1 throughout) to enable independent verification. Cross-cutting reader migration (decision 1B + FR-028/FR-029) lives in its own phase between the factory work and the catalog regeneration so readers are ready before the regenerated catalog lands on disk.

---

## Evidence Requirements

**Evidence Directory**: `specs/241-stac-best-practices-upgrade/evidence/`
**Media Directory**: `specs/241-stac-best-practices-upgrade/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | pytest + vitest + Playwright counts, coverage, key scenarios verified. YAML front matter per template. | After all phases pass |
| `evidence/usage-example.md` | Concrete demonstration: regenerate, validate, browse — 3 commands + expected output | After regen + Playwright land |
| `evidence/stac-browser-collection.png` | STAC Browser rendered Collection landing page (FR-023). Hero asset of the blog post (SC-005). | Captured by Playwright in Phase 7 |
| `evidence/stac-browser-item.png` | STAC Browser rendered Item detail page with thumbnail, overview, processing:* fields (FR-023). | Captured by Playwright in Phase 7 |
| `evidence/stac-browser-assets.png` | STAC Browser rendered asset list with `file:size`/`file:checksum` columns (FR-023). | Captured by Playwright in Phase 7 |
| `evidence/sample-item-diff.md` | Before/after structural diff snippet for one regenerated item (e.g. `core--boat1`). Demonstrates the shape change concretely. | After regeneration |
| `evidence/sample-collection-diff.md` | Before/after structural diff snippet for `catalog.json`. | After regeneration |
| `evidence/round-trip-evidence.md` | Round-trip proof: factory → JSON → vendored STAC 1.1 schema validation → factory rehydrate. Article II.1 schema integrity. | After test suite passes |
| `evidence/regeneration-output.txt` | Captured stdout of `scripts/upgrade-catalog-to-stac-1.1.py` first run + the zero-diff second run. Idempotency proof (SC-007). | After regen |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions). Hook is the planned `stac-browser-collection.png` screenshot. | **Already cached during `/speckit.plan`** |
| `media/shipped-post.md` | Feature blog post combining cached opener + ship-time evidence. First three sections copied verbatim from `evidence/opening-context.md`. | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with all evidence + media | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Land the dependency pins, fixture directories, and refresh scripts that subsequent phases consume. Nothing user-visible yet — everything is plumbing.

**Independent test criterion**: `uv sync` adds `multiformats` to `services/stac/`'s lockfile; the two fixture directories exist; `pnpm install` adds `http-server` to the web-shell workspace. No factory or reader logic changes.

- [x] T001 Pin `multiformats` (latest stable, e.g. `>=0.3.0`) in `services/stac/pyproject.toml` `dependencies`. Run `uv sync` to update lockfile. `services/stac/pyproject.toml`
- [x] T002 [P] Add `http-server` (latest stable major) as a `devDependency` in the web-shell workspace. `apps/web-shell/package.json`
- [x] T003 [P] Create the schema fixtures directory and refresh script header (no schemas yet — they're vendored in T006). `services/stac/tests/fixtures/stac-schemas/v1.1.0/.gitkeep` and `scripts/refresh-stac-schemas.sh`
- [x] T004 [P] Create the stac-browser fixture directory and refresh script header (no dist yet — vendored in T007). `apps/web-shell/test-fixtures/stac-browser-v3.3.4/.gitkeep` and `scripts/refresh-stac-browser-fixture.sh`
- [x] T005 [P] Make both refresh scripts executable and idempotent (re-runs overwrite safely). Document the bump procedure inline. `scripts/refresh-stac-schemas.sh`, `scripts/refresh-stac-browser-fixture.sh`
- [x] T006 Run `scripts/refresh-stac-schemas.sh` to vendor STAC 1.1.0 Item + Collection JSON Schemas plus all referenced sub-schemas. Commit the resulting tree under the v1.1.0 directory. `services/stac/tests/fixtures/stac-schemas/v1.1.0/`
- [x] T007 Run `scripts/refresh-stac-browser-fixture.sh` to clone radiantearth/stac-browser at v3.3.4, run its `npm run build`, and copy the `dist/` output into the fixture directory. Commit the resulting tree. `apps/web-shell/test-fixtures/stac-browser-v3.3.4/`

**Parallel execution**: T002 / T003 / T004 / T005 are independent file creations and can run together. T006 depends on T003 + T005; T007 depends on T004 + T005.

## Phase 2: Foundation

**Goal**: Land the shared helpers (`_helpers.py`), bump the central `STAC_VERSION` constant, and rewire the schema-validation harness to use the vendored fixtures with no network probe. These changes block every user story; nothing in US1–US4 can be implemented or tested cleanly until they're in place.

**Independent test criterion**: `pytest services/stac/tests/test_helpers.py` passes; `pytest services/stac/tests/test_stac_validation.py` runs unconditionally (no network probe) and validates a canned 1.1.0 Item against the vendored schemas.

- [x] T008 Create `_helpers.py` with `multihash_sha256(path)`, `multihash_sha256_bytes(data)`, `iso_now_utc()`, `normalise_to_utc(ts)`, `DEFAULT_PROVIDERS`, and the three STAC extension URI constants (debrief / processing / file). Strictly typed; no `Any`. `services/stac/src/debrief_stac/_helpers.py`
- [x] T009 [P][test] Write unit tests covering every helper: multihash round-trip against a known fixture; UTC normalisation of timezone-naive + non-UTC inputs; DEFAULT_PROVIDERS shape. `services/stac/tests/test_helpers.py`
- [x] T010 Bump `STAC_VERSION` from `"1.0.0"` to `"1.1.0"` in `services/stac/src/debrief_stac/types.py`. Update any in-module reference (e.g. `__all__`). `services/stac/src/debrief_stac/types.py`
- [x] T011 Remove the network probe at `services/stac/tests/test_stac_validation.py:17–23` (the `urllib.request.urlopen` gate). Replace with a configuration that points `stac_validator.StacValidate` at the vendored schemas under `services/stac/tests/fixtures/stac-schemas/v1.1.0/` (use `--schema_url` or its programmatic equivalent / a local schema-resolver hook). `services/stac/tests/test_stac_validation.py`
- [x] T012 [test] Add an explicit assertion in `test_stac_validation.py` that fails loudly if the vendored schemas directory is missing or empty (defensive — catches a deleted fixture during review). `services/stac/tests/test_stac_validation.py`
- [x] T013 [test] Add a smoke test that validates a hand-crafted minimal STAC 1.1.0 Item against the vendored schemas — proves the resolver wiring works end-to-end before any factory output exists. `services/stac/tests/test_stac_validation.py`

**Parallel execution**: T009 is independent of T010/T011/T012/T013 (it tests `_helpers.py` only). T011/T012/T013 all touch the same file and must run sequentially.

## Phase 3: US1 — Item factory emits STAC 1.1.0 with standard metadata extensions (P1)

**Goal**: A new plot created via `debrief-stac.create_plot()` produces a STAC 1.1.0 Item declaring the `processing` and `file` extensions alongside `debrief`, with `created`/`updated`/`license`/`providers`, with `processing:*` mirroring `debrief:provenance` on source assets, with `file:size`/`file:checksum` on every disk-backed asset, and with `assets.thumbnail` (200×150) + `assets.overview` (800×600) plus `proj:shape` on each.

**Independent test criterion (FR-001 → FR-009)**: Run a unit test that loads a single REP file end-to-end through `debrief-stac.create_plot()` + `add_features()` + `attach_thumbnails()` + `add_source_asset()` and asserts the resulting `item.json` validates against `contracts/item-shape.schema.json` AND the vendored STAC 1.1 Item Schema. No catalog, no UI, no Playwright required.

- [x] T014 Update `plot.create_plot()` to bump `stac_version` to `"1.1.0"`, append the `processing` and `file` extension URIs to `stac_extensions[]`, and emit `properties.created` / `properties.updated` / `properties.license` (default `"other"`) / `properties.providers` (default `DEFAULT_PROVIDERS`). Preserve `created` on subsequent edits by reading the on-disk JSON before re-emitting. `services/stac/src/debrief_stac/plot.py`
- [x] T015 Update `assets.add_source_asset()` to co-publish `processing:software` (mirroring `debrief:provenance.tool_version`) and `processing:datetime` (mirroring `debrief:provenance.load_timestamp`, normalised to UTC). Compute `file:size` + `file:checksum` when the source path is reachable on disk; omit both fields otherwise (never zero, never null). Refresh `properties.updated` on every write. Existing `debrief:provenance` field unchanged. `services/stac/src/debrief_stac/assets.py`
- [x] T016 Update `thumbnails.store_thumbnail()` to write `thumbnail.png` (200×150) and `overview.png` (800×600) to the item directory (new naming), register them as `assets.thumbnail` (`roles: ["thumbnail"]`, `proj:shape: [150, 200]`) and `assets.overview` (`roles: ["overview"]`, `proj:shape: [600, 800]`) respectively, and emit `file:size` + `file:checksum` on both. Drop the legacy `assets.thumbnail-sm` key. Refresh `properties.updated`. `services/stac/src/debrief_stac/thumbnails.py`
- [x] T017 Make `thumbnails.store_thumbnail()` the single asset-writing seam for plot-level thumbnails: ensure it accepts the same call signature shape that callers (including the new TS surface in Phase 5) need. No host-side direct fs writes are added; the function owns the entire lifecycle. `services/stac/src/debrief_stac/thumbnails.py`
- [x] T018 [test] Extend `test_plot.py` to call `create_plot()` end-to-end and assert the resulting Item validates against `contracts/item-shape.schema.json` AND the vendored STAC 1.1 Item Schema. Cover FR-001 through FR-005. `services/stac/tests/test_plot.py`
- [x] T019 [P][test] Write `created`/`updated` lifecycle tests: created preserved across edits; updated refreshed on every write; updated monotonic (≥ previous updated, ≥ created). `services/stac/tests/test_plot.py`
- [x] T020 [P][test] Write source-asset tests asserting `processing:software` / `processing:datetime` mirror `debrief:provenance` correctly, and that `file:size`/`file:checksum` are present for reachable paths and absent for unreachable ones (FR-006, FR-007, edge case in spec). `services/stac/tests/test_assets.py`
- [x] T021 [P][test] Write thumbnail-pair tests asserting `assets.thumbnail` is the 200×150 / `assets.overview` is the 800×600 / both have correct `proj:shape` / both have `file:size` + `file:checksum` (FR-008). `services/stac/tests/test_thumbnails.py`

**Parallel execution**: T014 / T015 / T016 / T017 modify three different source files (T016 + T017 share `thumbnails.py` and run sequentially) and can run together as soon as Phase 2 lands. T019 / T020 / T021 are independent test files and can run together.

## Phase 4: US2 — Collection factory emits STAC 1.1.0 with `item_assets` self-documentation (P1)

**Goal**: The promoted `catalog.json` Collection has `stac_version: "1.1.0"`, an `item_assets` block declaring the asset shape every Item exposes (`features`, `thumbnail`, `overview`, `source`, `scene-thumbnail`), a SPDX-or-`"other"` `license` value (with the corresponding `rel: "license"` link), a `providers[]` array, and continues to populate the existing `summaries` block unchanged. The Collection MUST validate against the STAC 1.1 Collection JSON Schema.

**Independent test criterion (FR-010 → FR-014)**: Create a fresh empty Collection, add one Item, assert the Collection JSON validates against `contracts/collection-shape.schema.json` AND the vendored STAC 1.1 Collection Schema, and that its `item_assets` keys match the contract.

- [ ] T022 Add `ITEM_ASSETS_TEMPLATE` module-level constant to `collection.py` containing the five logical asset declarations (`features`, `thumbnail`, `overview`, `source`, `scene-thumbnail`) per data-model.md. `services/stac/src/debrief_stac/collection.py`
- [ ] T023 Update `collection.rebuild_collection_summaries()` to emit `stac_version: "1.1.0"`, set `license` to `"other"` if absent (or normalise from the deprecated `"proprietary"` value), set `providers` to `DEFAULT_PROVIDERS` if absent, write the `item_assets` block from `ITEM_ASSETS_TEMPLATE`, and add a `links[]` entry with `rel: "license"` when `license == "other"`. Existing `summaries` computation unchanged. `services/stac/src/debrief_stac/collection.py`
- [ ] T024 [test] Extend `test_collection.py` to assert the rebuilt Collection validates against `contracts/collection-shape.schema.json` AND the vendored STAC 1.1 Collection Schema. Cover FR-010, FR-011, FR-012, FR-014. `services/stac/tests/test_collection.py`
- [ ] T025 [P][test] Write a regression test for FR-013: the Collection's `summaries` contents (debrief:tags / debrief:feature_tags / debrief:platforms aggregations) are byte-identical to the 1.0 baseline for the same Item set. `services/stac/tests/test_collection.py`
- [ ] T026 [P][test] Write a test asserting that when `license == "other"`, the Collection has exactly one `links[]` entry with `rel: "license"`; when `license` is an SPDX expression, no such link is required. `services/stac/tests/test_collection.py`

**Parallel execution**: T022 + T023 modify the same file and run sequentially. T024 / T025 / T026 share a test file and can be implemented as separate test functions in parallel by different sessions.

## Phase 5: Cross-cutting reader migration (FR-028, FR-029, decision 1B)

**Goal**: Every TypeScript caller of the catalog updates in lockstep with the new asset-key conventions. The pre-existing parallel asset-write path in `apps/vscode/src/commands/saveSession.ts` is migrated to call into the service-side factory (research.md Decision 11 — closes Article IV.1 violation). The asset-key rename (`thumbnailHref`/`thumbnailSmHref` → `overviewHref`/`thumbnailHref`) is enforced by tsc strict.

**Independent test criterion**: `pnpm -r typecheck` and `pnpm lint` pass with zero errors across the full workspace. The VS Code save-session integration test produces an `item.json` matching `contracts/item-shape.schema.json`. The web-shell mocks read the new asset keys.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — for the integration test in T029, `node apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` Linux binary. Standard browser CDN downloads are blocked in cloud sessions; the bundled binary works fully.

- [ ] T027 Add a typed `writePlotThumbnails()` surface that wraps the service-side `store_thumbnail()` call. Recommended location: extend the existing `@debrief/stac-writer` package introduced in #236 (single source of truth across both hosts) by adding a `writePlotThumbnails(args: { storePath: string; itemPath: string; largePngBase64: string; smallPngBase64: string }): Promise<StacItem>` method. `shared/components/...` or the existing `@debrief/stac-writer` package
- [ ] T028 Replace the direct `fs.writeFileSync` block in `apps/vscode/src/commands/saveSession.ts:88–110` with a call to `writePlotThumbnails(...)`. Remove all direct mutation of `item.json.assets` from the extension. `apps/vscode/src/commands/saveSession.ts`
- [ ] T029 [test] Write/extend a VS Code save-session integration test asserting (a) `saveSession.ts` no longer writes PNGs directly (assert no `fs.writeFileSync` of `*.png` in the call graph — verifiable via spy or vitest mock), and (b) the resulting on-disk `item.json` validates against `contracts/item-shape.schema.json`, and (c) the on-disk filenames are `thumbnail.png` (200×150) + `overview.png` (800×600), not the legacy pair. `apps/vscode/src/commands/saveSession.test.ts` (or equivalent location)
- [ ] T030 Rename `thumbnailHref` (→ now points at the small variant) and `thumbnailSmHref` (→ rename to `overviewHref`, points at the large variant) in `StacItemSummary` and any sibling interfaces. Strict mode will surface every consumer. `apps/vscode/src/types/stac.ts`
- [ ] T031 [P] Update `apps/vscode/src/services/stacService.ts` to read `assets['thumbnail']` (small, 200×150) and `assets['overview']` (large, 800×600) — drop the `assets['thumbnail-sm']` lookup. `apps/vscode/src/services/stacService.ts`
- [ ] T032 [P] Update `apps/vscode/src/panels/catalogOverviewPanel.ts` consumers of the renamed type fields; the small variant for tile rendering, the large variant for preview pane. `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T033 [P] Update `apps/vscode/src/services/storyboardPlayback.ts` and `apps/vscode/src/views/storyboardPanelView.ts` consumers of the renamed `StacItemSummary` fields. (Storyboard scene thumbnails use a separate domain term — `thumbnailHref` on `SceneRow` — and are NOT subject to this rename; verify the boundary.) `apps/vscode/src/services/storyboardPlayback.ts`, `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T034 [P] Update the type definitions in `shared/components/src/filter-engine/types.ts` to match the new naming. `shared/components/src/filter-engine/types.ts`
- [ ] T035 [P] Update `shared/components/src/StacBrowser/ThumbnailPreview.tsx` for the new semantics (`thumbnailHref` is now the small variant). Adjust any sizing assumptions. `shared/components/src/StacBrowser/ThumbnailPreview.tsx`
- [ ] T036 [P] Update `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx` to read the renamed field (`thumbnailSmHref` → `thumbnailHref`). `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`
- [ ] T037 [P] Update `apps/web-shell/src/mocks/stacService.ts` to read `assets['thumbnail']` (small) and `assets['overview']` (large). `apps/web-shell/src/mocks/stacService.ts`
- [ ] T038 [P] Audit `apps/web-shell/src/storyboard-edit-fixtures.ts` and `apps/web-shell/src/StoryboardPanelMount.tsx` for stale field references and update to the new naming. `apps/web-shell/src/storyboard-edit-fixtures.ts`, `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T039 [test] Run `pnpm -r typecheck` from repo root; verify zero errors across all workspaces. Command: `pnpm -r typecheck`
- [ ] T040 [test] Run `pnpm lint` from repo root; verify zero errors. Command: `pnpm lint`
- [ ] T041 [test] Run `pnpm --filter '!@debrief/web-shell' test` (vitest unit tests); verify all green. Command: `pnpm --filter '!@debrief/web-shell' test`

**Parallel execution**: T031 / T032 / T033 / T034 / T035 / T036 / T037 / T038 are mechanical renames in independent files and can run together. T030 must land first so the new type names exist for the renamers to consume. T029 depends on T028.

## Phase 6: US3 — Catalog regeneration brings all 73 sample items up to the new shape (P1)

**Goal**: Every one of the 73 `item.json` files under `preview/workspace/samples/local-store/` has the new shape; the promoted `catalog.json` has its `license` migrated, gains `providers[]`, gains `item_assets`, and bumps to 1.1.0; thumbnail PNGs are renamed via `git mv` (preserving git history); the regeneration is idempotent.

**Independent test criterion (FR-015 → FR-021)**: Run `scripts/upgrade-catalog-to-stac-1.1.py`. Diff resulting catalog against a golden snapshot of the expected shape (a small sampler — three items + the catalog). Re-run; assert second run produces zero diff. All 73 items + the catalog validate against the vendored STAC 1.1 schemas.

- [ ] T042 Create `scripts/upgrade-catalog-to-stac-1.1.py` implementing the regeneration pipeline per `contracts/factory-api.md`. Steps per item: read existing item.json, compute `created` from `git log --diff-filter=A --format=%aI` (fallback to mtime), bump `stac_version`, dedupe-add processing/file extension URIs, set `properties.created`/`updated`/`license`/`providers`, mirror `debrief:provenance.*` into `processing:*` on source assets, compute `file:size` + `file:checksum` for disk-backed assets, `git mv thumbnail.png → overview.png` AND `git mv thumbnail-sm.png → thumbnail.png` in correct order (avoid filename collision), update asset entries to match, add `proj:shape`, validate against the vendored STAC 1.1 Item Schema. For `catalog.json`: bump version, normalise license, add providers, add `item_assets`, add `rel: "license"` link, validate against the vendored Collection Schema. Halts on any validation failure. `scripts/upgrade-catalog-to-stac-1.1.py`
- [ ] T043 Make T042 idempotent: each step checks current state before mutation (e.g. don't append a duplicate extension URI; don't re-rename if filenames already match; don't overwrite existing `created`). Validate idempotency in the script's own self-test: run twice on a temp copy, assert second run produces empty git diff. `scripts/upgrade-catalog-to-stac-1.1.py`
- [ ] T044 Run `uv run python scripts/upgrade-catalog-to-stac-1.1.py` against `preview/workspace/samples/local-store/`. Verify all 73 items + the catalog validate. Capture stdout to `specs/241-stac-best-practices-upgrade/evidence/regeneration-output.txt` for the evidence collection in Phase 8. Command: `uv run python scripts/upgrade-catalog-to-stac-1.1.py`
- [ ] T045 Verify `git mv` preserved blame: `git log --follow --oneline preview/workspace/samples/local-store/core--boat1/overview.png | head -3` shows pre-rename commits. Spot-check three items. Command: `git log --follow ...`
- [ ] T046 [test] Add integration test `test_regen.py` running the script against a 3-item fixture catalog under `services/stac/tests/fixtures/regen-fixture/` (created from a hand-crafted miniature). Asserts FR-019 (zero-diff second run), FR-020 (validation halts on failure — inject a corrupt item to confirm), FR-021 (existing tests pass). `services/stac/tests/test_regen.py`
- [ ] T047 [test] Extend `test_stac_validation.py` with a test that walks every item in `preview/workspace/samples/local-store/` and validates each against the vendored STAC 1.1 Item Schema. Asserts SC-001 (73/73 items + catalog validate). `services/stac/tests/test_stac_validation.py`
- [ ] T048 [P] Spot-check three regenerated items via `jq` to verify shape matches data-model.md (asset_keys, providers, processing fields). Document outputs in `evidence/sample-item-diff.md`. Command: `jq '...' preview/workspace/samples/local-store/core--boat1/item.json`
- [ ] T049 [P] Capture before/after structural diff snippet for `catalog.json` to `specs/241-stac-best-practices-upgrade/evidence/sample-collection-diff.md`. `specs/241-stac-best-practices-upgrade/evidence/sample-collection-diff.md`

**Parallel execution**: T042 + T043 share the script file and run sequentially. T046 / T047 are independent test files. T048 / T049 are independent verification artefacts. T044 / T045 depend on T042 + T043.

## Phase 7: US4 — Open-source STAC browser renders our catalog (P1)

**Goal**: A short Playwright test serves the regenerated catalog locally, points the vendored `radiantearth/stac-browser` v3.3.4 dist at it, drives Collection → Item → assets, and captures three screenshots that assert thumbnails render, `processing:*` and `file:*` fields are pretty-printed, and zero console errors. Screenshots double as evidence and as the blog post's hero artefacts.

**Independent test criterion (FR-022 → FR-027)**: After Phase 6 lands, the test runs against the regenerated catalog. CI passes. Three screenshots committed under `evidence/`. Test runs headlessly and completes in under 60 seconds (FR-026). Three consecutive CI runs pass with zero retries (SC-003).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `node apps/web-shell/run-playwright.mjs stac-browser-interop` extracts `@sparticuz/chromium` and runs the spec. See `docs/project_notes/playwright-installation-research.md` for details.

- [ ] T050 Create `StacBrowserPage.ts` page object encapsulating navigation through the vendored stac-browser SPA. Methods: `gotoCollection()`, `clickFirstItem()`, `expandAssets()`, accessor methods for the metadata panel rows. Selectors verified against v3.3.4's actual DOM at implement time. `apps/web-shell/playwright/pages/StacBrowserPage.ts`
- [ ] T051 Create the Playwright test spec. `globalSetup` starts two `http-server` instances: one on `:4080` serving `preview/workspace/samples/local-store/` (with `--cors`), one on `:8080` serving `apps/web-shell/test-fixtures/stac-browser-v3.3.4/`. Test navigates to `http://localhost:8080/?catalogUrl=http://localhost:4080/catalog.json`, drives Collection → Item → assets through the page object, captures three screenshots to `specs/241-stac-best-practices-upgrade/evidence/`. `globalTeardown` stops both servers. `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`
- [ ] T052 Implement assertions inside the spec for FR-024 / FR-025: assert Collection title + description + at least one provider visible; assert thumbnail + overview rendered; assert `processing:datetime` (or any `processing:*` field) visible in the metadata panel; assert `file:size` (or `file:checksum`) visible in the asset list; assert zero browser-console errors (warnings about `debrief:*` are tolerated). `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`
- [ ] T053 Add a 60s test timeout (FR-026) on the spec's `test.describe` block (or per-test `test.setTimeout(60_000)`). The vendored dist serving means there is no install step on the critical path; budget should be comfortable. `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`
- [ ] T054 Wire `stac-browser-interop` into the existing Playwright runner — the spec is auto-discovered by `apps/web-shell/playwright/playwright.config.ts`'s glob, so the wiring is to ensure the spec is picked up by `task verify` / CI. Verify by running `cd apps/web-shell && node run-playwright.mjs stac-browser-interop`. `apps/web-shell/playwright/playwright.config.ts` (verify, no edits expected)
- [ ] T055 [test] Run the new Playwright spec three times consecutively to verify SC-003 (zero retries needed). Capture pass/fail counts. Command: `for i in 1 2 3; do (cd apps/web-shell && node run-playwright.mjs stac-browser-interop) || break; done`
- [ ] T056 Verify the three captured screenshots exist on disk under `specs/241-stac-best-practices-upgrade/evidence/`: `stac-browser-collection.png`, `stac-browser-item.png`, `stac-browser-assets.png`. These are committed to the repository as evidence artefacts (and consumed by the blog post in Phase 8). Command: `ls specs/241-stac-best-practices-upgrade/evidence/stac-browser-*.png`

**Parallel execution**: T050 / T051 are sequential (T051 imports the page object). T052 / T053 modify the same file as T051 and are sequential. T055 / T056 depend on T051–T053 landing.

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Capture evidence, write the feature blog post combining the cached opener + ship-time evidence, delete the throwaway regen script per #228 precedent, and create the PR.

### Pre-PR cleanup

- [ ] T057 Delete the now-spent regeneration script. Per research.md Decision 8 the script is committed for review then deleted in the same PR. Use `git rm scripts/upgrade-catalog-to-stac-1.1.py` and commit. `scripts/upgrade-catalog-to-stac-1.1.py`
- [ ] T058 Verify CI gates pass end-to-end: `task verify` (or the four-command fallback in `CLAUDE.md` § Before Pushing). All ruff / pyright / pnpm typecheck / vitest / pytest / Playwright suites green. Command: `task verify`

### Evidence Collection

- [ ] T059 Capture test results using template `.specify/templates/evidence/test-summary-template.md` in `specs/241-stac-best-practices-upgrade/evidence/test-summary.md`. YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body lists totals across pytest + vitest + Playwright, plus the key scenarios verified (factory shape, Collection shape, regen idempotency, schema validation, browser interop). `specs/241-stac-best-practices-upgrade/evidence/test-summary.md`
- [ ] T060 Create usage demonstration in `specs/241-stac-best-practices-upgrade/evidence/usage-example.md`. Three commands + expected output (regen, validate, browse). Mirrors quickstart.md but condensed. `specs/241-stac-best-practices-upgrade/evidence/usage-example.md`
- [ ] T061 [P] Capture round-trip evidence in `specs/241-stac-best-practices-upgrade/evidence/round-trip-evidence.md`: factory output → JSON serialise → vendored STAC 1.1 schema validate → re-read → assert byte-stable. Demonstrates Article II.1 schema integrity. `specs/241-stac-best-practices-upgrade/evidence/round-trip-evidence.md`
- [ ] T062 [P] Capture the regeneration script's stdout to `specs/241-stac-best-practices-upgrade/evidence/regeneration-output.txt` (first run + zero-diff second run). Idempotency proof for SC-007. `specs/241-stac-best-practices-upgrade/evidence/regeneration-output.txt`
- [ ] T063 [P] Capture before/after sample-item structural diff in `specs/241-stac-best-practices-upgrade/evidence/sample-item-diff.md`. Pick `core--boat1` as the canonical example; show the new fields side-by-side with the old shape. `specs/241-stac-best-practices-upgrade/evidence/sample-item-diff.md`
- [ ] T064 [P] Capture before/after `catalog.json` structural diff in `specs/241-stac-best-practices-upgrade/evidence/sample-collection-diff.md`. `specs/241-stac-best-practices-upgrade/evidence/sample-collection-diff.md`
- [ ] T065 Verify the three Playwright-captured screenshots are committed and visible: `evidence/stac-browser-collection.png`, `evidence/stac-browser-item.png`, `evidence/stac-browser-assets.png`. (These were captured in T051; this task is a verification gate before the blog post consumes them.) `specs/241-stac-best-practices-upgrade/evidence/`

### Media Content

- [ ] T066 Create the feature blog post at `specs/241-stac-best-practices-upgrade/media/shipped-post.md`. Use the Content Specialist agent (`.claude/agents/media/content.md`). The first three sections (`What We're Building`, `How It Fits`, `Key Decisions`) are copied **verbatim** from `evidence/opening-context.md`; the Hook content (without its `## Hook` heading) sits at the very top with the `images/stac-browser-collection.png` reference. Remaining sections (`Screenshots`, `By the Numbers`, `Lessons Learned`, `What's Next`) written from evidence. Track: `[credibility]`. `specs/241-stac-best-practices-upgrade/media/shipped-post.md`

### PR Creation

- [ ] T067 Create PR and publish blog: run `/speckit.pr`. Creates the feature PR in `debrief-future` with all evidence + media attached, and triggers the cross-repo PR to `debrief.github.io` for the blog post.

**Task T067 must run last. It depends on every other task being complete.**

**Parallel execution**: T061 / T062 / T063 / T064 are independent evidence files and can run together after T058 lands. T066 depends on T065 + T059 + T060 + T061 + T062 + T063 + T064.

## Dependencies

```
Phase 1 (Setup) ─────────────────┐
                                 │
Phase 2 (Foundation) ────────────┤
                                 │
                                 ▼
Phase 3 (US1 — Item factory)  ◄──┐
                                 │     ── independent of US2 day-to-day
Phase 4 (US2 — Collection)    ◄──┘     but landed together for review coherence
                                 │
                                 ▼
Phase 5 (Cross-cutting readers + saveSession migration)
                                 │
                                 ▼
Phase 6 (US3 — Regenerate 73 items)
                                 │
                                 ▼
Phase 7 (US4 — Browser interop test)
                                 │
                                 ▼
Phase 8 (Polish: evidence, blog, PR)
```

**Cross-phase rules**:
- Phase 2 is the gate for everything else — `_helpers.py` and the schema-validation rewiring block all factory + regen + Playwright work.
- Phase 3 and Phase 4 are P1 stories of equal priority. They can be implemented in parallel by different sessions but should land together for reviewer coherence (the regeneration in Phase 6 needs both).
- Phase 5 must precede Phase 6: if the readers haven't migrated to the new asset keys, regenerating the catalog would break VS Code and the web-shell on day 1. The `saveSession.ts` migration in particular (T028) is non-negotiable — without it, day-2 saves emit the old shape and contaminate the catalog.
- Phase 6 is the bulk of the visible diff (73 × `item.json` modified, 73 × PNG renames, `catalog.json` modified). It depends on Phases 3 + 4 producing the right shape and Phase 5 making the readers ready.
- Phase 7 is the proof-of-value story — it depends on Phase 6 producing the catalog the test validates.
- Phase 8 must run last; T067 (the `/speckit.pr` invocation) depends on every other task.

**Independent test criteria — quick reference**:
- Phase 3 (US1): unit-test a single fresh-plot creation; resulting `item.json` validates against `contracts/item-shape.schema.json` + STAC 1.1 Item schema.
- Phase 4 (US2): unit-test a fresh-Collection creation; validates against `contracts/collection-shape.schema.json` + STAC 1.1 Collection schema.
- Phase 5: `pnpm -r typecheck` + `pnpm lint` + saveSession integration test all green.
- Phase 6 (US3): regen script runs to completion, all 73 items + the catalog validate, second run produces zero diff.
- Phase 7 (US4): Playwright spec passes 3 consecutive runs without retries, three screenshots present.

## Implementation Strategy

### Incremental delivery

The feature decomposes naturally into two halves:

1. **Service-side shape** (Phases 1–4): change the factories so anything *new* is born in 1.1.0 shape. At this point the bundled catalog is still on 1.0; CI passes because the unit tests use fresh fixtures, not the bundled catalog. This is the smallest reviewable atom — a reviewer can sign off on the factory work without yet auditing 73 regenerated items.
2. **Catalog migration + proof** (Phases 5–7): bring the existing 73 items up to the new shape; migrate the readers in lockstep so nothing breaks; prove with the Playwright test that third-party tooling renders the result. Phase 8 captures evidence and ships the PR.

This split also lets us pause between the two halves if review surfaces issues with the factory work — the regeneration is a single command and is easy to defer or redo.

### Risk hot-spots and mitigations

- **`git mv` ordering during regeneration** (T042): renaming `thumbnail-sm.png → thumbnail.png` while `thumbnail.png` still exists would fail. Script must do all `thumbnail.png → overview.png` renames across all 73 dirs *first*, then all `thumbnail-sm.png → thumbnail.png` renames. Tested by T046's idempotency check (a partial rename leaves a non-zero diff on the second run).
- **`saveSession.ts` migration** (T028): the call site moves from a synchronous fs write to an async typed surface. If `writePlotThumbnails()` lives in `@debrief/stac-writer`, the existing async-await chain in `saveSession.ts` already supports it; verify before editing.
- **Schema-cache wiring** (T011): `stac_validator`'s schema-resolver hook needs to read from the vendored directory tree without hitting the network. T013's smoke test catches mis-wiring; if the test fails, the resolver setup needs adjusting before any other validation work proceeds.
- **Playwright stac-browser selectors** (T050): v3.3.4's actual DOM may not expose ergonomic test ids. Page object should rely on stable text content (`role="heading"`, `text=...`) rather than CSS class names that may change between minor versions. If selectors prove brittle, raise the issue before T053 — vendoring lets us patch the dist if absolutely required.
- **60s budget** (T053): vendored serving means the only time on the critical path is browser launch + 3 navigations + 3 screenshots. Cold-start on `@sparticuz/chromium` is ~5–10 s; navigation is ~2 s per page. Comfortable budget. If T055 reveals flake, raise before merging.

### Parallel session opportunities

- Phase 1: T002 / T003 / T004 / T005 are independent — start in parallel.
- Phase 3 + Phase 4 can be implemented by two sessions concurrently (one owns `plot.py`+`assets.py`+`thumbnails.py`, the other owns `collection.py`).
- Phase 5: T031 / T032 / T033 / T034 / T035 / T036 / T037 / T038 are mechanical renames in independent files — high parallelism.
- Phase 8: T061 / T062 / T063 / T064 are independent evidence files — capture in parallel.

### What "done" looks like

- 73/73 items + `catalog.json` validate against vendored STAC 1.1 schemas (SC-001).
- 0/73 items have the deprecated `"proprietary"` license; 0/73 have the 800×600 keyed at `assets.thumbnail` (SC-002).
- Three Playwright screenshots committed; Playwright spec passes 3 consecutive runs (SC-003).
- VS Code tile rendering, web-shell catalog browse, and the storyboard panel all keep working post-merge (SC-006).
- Regeneration script idempotent (SC-007) — and then deleted from the repo (T057, per #228 precedent).
- Blog post drafted (T066) using the cached opener, leading with `stac-browser-collection.png` (SC-005).
- Feature PR + blog PR created via `/speckit.pr` (T067).
