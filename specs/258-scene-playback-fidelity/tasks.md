---

description: "Task list for spec 258 — Storyboard Scene Playback Fidelity & UI Polish"
---

# Tasks: Storyboard Scene Playback Fidelity & UI Polish

**Input**: Design documents from `/specs/258-scene-playback-fidelity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests ARE requested (per Article VI Testing — mandatory across all artefact layers).

**Organization**: Tasks grouped by user story (US1–US4) per spec.md priorities (P1, P1, P2, P2). The two P1 stories are co-prioritised; either may run first after the foundation phase. SC-006 requires all four to ship together — no story may be deferred.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. Used in PR descriptions, blog post, and future reference.

**Evidence Directory**: `specs/258-scene-playback-fidelity/evidence/`
**Media Directory**: `specs/258-scene-playback-fidelity/media/`

### Planned Artifacts

This feature touches three evidence categories simultaneously:

1. **Schema Change** → round-trip proof (Python → JSON → TypeScript → JSON) for `SceneProperties.display_mode` + `_polygon_source`.
2. **UI Component(s)** → three theme screenshots (light, dark, vscode) for both `SceneRectangleLayer` (active-scene halo) and `FeatureList` (storyboard grouping with `(N)` badge), plus interaction GIFs.
3. **VS Code Extension Workflow** → web-shell Playwright screenshots of the capture-Trail → play-back-restores-Trail flow and the FeatureList storyboard expand/collapse flow.

| Artifact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | pytest + vitest + Playwright pass/fail counts; uses template from `.specify/templates/evidence/test-summary-template.md`; YAML front matter mandatory | After all tests pass |
| `evidence/usage-example.md` | Concrete walkthrough: capture in Trail → play back → mode restores. Annotated code + expected behaviour. | After all four stories implemented |
| `evidence/round-trip-evidence.md` | Schema round-trip: Pydantic write → JSON → TS read → JSON → Pydantic. Demonstrates `display_mode` + `_polygon_source` survive both directions intact. | After schema regen + tests pass |
| `evidence/screenshots/scene-rect-halo-light.png` | Active-scene rectangle with halo in light theme | After Story 3 lands |
| `evidence/screenshots/scene-rect-halo-dark.png` | Same, dark theme | After Story 3 lands |
| `evidence/screenshots/scene-rect-halo-vscode.png` | Same, VS Code theme | After Story 3 lands |
| `evidence/screenshots/featurelist-grouping-light.png` | Collapsible Storyboard parent + scene children + `(N)` badge in light theme | After Story 4 lands |
| `evidence/screenshots/featurelist-grouping-dark.png` | Same, dark theme | After Story 4 lands |
| `evidence/screenshots/featurelist-grouping-vscode.png` | Same, VS Code theme | After Story 4 lands |
| `evidence/screenshots/before-after-polygon.png` | Side-by-side: legacy ~100m placeholder vs real bounds at two different zooms | After Story 2 lands |
| `evidence/screenshots/interaction.gif` | Primary flow: switch to Trail → Capture → Switch to Full → click scene in FeatureList → map flies + Trail restored + rectangle halos | After Stories 1+2+3+4 all land |
| `evidence/webview-e2e-summary.md` | Playwright suite results: `storyboard-capture.spec.ts` + `storyboard-playback-fidelity.spec.ts` | After web-shell E2E pass |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener (Hook + What/How/Decisions) | ✅ Created during `/speckit.plan` |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Triggered When |
|---|---|---|
| Feature PR | PR in debrief-future with evidence | Final task `/speckit.pr` |
| Blog PR | PR in debrief.github.io with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the monorepo toolchain (LinkML regen, pnpm/uv workspaces, Playwright runner) is healthy before any code lands. No new packages or configs are created by this feature.

- [ ] T001 Verify schema regeneration toolchain works end-to-end (`uv run task schemas:regen` or equivalent) and commits the regenerated files cleanly — baseline measurement so subsequent diffs are signal not noise `shared/schemas/`
- [ ] T002 [P] Verify Playwright cloud runner provisions Chromium correctly (`cd apps/web-shell && node run-playwright.mjs --list`) — confirms `@sparticuz/chromium` extracts in this session `apps/web-shell/run-playwright.mjs`
- [ ] T003 [P] Confirm `task verify` baseline is green on the branch before any changes (lint + typecheck + tests) — sets the "before" reference for CI regression checking `Taskfile.yml`

**Checkpoint**: Toolchain healthy; baseline CI green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: LinkML schema additions (`display_mode` slot + `PolygonSourceEnum` + `_polygon_source` slot) and the regenerated Pydantic/TypeScript types they produce. Every user story consumes these types — nothing else can start until Phase 2 is complete and `pnpm -r typecheck` is green.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete and the generated `@debrief/schemas` artefacts are checked in.

### Schema source edits

- [ ] T004 Add `display_mode` slot to `SceneProperties` (required: false; range: `DisplayModeEnum`). Reference the existing enum at `session-state.yaml#/enums/DisplayModeEnum` — do NOT duplicate it (Article II.1 single source of truth) `shared/schemas/src/linkml/storyboard.yaml`
- [ ] T005 Add `PolygonSourceEnum` (permissible values: `bounds`, `placeholder`, `manual`) to `storyboard.yaml#/enums` `shared/schemas/src/linkml/storyboard.yaml`
- [ ] T006 Add `_polygon_source` slot to `SceneProperties` (required: false; range: `PolygonSourceEnum`); depends on T005 `shared/schemas/src/linkml/storyboard.yaml`
- [ ] T007 If cross-file LinkML `imports:` are awkward, copy the `DisplayModeEnum` permissible-value list into `storyboard.yaml` with a comment pointing at the canonical source (decision to be made during T004; pick one route, do not ship both) `shared/schemas/src/linkml/storyboard.yaml`

### Regeneration

- [ ] T008 Regenerate Pydantic models (`uv run task schemas:regen-pydantic` or equivalent); commit generated files `shared/schemas/src/generated/python/`
- [ ] T009 Regenerate TypeScript types (`pnpm --filter @debrief/schemas regen-typescript` or equivalent); commit generated files `shared/schemas/src/generated/typescript/`
- [ ] T010 Regenerate JSON Schema fragments (gen-json-schema); commit generated files `shared/schemas/src/generated/jsonschema/`

### Schema gate tests

- [ ] T011 [test] Add golden fixture covering a scene **with** `display_mode: 'trail'` AND `_polygon_source: 'bounds'` (round-trip case) `shared/schemas/fixtures/scene-258-with-display-mode.json`
- [ ] T012 [P][test] Add golden fixture covering a legacy scene (NO `display_mode`, NO `_polygon_source`) — must parse cleanly via Pydantic (FR-003) `shared/schemas/fixtures/scene-258-legacy.json`
- [ ] T013 [P][test] Add Python round-trip test for `display_mode` + `_polygon_source` `shared/schemas/tests/test_scene_properties_258.py`
- [ ] T014 [P][test] Add TypeScript round-trip test asserting both slots survive `JSON.parse` / `JSON.stringify` `shared/schemas/tests/scene-properties-258.test.ts`

### Verification

- [ ] T015 Run `task verify` end-to-end; confirm lint + typecheck + schema tests all green. Any pre-existing failures are pre-conditions, not regressions — but every test added in T011–T014 MUST pass `Taskfile.yml`

**Checkpoint**: Foundation ready — `SceneProperties.display_mode` and `SceneProperties._polygon_source` exist in `@debrief/schemas`; round-trip proven; user-story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Capture & restore Trail/Full display mode (Priority: P1)

**Goal**: An author captures a scene while the time controller is in Trail mode; clicking that scene later restores Trail mode in addition to the viewport. Legacy scenes (no `display_mode`) leave the time controller untouched.

**Independent Test**: Open a sample storyboard, switch the time controller to Trail, capture a scene. Switch to Full, capture a second. Click the first scene in the StoryboardPanel or FeatureList → map flies to scene 1's framing AND the time controller switches to Trail. Click the second → switches back to Full.

### Tests for User Story 1 ⚠️

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation.

- [ ] T016 [P][test][US1] Unit test: `captureScene.ts` reads `session.getState().displayMode` and passes it into `createScene` `apps/vscode/src/commands/__tests__/captureScene.test.ts`
- [ ] T017 [P][test][US1] Unit test: web-shell `captureSceneWeb.ts` mirrors the same path `apps/web-shell/src/commands/__tests__/captureSceneWeb.test.ts`
- [ ] T018 [P][test][US1] Unit test: `crud.createScene` accepts and persists `display_mode` in `SceneProperties` `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T019 [test][US1] Targeted VS Code unit test (C-14): `storyboardPlayback.executeTransition` calls `session.setDisplayMode(scene.properties.display_mode)` exactly once per transition when slot is PRESENT; DOES NOT call it when slot is ABSENT; never fires from any of the other 6 `pushSceneRectangles` invocation sites `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts`

### Web-Shell E2E Tests for User Story 1 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip. See `docs/project_notes/playwright-installation-research.md`.

- [ ] T020 [P][test][US1] Extend `StoryboardEditPage` page object with `getDisplayMode()` and `setDisplayMode(mode)` selectors `apps/web-shell/playwright/pages/StoryboardEditPage.ts`
- [ ] T021 [test][US1] Extend `storyboard-capture.spec.ts`: switch to Trail → Capture → assert saved scene has `display_mode: 'trail'` `apps/web-shell/playwright/tests/storyboard-capture.spec.ts`
- [ ] T022 [test][US1] New E2E test: capture Trail-mode scene → switch to Full → click scene → assert mode switches back to Trail `apps/web-shell/playwright/tests/storyboard-playback-fidelity.spec.ts`

### Implementation for User Story 1

#### Shared layer (consumed by both hosts)

- [ ] T023 [US1] Add `onSceneActivated?: (scene: SceneFeature) => void` callback prop to `StoryboardPanelProps` (and any related types) `shared/components/src/panels/StoryboardPanel/types.ts`
- [ ] T024 [US1] In `StoryboardPanel`, fire `onSceneActivated(scene)` from every code path that sets `currentSceneIndex`/`currentSceneId` (panel click, transport advance, etc.); depends on T023 `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T025 [P][US1] Extend `createScene` (and `updateScene`) input types to accept `displayMode?: DisplayMode` and persist it as `properties.display_mode` `shared/components/src/storyboard/crud.ts`

#### VS Code host

- [ ] T026 [US1] In `captureScene.ts`, read `session.getState().displayMode` and pass it via the `createScene` input; depends on T025 `apps/vscode/src/commands/captureScene.ts`
- [ ] T027 [US1] In `storyboardPlayback.executeTransition` (line 621), after `flyToViewport`, conditionally call `session.setDisplayMode(scene.properties.display_mode)` ONLY when slot is present; depends on T023 `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T028 [US1] Wire `StoryboardPanel.onSceneActivated` from the VS Code panel host so it routes into `executeTransition` (or a dedicated thin handler that owns the setDisplayMode call); exact host-wiring file discovered during impl; depends on T024, T027 `apps/vscode/src/panels/`

#### Web-shell host

- [ ] T029 [P][US1] In `captureSceneWeb.ts`, read `displayMode` from the session store and pass it via `createScene`; depends on T025 `apps/web-shell/src/commands/captureSceneWeb.ts`
- [ ] T030 [US1] Wire `StoryboardPanel.onSceneActivated` in `App.tsx` (or `StoryboardPanelMount`); route it to `session.setDisplayMode(scene.properties.display_mode)` in the same handler block that handles `temporal:displayMode` messages; depends on T024 `apps/web-shell/src/App.tsx`

**Checkpoint**: A Trail-mode capture round-trips through both hosts; legacy scenes don't disturb the time controller. T016–T022 all pass.

---

## Phase 4: User Story 2 — Real viewport-bounds polygon fidelity (Priority: P1)

**Goal**: Each scene's on-map rectangle matches the actual viewport at capture time, not a ~100m placeholder. Legacy scenes are recomputed at render time using `_polygon_source` metadata (no fragile geometric heuristic). Updating or restoring a scene preserves bounds fidelity (all 3 `crud.ts` call sites covered).

**Independent Test**: Capture three scenes at clearly different zooms (continental, regional, neighbourhood). The three rectangles on the map have visibly different sizes. Open a pre-#258 sample plot — its rectangles are recomputed from stored viewport rather than appearing as ~100m squares.

### Tests for User Story 2 ⚠️

- [ ] T031 [P][test][US2] Unit test: `bboxToPolygon(bounds, 'bounds')` produces a closed `[SW, NW, NE, SE, SW]` ring whose four corners equal `bounds.getSouthWest/getNorthWest/getNorthEast/getSouthEast`. Reject degenerate inputs `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T032 [P][test][US2] Unit test: `createScene` populates `_polygon_source: 'bounds'` when called via the new path `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T033 [P][test][US2] Unit test: `updateScene` (line 643 caller) also routes through `bboxToPolygon` and sets `_polygon_source: 'bounds'` `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T034 [P][test][US2] Unit test: the third `crud.ts` caller at line 1020 (`restoreScene` / migrate path) propagates `_polygon_source` correctly — legacy scenes keep their `placeholder` / absent value; updates set `'bounds'` `shared/components/src/storyboard/__tests__/crud.test.ts`
- [ ] T035 [test][US2] Unit test: `SceneRectangleLayer` renders `scene.geometry` as-is when `_polygon_source === 'bounds'`; recomputes from `(viewport, map.getSize())` when value is `'placeholder'`, `'manual'`, or absent. Memoised by `(scene.id, mapZoom)` — re-render with stable inputs does NOT re-invoke recompute `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx`

### Web-Shell E2E Tests for User Story 2 🖥️

- [ ] T036 [P][test][US2] Extend `StoryboardEditPage` with `getSceneRectangleBounds(sceneId)` returning the Leaflet polygon's lat/lng corners `apps/web-shell/playwright/pages/StoryboardEditPage.ts`
- [ ] T037 [test][US2] Extend `storyboard-playback-fidelity.spec.ts`: capture two scenes at clearly different zooms; assert the two polygons have visibly-different bbox areas AND neither matches the legacy placeholder shape `apps/web-shell/playwright/tests/storyboard-playback-fidelity.spec.ts`

### Implementation for User Story 2

#### Shared layer

- [ ] T038 [US2] Add `bboxToPolygon(bounds: LatLngBounds, source: PolygonSource): GeoJSONPolygon` and delete the legacy `viewportToPolygon(viewport)` signature. TypeScript strict mode will flag every caller `shared/components/src/storyboard/crud.ts`
- [ ] T039 [US2] Update `crud.createScene` (line 538): accept a bounds parameter (or compute from input); call `bboxToPolygon(bounds, 'bounds')`; persist `_polygon_source: 'bounds'`. Depends on T038 `shared/components/src/storyboard/crud.ts`
- [ ] T040 [US2] Update `crud.updateScene` (line 643): same treatment — when geometry changes, set `_polygon_source: 'bounds'`. Depends on T038 `shared/components/src/storyboard/crud.ts`
- [ ] T041 [US2] Update the third caller at `crud.ts:1020` (likely `restoreScene` or migrate): preserve incoming `_polygon_source` on restore; default to `'bounds'` if computing from current bounds. Depends on T038 `shared/components/src/storyboard/crud.ts`
- [ ] T042 [P][US2] Add `pickPolygonForRender(scene, map): GeoJSONPolygon` helper in `SceneRectangleLayer` (memoised via `useMemo` keyed on `(scene.id, map.getZoom())`); render its result instead of `scene.geometry` directly `shared/components/src/MapView/SceneRectangleLayer.tsx`
- [ ] T043 [US2] Define `recomputeFromViewport(viewport, mapSize, map)` using `map.containerPointToLatLng({x:0,y:0})` + `map.containerPointToLatLng(mapSize)` → four-corner polygon. Depends on T042 `shared/components/src/MapView/SceneRectangleLayer.tsx`

#### VS Code + web-shell hosts

- [ ] T044 [P][US2] In `captureScene.ts`, pass `map.getBounds()` (via the MapPanel port) into `createScene`. Depends on T039 `apps/vscode/src/commands/captureScene.ts`
- [ ] T045 [P][US2] Same in `captureSceneWeb.ts`. Depends on T039 `apps/web-shell/src/commands/captureSceneWeb.ts`

**Checkpoint**: All three `crud.ts` call sites use bounds-derived polygons; render-side metadata-driven recompute works for legacy scenes; T031–T037 all pass.

---

## Phase 5: User Story 3 — Active-scene selection halo (Priority: P2)

**Goal**: When a scene is the current/active scene, its on-map rectangle displays the same drop-shadow + pulse halo that selected tracks use (the existing `debrief-map-feature--selected` class). At most one rectangle is highlighted at a time.

**Independent Test**: With three scene rectangles visible, click scene 2 in the StoryboardPanel — its rectangle gains the halo and scenes 1 + 3 remain neutral. Click scene 1 directly on the map — halo transfers. Clear selection — no halo on any rectangle.

### Tests for User Story 3 ⚠️

- [ ] T046 [test][US3] Unit test: `SceneRectangleLayer` adds the `debrief-map-feature--selected` className to the polygon when `scene.id === currentSceneId`; omits it otherwise. Existing `debrief-scene-rect--current` class still composed alongside `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx`
- [ ] T047 [test][US3] Unit test: changing `currentSceneId` removes the halo from the previous scene and applies it to the new one in a single render pass `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx`

### Storybook E2E Tests for User Story 3 🎭

- [ ] T048 [P][test][US3] Extend `StoryboardPlayback.stories.tsx` to expose a "halo on active scene" interactive story (or reuse the existing one) — used as the visual demo target `shared/components/src/panels/StoryboardPanel/StoryboardPlayback.stories.tsx`
- [ ] T049 [test][US3] Playwright Storybook test asserts the halo CSS class is applied across light/dark/vscode themes when a scene is active `shared/components/e2e/StoryboardPlayback.spec.ts`

### Implementation for User Story 3

- [ ] T050 [US3] In `SceneRectangleLayer.tsx`, when building the `className` for each polygon, append `'debrief-map-feature--selected'` iff `scene.id === currentSceneId`. The existing `--current` class continues to express the data-state; the new class adds the visual treatment `shared/components/src/MapView/SceneRectangleLayer.tsx`

**Checkpoint**: Active scene visually unambiguous on a busy map; T046–T049 all pass.

---

## Phase 6: User Story 4 — FeatureList storyboard grouping with `(N)` badge (Priority: P2)

**Goal**: Each Storyboard feature renders as a single collapsible parent row in `FeatureList`; its Scene children are indented underneath. The parent row displays `Name (N)` where `N` is the scene count, always visible regardless of collapse state. Active-scene state propagates to a collapsed parent.

**Independent Test**: Open a scenario with one storyboard of 5 scenes. The FeatureList shows ONE top-level "Storyboard" row with `(5)` after the name. Clicking the chevron reveals 5 indented scene children. Collapsing the parent hides them; if a child is the active scene, the collapsed parent inherits the active styling. An empty storyboard renders with `(0)` and a disabled chevron.

### Tests for User Story 4 ⚠️

- [ ] T051 [P][test][US4] Unit test: `flattenFeatures` with 1 × STORYBOARD + 3 × STORYBOARD_SCENE (all under same `storyboard_id`) produces exactly 1 row of `type: 'storyboard'` + 3 child rows when expanded; 1 row only when collapsed. `childCount === 3` on the parent `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T052 [P][test][US4] Unit test: empty storyboard produces 1 parent row with `childCount: 0` and `isExpandable: false` (FR-013) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T053 [P][test][US4] Unit test: two storyboards each with their own scenes — children are routed under correct parents; no cross-contamination `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T054 [P][test][US4] Unit test: orphan scene (`storyboard_id` matches no STORYBOARD feature) is emitted as top-level row with `console.warn` (Article I.3 — no silent failure) `shared/components/src/FeatureList/flattenFeatures.test.ts`
- [ ] T055 [test][US4] Unit test: `FeatureRow` renders `My Scenario (5)` for storyboard rows; renders `My Scenario (0)` for empty ones; chevron disabled when `isExpandable === false` `shared/components/src/FeatureList/FeatureRow.test.tsx`
- [ ] T056 [test][US4] Unit test: `FeatureList` collapse + expand toggles children visibility; `hasChildSelected` propagates active state to a collapsed parent (FR-012) `shared/components/src/FeatureList/FeatureList.test.tsx`

### Storybook E2E Tests for User Story 4 🎭

- [ ] T057 [P][test][US4] Add "Storyboard Grouping" story to `FeatureList.stories.tsx` showing the parent + 5 children + `(5)` badge `shared/components/src/FeatureList/FeatureList.stories.tsx`
- [ ] T058 [test][US4] Playwright Storybook test asserts the `(N)` badge text and chevron expand/collapse behaviour across light/dark/vscode themes `shared/components/e2e/FeatureList.spec.ts`

### Implementation for User Story 4

- [ ] T059 [US4] Add `'storyboard'` to `DisplayItemType` union; add optional `childCount?: number` to the `DisplayItem` interface `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T060 [US4] Update `flattenFeatures` per the data-model.md pseudocode: detect STORYBOARD features, emit parent rows with `childCount`, emit child rows at `depth: 1`, skip top-level STORYBOARD_SCENE features that have matching parents, fall back to top-level with `console.warn` for orphans. Depends on T059 `shared/components/src/FeatureList/flattenFeatures.ts`
- [ ] T061 [US4] In `FeatureRow.tsx`, render `name (childCount)` for `type: 'storyboard'` rows; respect `isExpandable: false` (disabled chevron) for empty storyboards. Depends on T059 `shared/components/src/FeatureList/FeatureRow.tsx`
- [ ] T062 [P][US4] Confirm the existing `hasChildSelected` helper covers the new parent type without modification (it already operates on `parentId` / `depth`). If not, extend it `shared/components/src/FeatureList/flattenFeatures.ts`

**Checkpoint**: Storyboards render as parent rows with `(N)` badge in FeatureList; T051–T058 all pass.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story validation, evidence collection, media content, PR. All four stories must be complete before this phase starts.

### Validation

- [ ] T063 Run the quickstart.md walkthrough end-to-end against a sample plot; manually verify each pass criterion. Note any drift from expectations in evidence/test-summary.md `specs/258-scene-playback-fidelity/quickstart.md`
- [ ] T064 Manual legacy-data smoke test: open `preview/workspace/samples/local-store/` and click through any pre-#258 storyboard. Confirm: (i) loads without error, (ii) rectangles render at real bounds (recompute path), (iii) clicking a legacy scene does NOT change the time controller mode `preview/workspace/samples/local-store/`
- [ ] T065 [P] Run `task verify` and confirm lint + typecheck + unit tests + Playwright E2E all pass on the branch `Taskfile.yml`

### Evidence Collection (REQUIRED)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright-driven evidence tasks because you think browsers can't be installed. The web-shell runner at `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium` binary. Full details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T066 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`); include vitest + pytest + Playwright pass/fail counts; populate YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/258-scene-playback-fidelity/evidence/test-summary.md`
- [ ] T067 Create usage example walkthrough — Trail capture → playback → mode + viewport + halo all restore. Annotated screenshots inline `specs/258-scene-playback-fidelity/evidence/usage-example.md`
- [ ] T068 Round-trip evidence (schema change): Pydantic write → JSON file → TypeScript read → JSON output → Pydantic read-back. Demonstrate `display_mode` and `_polygon_source` survive both directions intact `specs/258-scene-playback-fidelity/evidence/round-trip-evidence.md`

#### Screenshot capture (REQUIRED for UI components)

- [ ] T069 [P] Playwright Storybook screenshots: SceneRectangleLayer active-halo state in light theme `specs/258-scene-playback-fidelity/evidence/screenshots/scene-rect-halo-light.png`
- [ ] T070 [P] Same, dark theme `specs/258-scene-playback-fidelity/evidence/screenshots/scene-rect-halo-dark.png`
- [ ] T071 [P] Same, vscode theme `specs/258-scene-playback-fidelity/evidence/screenshots/scene-rect-halo-vscode.png`
- [ ] T072 [P] Playwright Storybook screenshots: FeatureList storyboard grouping with `(5)` badge in light theme `specs/258-scene-playback-fidelity/evidence/screenshots/featurelist-grouping-light.png`
- [ ] T073 [P] Same, dark theme `specs/258-scene-playback-fidelity/evidence/screenshots/featurelist-grouping-dark.png`
- [ ] T074 [P] Same, vscode theme `specs/258-scene-playback-fidelity/evidence/screenshots/featurelist-grouping-vscode.png`
- [ ] T075 [P] Before/after polygon screenshot: place a legacy ~100m placeholder and a real-bounds rectangle side-by-side at two zoom levels `specs/258-scene-playback-fidelity/evidence/screenshots/before-after-polygon.png`

#### Web-Shell E2E evidence (REQUIRED for extension workflows) 🖥️

- [ ] T076 Run full web-shell Playwright suite: `cd apps/web-shell && node run-playwright.mjs storyboard-playback-fidelity storyboard-capture` `apps/web-shell/playwright/tests/`
- [ ] T077 Capture interaction GIF (< 5 s, < 2 MB) of the headline flow: switch to Trail → Capture → switch to Full → click scene in FeatureList → map flies + Trail restored + rectangle halos. Use `recordVideo` config in Playwright then convert with ffmpeg `specs/258-scene-playback-fidelity/evidence/screenshots/interaction.gif`
- [ ] T078 Document web-shell E2E results: suite name, pass/fail counts, screenshots captured `specs/258-scene-playback-fidelity/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T079 Create feature blog post using Content Specialist subagent (`.claude/agents/media/content.md`). First three sections (Hook, What We're Building, How It Fits, Key Decisions) copied verbatim from `evidence/opening-context.md` (already cached during `/speckit.plan`). Add ship-time sections: Screenshots (reference the captured images), By the Numbers (pull from test-summary.md), Lessons Learned, What's Next. `specs/258-scene-playback-fidelity/media/shipped-post.md`

### PR Creation

- [ ] T080 Create PR and publish blog: run `/speckit.pr`

**Task T080 MUST run last.** It depends on all preceding tasks (validation, evidence, media) being complete. It creates the feature PR in `debrief-future` and publishes `shipped-post.md` to `debrief.github.io` in a single pass; returns both PR URLs.

**Checkpoint**: Evidence complete, blog post drafted, PR open. Workflow advances `BACKLOG.md` item 258 from `specified` to `complete` via the `/speckit.pr` flow.

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. **BLOCKS all user stories** — every story consumes the regenerated `@debrief/schemas` types.
- **Phase 3–6 (Stories US1–US4)**: All depend on Phase 2. After Phase 2, the four stories are largely independent and can proceed in parallel (different test files; different source files per the Project Structure in plan.md). Two soft cross-story dependencies:
  - **US3 depends on US2** for the recompute path being used by `SceneRectangleLayer` (US3 modifies the className while US2 modifies the polygon source). They touch the same file (`SceneRectangleLayer.tsx`); land US2 first to avoid merge conflict.
  - **US4 depends on US3** for `hasChildSelected` semantics to surface the active-scene parent indicator (FR-012). US3 doesn't actually modify `hasChildSelected`, but the visual contract for "active inside a collapsed group" only makes sense once the halo class exists in US3.
- **Phase 7 (Polish)**: Depends on US1+US2+US3+US4 all complete. SC-006 — all four ship together. Evidence collection cannot start until rectangles, halos, and grouping all render in their final form.

### Within Each Story

- Tests (`[test]`) MUST be written and FAIL before implementation tasks. Article VII.1 (Test-Driven AI Collaboration).
- Models / shared types before host wiring.
- Host wiring before E2E.
- Each checkpoint MUST validate the story independently.

### Parallel Opportunities

- **Phase 1**: T002, T003 marked `[P]` — can run together.
- **Phase 2**: T008, T009, T010 are independent regenerators (different output dirs); T011–T014 are independent test files.
- **Phase 3**: T016, T017, T018 are independent test files (`[P]`); within implementation, T025 + T029 touch different files.
- **Phase 4**: T031–T034 are all in the same test file but verify independent helper signatures; ok to write all four at once but not run in parallel. T044 + T045 are independent (different host commands).
- **Phase 5**: small story, mostly serial within `SceneRectangleLayer.tsx`.
- **Phase 6**: T051–T054 are different test cases in the same test file; T057 (Storybook) is independent of unit tests.
- **Phase 7**: T069–T075 are independent screenshot captures.

### Story Co-Prioritisation

The spec marks US1 and US2 as **co-P1** because (b) (polygon fidelity) only "means" what the audience sees once (a) (display mode) is also captured. Implementation order can be either (US1 → US2) or (US2 → US1); the team picks based on convenience. The Polish phase requires both.

---

## Implementation Strategy

### Incremental Delivery

1. **Setup (Phase 1)** → toolchain confirmed; baseline green.
2. **Foundational (Phase 2)** → schema + regen + round-trip tests green. ⚠️ Hard gate: nothing else starts until `pnpm -r typecheck` clears.
3. **US1 + US2 (P1, P1)** → can run in parallel after Phase 2; suggest landing US2 first if a single developer takes both (they share `SceneRectangleLayer.tsx`). After both: capture-and-replay-Trail works AND rectangles are real bounds.
4. **US3 (P2)** → adds the halo class. Visually validate against existing TrackLayer selection style before moving on.
5. **US4 (P2)** → FeatureList tree composition + count badge. Mostly orthogonal to US1–US3.
6. **Polish (Phase 7)** → evidence + media + PR. SC-006 enforces that we do NOT ship US1+US2 alone and follow up with US3+US4 — they ship together.

### Solo-Developer Strategy

With one developer (likely for #258):
1. Phase 1 (T001–T003, ~15 min).
2. Phase 2 (T004–T015, ~half day — schema edits are cheap, regen + round-trip tests are the slow part).
3. US2 first (T031–T045), because it tests easily in isolation and lays the groundwork in `SceneRectangleLayer.tsx`. ~1 day.
4. US1 next (T016–T030), threading display_mode through both capture commands and adding the panel callback. ~1 day.
5. US3 (T046–T050) — small. ~half day.
6. US4 (T051–T062) — the FeatureList work plus a new story. ~1 day.
7. Polish (T063–T080) — evidence collection + Playwright runs + blog draft + PR. ~half day.

Total: ~3.5–4 dev-days. Aligns with the BACKLOG estimate of 3–4 dev-days.

### Parallel-Team Strategy

With two developers:
1. Both land Phase 1 + Phase 2 together.
2. Dev A: US1 + US3 (host-side wiring + halo).
3. Dev B: US2 + US4 (polygon math + FeatureList tree).
4. Polish is a joint exercise.

### Risk Hot-Spots

- **`apps/vscode/src/panels/` host-wiring file (T028)** — the exact location is "discovered during impl" because the explore agent didn't pin it down. Spike this early in US1 so the rest of the story doesn't block.
- **Third `crud.ts` caller at line 1020 (T041)** — the explorer flagged it as "likely `restoreScene` or migrate path". Read the actual function before implementing.
- **Metadata-driven recompute (T042–T043)** — must be memoised correctly to avoid recomputing on every map pan. Verify via a render-counter spy in the test or a manual Performance-panel check.
- **Schema regen drift** — if `gen-pydantic` / `gen-typescript` output differs from main on unrelated slots, do not commit those diffs; isolate just the slots #258 introduces.
- **Storybook + Playwright cohabitation** — T049 + T058 run Storybook E2E for the first time on this branch. If the Storybook config has changed since the last run, expect a small set-up cost.
