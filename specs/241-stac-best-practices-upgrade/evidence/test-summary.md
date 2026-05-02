---
feature: "241-stac-best-practices-upgrade"
captured_at: "2026-05-02T09:00:00Z"
git_sha: "67795a5"
tests_passed: 2245
tests_failed: 0
tests_skipped: 5
coverage_pct: null
---

# Test Summary: STAC 1.1.0 + best-practices upgrade

## Results

| Metric | Value |
|--------|-------|
| Total tests | 2250 |
| Passed | 2245 |
| Failed | 0 |
| Skipped | 5 (existing pre-spec test isolation marker, unrelated to spec 241) |

## Test Breakdown

### Python — `services/stac/tests/` (pytest)

| Suite | Tests | Status |
|---|---|---|
| `test_helpers.py` (NEW) | 16 | Pass |
| `test_stac_validation.py` (rewired — vendored schemas, no network probe) | 13 | Pass |
| `test_plot.py` (extended with 14 spec-241 tests) | 38 | Pass |
| `test_thumbnails.py` (rewritten for new asset shape) | 7 | Pass |
| `test_assets.py` | 7 | Pass |
| `test_collection.py` (extended with 8 spec-241 tests) | 40 | Pass |
| `test_regen.py` (NEW — regen integration tests) | 4 | Pass |
| `test_artifacts.py` / `test_catalog.py` / `test_cli.py` / `test_coverage.py` / `test_features.py` / `test_integration.py` / `test_mcp.py` / `test_migrate.py` / `test_provenance.py` (existing — confirmed unbroken) | 92 | Pass |
| **services/stac total** | **217** | **Pass** (1 skipped, 0 xfail) |

### TypeScript — `shared/components` (vitest)

| Tests | Status |
|---|---|
| 2028 | Pass (4 skipped — existing) |

### Repo-wide TypeScript

| Workspace | Status |
|---|---|
| All 11 workspaces (`pnpm -r typecheck`) | Pass — 0 errors |

### Repo-wide ESLint

| Status |
|---|
| Pass — 0 errors (5 pre-existing warnings) |

### Playwright — `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts` (NEW)

| Run | Result | Duration |
|---|---|---|
| 1 | Pass | 5.9 s |
| 2 | Pass | 5.4 s |
| 3 | Pass | 5.4 s |

3/3 consecutive runs pass with zero retries → **SC-003 satisfied**. Well under the 60 s budget (FR-026).

## Key Scenarios Verified

- **FR-001..FR-009** — Item factory emits STAC 1.1.0 with processing/file extensions, created/updated/license/providers, processing:* mirroring debrief:provenance, file:size + file:checksum, assets.thumbnail (200×150) + assets.overview (800×600) with proj:shape (`test_plot.py::TestSpec241ItemFactoryShape`, `TestSpec241LifecycleTimestamps`, `TestSpec241SourceAssetCoPublishing`, `TestSpec241ThumbnailPair`).
- **Edge case — unreachable source path** — `file:size` and `file:checksum` are omitted (not zero, not null) when the asset bytes can't be hashed (`test_plot.py::TestSpec241SourceAssetMissingPath`).
- **FR-010..FR-014** — Collection envelope: stac_version 1.1.0, item_assets block, providers, license migration (proprietary → other), rel='license' link, summaries unchanged (`test_collection.py::TestSpec241*`).
- **FR-015..FR-021** — Regeneration script produces spec-241 shape, idempotent (zero-diff second run), halts on validation failure, regenerated items satisfy existing invariants (`test_regen.py`, `evidence/regeneration-output.txt`).
- **SC-001** — All 73 sample-catalog items + the catalog validate against the vendored STAC 1.1 schemas (`test_stac_validation.py::test_sample_catalog_items_validate_against_stac_1_1`, `::test_sample_catalog_root_validates_against_stac_1_1`).
- **FR-022..FR-027** — Vendored radiantearth/stac-browser v3.3.4 dist + http-server'd local catalog → real navigation flow → 3 screenshots captured to evidence/ directory.
- **Article I.3** (no silent failures) — Network probe removed from test_stac_validation.py; vendored schemas resolve via custom Registry; missing fixtures fail loudly (`assert_schemas_vendored()`).
- **Article IV.1** (services don't mutate UI; UI doesn't persist) — `saveSession.ts` no longer writes thumbnail PNGs or mutates item.json directly; routed through new `plotThumbnailWriter.ts` typed shim that produces the spec-241 shape (full service-mediated path is follow-up #242).

## Known Issues

- One pre-existing flaky test in `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts` (a `chmod 444` permission test that fails when the test runs as root in a container; unrelated to spec 241 and pre-dates this PR).

## Environment

- Runner: pytest 9.0.2 (Python 3.11.15) + vitest 1.6.1 (TypeScript 5.x) + Playwright 1.58 (`@sparticuz/chromium` extracted Linux binary)
- Branch: `claude/implement-speckit-241-AWnxM`
- Date: 2026-05-02
- Vendored schemas: STAC 1.1.0 (Item / Collection / Catalog + sub-schemas) + GeoJSON Feature/Geometry under `services/stac/tests/fixtures/stac-schemas/`
- Vendored STAC Browser: radiantearth/stac-browser v3.3.4 prebuilt dist under `apps/web-shell/test-fixtures/stac-browser-v3.3.4/`
