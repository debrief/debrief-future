# Tasks: Thumbnail Capture and Gallery Preview

**Input**: Design documents from `/specs/174-thumbnail-capture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Review Decisions** (from `/speckit.review`):
1. Add `crossOrigin="anonymous"` to all TileLayer instances (explicit task)
2. Await thumbnail capture with 5-second timeout in saveSession
3. Direct key lookup for thumbnail assets (`item.assets['thumbnail']`)
4. `thumbnailHref` on `CatalogOverviewItem` only (not StacItemSummary)
5. Test everything including capture utils (jsdom setup)

---

## Evidence Requirements

**Evidence Directory**: `specs/174-thumbnail-capture/evidence/`
**Media Directory**: `specs/174-thumbnail-capture/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest + Playwright results | After all tests pass |
| usage-example.md | Save flow + gallery preview walkthrough | After all stories complete |
| screenshots/component-light.png | ThumbnailPreview in light theme | During E2E tests |
| screenshots/component-dark.png | ThumbnailPreview in dark theme | During E2E tests |
| screenshots/component-vscode.png | ThumbnailPreview in VS Code theme | During E2E tests |
| screenshots/interaction.gif | Gallery prev/next navigation | During E2E tests |
| sample-item.json | STAC item with thumbnail assets | After storage tests |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Done (during /speckit.plan) |
| media/linkedin-planning.md | LinkedIn summary for planning | Done (during /speckit.plan) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

**Purpose**: Install dependencies and configure CORS for canvas capture

- [x] T001 Add `modern-screenshot` dependency to `shared/components/package.json`
- [x] T002 [P] Add `sharp` as devDependency to `apps/web-shell/package.json`
- [x] T003 [P] Add `crossOrigin="anonymous"` to TileLayer in `shared/components/src/MapView/MapView.tsx`
- [x] T004 [P] Add `crossOrigin="anonymous"` to TileLayer in `shared/components/src/StacBrowser/StacBrowser.tsx`
- [x] T005 [P] Add `data-testid="fit-to-window"` to fit button in `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [x] T006 Run `pnpm install` to install new dependencies

---

## Phase 2: Foundation — STAC Data Model & Thumbnail Storage (US5, P1)

**Goal**: Establish the STAC data model for thumbnails and the Python storage function. All other stories depend on this.

**Independent Test**: Run `uv run pytest services/stac/tests/test_thumbnails.py` — verify store, overwrite, and metadata.

### Tests

- [x] T007 [test] Write unit tests for `store_thumbnail()` `services/stac/tests/test_thumbnails.py`
- [x] T008 [P][test] Add test fixture: sample STAC item with thumbnail assets `apps/vscode/test-data/local-store/exercise-alpha/item.json`

### Implementation

- [x] T009 Create `store_thumbnail()` function following `store_artifact()` pattern `services/stac/src/debrief_stac/thumbnails.py`
- [x] T010 [P] Add `thumbnailHref` and `thumbnailSmHref` fields to `CatalogOverviewItem` `shared/components/src/filter-engine/types.ts`
- [x] T011 [P] Update VS Code stacService to extract thumbnail hrefs using direct key lookup (`item.assets['thumbnail']`) `apps/vscode/src/services/stacService.ts`
- [x] T012 [P] Update web-shell mock stacService `toOverviewItem()` to populate thumbnailHref from item assets `apps/web-shell/src/mocks/stacService.ts`
- [x] T013 Run Python tests: `uv run pytest services/stac/tests/test_thumbnails.py`

**Checkpoint**: Thumbnail storage works. STAC items can store and retrieve thumbnail assets.

---

## Phase 3: User Story 1 — Save Plot Generates Thumbnails (Priority: P1)

**Goal**: When analyst saves a plot, the Leaflet map is captured as PNG, downscaled, and stored as STAC thumbnail assets.

**Independent Test**: Save a plot and verify `thumbnail.png` (800x600) and `thumbnail-sm.png` (200x150) appear in the item directory.

### Tests

- [x] T014 [test] Write unit test for `captureMapAsDataUrl()` using jsdom + mock DOM `shared/components/src/MapView/__tests__/captureMap.test.ts`
- [x] T015 [P][test] Write unit test for `downscaleDataUrl()` using jsdom canvas `shared/components/src/MapView/__tests__/resizeImage.test.ts`

### Implementation

- [x] T016 Create map capture utility wrapping `modern-screenshot` domToPng `shared/components/src/MapView/captureMap.ts`
- [x] T017 [P] Create image downscale utility using offscreen canvas `shared/components/src/MapView/resizeImage.ts`
- [x] T018 Add `RequestThumbnailCaptureMessage` and `ThumbnailCaptureResponseMessage` to webview protocol `apps/vscode/src/webview/messages.ts`
- [x] T019 Handle `requestThumbnailCapture` in webview: capture map, downscale, send both base64 PNGs back `apps/vscode/src/webview/mapPanel.ts`
- [x] T020 Integrate capture into saveSession: await with 5-second timeout, decode base64, call `store_thumbnail()` via stacService `apps/vscode/src/commands/saveSession.ts`
- [x] T021 Run unit tests: `pnpm --filter @debrief/components test`

**Checkpoint**: Save-time thumbnail capture works end-to-end.

---

## Phase 4: User Story 2 — Gallery Preview in Catalog Browser (Priority: P2)

**Goal**: Split view in catalog browser with large thumbnail preview pane. Single-click = preview, double-click = open. Prev/next keyboard navigation.

**Independent Test**: Open catalog, click a plot, verify large thumbnail appears in preview pane. Arrow keys navigate through items.

### Tests

- [x] T022 [test] Write component tests for ThumbnailPreview: render, fallback, prev/next, keyboard nav, onError handler `shared/components/src/StacBrowser/__tests__/ThumbnailPreview.test.tsx`

### Implementation

- [x] T023 Create ThumbnailPreview component with large `<img>`, title overlay, prev/next buttons, keyboard arrows, SVG fallback via `onError` `shared/components/src/StacBrowser/ThumbnailPreview.tsx`
- [x] T024 [P] Create ThumbnailPreview styles `shared/components/src/StacBrowser/ThumbnailPreview.css`
- [x] T025 Add preview panel to StacBrowser GoldenLayout (4th panel, right side of top row) `shared/components/src/StacBrowser/StacBrowser.tsx`
- [x] T026 Change ExerciseListItemRow: single-click = highlight/preview (`onHighlight`), double-click = open (`onSelect`) `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`
- [x] T027 Update ExerciseListView to pass `onHighlight` and `onSelect` callbacks separately `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T028 Wire StacBrowser `selectedItemId` state to ThumbnailPreview panel and list highlight `shared/components/src/StacBrowser/StacBrowser.tsx`
- [x] T029 Run component tests: `pnpm --filter @debrief/components test`

**Checkpoint**: Gallery preview pane works with prev/next navigation.

---

## Phase 5: User Story 3 — Small Thumbnails in List View (Priority: P3)

**Goal**: List items show small raster PNG thumbnails (with basemap context) instead of SVG spatial thumbnails when available.

**Independent Test**: Open catalog, verify items with thumbnails show PNG images; items without show SVG fallback.

### Tests

- [x] T030 [test] Write unit test for ExerciseListItemRow: PNG rendering when `thumbnailSmHref` exists, SVG fallback when null `shared/components/src/ExerciseListView/__tests__/ExerciseListItemRow.test.tsx`

### Implementation

- [x] T031 Update ExerciseListItemRow to render `<img>` when `item.thumbnailSmHref` is available, with `onError` fallback to SpatialThumbnail `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`
- [x] T032 Run component tests: `pnpm --filter @debrief/components test`

**Checkpoint**: List view shows raster thumbnails with seamless SVG fallback.

---

## Phase 6: User Story 4 — Batch Thumbnail Backfill (Priority: P4)

**Goal**: CLI script to generate thumbnails for all existing plots by automating the web-shell via Playwright.

**Independent Test**: Run `pnpm --filter @debrief/web-shell generate-thumbnails` and verify all items get `thumbnail.png` + `thumbnail-sm.png`.

### Implementation

- [x] T033 Add `fitToWindow()` method to AnalysisPage POM `apps/web-shell/playwright/pages/AnalysisPage.ts`
- [x] T034 Create backfill script: iterate catalog, open each plot, fit to window, wait for tiles, screenshot, resize with sharp, write PNGs + update item.json `apps/web-shell/scripts/generate-thumbnails.ts`
- [x] T035 Add `"generate-thumbnails"` npm script to web-shell package.json `apps/web-shell/package.json`
- [x] T036 Test: run backfill script against web-shell dev server and verify output files
- [x] T036a One-off retro-capture: run `pnpm --filter @debrief/web-shell generate-thumbnails` against the committed demo catalog at `preview/workspace/samples/local-store/`, verify `thumbnail.png` + `thumbnail-sm.png` exist in every item directory (expected: ~70 plots), confirm each `item.json` has the two thumbnail asset entries, then commit the generated PNGs and `item.json` updates in a single bulk commit. Capture a count check (plots with thumbnails / total plots) in PR evidence.

**Checkpoint**: All existing plots have thumbnails; demo catalog ships with committed thumbnails for every sample plot.

---

## Phase 7: E2E Testing

**Purpose**: End-to-end tests for the gallery preview in the web-shell.

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T037 Create Playwright E2E test: gallery preview panel renders, prev/next navigation, fallback state `apps/web-shell/playwright/tests/thumbnail-preview.spec.ts`
- [x] T038 Run E2E tests: `cd apps/web-shell && node run-playwright.mjs`

**Checkpoint**: All E2E tests pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

### Verification

- [x] T039 Run full CI check: `task verify` (lint + typecheck + tests)
- [x] T040 Run quickstart.md validation: manually verify the steps in `specs/174-thumbnail-capture/quickstart.md`

### Evidence Collection

- [x] T041 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/174-thumbnail-capture/evidence/test-summary.md`
- [x] T042 Create usage demonstration in `specs/174-thumbnail-capture/evidence/usage-example.md`
- [x] T043 [P] Capture theme screenshots (light/dark/vscode) of ThumbnailPreview to `specs/174-thumbnail-capture/evidence/screenshots/`
- [x] T044 Capture interaction GIF showing gallery prev/next navigation to `specs/174-thumbnail-capture/evidence/screenshots/interaction.gif`
- [x] T045 [P] Capture sample STAC item.json with thumbnail assets to `specs/174-thumbnail-capture/evidence/sample-item.json`

### Media Content

- [x] T046 Create shipped blog post in `specs/174-thumbnail-capture/media/shipped-post.md`
- [x] T047 [P] Create LinkedIn shipped summary in `specs/174-thumbnail-capture/media/linkedin-shipped.md`

### PR Creation

- [x] T048 Create PR and publish blog: run `/speckit.pr` — published via `/publish` workflow as debrief.github.io#94 (2026-05-01); feature itself shipped earlier across debrief-future PRs #378/#379/#381/#459/#464

**Task T048 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — install deps, configure CORS
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 Save Capture)**: Depends on Phase 2
- **Phase 4 (US2 Gallery Preview)**: Depends on Phase 2. Can run in parallel with Phase 3.
- **Phase 5 (US3 List Thumbnails)**: Depends on Phase 2. Can run in parallel with Phases 3-4.
- **Phase 6 (US4 Backfill)**: Depends on Phase 2 + Phase 1 (sharp). Can run in parallel with Phases 3-5.
- **Phase 7 (E2E)**: Depends on Phases 4 + 5 (gallery + list view must exist)
- **Phase 8 (Polish)**: Depends on all above

### Parallel Opportunities

```
Phase 1 (Setup)
    │
Phase 2 (Foundation)
    │
    ├── Phase 3 (Save Capture)     ┐
    ├── Phase 4 (Gallery Preview)  ├── Can run in parallel
    ├── Phase 5 (List Thumbnails)  │
    └── Phase 6 (Backfill Script)  ┘
              │
         Phase 7 (E2E)
              │
         Phase 8 (Polish)
```

### Within Phases

- T001-T005: All setup tasks can run in parallel
- T007-T008: Foundation tests can run in parallel
- T010-T012: Type and service updates can run in parallel
- T014-T015: Capture utility tests can run in parallel
- T016-T017: Capture and resize utilities can run in parallel
- T023-T024: Component + CSS can run in parallel
- T041-T045: Evidence tasks can run in parallel

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1-2**: Foundation ready — thumbnail storage works, types updated
2. **Phase 3**: Save-time capture works — new plots get thumbnails automatically
3. **Phase 4**: Gallery preview works — analysts can browse plots visually
4. **Phase 5**: List view enhanced — raster thumbnails replace SVG
5. **Phase 6**: Backfill complete — all existing plots have thumbnails
6. **Phase 7-8**: Tested, documented, shipped

### Recommended Sequential Order

Phases 3-6 can run in parallel but the recommended order for a single developer is:
1. Phase 3 (Save Capture) — establishes the capture pipeline
2. Phase 5 (List Thumbnails) — quick win, small change
3. Phase 4 (Gallery Preview) — largest UI change
4. Phase 6 (Backfill Script) — developer tooling, can happen anytime

---

## Notes

- `[P]` tasks = different files, no dependencies — can run in parallel
- `[test]` tasks should be written first and verified to fail before implementation
- Direct key lookup: use `item.assets['thumbnail']` not role scanning
- `thumbnailHref` only on `CatalogOverviewItem`, not duplicated to `StacItemSummary`
- Use `modern-screenshot` (not `leaflet-image`) for DOM-to-PNG capture
- `crossOrigin="anonymous"` is required on all TileLayer instances for canvas capture
- Capture in saveSession: await with 5-second timeout, non-blocking on failure
