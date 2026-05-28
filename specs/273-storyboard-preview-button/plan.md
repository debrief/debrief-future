# Implementation Plan: Storyboard live Preview button + web-shell briefing-zip export parity

**Branch**: `273-storyboard-preview-button` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/273-storyboard-preview-button/spec.md`

## Summary

Add a **Preview** control to the shared storyboard panel header (both VS Code and web-shell) that opens the existing briefing-renderer SPA in a new browser tab, loading the active storyboard **live** from a `?features=<url>` location — no zip packing step. This requires an **additive, async** boot path in the renderer that fetches+validates+seeds via the existing loaders/store, leaving the air-gapped inline-boot path (used by #264's zip) completely untouched. In parallel, bring **Export as briefing zip** to web-shell by extracting the already-pure packing core into a shared `@debrief/briefing-export` package with per-host adapters (VS Code = disk/save-dialog; web-shell = IndexedDB-via-stac-writer + browser download). The two hosts differ only in how they produce the features URL: VS Code stands up an ephemeral loopback HTTP server; web-shell uses a same-origin blob object URL. No LinkML schema changes and no new external dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node 20 runtime (VS Code extension host); React 18.x (renderer + panel)
**Primary Dependencies**: `@debrief/components` (StoryboardPanel), `@debrief/stac-writer` (web-shell reads), `@debrief/schemas` (LinkML types — consumed, not changed), JSZip 3.10.1 (already present), VS Code Extension API ^1.85.0, `react-leaflet`/Leaflet (renderer map), Vite 5.x (web-shell + renderer)
**Storage**: N/A for preview (read-only). Web-shell export reads plots/assets via `@debrief/stac-writer` (IndexedDB backend per #236). VS Code reads via `vscode.workspace.fs`.
**Testing**: Vitest (renderer loaders, shared export core, panel), Playwright via `run-playwright.mjs` (web-shell preview + export workflow; shared-components Storybook for the header control)
**Target Platform**: VS Code extension host (Node 20) + system browser; web-shell static SPA on `debrief.github.io` and dev/preview
**Project Type**: web (monorepo: shared packages + apps)
**Performance Goals**: Preview launch (click → renderer playing) within a few seconds on a typical plot; renderer URL-fetch + validate is the only added latency vs. inline boot
**Constraints**: Offline-by-default for VS Code preview (loopback only); inline-boot path byte-identical and network-free (FR-010/011); strict types, no `any`; reuse shared playback engine (#217/#258/#263)
**Scale/Scope**: Single active storyboard per preview/zip; plots up to the existing sample-catalog scale

## Constitution Check

*GATE: re-checked after Phase 1 design below.*

| Article | Assessment |
|---|---|
| **I. Defence-grade reliability** | PASS. VS Code preview is loopback-only → fully offline. Inline-boot path stays network-free for storyboard data (FR-011). No silent failures: unreachable URL → explicit renderer error state; blocked tab → host message (FR-008/009). |
| **II. Schema integrity** | PASS — **no schema change**. `BriefingConfig.tileLayerUrl` is a renderer-local TS interface field, not LinkML. Plot/Storyboard/Scene LinkML types consumed unchanged; no adherence-test impact. |
| **III. Data sovereignty** | PASS. Preview is read-only (no transformation, no provenance write). Export already records provenance in `item.json`; web-shell export reuses the same core. |
| **IV. Architectural boundaries** | PASS. All frontend; no Python service touched. **IV.2** preview persists nothing; export "writes" only a user-downloaded artefact, not app state. **IV.4** web-shell reads plot/item/thumbnails through `@debrief/stac-writer` (no raw IndexedDB). The VS Code loopback server is read-only serving, not persistence. |
| **V. Extensibility** | PASS. Renderer dual-boot is additive; a missing `onPreview` simply hides the button. |
| **VI / VII. Testing & TDD** | PASS (planned). Renderer inline-boot tests stay green; new url-boot, shared-export-core, panel-control, and web-shell E2E tests written before/with implementation. |
| **VIII. Documentation** | PASS with action: **new ADR** for (a) the VS Code loopback-preview-server pattern and (b) the renderer dual-boot-path. Spec + this plan satisfy "specs before code". |
| **IX. Dependencies** | PASS — **no new external dependency** (`node:http`, `fetch`, `Blob` native; JSZip already pinned). New *internal* workspace package `@debrief/briefing-export`. |
| **X. Security** | PASS. No secrets. Loopback server binds 127.0.0.1 only, serves read-only scoped data, ephemeral lifetime, **and enforces a `Host` header allowlist to defeat DNS-rebinding** (contract C-B7; folded into the ADR). |
| **XI. i18n** | PASS. New user-facing strings (Preview label/tooltip, errors) externalised like existing panel strings. |
| **XIII. Contribution standards** | PASS. Atomic commits; PR review; CI gate. |
| **XV. Strict type safety** | PASS. Renderer fetch boundary narrows via existing validators before use; no `any`; strict mode throughout. |

**Result**: No violations. One documentation action (ADR) tracked. The VS Code loopback server is novel but within boundaries — recorded in Complexity Tracking for visibility.

## Project Structure

### Documentation (this feature)

```text
specs/273-storyboard-preview-button/
├── plan.md              # This file
├── spec.md              # Feature spec
├── research.md          # Phase 0 — 6 decisions
├── data-model.md        # Phase 1 — interfaces/contracts (no LinkML change)
├── quickstart.md        # Phase 1 — verify/run
├── contracts/
│   ├── preview-boot.md       # renderer URL-boot guarantees
│   └── host-integration.md   # panel control, VS Code server, web-shell handoff, shared export
├── checklists/requirements.md
└── evidence/
    └── opening-context.md    # cached blog opener (Phase 2)
```

### Source Code (repository root)

```text
shared/
├── briefing-export/                      # NEW package @debrief/briefing-export
│   ├── src/
│   │   ├── core/                         # pure: scopeStoryboard, computeTileCoverage,
│   │   │   │                             #       injectInlineData, assembleZip, buildItemJson
│   │   │   └── index.ts
│   │   ├── deps.ts                        # ExportDeps / ExportHostDeps interface
│   │   └── index.ts
│   ├── src/__tests__/                     # core unit tests (moved + extended)
│   └── package.json
└── components/src/panels/StoryboardPanel/
    ├── StoryboardHeader.tsx               # + Preview button (gated on onPreview)
    ├── StoryboardPanel.tsx                # pass-through canPreview/onPreview
    └── types.ts                           # + onPreview?, canPreview?

apps/briefing-renderer/src/
├── App.tsx                                # read ?features alongside ?story
├── boot.ts                                # + async url-boot branch (inline path untouched)
├── types.ts                               # BriefingConfig + optional tileLayerUrl
├── loaders/urlDataLoader.ts               # NEW: fetch + reuse validators + synth item/config
├── components/BriefingMap.tsx             # tileLayerUrl ?? './tiles/...'
└── __tests__/                             # keep boot.test.ts green + url-boot tests

apps/vscode/src/
├── services/briefingPreviewServer.ts      # NEW: ephemeral loopback server (renderer + /features.geojson)
├── services/briefingZipExport/            # host adapter only; pure core now imported from @debrief/briefing-export
├── commands/previewStoryboard.ts          # NEW: scope active SB, start server, asExternalUri+openExternal
├── commands/exportStoryboardAsBriefingZip.ts  # re-pointed at shared package
├── views/storyboardPanelView.ts           # handle 'preview-clicked'
└── webview/web/storyboardPanel.tsx        # post 'preview-clicked'; pass onPreview

apps/web-shell/src/
├── StoryboardPanelMount.tsx               # wire onPreview (blob URL) + Export
├── services/briefingExportWebDeps.ts      # NEW: web ExportDeps (stac-writer reads + download)
└── (vite.config.ts / build)               # serve apps/briefing-renderer dist under /briefing-renderer/
```

**Structure Decision**: Monorepo "web" layout. The one structural addition is the `@debrief/briefing-export` shared package — chosen over cross-app imports to satisfy FR-016 and the E12 no-deep-imports direction. Everything else extends existing files in place.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| StoryboardPanel header (Preview control) | `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` | `storyboard-panel.js` | Show the new Preview button in the header (enabled vs disabled-no-scenes) across themes |

**Inclusion Criteria Applied**:
- [x] New visual component (Preview button in shared header)
- [x] Significant visual change
- [x] Interactive demo adds narrative value (the "verify before export" loop)

**Bundleability Verified**:
- [x] Stories exist in Storybook (StoryboardPanel has stories; add/extend a Preview-enabled variant)
- [x] Components render standalone (panel renders from props/mock host)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/components-storybook/?path=/story/panels-storyboardpanel`

> The richer narrative artefact is a **web-shell workflow GIF** (click Preview → renderer tab plays back), captured by the Playwright workflow below, not a Storybook bundle.

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `StoryboardPanel.stories.tsx` (Preview variant) | Preview button renders when `onPreview` set; disabled+tooltip when `canPreview=false`; hidden when `onPreview` absent; click fires `onPreview` | light, dark, vscode | hover (tooltip), click |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (click → callback)
- [x] Accessibility attributes present (`data-testid`, `aria-*`, disabled state)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/StoryboardPanel.spec.ts` (extend existing)

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Preview active storyboard | StoryboardPanel header, briefing-renderer tab | `[data-testid="storyboard-preview"]`, renderer `[data-testid="briefing-loading"]`/map | load plot, click Preview, assert new tab loads renderer at `/briefing-renderer/?features=blob:` and reaches `ready`, scenes play |
| Export briefing zip (web-shell) | StoryboardPanel / panel host | export control | invoke export, assert a `.zip` is delivered (download), assert it is non-empty/openable |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended for the Preview control + new-tab handling (`context.waitForEvent('page')`)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/273-storyboard-preview-button/evidence/screenshots/`

**Test File Location**: `apps/web-shell/playwright/tests/storyboard-preview.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs storyboard-preview`
- Local: `pnpm --filter @debrief/web-shell test storyboard-preview`

**Optional — chrome-level VS Code Webview tests**: The VS Code loopback-server + `openExternal` path is exercised by a thin command-level/unit test of `briefingPreviewServer` (server serves renderer + `/features.geojson`, returns scoped features); full external-browser launch is not driven through openvscode-server (#142 reliability) — the renderer behaviour itself is covered by the web-shell + renderer-unit paths above.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| VS Code ephemeral loopback HTTP server (new pattern, no precedent) | External browser tabs (the chosen surface) cannot read `webview-resource:` URIs; a reachable URL is required to serve the renderer + live features offline | A `file://` temp page with inlined data = the zip path in disguise (a packing step), violating "live URL, no zip"; a webview was explicitly rejected (user chose a new tab). To be documented in an ADR. |
| New shared package `@debrief/briefing-export` | FR-016 requires shared packing logic across hosts; E12 direction forbids cross-app deep imports | Duplicating the packer in web-shell risks drift; importing from `apps/vscode` crosses app boundaries. The core is already pure, so extraction is mechanical. |
