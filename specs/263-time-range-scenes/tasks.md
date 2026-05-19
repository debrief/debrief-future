# Tasks: Storyboard Time-Range Scenes

**Feature**: 263-time-range-scenes
**Branch**: `263-time-range-scenes`
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Evidence Requirements

**Evidence Directory**: `specs/263-time-range-scenes/evidence/`
**Media Directory**: `specs/263-time-range-scenes/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Pytest + vitest + Playwright run summary (uses `.specify/templates/evidence/test-summary-template.md`) | After all tests pass |
| `evidence/usage-example.md` | Step-by-step demonstration of capturing and playing back a time-range Scene | After capture + playback land |
| `evidence/round-trip-evidence.md` | Schema round-trip proof (LinkML → Pydantic → JSON → TS → JSON) for both Scene flavours | After schema regen + adherence tests pass |
| `evidence/webview-e2e-summary.md` | Web-shell Playwright run report (workflow + screenshots) | After Playwright spec passes in cloud |
| `evidence/screenshots/storyboard-range-armed-light.png` | StoryboardPanel range-armed state — light theme (Storybook E2E) | Storybook E2E pass |
| `evidence/screenshots/storyboard-range-armed-dark.png` | StoryboardPanel range-armed state — dark theme (Storybook E2E) | Storybook E2E pass |
| `evidence/screenshots/storyboard-range-armed-vscode.png` | StoryboardPanel range-armed state — vscode theme (Storybook E2E) | Storybook E2E pass |
| `evidence/screenshots/storyboard-range-in-progress.png` | StoryboardPanel showing the "range in progress" banner | Storybook E2E pass |
| `evidence/screenshots/storyboard-mixed-flavours.png` | StoryboardPanel showing mixed instant + time-range Scene rows | Storybook E2E pass |
| `evidence/screenshots/workflow-capture-start.png` | Web-shell: slider at `t_start`, map framed, range armed | Web-shell Playwright |
| `evidence/screenshots/workflow-capture-end.png` | Web-shell: slider at `t_end`, map re-framed, confirm visible | Web-shell Playwright |
| `evidence/screenshots/workflow-playback-mid.png` | Web-shell: mid-scrub frame showing slider and viewport both partway | Web-shell Playwright |
| `evidence/screenshots/interaction.gif` | <5 s GIF of: arm range → capture start → scrub → confirm → play | Web-shell Playwright (recordVideo → gif) |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | During `/speckit.plan` (already present) |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + media | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` with the shipped post | Triggered by `/speckit.pr` |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks. The project uses `@sparticuz/chromium` and the bundled `run-playwright.mjs` wrappers. Standard browser CDN downloads are blocked (403) in cloud, but the bundled binary works fully. Run `cd apps/web-shell && node run-playwright.mjs storyboard-range-scene` and `cd shared/components && node run-playwright.mjs StoryboardPanel-range`. Full details: `docs/project_notes/playwright-installation-research.md`.

## Phase 1: Setup

**Goal**: Confirm the active feature, branch, and toolchain are ready before any schema or code work begins.

- [x] T001 Confirm `.specify/.active-feature` resolves to this feature `.specify/.active-feature`
- [x] T002 Verify the feature branch matches the active feature `apps/.gitignore`
- [x] T003 [P] Verify Python toolchain (`uv sync`) and that `linkml`, `pydantic>=2`, `gen-pydantic`, `gen-typescript`, `gen-json-schema` are available `pyproject.toml`
- [x] T004 [P] Verify Node toolchain (`pnpm install`) and that `@debrief/schemas`, `@debrief/components`, `@debrief/session-state`, `@debrief/stac-writer` workspaces resolve `pnpm-workspace.yaml`
- [x] T005 Sanity-run `task verify` (or the four-step fallback) on the current `main` to capture the pre-change baseline `Taskfile.yml`

## Phase 2: Foundation — Schema Evolution (Article II)

**Goal**: Land the LinkML schema changes, regenerate all derived artefacts, and prove cross-language adherence. This phase is a hard prerequisite for every user story.

**Independent Test**: `uv run pytest shared/schemas/tests/test_storyboard_scene_flavour.py` passes; round-trip evidence shows a time-range Scene fixture surviving LinkML → Pydantic → JSON → TS → JSON unchanged; all three invalid fixtures are rejected with a flavour-mismatch error.

### Schema source of truth

- [x] T006 Add `TimeRange` class (`start: datetime`, `end: datetime`) to the storyboard LinkML cluster `shared/schemas/src/linkml/storyboard.yaml`
- [x] T007 Convert `SceneProperties.time_range` from reserved (must-be-null) to a `TimeRange` optional slot `shared/schemas/src/linkml/storyboard.yaml`
- [x] T008 Add `SceneProperties.viewport_end: Viewport` optional slot `shared/schemas/src/linkml/storyboard.yaml`
- [x] T009 Add the XOR cross-field adherence rule: `time_range` set ⇔ `viewport_end` set; and `time_range.end > time_range.start` `shared/schemas/src/linkml/storyboard.yaml`

### Regenerate derived artefacts (Article II.1)

- [x] T010 Regenerate Pydantic models from LinkML `shared/schemas/src/debrief_schemas/storyboard.py`
- [x] T011 [P] Regenerate TypeScript types from LinkML `shared/schemas/src/ts/storyboard.ts`
- [x] T012 [P] Regenerate JSON Schema from LinkML `shared/schemas/src/json-schema/storyboard.schema.json`
- [x] T013 [P] Regenerate the `@debrief/schemas` package index export of the new `TimeRange` and updated `SceneProperties` `shared/schemas/src/index.ts`

### Golden fixtures (Article II.2)

- [x] T014 [P] Add canonical valid time-range Scene fixture `shared/schemas/src/fixtures/valid/scene-time-range.json`
- [x] T015 [P] Keep (regression anchor) canonical valid instant Scene fixture `shared/schemas/src/fixtures/valid/scene-instant.json`
- [x] T016 [P] Add invalid fixture: time-range missing `viewport_end` `shared/schemas/src/fixtures/invalid/scene-time-range-missing-viewport-end.json`
- [x] T017 [P] Add invalid fixture: instant Scene with `viewport_end` set `shared/schemas/src/fixtures/invalid/scene-instant-with-viewport-end.json`
- [x] T018 [P] Add invalid fixture: time-range with `t_end <= t_start` `shared/schemas/src/fixtures/invalid/scene-time-range-end-not-after-start.json`
- [ ] T019 [P] Retire the v1 reserved-slot fixtures (`scene-time-range-non-null.json` and `scene-viewport-end-set.json`) introduced by #215 `shared/schemas/src/fixtures/invalid/`

### Adherence tests (Article II + Article VI)

- [x] T020 [test] Add Python adherence tests: round-trip both flavours, reject all three invalid fixtures with flavour-mismatch error `shared/schemas/tests/test_storyboard_scene_flavour.py`
- [x] T021 [P][test] Add TypeScript adherence tests mirroring T020 using generated TS types `shared/schemas/tests/storyboard_scene_flavour.test.ts`
- [x] T022 [P][test] Add JSON-Schema validation tests for the same five fixtures `shared/schemas/tests/storyboard_scene_flavour.schema.test.ts`

### Shared discriminated union (Article XV)

- [x] T023 Add `TimeRange`, `InstantSceneFeature`, `TimeRangeSceneFeature`, `SceneFeature` union, and `isTimeRangeScene` predicate (typed boundary narrowing, no `any`) `shared/components/src/storyboard/types.ts`
- [x] T024 [test] Predicate narrowing test (positive + negative cases) `shared/components/src/storyboard/__tests__/types.flavour.test.ts`

### ADR + en-GB messages

- [ ] T025 [P] Append ADR: additive optional schema evolution under Article XIV + RAF lock-step interpolation primitive `docs/project_notes/decisions.md`
- [ ] T026 [P] Add new en-GB strings for the range affordance, in-progress banner, cancel label, and `t_end <= t_start` error `apps/vscode/src/types/storyboardPanelMessages.ts`

**Parallel example for Phase 2**: T010 must complete before T011/T012/T013 (Pydantic generates first by convention); T014–T019 are independent file writes and run in parallel; T020/T021/T022 are independent test files and run in parallel after their fixtures and regenerated code land.

## Phase 3: User Story 1 — Capture a time-range Scene (P1)

**Story Goal** (spec.md US1): An analyst arms the "range" affordance, captures `(t_start, viewport_start)`, scrubs + reframes, then confirms `(t_end, viewport_end)`. The platform writes a single Scene whose `time_range` and `viewport_end` are both set.

**Independent Test**: With an open plot and a Storyboard containing at least one v1 instant Scene, arm the range affordance, capture start, scrub forward, reframe, and confirm. The new Scene appears in the list with the range badge; inspecting it shows non-null `time_range`, `viewport` matching the start frame, and `viewport_end` matching the end frame. Save → close → re-open preserves all four values byte-equivalently.

### Tests first (FR-CAP-001..006)

- [ ] T027 [test] Capture command: arming the range toggle flips transport state and updates the capture button label `apps/vscode/src/commands/__tests__/captureScene.range.test.ts`
- [ ] T028 [test] Capture command: step-1 records `t_start` + `viewport`, leaves Storyboard list unchanged, surfaces "range in progress" `apps/vscode/src/commands/__tests__/captureScene.range.test.ts`
- [ ] T029 [test] Capture command: step-2 writes a single Scene with `time_range` and `viewport_end` set, list updates once, transport state resets `apps/vscode/src/commands/__tests__/captureScene.range.test.ts`
- [ ] T030 [test] Capture command: cancel path between step-1 and step-2 writes nothing and clears in-progress state; AND document-close (or active-Storyboard switch) mid-flow also resets transport.rangeInProgress to false `apps/vscode/src/commands/__tests__/captureScene.range.test.ts`
- [ ] T031 [test] Capture command: `t_end <= t_start` is rejected at confirm time with a named error string from the en-GB messages module `apps/vscode/src/commands/__tests__/captureScene.range.test.ts`
- [x] T032 [test] CRUD createScene: accepts the `{ time_range, viewport_end }` pair, enforces XOR (FR-SCH-002), applies the existing `assertViewportBearingZero` to `viewport_end` too `shared/components/src/storyboard/__tests__/crud.flavour.test.ts`
- [x] T033 [test] CRUD updateScene: partial flavour edits are rejected (capture-and-replace pattern preserved per FR-SCO-002) `shared/components/src/storyboard/__tests__/crud.flavour.test.ts`
- [x] T034 [test] validate.ts: `flavourCheck()` accepts both valid flavours, rejects mixed flavour and reversed range `shared/components/src/storyboard/__tests__/validate.flavour.test.ts`
- [x] T035 [test] ordering.ts assertion: sort key is `(time_range?.start ?? timestamp, creation_order)`; instant-only Storyboards sort byte-equivalently to #259; mixed-flavour Storyboard sorts by `t_start` for time-range Scenes `shared/components/src/storyboard/__tests__/ordering.flavour.test.ts`

### Implementation

- [x] T036 Extend CRUD `createScene` signature to accept optional `{ time_range, viewport_end }`; enforce XOR; pass `viewport_end` through bearing-zero assertion `shared/components/src/storyboard/crud.ts`
- [ ] T037 Extend `updateScene` to reject partial flavour edits (returns named error) `shared/components/src/storyboard/crud.ts`
- [x] T038 Add `flavourCheck()` in validate, called from `createScene` and `updateScene` paths `shared/components/src/storyboard/validate.ts`
- [x] T039 [P] Change `ordering.ts` sort key from `(timestamp, creation_order)` to `(time_range?.start ?? timestamp, creation_order)` (review 2A — drops the R8 sort-anchor invariant; instant Scenes sort byte-equivalently to #259) `shared/components/src/storyboard/ordering.ts`
- [ ] T040 Add `transport.rangeArmed` + `transport.rangeInProgress` state (transport-only, NOT in schema) `apps/vscode/src/services/transportState.ts`
- [ ] T041 Wire the two-step state machine into `captureScene`: arm → step-1 (record `t_start`, `viewport`) → step-2 (record `t_end`, `viewport_end`, emit `createScene`) → cancel `apps/vscode/src/commands/captureScene.ts`
- [ ] T042 Surface the `t_end <= t_start` rejection via the en-GB messages module and the panel banner `apps/vscode/src/commands/captureScene.ts`

### UI affordance (StoryboardPanel — real path under `shared/components/src/panels/`)

- [ ] T043 [P] Add the range toggle (`data-testid="storyboard-range-toggle"`, `aria-pressed`) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T044 [P] Add the "range in progress" banner (`data-testid="storyboard-range-banner"`, `aria-live="polite"`) with a Cancel control `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T045 [P] Add the per-row range badge for time-range Scenes (`data-testid="storyboard-scene-row-{id}"`) `shared/components/src/panels/StoryboardPanel/SceneRow.tsx`
- [ ] T046 [P] Extend Storybook stories with `rangeArmedAndInProgress` and `mixedFlavourPlayback` `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

**Checkpoint**: At the end of Phase 3 a user can capture a time-range Scene and see it in the Storyboard list with the range badge. Playback still uses the v1 path (Phase 4 lights up the new playback engine).

**Parallel example for Phase 3**: T027–T035 are independent test files and run in parallel. T043–T046 are CSS/JSX-only and run in parallel after T036–T042 expose the underlying state.

## Phase 4: User Story 2 — Synchronised viewport + slider playback (P1)

**Story Goal** (spec.md US2): During playback into a time-range Scene the engine simultaneously interpolates the viewport `viewport_start → viewport_end` AND the slider `t_start → t_end` over the same `transition_duration_ms` wall-clock window. Linear only. Visuals stay in lock-step.

**Independent Test**: Open a Storyboard containing at least one time-range Scene whose `time_range` covers a window where tracks visibly move. Press Play. The map pans/zooms and the slider crawls in lock-step; at the end the slider rests at `t_end` and the viewport at `viewport_end`. Mixed flavours (some instant, some time-range) play correctly with no instant-Scene regression.

### Engine relocation to shared layer (review 1B)

- [ ] T047a Extract port interfaces (MapPanel, session, panelView, timeRangeView, modalPrompt, visibility) from the existing VS Code service into a host-agnostic shape `shared/components/src/storyboardPlayback/ports.ts`
- [ ] T047b Relocate `StoryboardPlaybackService` from `apps/vscode/src/services/storyboardPlayback.ts` into the shared module; replace concrete deps with the port interfaces `shared/components/src/storyboardPlayback/storyboardPlaybackService.ts`
- [ ] T047c Add the VS Code host adapter wiring `MapPanel` + `vscode.Event` + `sessionManager` into the shared engine `apps/vscode/src/services/storyboardPlaybackHost.ts`
- [ ] T047d Add the web-shell host adapter wiring `react-leaflet` map + `webPanelHost` + web-shell sessionStore into the shared engine `apps/web-shell/src/services/storyboardPlaybackWebHost.ts`
- [ ] T047e [test] Port-contract test: a stub VS Code adapter and a stub web-shell adapter both satisfy the same recorded port call log under a representative transition `shared/components/src/storyboardPlayback/__tests__/portContract.test.ts`

### Tests first (FR-PLAY-001..005)

- [x] T047 [test] `executeTransition` branches on flavour: instant path is unchanged (calls `flyToViewport` + snaps `currentTime`) `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T048 [test] `executeTransition` time-range forward: at wall-clock fraction `f` the slider is at `t_start + f·(t_end−t_start)` and the viewport is at the linear blend `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T049 [test] `executeTransition` time-range forward: at completion slider rests at `t_end` and viewport rests at `viewport_end` (no drift, no overshoot) `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T050 [test] Mixed-flavour Storyboard plays end-to-end without flavour cross-contamination `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T051 [test] Degenerate range (`t_end == t_start`): viewport tweens, slider stays put, no divide-by-zero `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`

### Implementation

- [x] T052 Introduce `TimeRangeTween` primitive in the shared engine: single RAF loop that on each frame computes `f = clamp01((now − t0) / duration)` and applies both `session.setCurrentTime(...)` and `mapPanel.flyToViewport(linearBlend(...), 0)` via the ports `shared/components/src/storyboardPlayback/timeRangeTween.ts`
- [x] T053 Branch `executeTransition` on `isTimeRangeScene(scene)`: time-range path uses `TimeRangeTween`, instant path stays on existing `flyToViewport` + snap `shared/components/src/storyboardPlayback/storyboardPlaybackService.ts`
- [x] T054 Linear-blend helper for `Viewport` (geographic bounds; no rotation/bearing per Article XV invariants), pure function with unit-test coverage `shared/components/src/storyboardPlayback/timeRangeTween.ts`
- [x] T055 Confirm the MapPanel port's `flyToViewport(viewport, 0)` is the documented snap path used per-frame; no concrete `MapPanel` edit needed if both adapters already honour `durationMs == 0` as snap (verify in T047e contract test) `shared/components/src/storyboardPlayback/ports.ts`
- [x] T056 Ensure the lock-step write order is `setCurrentTime` then `flyToViewport` on each RAF tick (so feature-visibility windows resolve before redraw) `shared/components/src/storyboardPlayback/timeRangeTween.ts`

### Performance gate (review 4A)

- [ ] T056a [test] Perf smoke: 60-frame tween with a realistic feature-visibility consumer + chart-cursor stub subscribed to session-state; assert mean per-frame work under 8 ms (half of 16 ms budget). Fails build if exceeded. `shared/components/src/storyboardPlayback/__tests__/timeRange.perf.test.ts`

### Visual sync verification (FR-PLAY-003)

- [ ] T057 [test] On every RAF tick, all time-driven visuals (track positions, feature-visibility filter outputs, chart cursor positions) reflect the slider position with no greater lag than the existing instant-Scene path `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`

**Checkpoint**: At the end of Phase 4 captured time-range Scenes play back as synchronised scrubs. Reverse is still v1 behaviour (Phase 5 lights up reverse symmetry).

**Parallel example for Phase 4**: T047–T051 are independent test cases in the same file and run as a single test pass; T054 is a pure function and can be authored in parallel with T052/T053.

## Phase 5: User Story 3 — Reverse playback (P2)

**Story Goal** (spec.md US3): Reverse playback through a time-range Scene reverses both axes symmetrically: viewport from `viewport_end` to `viewport_start`, slider from `t_end` to `t_start`, over the same wall-clock duration with the same lock-step guarantees.

**Independent Test**: With the same Storyboard used in Phase 4, position playback at the end of a time-range Scene and trigger reverse. The map pans/zooms back toward `viewport_start`, the slider scrubs back toward `t_start`, tracks/cursors wind back in step. Forward at fraction `f` and reverse at fraction `1−f` produce the same world state (SC-007).

### Tests first (FR-PLAY-006, FR-PLAY-007)

- [x] T058 [test] Reverse `executeTransition` mid-scrub: at wall-clock fraction `f` slider is at `t_end − f·(t_end−t_start)`, viewport is the corresponding reverse blend `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T059 [test] Reverse completion: slider rests exactly at `t_start`, viewport rests exactly at `viewport_start` `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [x] T060 [test] Forward+reverse symmetry: world state at forward `f` matches world state at reverse `1−f` (modulo direction) `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [ ] T061 [test] Interruption coherence: grabbing the slider mid-scrub aborts the tween cleanly; slider, viewport, and time-driven visuals all settle on one coherent moment within `[t_start, t_end]` `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`
- [ ] T062 [test] Selecting a different Scene mid-scrub aborts the tween and routes the new transition without forcing completion `shared/components/src/storyboardPlayback/__tests__/timeRange.test.ts`

### Implementation

- [x] T063 Extend `TimeRangeTween` to accept a direction flag (`forward | reverse`) and apply the symmetric blend formula `shared/components/src/storyboardPlayback/timeRangeTween.ts`
- [ ] T064 Wire the reverse-playback entry path (the transport's reverse button / API) through the same `executeTransition` branch so reverse uses `TimeRangeTween` with `direction = 'reverse'` `shared/components/src/storyboardPlayback/storyboardPlaybackService.ts`
- [x] T065 Abort-on-interrupt: expose a `cancel()` on the active tween, called by transport state changes (pause/stop/scene-change/manual-scrub) `shared/components/src/storyboardPlayback/timeRangeTween.ts`

### Interrupt-coherence subscriber test (review 3C)

- [ ] T065a [test] Construct a fake session-state subscriber that records every `(currentTime, viewport)` pair it sees; run `TimeRangeTween` to mid-scrub, fire abort, assert the subscriber's last-seen pair matches the engine's last written frame exactly (no torn write, no out-of-order pair) `shared/components/src/storyboardPlayback/__tests__/interruptCoherence.test.ts`

**Checkpoint**: At the end of Phase 5 forward and reverse playback both work through time-range Scenes; interruptions leave a coherent world state.

## Phase 6: User Story 4 — Back-compat for instant Scenes (P1)

**Story Goal** (spec.md US4): Storyboards authored under v1 (all Scenes `time_range = null`, no `viewport_end`) continue to load, play, edit, and save with no visible change.

**Independent Test**: Open a v1 Storyboard fixture (or capture one with the range affordance off). Playback shows the v1 viewport tween only with the slider snapping to each Scene's `timestamp`. Round-trip save → load → save preserves byte-equivalence; no `viewport_end` is invented; no field is dropped.

### Tests first (FR-SCH-005, FR-SCH-006, SC-004)

- [ ] T066 [test] Loading a pre-#263 plot fixture with all instant Scenes parses cleanly under the new schema (no prompts, no transforms) `shared/components/src/storyboard/__tests__/backcompat.test.ts`
- [ ] T067 [test] Round-trip an all-instant Storyboard through save → load → save and assert byte-equivalence `shared/components/src/storyboard/__tests__/backcompat.test.ts`
- [ ] T068 [test] Playback of an all-instant Storyboard exercises ONLY the instant `executeTransition` branch (asserted via spy on `TimeRangeTween` — must never be constructed) `shared/components/src/storyboardPlayback/__tests__/backcompat.test.ts`
- [ ] T069 [test] A v1 plot opened on a build with the new schema can have a new time-range Scene appended without corrupting any of the existing instant Scenes (FR-SCH-006 / SC-004 — mixed survivability) `shared/components/src/storyboard/__tests__/backcompat.test.ts`

### Implementation / verification

- [ ] T070 [P] Pin a v1 Storyboard regression fixture (snapshot of the schema-#215 era plot used by #217's playback tests) `shared/components/src/storyboard/__tests__/fixtures/v1-storyboard.plot.geojson`
- [ ] T071 Confirm the storyboard READER tolerates legacy plots with `time_range = null` and no `viewport_end` (no implicit defaults injected) `shared/components/src/storyboard/crud.ts`
- [ ] T072 Confirm the storyboard WRITER never emits a `viewport_end` key for instant Scenes (omit, not `null`) `shared/components/src/storyboard/crud.ts`

**Checkpoint**: At the end of Phase 6 the feature is complete end-to-end: capture, forward playback, reverse playback, back-compat. Polish phase collects evidence and ships.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Capture evidence demonstrating each acceptance scenario, write the feature blog post, and open the PR.

### Storybook E2E (shared components)

- [ ] T073 [test] Storybook E2E spec for `StoryboardPanel` range-armed + in-progress states across light/dark/vscode themes `shared/components/e2e/StoryboardPanel-range.spec.ts`
- [ ] T074 Run `cd shared/components && node run-playwright.mjs StoryboardPanel-range` and write screenshots into the evidence directory `specs/263-time-range-scenes/evidence/screenshots/`

### Web-shell E2E (workflow test)

- [ ] T075 [test] Web-shell Playwright workflow: open plot → arm range → capture start → scrub → reframe → confirm → play forward → play reverse; capture screenshots + interaction GIF directly into the evidence directory. Web-shell exercises the same shared engine as VS Code via `storyboardPlaybackWebHost` (review 1B). `apps/web-shell/playwright/tests/storyboard-range-scene.spec.ts`
- [ ] T075a [test] Interrupt visual-continuity (review 3C E2E half): inside the workflow spec, mid-scrub fire an interrupt (drag the slider); take a screenshot; manually scrub to that exact instant on a fresh load; assert pixel-level continuity between the two frames `apps/web-shell/playwright/tests/storyboard-range-scene.spec.ts`
- [ ] T076 Run `cd apps/web-shell && node run-playwright.mjs storyboard-range-scene` and confirm screenshots + GIF land at `specs/263-time-range-scenes/evidence/screenshots/` `specs/263-time-range-scenes/evidence/screenshots/`

### Evidence Collection

- [x] T077 Capture test results using `.specify/templates/evidence/test-summary-template.md` (YAML front matter: `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/263-time-range-scenes/evidence/test-summary.md`
- [x] T078 Create usage demonstration (capture flow + playback narrative + screenshots) `specs/263-time-range-scenes/evidence/usage-example.md`
- [x] T079 [P] Capture schema round-trip evidence (LinkML → Pydantic → JSON → TS → JSON for both flavours; reject samples for all three invalid fixtures) `specs/263-time-range-scenes/evidence/round-trip-evidence.md`
- [ ] T080 [P] Write the web-shell E2E summary (Playwright run report, links to screenshots and GIF) `specs/263-time-range-scenes/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T081 Create feature blog post via Content Specialist subagent — first three sections copied verbatim from `evidence/opening-context.md`; remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence `specs/263-time-range-scenes/media/shipped-post.md`

### Final verification

- [ ] T082 Run `task verify` (or the four-step fallback) and confirm lint, typecheck, unit tests, and Playwright E2E all pass `Taskfile.yml`

### PR Creation

- [x] T083 Create PR and publish blog: run /speckit.pr `specs/263-time-range-scenes/`

**Task T083 must run last. It depends on every evidence, media, and verification task being complete.**

## Dependencies

**Phase order** (each phase is a complete, independently testable increment):

```
Phase 1 (Setup)
   ↓
Phase 2 (Schema Foundation — BLOCKS everything below)
   ↓
   ├── Phase 3 (US1 Capture, P1) ──────────────┐
   │     ↓                                     │
   ├── Phase 4 (US2 Forward Playback, P1) ─────┤
   │     ↓                                     │
   ├── Phase 5 (US3 Reverse Playback, P2) ─────┤
   │                                           │
   └── Phase 6 (US4 Back-compat, P1) ──────────┘
                                               ↓
                                       Phase 7 (Polish + PR)
```

**Story-level dependencies**:

- **US1 (Capture)** depends only on Phase 2. Delivers the new Scene shape end-to-end; playback still uses the v1 path until US2 ships.
- **US2 (Forward Playback)** depends on Phase 2 + the Phase 4 engine relocation prelude (T047a–T047e, review 1B); only then can the new branch land in the shared engine and reach both hosts.
- **US3 (Reverse Playback)** depends on Phase 4 (`TimeRangeTween` primitive exists in the shared engine).
- **US4 (Back-compat)** depends on Phase 2 + engine relocation (so the back-compat spy tests reference the shared module path) and runs in parallel with US2 & US3 after the relocation lands.
- **Phase 7 (Polish + PR)** depends on every prior phase completing — evidence collection requires the feature working end-to-end.

**Task-level critical path** within phases is documented inside each phase's "Parallel example" line.

## Implementation Strategy

**Atomic commits** (per plan.md, revised at review 1B):

1. **Schema + regen + adherence tests** — Phase 2 (T006–T026). One commit; CI gates that the regenerated artefacts match LinkML before any code consumes them. Note: `ordering.ts` sort key changes here (T039 — review 2A) and the R8 invariant + fixture + error code are NOT added.
2. **CRUD / validate / ordering + StoryboardPanel UI affordance** — Phase 3 (T027–T046). One commit; capture flow lands in isolation behind the new toggle.
3. **Engine relocation to `@debrief/components` + port adapters + contract test** — Phase 4 prelude (T047a–T047e). One commit; this is the pure mechanical refactor that unblocks step 4. The VS Code adapter and web-shell adapter both compile and pass the port-contract test against the unchanged v1 playback path before any flavour-branching lands.
4. **Playback engine (forward + reverse + abort + perf gate + interrupt coherence)** — Phases 4 (T047–T056a) + 5 (T058–T065a). One commit; the `TimeRangeTween` primitive is born complete with both directions, interruption coherence, and the perf smoke gate so it never half-ships.
5. **Capture command wiring + Playwright workflow + evidence + media + PR** — Phases 3 (T040–T042 if not already committed with step 2), 6, and 7. One commit; ship.

**Independent demonstrability**:

- After Phase 3 ships: an analyst can capture a time-range Scene. Playback still uses the v1 snap-to-end behaviour (acceptable interim).
- After Phase 4 ships: forward playback of time-range Scenes works as a synchronised scrub. Mixed-flavour Storyboards play correctly.
- After Phase 5 ships: reverse playback works symmetrically. Interruption coherence holds.
- After Phase 6 ships: pre-#263 plots are confirmed regression-free.
- After Phase 7 ships: evidence + blog post + PR open.

**Why this order**: the schema is the contract every other layer reads; landing it first means downstream tests can use generated types from the first task they're written against. Capture before playback means the playback engine has real data to feed it; back-compat last (but in parallel) means the regression net catches anything the new path inadvertently broke.

**Format validation**: Every task above follows the strict checklist format — `- [ ] T### [optional-labels] Description \`path\``. IDs are 3-digit (T001..T083) with `Txxxa..e` suffixes used for tasks inserted at review time (1B engine relocation, 3C interrupt coherence, 4A perf gate) so the original numbering survives. Test tasks are tagged `[test]`; parallel-safe tasks tagged `[P]`. All file paths are project-relative.
