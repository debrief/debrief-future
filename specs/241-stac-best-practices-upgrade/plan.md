# Implementation Plan: STAC 1.1.0 + best-practices upgrade

**Branch**: `241-stac-best-practices-upgrade` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/241-stac-best-practices-upgrade/spec.md`

## Summary

Lift Debrief's bundled STAC catalog from 1.0 to 1.1.0 and adopt the standard `processing` and `file` extensions, the recommended Item-level metadata (`created`, `updated`, `license`, `providers`), the new STAC 1.1 `item_assets` Collection block, and a corrected role split between the 200×150 thumbnail (`assets.thumbnail`) and the 800×600 preview (`assets.overview`). The work is layered: upgrade the Item factory in `services/stac/`, upgrade the Collection factory, regenerate every one of the 73 sample-catalog items via a one-shot script (`scripts/upgrade-catalog-to-stac-1.1.py`), update VS Code and web-shell readers in lockstep (TypeScript renames enforced by tsc strict), and prove the result with a short Playwright test that drives `radiantearth/stac-browser` v3.3.4 against the regenerated catalog and captures three screenshots. The screenshots double as evidence and as the blog post's hero artefacts. The `debrief:` namespace is **not** removed; standard fields are co-published alongside it. ADR-028 already records the policy; this plan implements it.

## Technical Context

**Language/Version**: Python 3.11 (services, regeneration script); TypeScript 5.x strict (VS Code, web-shell, Playwright)
**Primary Dependencies**:
- Python: existing `debrief-stac` (modified), existing `stac_validator`, **NEW** `multiformats` (PyPI; pure-Python multihash encoding for `file:checksum`)
- TypeScript: existing `@debrief/components`, `@debrief/session-state`, `@debrief/schemas`. **NEW** dev-deps on the Playwright workspace: `@radiantearth/stac-browser` v3.3.4, `http-server` (latest stable; serves the catalog over CORS during the test)
**Storage**: bundled static STAC catalog at `preview/workspace/samples/local-store/` (73 Items + `catalog.json`). No database. The IndexedDB-backed web-shell catalog from #236 is unaffected (it reads through the same shape contract)
**Testing**: pytest (Python), vitest (TypeScript unit), Playwright (E2E). New: `services/stac/tests/test_stac_validation.py` is extended to validate against the official STAC 1.1 Item + Collection JSON Schemas; new Playwright spec at `apps/web-shell/playwright/tests/stac-browser-interop.spec.ts`
**Target Platform**: Linux (CI) + macOS/Windows (developer machines). Catalog is platform-neutral JSON; readers run wherever the host application runs (Code Server, VS Code Desktop, web-shell)
**Project Type**: monorepo with services + multiple frontends (web). The STAC layer is the cross-cutting service-of-services
**Performance Goals**: regeneration script completes in under 30 s for 73 items on developer hardware; `file:checksum` SHA-256 over the entire 73-item asset set within that budget. The Playwright test completes in under 60 s on CI (FR-026)
**Constraints**: Article I.1 (offline by default) — STAC 1.1 schemas are cached locally on first fetch (monthly mtime invalidation); the Playwright test serves both the catalog and stac-browser locally; no network fetches inside the test path. Article XV (strict types) — every new field flows through typed Pydantic models on the Python side and typed TS interfaces on the reader side
**Scale/Scope**: 73 sample items now; design accommodates O(thousands) since the per-item work is constant. Item factory and Collection factory are the central touchpoints — every contributor's plot creation goes through them. Reader rename touches ~12 sites across `apps/vscode/` + `shared/components/` + `apps/web-shell/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Compliance | Evidence |
|---|---|---|
| **I.1 Offline by default** | ✅ | STAC 1.1 schemas cached locally; Playwright test serves both catalog and stac-browser on `localhost:4080` / `localhost:8080`; no runtime network calls. |
| **I.4 Reproducibility** | ✅ | `radiantearth/stac-browser` pinned at v3.3.4. `multiformats` pinned. Regeneration script idempotent (FR-019, SC-007). |
| **II.1 Schema integrity** | ✅ | LinkML `debrief:` schema unchanged. New `processing:*` / `file:*` fields validate against upstream extension schemas; new envelope validates against official STAC 1.1 Item + Collection schemas. |
| **II.2 Schema tests mandatory** | ✅ | `services/stac/tests/test_stac_validation.py` extended. `contracts/item-shape.schema.json` and `contracts/collection-shape.schema.json` express the spec-241-specific contract. |
| **III.1 Provenance always** | ✅ | `debrief:provenance` and `debrief:provenance_log` retained byte-for-byte. `processing:software` / `processing:datetime` are co-published, never replacing. |
| **III.2 Source preservation** | ✅ | `derived_from` link semantics unchanged; source assets unchanged in role and content. |
| **III.3 Audit trail immutable** | ✅ | `debrief:provenance_log` rotation/archive untouched. |
| **IV.1 Services never touch UI** | ✅ | All factory work is in `services/stac/`. Frontends only update which asset key they read. |
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
│   ├── thumbnails.py                             # MODIFIED — emits assets.thumbnail (200×150) + assets.overview (800×600)
│   ├── collection.py                             # MODIFIED — bumps stac_version, sets license/providers/item_assets
│   ├── types.py                                  # MODIFIED — STAC_VERSION = "1.1.0"
│   ├── providers.py                              # NEW — DEFAULT_PROVIDERS constant
│   ├── checksum.py                               # NEW — multihash_sha256() helper
│   ├── timestamps.py                             # NEW — iso_now_utc(), normalise_to_utc() helpers
│   └── extensions.py                             # NEW — STAC extension URIs as constants
└── tests/
    ├── test_plot.py                              # MODIFIED — asserts new field shape
    ├── test_collection.py                        # MODIFIED — asserts item_assets, license, providers
    └── test_stac_validation.py                   # MODIFIED — validates against STAC 1.1 Item + Collection schemas

scripts/
└── upgrade-catalog-to-stac-1.1.py                # NEW — one-shot regeneration script (deleted after merge)

apps/vscode/src/types/
└── stac.ts                                       # MODIFIED — rename thumbnailHref/thumbnailSmHref → overviewHref/thumbnailHref

apps/vscode/src/services/                         # MODIFIED — every consumer of the renamed fields
shared/components/src/                            # AUDIT + MODIFY — same rename
apps/web-shell/src/                               # AUDIT + MODIFY — same rename

apps/web-shell/playwright/
├── tests/
│   └── stac-browser-interop.spec.ts              # NEW — drives stac-browser, captures 3 screenshots
├── pages/
│   └── StacBrowserPage.ts                        # NEW — page object for stac-browser navigation
└── package.json                                  # MODIFIED — pin @radiantearth/stac-browser, http-server

preview/workspace/samples/local-store/            # REGENERATED (output of script)
├── catalog.json                                  # all 1 file modified
├── core--*/item.json                             # all 73 files modified
├── core--*/thumbnail.png                         # all 73 files renamed via git mv (was thumbnail-sm.png)
└── core--*/overview.png                          # all 73 files renamed via git mv (was thumbnail.png)
```

**Structure Decision**: this is a service-layer + cross-cutting refactor inside the existing monorepo — no new top-level packages. The Python work concentrates in `services/stac/` where the factories live; the regeneration script is a throwaway under `scripts/` (precedent: #228); the Playwright test lives next to existing E2E specs under `apps/web-shell/playwright/`. Reader updates touch typed surfaces in `apps/vscode/`, `shared/components/`, and `apps/web-shell/`, but the changes are mechanical renames that tsc strict mode will enforce completion of. No new app, no new package; everything bolts onto existing seams.

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
| Open `radiantearth/stac-browser` v3.3.4 against the regenerated `local-store` catalog and navigate Collection → Item → assets | Third-party stac-browser SPA served at `http://localhost:8080`; catalog served at `http://localhost:4080/catalog.json` | `[data-test="collection-title"]`, `[data-test="item-grid-tile"]`, `[data-test="metadata-panel-row"]` (where stac-browser exposes them — selectors verified at implement time against v3.3.4's DOM) | Navigate to Collection landing → assert title + providers + item_assets visible → click first Item tile → assert thumbnail + overview rendered + processing:datetime + file:size visible → expand assets section → assert all four asset roles listed |

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
