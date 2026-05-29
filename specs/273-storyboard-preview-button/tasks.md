# Tasks: Storyboard live Preview button + web-shell briefing-zip export parity

**Feature**: 273 | **Branch**: `273-storyboard-preview-button` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This breakdown delivers two coordinated capabilities surfaced from the shared `StoryboardPanel`
header: (A) a **Preview** button that opens the briefing-renderer SPA in a new tab loaded **live**
from a features URL (no zip step), and (B) **Export as briefing zip** parity for the web-shell
surface, achieved by extracting the packing core into a shared `@debrief/briefing-export` package.

## Evidence Requirements

**Evidence Directory**: `specs/273-storyboard-preview-button/evidence/`
**Media Directory**: `specs/273-storyboard-preview-button/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results across renderer, shared-export, panel, web-shell | After all tests pass |
| usage-example.md | Walkthrough: click Preview → renderer tab plays; web-shell Export → download | After both flows work |
| screenshots/storyboard-preview-{light,dark,vscode}.png | StoryboardPanel header with Preview control, 3 themes (Storybook E2E) | After panel control done |
| screenshots/preview-playback-webshell.png | Web-shell Preview → renderer tab playing the active storyboard | After web-shell preview works |
| screenshots/preview-disabled-no-scenes.png | Preview disabled + tooltip when active storyboard has no scenes | After panel control done |
| screenshots/interaction.gif | Web-shell: click Preview → new tab loads renderer → scenes play (< 5s, < 2MB) | After web-shell E2E passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| evidence/opening-context.md | Cached opener (What We're Building, How It Fits, Key Decisions) | During /speckit.plan (present) |
| media/shipped-post.md | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you
> think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux
> Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary
> works fully. Run `node apps/web-shell/run-playwright.mjs` (or the `shared/components` wrapper) to
> extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

## Phase 1: Setup

**Goal**: Scaffold the new shared `@debrief/briefing-export` workspace package so the pure packing
core can be moved into it in Phase 2. No behaviour change yet.

- [x] T001 Create package manifest for the shared export package `shared/briefing-export/package.json` (name `@debrief/briefing-export`, type module, `main`/`types` pointing at `src/index.ts`, JSZip as a dependency mirroring the version already pinned in the repo, build/typecheck scripts matching sibling packages like `shared/stac-writer`)
- [x] T002 [P] Add TypeScript config `shared/briefing-export/tsconfig.json` (extend the repo base config, strict mode, mirror `shared/stac-writer/tsconfig.json`)
- [x] T003 [P] Add package entry point `shared/briefing-export/src/index.ts` (placeholder re-exports — populated in Phase 2)
- [x] T004 Verify the pnpm workspace resolves the new package: run `pnpm install` and confirm `@debrief/briefing-export` is linked (workspace glob already covers `shared/*`; add it explicitly only if needed)


## Phase 2: Foundation (Blocking Prerequisites)

**Goal**: Move the pure packing core into the shared package, re-point VS Code at it (no behaviour
change — existing zip export must stay green), and lay the shared seams both stories build on: the
panel `onPreview`/`canPreview` props and the renderer's optional `tileLayerUrl`.

**⚠️ CRITICAL**: No user story should begin until this phase is complete and existing tests are green.

### Extract the shared export core (FR-016, C-D1)

- [x] T005 Move the pure packing modules into the package, preserving their content: `shared/briefing-export/src/core/scopeStoryboard.ts`, `computeTileCoverage.ts`, `injectInlineData.ts`, `zipAssembler.ts`, `buildItemJson.ts` (sourced from `apps/vscode/src/services/briefingZipExport/`; verify zero `node:fs`/`path`/`os` imports per C-D1)
- [x] T006 Move the host-dependency interface and orchestrator into the package `shared/briefing-export/src/deps.ts` and `shared/briefing-export/src/core/export.ts` (the `ExportDeps`/`ExportHostDeps` seam + orchestrator from `apps/vscode/src/services/briefingZipExport/export.ts`, with all `fetchTile`/`readPlot`/`writeOrDeliver`/`ui` members host-injected)
- [x] T007 Populate the package entry point `shared/briefing-export/src/index.ts` (export orchestrator, `ExportDeps`/`ExportHostDeps` types, and the pure core functions consumers need)
- [x] T008 [P] Move the export core unit tests into the package `shared/briefing-export/src/__tests__/` (relocated from any existing `briefingZipExport` tests; adjust imports to the package-relative paths; they must pass unchanged in behaviour)

### Re-point the VS Code host adapter (no behaviour change)

- [x] T009 Reduce `apps/vscode/src/services/briefingZipExport/` to a host adapter only: keep `fetchTiles.ts` (Node `fetch`) and the disk/save-dialog wiring, delete the now-moved pure modules, and re-export/import the orchestrator + types from `@debrief/briefing-export` via `apps/vscode/src/services/briefingZipExport/index.ts`
- [x] T010 Update the VS Code export command `apps/vscode/src/commands/exportStoryboardAsBriefingZip.ts` to construct its `ExportDeps` from the VS Code host adapter and call the shared orchestrator (no functional change to the produced zip)
- [x] T011 [test] Confirm the VS Code briefing-zip export behaviour is unchanged: run `pnpm --filter @debrief/vscode test` (existing export tests stay green) `apps/vscode/src/services/briefingZipExport/`

### Shared panel Preview control props (C-A1..C-A4)

- [x] T012 Add `onPreview?: () => void` and `canPreview?: boolean` to the panel prop types `shared/components/src/panels/StoryboardPanel/types.ts` (follow the existing optional-callback pattern used by Capture/Export)
- [x] T013 Render the Preview button in the header button row `shared/components/src/panels/StoryboardPanel/StoryboardHeader.tsx` (sibling of Capture; rendered iff `typeof onPreview === 'function'`; disabled with explanatory tooltip when `canPreview === false`; `data-testid="storyboard-preview"`, `aria-*`)
- [x] T014 Thread the new props through the panel `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx` (pass-through `onPreview`/`canPreview` to the header)
- [x] T015 [test] Cover the header Preview control `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardHeader.test.tsx` (renders iff `onPreview` set — C-A1; disabled+tooltip when `canPreview===false`, does not fire — C-A2; absent `onPreview` renders identically/no layout shift — C-A3; click fires once — C-A4)

### Renderer basemap seam (Decision 2, contract Basemap)

- [x] T016 Add optional `tileLayerUrl?: string` to the renderer-local config interface `apps/briefing-renderer/src/types.ts` (renderer-local TS only — NOT a LinkML change)
- [x] T017 Use the optional tile URL in the map `apps/briefing-renderer/src/components/BriefingMap.tsx` (`config.tileLayerUrl ?? './tiles/{z}/{x}/{y}.png'`; keep `errorTileUrl` placeholder so offline degrades gracefully)


## Phase 3: User Story 1 — Preview the current storyboard (Priority: P1)

**Goal**: An author clicks **Preview** in the storyboard panel header and the briefing-renderer
opens in a new tab, loaded **live** from a features URL, playing back the active storyboard — on
both the VS Code and web-shell surfaces.

**Independent Test**: Open a plot with a ≥1-scene storyboard, click Preview, confirm the renderer
opens in a new tab and plays the active storyboard's scenes (order, viewports, time-range motion,
basemap) loaded live from a `?features=` URL — no zip step.

### Renderer URL-boot path (additive; inline path untouched — contract preview-boot G4..G7)

- [x] T018 [test] Write URL-boot loader tests first `apps/briefing-renderer/src/loaders/__tests__/urlDataLoader.test.ts` (valid URL → fetch once, validate, synth item/config, return `InlineData` shape — G4; unreachable/parse-fail/invalid → `InlineDataLoadError` — G5; one scene → ready, zero → empty — G6; reuses existing validators — G7)
- [x] T019 Create the URL data loader `apps/briefing-renderer/src/loaders/urlDataLoader.ts` (`fetchAndValidate(url)`: `fetch` → parse → reuse existing validators from `inlineDataLoader.ts` → synthesise minimal `item` `{type:'Feature', id, properties:{}, assets:{}, links:[]}` and `config` with online `tileLayerUrl` + high `maxBundledZoom`; throw `InlineDataLoadError` on any failure)
- [x] T020 Read the `features` query param in the app shell `apps/briefing-renderer/src/App.tsx` (detect `?features=` independently of the existing `?story=` hook)
- [x] T021 Add the async URL-boot branch to boot `apps/briefing-renderer/src/boot.ts` (if `features` present → `bootState: loading` → `urlDataLoader.fetchAndValidate` → unchanged `store.seed(...)` → `ready`/`empty`/`error`; otherwise the existing synchronous inline path runs unchanged)
- [x] T022 [test] Add boot-path tests for the URL branch `apps/briefing-renderer/src/__tests__/boot.test.ts` (valid `features` → `ready` and playing — G4; bad `features` → `error` with human-readable message, never blank — G5; existing inline/dev-fixture/error cases stay green — G1/G2)

### VS Code preview launch (loopback server — contract host-integration B)

- [x] T023 Create the ephemeral loopback preview server `apps/vscode/src/services/briefingPreviewServer.ts` (`node:http` bound to `127.0.0.1`, OS-assigned port; serves bundled renderer from `resources/briefing-renderer-static/` at `/` and scoped active-storyboard features at `/features.geojson`; enforces a `Host` header allowlist → `403` for foreign hosts — C-B7; lazy single shared instance, disposed on deactivation — C-B5)
- [x] T024 [test] Test the preview server `apps/vscode/src/services/__tests__/briefingPreviewServer.test.ts` (serves renderer at `/` — C-B3; serves scoped features at `/features.geojson` — C-B2; rejects foreign `Host` with 403, accepts `127.0.0.1[:port]` — C-B7)
- [x] T025 Create the preview command `apps/vscode/src/commands/previewStoryboard.ts` (scope the active storyboard via shared `scopeStoryboard`; if zero scenes, do not launch and explain why — C-B6; start/reuse the server; open the system browser via `vscode.env.openExternal(await vscode.env.asExternalUri(Uri.parse('http://127.0.0.1:<port>/?features=/features.geojson')))` — C-B4)
- [x] T026 Route the webview message in the panel view host `apps/vscode/src/views/storyboardPanelView.ts` (handle `{ type: 'preview-clicked' }` → invoke the preview command — C-B1; compute `canPreview` from active storyboard scene count and pass to the panel)
- [x] T027 Wire the panel webview to post the message and pass props `apps/vscode/src/webview/web/storyboardPanel.tsx` (provide `onPreview` → `postMessage({ type: 'preview-clicked' })` and `canPreview`)
- [x] T028 Register the preview command in the extension activation `apps/vscode/src/extension.ts` (register `previewStoryboard`; dispose the preview server on deactivation)

### Web-shell preview launch (blob URL — contract host-integration C)

- [x] T029 Serve the briefing-renderer dist under the web-shell tree at `/briefing-renderer/` `apps/web-shell/vite.config.ts` (static copy / dev-server mount mirroring the GitHub Pages sibling-path layout so the path resolves in dev, `vite preview`, and the static build — C-C3)
- [x] T030 Wire `onPreview` in the web-shell panel mount `apps/web-shell/src/StoryboardPanelMount.tsx` (scope the active storyboard from the in-memory `featureCollection`, build a `Blob`, create an object URL, open `<renderer base>/?features=<encodeURIComponent(blobUrl)>` in a new tab keeping the web-shell tab alive — C-C1/C-C2; compute `canPreview` from active storyboard scene count; if the new tab is blocked, surface the reason — C-C4/FR-009)


## Phase 4: User Story 2 — Export a briefing zip from the browser surface (Priority: P2)

**Goal**: An author on the web-shell surface invokes **Export as briefing zip** and the browser
produces a downloadable zip, functionally equivalent to the VS Code one, by reusing the shared
`@debrief/briefing-export` core via a web host adapter.

**Independent Test**: In the web-shell, open a plot with a storyboard, invoke Export as briefing
zip, confirm a `.zip` downloads, then open it offline and confirm it plays back equivalently.

- [ ] T031 Create the web-shell export host adapter `apps/web-shell/src/services/briefingExportWebDeps.ts` (implement `ExportDeps`: `readPlot` from in-memory `featureCollection` + `item.json` via `@debrief/stac-writer` reader — C-D4; `readThumbnail` via stac-writer asset reader; `readStaticBundle` from the served `/briefing-renderer/` tree; `fetchTile` via browser `fetch`; `writeOrDeliver` → anchor + object-URL browser download — C-D3; `ui` → web-shell panel host prompts/toasts)
- [ ] T032 Wire the web-shell Export control `apps/web-shell/src/StoryboardPanelMount.tsx` (pass the existing Export callback for the active storyboard, constructing the web `ExportDeps` and calling the shared orchestrator)
- [x] T033 [test] Prove cross-surface zip equivalence `shared/briefing-export/src/__tests__/equivalence.test.ts` (given equivalent inputs, `assembleZip` produces a functionally-equivalent archive regardless of host adapter — FR-015/C-D2; assert no new external dependency is pulled in — C-D5)


## Phase 5: User Story 3 — Distributed offline briefings keep working unchanged (Priority: P1)

**Goal**: The existing air-gapped inline-boot path used by distributed briefing zips remains
behaviourally unchanged — when no `features` URL is supplied, the renderer uses its bundled,
self-contained data with zero network requests for storyboard data.

**Independent Test**: Open a (pre- or post-feature) briefing zip on a fully offline machine and
confirm it plays back identically — no new errors, no network calls for storyboard data.

- [x] T034 [test] Assert the inline-boot path is byte-for-behaviour unchanged `apps/briefing-renderer/src/__tests__/boot.test.ts` (no `features` param + empty slots + `disableDevFixture` → `error` — G1; populated slots → synchronous seed from slots — G2)
- [x] T035 [test] Assert zero network for storyboard data on the inline path `apps/briefing-renderer/src/loaders/__tests__/inlineDataLoader.test.ts` (with no `features` param, no `fetch` is issued for storyboard data — G3/FR-011; the two boot paths are cleanly separated — FR-012)
- [x] T036 [test] Assert the inline path leaves `tileLayerUrl` unset → bundled local tiles `apps/briefing-renderer/src/components/__tests__/BriefingMap.test.tsx` (inline/zip config has no `tileLayerUrl` → `./tiles/{z}/{x}/{y}.png`, byte-identical to today — contract Basemap)


## Phase 6: Polish & Cross-Cutting Concerns

### E2E Tests

- [x] T037 [test] Extend the Storybook E2E for the Preview control `shared/components/e2e/StoryboardPanel.spec.ts` (Preview renders when `onPreview` set / hidden when absent / disabled+tooltip when `canPreview=false`; hover + click across light/dark/vscode; capture theme screenshots into `specs/273-storyboard-preview-button/evidence/screenshots/`). Run: `cd shared/components && node run-playwright.mjs StoryboardPanel`
- [x] T038 [test] Add the web-shell preview workflow E2E `apps/web-shell/playwright/tests/storyboard-preview.spec.ts` (load plot → capture 4 scenes → click Preview → assert new tab loads renderer at `/briefing-renderer/?features=blob…` and reaches `ready` with scenes playing; ADR-038 guards: every scene references both tracks + renderer draws them; capture `preview-trigger-webshell.png`, `preview-playback-webshell.png`, `preview-scene-{1-overview,2-approach,3-convergence,4-closing}.png`, `preview-present-mode.png` into `evidence/screenshots/`). Run: `cd apps/web-shell && node run-playwright.mjs storyboard-preview`. **NOTE:** the *Export*-as-zip half is part of US2 (T031/T032) and remains deferred; this E2E covers the Preview workflow. The interaction GIF is omitted (no `ffmpeg` in the cloud env); the seven PNGs cover the trigger + replay narrative.
- [x] T039 Extend web-shell page objects for Preview + new-tab handling `apps/web-shell/playwright/pages/StoryboardPanelPage.ts` (added `previewButton` selector + `openPreview()` returning the popup `Page` via `waitForEvent('popup')`; extended, not duplicated)

### Documentation

- [x] T040 Add an ADR for the loopback-preview-server pattern + renderer dual-boot-path `docs/project_notes/decisions.md` (Article VIII.3 — covers the `127.0.0.1` ephemeral server, the `Host`-allowlist DNS-rebinding defence (C-B7), and the additive URL-boot path; cross-link from the spec)

### Evidence Collection

- [x] T041 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/273-storyboard-preview-button/evidence/test-summary.md` (YAML front matter: `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; breakdown by suite: renderer / shared-export / panel / web-shell E2E)
- [x] T042 Create usage demonstration in `specs/273-storyboard-preview-button/evidence/usage-example.md` (click Preview → renderer tab plays; web-shell Export → downloaded zip; both surfaces)
- [x] T043 [P] Capture the headline web-shell preview-playback screenshot `specs/273-storyboard-preview-button/evidence/screenshots/preview-playback-webshell.png` (produced by T038 — do NOT defer)
- [x] T044 [P] Capture the disabled-no-scenes state screenshot `specs/273-storyboard-preview-button/evidence/screenshots/preview-disabled-no-scenes.png` (produced by T037 — do NOT defer)

### Media Content

- [x] T045 Create feature blog post in `specs/273-storyboard-preview-button/media/shipped-post.md` (Content Specialist agent; first three sections copied verbatim from `evidence/opening-context.md`; remaining sections from evidence)

### PR Creation

- [ ] T046 Create PR and publish blog: run /speckit.pr

**Task T046 must run last. It depends on all evidence and media tasks being complete.**


## Dependencies

**Phase order**: Setup (1) → Foundation (2) → User Stories (3, 4, 5) → Polish (6).

- **Phase 1 (Setup)** blocks Phase 2: the package must exist before the core can move into it.
- **Phase 2 (Foundation)** blocks all user stories:
  - The shared `@debrief/briefing-export` extraction (T005–T011) is required by US1's VS Code
    preview (reuses `scopeStoryboard`) and by US2's web-shell export.
  - The panel props (T012–T015) are required by US1 on both hosts.
  - The renderer `tileLayerUrl` seam (T016–T017) is required by US1's URL-boot and US3's
    regression guard.
- **US1 (Phase 3)** and **US3 (Phase 5)** are both P1. US3 is largely a regression guard over the
  renderer changes US1 introduces, so it is validated immediately after US1's renderer work.
- **US2 (Phase 4, P2)** depends only on Foundation; it can proceed in parallel with US1's host
  wiring once the shared package exists.
- **Phase 6 (Polish)**: E2E + evidence depend on the relevant story being functional; the feature
  post (T045) depends on evidence; the PR task (T046) depends on everything.

**Within US1**: renderer URL-boot (T018–T022) is independent of the two host launchers and can run
in parallel with them; VS Code (T023–T028) and web-shell (T029–T030) launchers are independent of
each other.


## Implementation Strategy

**Incremental delivery**:

1. **MVP = Foundation + US1**. After Phase 3, an author on both surfaces can click Preview and watch
   the active storyboard play live in a new tab — the core value (close the tweak→verify loop).
2. **US3 immediately validates** that the additive renderer boot path did not disturb the
   air-gapped inline path — the regression guard ships alongside US1.
3. **US2 adds web-shell export parity**, reusing the shared core extracted in Foundation, so the two
   surfaces cannot drift.
4. **Polish** captures E2E evidence (real Playwright screenshots/GIF), the ADR, the feature post,
   and opens the PR.

**Risk controls**:
- The frozen inline-boot path is protected by keeping `boot.test.ts` green at every step (T011,
  T022, T034) — never modify the synchronous inline branch.
- The loopback server is read-only, ephemeral, loopback-bound, and `Host`-allowlisted (T023/C-B7)
  to close the DNS-rebinding surface before the command that opens the browser (T025) lands.
- Tests precede or accompany each implementation task ([test] tasks listed before the modules they
  cover within each story), per Article VI/VII.

