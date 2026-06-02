# Tasks: Briefing Renderer Honours Trail Display Mode

**Feature**: 280-briefing-trail-mode | **Branch**: `claude/happy-fermat-rJSBF` (active feature `280-briefing-trail-mode`)
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/trail-rendering.md](./contracts/trail-rendering.md)

> Renderer-only bug fix (#280, epic E13). A single implementation — pure
> display helpers + `BriefingMap` wiring — delivers all three user stories; the
> stories below map to **test increments** (P1 the fix, P2 the regression guard,
> P3 the composition). No schema, capture, export, or host change (FR-006).

## Evidence Requirements

**Evidence Directory**: `specs/280-briefing-trail-mode/evidence/`
**Media Directory**: `specs/280-briefing-trail-mode/media/`

This is a **UI rendering behaviour** in the standalone briefing-renderer SPA. The
defining symptom is *visual and temporal* (a static full track vs a growing
trail), so the evidence centres on a before/after growth sequence plus a short
interaction GIF — not theme-variant screenshots (the renderer is not theme-driven).

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright results (uses template) | After all tests pass |
| `evidence/usage-example.md` | How a Trail scene grows in an exported briefing (dev + test walkthrough) | After US1 complete |
| `evidence/screenshots/trail-start.png` | Trail scene at window start — little/no track drawn | By the Playwright growth test (T008) |
| `evidence/screenshots/trail-growth.png` | Trail scene mid-playback — track grown, trailing the dot (the "after" hero shot) | By the Playwright growth test (T008) |
| `evidence/screenshots/trail-end.png` | Trail scene at window end — full track drawn | By the Playwright growth test (T008) |
| `evidence/screenshots/interaction.gif` | Trail growing as the slider scrubs (< 5s, < 2MB) | Polish phase, from the Playwright run |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — before/after Hook (Hook, What We're Building, How It Fits, Key Decisions) | ✅ During `/speckit.plan` |
| `media/shipped-post.md` | Feature post: cached opener (verbatim) + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | Existing PR [#661](https://github.com/debrief/debrief-future/pull/661) updated with implementation + evidence | Final task |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by `/speckit.pr` |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip the Playwright tasks
> assuming browsers can't be installed. The renderer bundles `@sparticuz/chromium`;
> `apps/briefing-renderer/run-playwright.mjs` extracts it and wires the flags. See
> `docs/project_notes/playwright-installation-research.md`.

## Phase 1: Setup

**Goal**: Make the canonical trail-slice helper available to the renderer.

- [ ] T001 Add `"@debrief/utils": "workspace:*"` to dependencies `apps/briefing-renderer/package.json`
- [ ] T002 Run `pnpm install` from repo root to link the workspace dep, then confirm `import { sliceTrackToTime } from '@debrief/utils'` type-resolves in the renderer (`pnpm --filter @debrief/briefing-renderer typecheck`)

**Checkpoint**: `@debrief/utils` resolves from the briefing renderer.

## Phase 2: Foundational (blocks all user stories)

**Goal**: The testable core shared by every story — the pure display helpers
(Contracts A & B) and the dev fixture both the dev server and Playwright boot from.

**⚠️ Tests-first (Article VII)**: write T003 before T004; T004 makes it pass.

- [ ] T003 [test] Unit tests for the pure helpers — Contract A (`displayCoords`: full mode returns whole track at any time; trail mode grows; pre-start → `[]`; post-end → full; nearest-sample boundary; monotonic-growth property) and Contract B (`classifyTemporalTrack`: valid LineString+parallel timestamps qualifies; missing/mismatched-length/unparseable timestamps and non-LineString do not). Tests fail until T004. `apps/briefing-renderer/src/components/__tests__/trackDisplay.test.ts`
- [ ] T004 Implement the pure helpers `classifyTemporalTrack(feature) -> TemporalTrack | null` (reuse the SAME validity gate as the existing dot: array timestamps, `coords.length === timestamps.length`, ≥2 points, all `Date.parse` finite) and `displayCoords(coords, epochsMs, isTrail, nowMs)` (delegates to `sliceTrackToTime` from `@debrief/utils` when `isTrail`, else returns full coords). Strict types, no `any`. `apps/briefing-renderer/src/components/trackDisplay.ts`
- [ ] T005 [P] Extend the dev fixture: set `display_mode: 'trail'` on the existing time-range scene (so slider scrubbing reveals growth) and `display_mode: 'full'` on one other scene; **keep the 4-scene count** so `briefing-zip-playback.spec.ts` ("1 / 4") stays green; leave the remaining scenes' `display_mode` absent (free legacy coverage); confirm the trail scene's track carries parallel `properties.timestamps`. `apps/briefing-renderer/src/fixtures/dev-fixture.ts`

**Checkpoint**: `pnpm --filter @debrief/briefing-renderer test` — helper unit tests pass; fixture exposes a Trail, a Full, and a legacy scene.

## Phase 3: User Story 1 — Viewer watches a Trail-mode scene and the track grows (P1) 🎯 MVP

**Story goal**: In a Trail-mode scene, each time-stamped track grows from its
start up to the current playback time, trailing the moving dot (FR-001, FR-004).

**Independent test**: Load the dev fixture, advance to the Trail (time-range)
scene, scrub the slider start→end — the visible track length increases and at the
end equals the full track.

- [ ] T006 Wire trail rendering into the map: derive `isTrail` from `currentScene.properties.display_mode === 'trail'`; partition the scene's visible line features via `classifyTemporalTrack` into temporal tracks vs other lines/areas; render each temporal track as a **stable-keyed** react-leaflet `Polyline` (one stable key per track id) whose `positions` are `displayCoords(coords, epochsMs, isTrail, currentTime)` mapped to Leaflet lat/lng — so positions update in place with no re-key teardown; style to match the current track style (colour from properties, weight 3, opacity 0.85); keep non-temporal lines/areas in the existing `GeoJSON` layer; add a `data-testid="trail-layer"` (or per-track attribute) so tests can measure rendered vertices. `apps/briefing-renderer/src/components/BriefingMap.tsx`
- [ ] T007 Refactor the moving-dot (`timeMarkers`) to consume the same `classifyTemporalTrack` result as the trail, so dot and trail share one validity gate (a track shows both or neither — FR-004, FR-007 consistency). Same file, sequential after T006. `apps/briefing-renderer/src/components/BriefingMap.tsx`
- [ ] T008 [test] Playwright growth test (Contract C1–C3): navigate to built `dist/index.html`, advance to the Trail scene, sample the rendered trail length (vertex count via `data-testid`) at slider start / mid / end and assert strictly increasing; capture evidence PNGs `trail-start.png`, `trail-growth.png`, `trail-end.png` directly into `specs/280-briefing-trail-mode/evidence/screenshots/`. `apps/briefing-renderer/playwright/tests/briefing-zip-trail-mode.spec.ts`

**Checkpoint**: US1 delivered — run `cd apps/briefing-renderer && node run-playwright.mjs briefing-zip-trail-mode`; the trail visibly grows and the three growth screenshots are written. **This is the MVP** — the reported defect no longer reproduces.

## Phase 4: User Story 2 — Full / legacy scenes show the whole track (P2)

**Story goal**: Full-mode and legacy (no `display_mode`) scenes show the whole
track at every playback position, unchanged from today (FR-002, FR-003) — the
regression guard. The implementation already handles this via the same render
path, so this phase is **tests only**.

- [ ] T009 [P][test] Unit test: `displayCoords(..., isTrail=false, ...)` returns the full track at start/mid/end times; the mode predicate maps `'full'`, `undefined`, and an unrecognised value all to "not trail" (FR-002/FR-003 + safe-default edge case). Extend `apps/briefing-renderer/src/components/__tests__/trackDisplay.test.ts`
- [ ] T010 [test] Playwright assertions (Contract C4–C5): on the Full scene, rendered track length is constant at slider start/mid/end; on a legacy (display_mode-absent) scene, the full track shows and no console error is emitted. Extend `apps/briefing-renderer/playwright/tests/briefing-zip-trail-mode.spec.ts`
- [ ] T011 [test] Regression check — run the existing renderer suites and confirm they stay green with the fixture's new `display_mode` values: `briefing-zip-playback.spec.ts` ("1 / 4", slider visibility) and `briefing-zip-screenshots.spec.ts` (evidence states). Adjust only assertions genuinely invalidated by display_mode and document any change. `apps/briefing-renderer/playwright/tests/`

**Checkpoint**: Full + legacy paths proven unchanged; no regression in the #264 air-gapped suite.

## Phase 5: User Story 3 — Mixed Trail/Full briefing applies the right mode per scene (P3)

**Story goal**: A briefing mixing Trail and Full scenes applies the correct mode
per scene as the viewer navigates between them within one session (FR-005).

- [ ] T012 [test] Playwright composition test: on the Trail scene advancing the slider grows the track; navigating to the Full scene shows the complete track at all positions; returning to the Trail scene grows again from its time origin. Extend `apps/briefing-renderer/playwright/tests/briefing-zip-trail-mode.spec.ts`

**Checkpoint**: All three user stories covered; per-scene mode re-evaluation proven across navigation.

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T013 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — include YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) and the key Trail/Full/legacy scenarios verified. `specs/280-briefing-trail-mode/evidence/test-summary.md`
- [ ] T014 Create usage demonstration — how a Trail scene grows in an exported briefing (dev walkthrough + the `displayCoords` contract in plain terms), mapped to Success Criteria. `specs/280-briefing-trail-mode/evidence/usage-example.md`
- [ ] T015 [P] Capture a trail-growth interaction GIF (< 5s, < 2MB) from the Playwright run (the slider scrubbing while the track grows). `specs/280-briefing-trail-mode/evidence/screenshots/interaction.gif`

> Growth stills (`trail-start.png` / `trail-growth.png` / `trail-end.png`) are produced by T008 and live in `evidence/screenshots/`.

### Media Content

- [ ] T016 Create the feature blog post via the Content Specialist (`.claude/agents/media/content.md`): copy `What We're Building` / `How It Fits` / `Key Decisions` **verbatim** from `evidence/opening-context.md`, place the before/after Hook (`trail-start.png` → `trail-growth.png`) at the top, and write Screenshots / By the Numbers / Lessons Learned / What's Next from evidence. Bug-fix sizing — judgement call, lean full given the visual before/after. No Storybook section (no story). `specs/280-briefing-trail-mode/media/shipped-post.md`

### PR Creation

- [ ] T017 Create PR and publish blog: run `/speckit.pr` (updates existing PR #661 with the implementation + evidence, and opens the blog PR on debrief.github.io)

**Task T017 must run last — it depends on every evidence and media task being complete.**

## Dependencies

**Phase order**: Setup (P1–T002) → Foundational (T003–T005) → US1 (T006–T008) →
US2 (T009–T011) → US3 (T012) → Polish (T013–T017).

**Critical path (code)**:

- T001 → T002 (dep available) → T004 (helpers import `sliceTrackToTime`).
- T003 [test] before T004 (test-first); T003 is independent of T001/T002 (pure-array tests can stub the helper) but conventionally lands with T004.
- T005 [P] (fixture) is independent of the helpers — can be authored in parallel.
- T006 (BriefingMap wiring) depends on **T004** (helpers) and **T005** (fixture for dev verify); T007 is sequential after T006 (same file).
- T008 (Playwright growth) depends on T006 + T007 + T005.

**Story dependencies**:

- **US1 (P1)** depends only on Setup + Foundational → it is the MVP and ships the fix.
- **US2 (P2)** and **US3 (P3)** depend on US1's implementation (T006/T007) being in place; they add **tests only** — no further production code. They can be done in either order (both extend the same Playwright spec, so run them sequentially to avoid edit conflicts, or split into separate test files for parallelism).

**Polish**: T013/T014 after all tests pass; T015 [P] (GIF) after T008; T016 (post) after evidence exists; **T017 (`/speckit.pr`) strictly last**.

## Implementation Strategy

**Incremental delivery**: This fix is small and the three stories share one
implementation, so the natural increment is:

1. **Setup + Foundational + US1 (T001–T008) = the shippable MVP.** After T008 the
   reported defect is gone: Trail scenes grow in the exported briefing. If time is
   tight, this alone is a complete, demonstrable fix.
2. **US2 (T009–T011)** locks in the regression guard — proving Full/legacy are
   unchanged and the #264 air-gapped suite stays green. Cheap (tests only) and
   high-value; do not skip.
3. **US3 (T012)** adds the cross-scene composition proof.
4. **Polish (T013–T017)** captures evidence, writes the post, and ships via
   `/speckit.pr`.

**TDD discipline**: T003 (helper tests) precedes T004 (helpers). The Playwright
specs (T008/T010/T012) are written to assert observable growth/constancy, then
the implementation is confirmed against them.

**Risk controls**:
- Keep the dev fixture at 4 scenes (T005) so `briefing-zip-playback` stays green.
- Stable-keyed `<Polyline>` (T006) updates positions in place — no per-frame layer
  teardown (avoids the #264 oscillation failure mode).
- Reusing `sliceTrackToTime` (T004) guarantees FR-008 parity with the main app.
- Touch only `BriefingMap.tsx`, the new `trackDisplay.ts`, the dev fixture, tests,
  and `package.json` — the air-gapped boot path (`boot.ts`) is untouched (FR-006).

**Bug fast-track note**: #280 is a Bug. Because the behaviour is fully pinned by
the contracts, an alternative to walking T001–T017 by hand is `/speckit.implement`
(or the `/bugfix` fast-track) — the task list above is the same checklist either
path executes.

**This `tasks.md` is the implementation checklist** — run `/speckit.implement` to
execute it, or work the phases manually in order.
