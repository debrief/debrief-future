# Implementation Plan: STAC 1.1.0 + best-practices upgrade

**Branch**: `241-stac-best-practices-upgrade` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/241-stac-best-practices-upgrade/spec.md`

## Summary

Lift Debrief's bundled STAC catalog from 1.0 to 1.1.0 and adopt the standard `processing` and `file` extensions, the recommended Item-level metadata (`created`, `updated`, `license`, `providers`), the new STAC 1.1 `item_assets` Collection block, and a corrected role split between the 200×150 thumbnail (`assets.thumbnail`) and the 800×600 preview (`assets.overview`). The work is layered: upgrade the Item factory in `services/stac/`, upgrade the Collection factory, regenerate every one of the 73 sample-catalog items via a one-shot script (`scripts/upgrade-catalog-to-stac-1.1.py`), update VS Code and web-shell readers in lockstep (TypeScript renames enforced by tsc strict), and prove the result with a short Playwright test that drives `radiantearth/stac-browser` v3.3.4 against the regenerated catalog and captures three screenshots. The screenshots double as evidence and as the blog post's hero artefacts. The `debrief:` namespace is **not** removed; standard fields are co-published alongside it. ADR-028 already records the policy; this plan implements it.

## Technical Context

**Language/Version**: Python 3.11 (services, regeneration script); TypeScript 5.x strict (VS Code, web-shell, Playwright)
**Primary Dependencies**:
- Python: existing `debrief-stac` (modified), existing `stac_validator`, **NEW** `multiformats` (PyPI; pure-Python multihash encoding for `file:checksum`)
- TypeScript: existing `@debrief/components`, `@debrief/session-state`, `@debrief/schemas`. **NEW** dev-dep on the Playwright workspace: `http-server` (latest stable; serves the catalog and the vendored stac-browser dist statically). `radiantearth/stac-browser` v3.3.4 is **vendored as a prebuilt dist** under `apps/web-shell/test-fixtures/stac-browser-v3.3.4/` rather than installed via `pnpm dlx` at runtime — keeps the test offline-clean and within the 60 s budget (research.md Decision 7)
**Storage**: bundled static STAC catalog at `preview/workspace/samples/local-store/` (73 Items + `catalog.json`). No database. The IndexedDB-backed web-shell catalog from #236 is unaffected (it reads through the same shape contract)
**Testing**: pytest (Python), vitest (TypeScript unit), Playwright (E2E). New: `services/stac/tests/test_stac_validation.py` is extended to validate against the official STAC 1.1 Item + Collection JSON Schemas, with the schemas **vendored** under `services/stac/tests/fixtures/stac-schemas/v1.1.0/` and the existing network-probe gate (line 19) **removed** so failures are loud (research.md Decision 9 — restores Article I.1 + I.3). New Playwright spec at `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`
**Target Platform**: Linux (CI) + macOS/Windows (developer machines). Catalog is platform-neutral JSON; readers run wherever the host application runs (Code Server, VS Code Desktop, web-shell)
**Project Type**: monorepo with services + multiple frontends (web). The STAC layer is the cross-cutting service-of-services
**Performance Goals**: regeneration script completes in under 30 s for 73 items on developer hardware; `file:checksum` SHA-256 over the entire 73-item asset set within that budget. The Playwright test completes in under 60 s on CI (FR-026)
**Constraints**: Article I.1 (offline by default) — STAC 1.1 schemas are cached locally on first fetch (monthly mtime invalidation); the Playwright test serves both the catalog and stac-browser locally; no network fetches inside the test path. Article XV (strict types) — every new field flows through typed Pydantic models on the Python side and typed TS interfaces on the reader side
**Scale/Scope**: 73 sample items now; design accommodates O(thousands) since the per-item work is constant. Item factory and Collection factory are the central touchpoints — every contributor's plot creation goes through them. Reader rename touches ~12 sites across `apps/vscode/` + `shared/components/` + `apps/web-shell/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Compliance | Evidence |
|---|---|---|
| **I.1 Offline by default** | ✅ | STAC 1.1 schemas vendored at `services/stac/tests/fixtures/stac-schemas/v1.1.0/` (research.md Decision 9). Playwright test serves both the regenerated catalog and the vendored stac-browser dist (`apps/web-shell/test-fixtures/stac-browser-v3.3.4/`) statically on `localhost:4080` / `localhost:8080`; zero runtime network calls. |
| **I.3 No silent failures** | ✅ | Existing `test_stac_validation.py` line 19 network probe is **removed** as part of this work — schema validation now fails loudly on broken shape rather than silently skipping when offline. |
| **I.4 Reproducibility** | ✅ | `radiantearth/stac-browser` v3.3.4 vendored as a prebuilt dist (committed). `multiformats` pinned. Regeneration script idempotent (FR-019, SC-007). |
| **II.1 Schema integrity** | ✅ | LinkML `debrief:` schema unchanged. New `processing:*` / `file:*` fields validate against upstream extension schemas; new envelope validates against official STAC 1.1 Item + Collection schemas. |
| **II.2 Schema tests mandatory** | ✅ | `services/stac/tests/test_stac_validation.py` extended. `contracts/item-shape.schema.json` and `contracts/collection-shape.schema.json` express the spec-241-specific contract. |
| **III.1 Provenance always** | ✅ | `debrief:provenance` and `debrief:provenance_log` retained byte-for-byte. `processing:software` / `processing:datetime` are co-published, never replacing. |
| **III.2 Source preservation** | ✅ | `derived_from` link semantics unchanged; source assets unchanged in role and content. |
| **III.3 Audit trail immutable** | ✅ | `debrief:provenance_log` rotation/archive untouched. |
| **IV.1 Services never touch UI** | ✅ | All factory work is in `services/stac/`. The pre-existing parallel asset-write path in `apps/vscode/src/commands/saveSession.ts` (which wrote `thumbnail.png` / `thumbnail-sm.png` directly from the extension) is **migrated to call into `services/stac/`** as part of this work — closing the inherited Article IV violation rather than perpetuating it (research.md Decision 11). Frontends only update which asset key they read. |
| **VI Tests required** | ✅ | Every FR has a test. Contract tests in `services/stac/tests/`, integration test for the regenerator, Playwright E2E for the renderer. |
| **VII Test-Driven AI Collaboration** | ✅ | Acceptance scenarios in spec, contract schemas in `contracts/`, Playwright assertions enumerated in FR-024. |
| **VIII.1 Specs before code** | ✅ | This plan + ADR-028 land before implementation. |
| **VIII.3 ADRs** | ✅ | ADR-028 already in `docs/project_notes/decisions.md`. |
| **IX.1 Minimal vetted dependencies** | ✅ | One new Python dep (`multiformats`, pure-Python, ~50 KB). Two new dev-only Playwright deps (`@radiantearth/stac-browser`, `http-server`) — both well-maintained and used widely in the STAC ecosystem. Justification in research.md Decision 2 + Decision 7. |
| **IX.2 Pinned versions** | ✅ | `multiformats` pinned via `services/stac/pyproject.toml`. stac-browser at v3.3.4. |
| **XV Strict type safety** | ✅ | New Python Pydantic models for `Provider` and `AssetTemplate`; TS rename caught by tsc strict on the reader path. No `Any`/`any` introduced. |

**No violations to track.** The Complexity Tracking section below stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/241-stac-best-practices-upgrade/
├── plan.md                   # This file
├── spec.md                   # Feature specification
├── research.md               # Phase 0 — 10 decisions covering version pins, checksum encoding, created recovery, license/providers, item_assets shape, rename strategy, browser harness, regen script lifecycle, schema validation, reader rename
├── data-model.md             # Phase 1 — Item / Asset / Collection / Factory state machine / Filesystem layout
├── quickstart.md             # Phase 1 — How to run the regeneration + verify with stac-browser
├── contracts/                # Phase 1
│   ├── item-shape.schema.json        # JSON Schema for spec-241 Item additions
│   ├── collection-shape.schema.json  # JSON Schema for spec-241 Collection additions
│   └── factory-api.md                # Python + TS API contract for the modified functions
├── evidence/                 # Populated during /speckit.implement
│   ├── opening-context.md            # Cached blog opener (this command)
│   ├── stac-browser-collection.png   # Playwright screenshot (FR-022)
│   ├── stac-browser-item.png         # Playwright screenshot (FR-022)
│   └── stac-browser-assets.png       # Playwright screenshot (FR-022)
└── tasks.md                  # Phase 2 (created by /speckit.tasks — NOT created by this command)
```

### Source Code (repository root)

```text
services/stac/                                    # Item + Collection factory (Python, modified)
├── src/debrief_stac/
│   ├── plot.py                                   # MODIFIED — bumps stac_version, sets created/updated/license/providers
│   ├── assets.py                                 # MODIFIED — emits processing:* + file:* on source assets
│   ├── thumbnails.py                             # MODIFIED — emits assets.thumbnail (200×150) + assets.overview (800×600); becomes the single asset-writing seam (FR-028 callers route through here)
│   ├── collection.py                             # MODIFIED — bumps stac_version, sets license/providers/item_assets (ITEM_ASSETS_TEMPLATE inlined here)
│   ├── types.py                                  # MODIFIED — STAC_VERSION = "1.1.0"
│   └── _helpers.py                               # NEW — single internal-helpers module: multihash_sha256, multihash_sha256_bytes, iso_now_utc, normalise_to_utc, DEFAULT_PROVIDERS, STAC extension URI constants (research.md Decision 12)
└── tests/
    ├── test_plot.py                              # MODIFIED — asserts new field shape
    ├── test_collection.py                        # MODIFIED — asserts item_assets, license, providers
    ├── test_stac_validation.py                   # MODIFIED — validates against STAC 1.1 Item + Collection schemas; network probe removed
    ├── test_helpers.py                           # NEW — covers _helpers.py (multihash round-trip, timestamp normalisation)
    └── fixtures/stac-schemas/v1.1.0/             # NEW — vendored STAC 1.1 schemas (item.json, collection.json, plus referenced sub-schemas) and a refresh script for future bumps

scripts/
└── upgrade-catalog-to-stac-1.1.py                # NEW — one-shot regeneration script (deleted after merge)

apps/vscode/src/types/
└── stac.ts                                       # MODIFIED — rename thumbnailHref/thumbnailSmHref → overviewHref/thumbnailHref

apps/vscode/src/services/                         # MODIFIED — every consumer of the renamed fields (stacService.ts)
apps/vscode/src/panels/catalogOverviewPanel.ts    # MODIFIED — same rename
apps/vscode/src/commands/saveSession.ts           # MODIFIED — drops direct fs.writeFileSync of PNGs and direct mutation of item.json.assets; instead invokes a new asset-writing entry point in services/stac/ (decision 1B — closes pre-existing Article IV violation). New seam: services/stac/src/debrief_stac/thumbnails.py:store_thumbnail() called via the existing IPC/MCP boundary or, where in-process, via a debrief_stac shim.
shared/components/src/filter-engine/types.ts      # MODIFIED — same rename
shared/components/src/StacBrowser/ThumbnailPreview.tsx  # MODIFIED — semantics flip: thumbnailHref now points at the small variant
shared/components/src/ExerciseListView/ExerciseListItemRow.tsx  # MODIFIED — same rename
apps/web-shell/src/mocks/stacService.ts           # MODIFIED — reads assets['thumbnail'] (200×150) + assets['overview'] (800×600)

apps/web-shell/playwright/
├── tests/
│   └── stac-browser-interop.spec.ts              # NEW — drives stac-browser, captures 3 screenshots
├── pages/
│   └── StacBrowserPage.ts                        # NEW — page object for stac-browser navigation
└── package.json                                  # MODIFIED — add http-server dev-dep (vendored stac-browser does NOT need a package entry)

apps/web-shell/test-fixtures/stac-browser-v3.3.4/  # NEW — vendored prebuilt dist of radiantearth/stac-browser v3.3.4 (committed). Refresh script `scripts/refresh-stac-browser-fixture.sh` documents how to bump.

preview/workspace/samples/local-store/            # REGENERATED (output of script)
├── catalog.json                                  # all 1 file modified
├── core--*/item.json                             # all 73 files modified
├── core--*/thumbnail.png                         # all 73 files renamed via git mv (was thumbnail-sm.png)
└── core--*/overview.png                          # all 73 files renamed via git mv (was thumbnail.png)
```

**Structure Decision**: this is a service-layer + cross-cutting refactor inside the existing monorepo — no new top-level packages. The Python work concentrates in `services/stac/` where the factories live, with a single `_helpers.py` for shared internal utilities (rather than four micro-modules — research.md Decision 12). The regeneration script is a throwaway under `scripts/` (precedent: #228); the Playwright test lives next to existing E2E specs under `apps/web-shell/playwright/`, served against a vendored stac-browser dist for offline-clean reproducibility. Reader updates touch typed surfaces in `apps/vscode/`, `shared/components/`, and `apps/web-shell/`; the asset-key rename is enforced by tsc strict mode. The `saveSession.ts` lockstep migration moves a pre-existing Article IV violation (frontend writing assets directly) onto the supported services-side seam. No new app, no new package; everything bolts onto existing seams.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| _none_ — see below | — | — | — |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**: N/A

**Storybook Link**: N/A

None — service-/infrastructure-level feature. The user-visible artefacts are the rendered STAC Browser pages (captured as PNGs by the Playwright test), not Storybook stories. The blog post leads with `evidence/stac-browser-collection.png` as its hero image (SC-005); a Storybook bundle would not add narrative value.

## Storybook E2E Testing

None — no interactive UI components introduced by this feature. Asset-key rename in TypeScript readers is enforced by tsc strict mode + existing unit tests; no story-level interaction surface to test.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Open `radiantearth/stac-browser` v3.3.4 (vendored prebuilt dist) against the regenerated `local-store` catalog and navigate Collection → Item → assets | Vendored stac-browser dist served at `http://localhost:8080` from `apps/web-shell/test-fixtures/stac-browser-v3.3.4/`; catalog served at `http://localhost:4080/catalog.json` from `preview/workspace/samples/local-store/`. Both via `http-server` started in `globalSetup` and torn down in `globalTeardown`. | `[data-test="collection-title"]`, `[data-test="item-grid-tile"]`, `[data-test="metadata-panel-row"]` (where stac-browser exposes them — selectors verified at implement time against v3.3.4's DOM) | Navigate to Collection landing → assert title + providers + item_assets visible → click first Item tile → assert thumbnail + overview rendered + processing:datetime + file:size visible → expand assets section → assert all four asset roles listed |

**Testing Strategy**:
- [x] Workflow runs end-to-end against the real `radiantearth/stac-browser` build (v3.3.4 pinned)
- [x] Page object at `apps/web-shell/playwright/pages/StacBrowserPage.ts` encapsulates stac-browser DOM (separate page object because it's a different SPA from web-shell itself)
- [x] Three screenshots written **directly** into `specs/241-stac-best-practices-upgrade/evidence/` from the spec file (matches the `properties-screenshots.spec.ts` path-resolution pattern)

**Test File Location**: `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs stac-browser-interop`
- Local: `pnpm --filter @debrief/web-shell test stac-browser-interop`

**Optional — chrome-level VS Code Webview tests**: not applicable. This test deliberately bypasses the VS Code chrome — the proof of value is third-party rendering, which has nothing to do with our extension UI. (Reader rename inside `apps/vscode/` is covered by existing VS Code integration tests.)

## Complexity Tracking

> No constitutional violations. This section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_ | — | — |
