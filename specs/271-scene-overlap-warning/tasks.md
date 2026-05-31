# Tasks: Overlap Warning for Time-Range Scenes

**Feature**: #271 | **Branch**: `271-scene-overlap-warning` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Frontend-only, no schema change, no Python. A pure shared `detectSceneOverlaps()` helper + an `OverlapBadge` (mirroring `StaleBadge`) + one optional view-model field, wired into both the VS Code panel view and the web-shell mount. Dismissal is session-scoped, host-local, never persisted.

## Evidence Requirements

**Evidence Directory**: `specs/271-scene-overlap-warning/evidence/`
**Media Directory**: `specs/271-scene-overlap-warning/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Vitest results (unit + component) + Playwright E2E counts, using the test-summary template | After all tests pass |
| `usage-example.md` | Concrete walkthrough: a Storyboard with two overlapping time-range Scenes → warning naming the partner → dismiss | After US1+US2 complete |
| `screenshots/overlap-light.png` | `WithOverlapWarnings` story, light theme — two rows warning, others clean (Hook image) | Storybook E2E (US1) |
| `screenshots/overlap-dark.png` | Same story, dark theme | Storybook E2E (US1) |
| `screenshots/overlap-vscode.png` | Same story, vscode theme | Storybook E2E (US1) |
| `screenshots/interaction.gif` | Dismiss interaction — badge present → click Dismiss → both rows clear (< 5s, < 2MB) | Storybook E2E (US2) |
| `e2e-summary.md` | Storybook E2E pass rates + theme-variant coverage | After E2E green |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook, What We're Building, How It Fits, Key Decisions) | During `/speckit.plan` ✅ done |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR #654 in debrief-future with evidence (already open — updated) | Final task |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by `/speckit.pr` |

## Phase 1: Setup

- [x] T001 Create the overlap helper module skeleton with exported signatures and the `OverlapPartner` interface (no logic yet) `shared/components/src/storyboard/overlap.ts`

## Phase 2: Foundation

**Blocks all user stories.** The pure detection helper, its exports, and the boundary-type extension everything else consumes.

- [x] T002 [test] Write table-driven unit tests for `detectSceneOverlaps`/`overlapPairKey` covering every contract case C1.1–C1.12 (strict overlap, touching endpoints, instant exclusion, multi-overlap, chain A-B-C, identical windows, zero-length, cross-Storyboard isolation, dismissedPairs filtering, empty/single-Scene, determinism) `shared/components/src/storyboard/__tests__/overlap.test.ts`
- [x] T003 Implement `overlapPairKey` (sorted `${lo}|${hi}`) and `detectSceneOverlaps(plot, storyboardId, dismissedPairs?)` — strict interior overlap on `Date.parse` epoch ms, time-range Scenes only via `isTimeRangeScene`, single-Storyboard scope, symmetric result, dismissal filtering `shared/components/src/storyboard/overlap.ts`
- [x] T004 Export `detectSceneOverlaps`, `overlapPairKey`, and the `OverlapPartner` type from the component-library barrel `shared/components/src/index.ts`
- [x] T005 Extend the panel boundary contract: add optional `readonly overlapsWith?: readonly OverlapPartner[]` to `SceneEditViewModel` and optional `onSceneOverlapDismiss?(sceneId: string, partnerSceneIds: readonly string[]): void` to `StoryboardPanelProps`, re-exporting `OverlapPartner` for hosts `shared/components/src/panels/StoryboardPanel/types.ts`

**Checkpoint**: `pnpm --filter @debrief/components test overlap` green; library builds with the new exports/types and all existing fixtures still compile (optional+defaulted additions).

## Phase 3: User Story 1 — Spot an accidental overlap (Priority: P1) 🎯 MVP

**Goal**: Each Scene row whose time-range window overlaps another's shows a passive warning naming the conflicting Scene(s), in both hosts and all themes. Nothing is blocked.

**Independent Test**: Open the `WithOverlapWarnings` story (and a VS Code plot) containing two overlapping time-range Scenes plus a non-overlapping one and an instant Scene. The two overlapping rows show "Overlaps with …" naming each other; the other rows are clean. Playback/capture/save remain unaffected.

- [x] T006 [test] Write `OverlapBadge` render tests: renders only when `overlapsWith` non-empty, names every partner in visible text + accessible name (not colour-only), `role="status"`, `data-testid="overlap-badge"`, `data-scene-id`, and coexists with a stale badge on the same row (C2.1–C2.3, C2.6, C3.4) `shared/components/src/panels/StoryboardPanel/__tests__/OverlapBadge.test.tsx`
- [x] T007 Implement `OverlapBadge` mirroring `StaleBadge` — warning glyph, partner names, `role="status"`, accessible label, a keyboard-activable Dismiss button calling `onDismiss`, VS Code warning fg/bg tokens (axe-contrast safe) `shared/components/src/panels/StoryboardPanel/OverlapBadge.tsx`
- [x] T008 Render `OverlapBadge` in the Scene list, gated on `sceneEditViewModels[sceneId]?.overlapsWith?.length`, in the same slot pattern as `StaleBadge`, skipped for `pendingDelete` rows; wire its `onDismiss` → `onSceneOverlapDismiss?.(sceneId, overlapsWith.map(p => p.sceneId))` (C3.1–C3.3) `shared/components/src/panels/StoryboardPanel/SceneList.tsx`
- [x] T009 Thread the optional `onSceneOverlapDismiss` prop through the panel into `SceneList` `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [x] T010 [P] Add a `WithOverlapWarnings` story: fixture Storyboard with two overlapping time-range Scenes (mutual warning), one non-overlapping time-range Scene, and one instant Scene (both clean) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T011 VS Code host: call `detectSceneOverlaps(plot, activeStoryboardId, dismissedPairs)` once per `refresh()` and populate each `SceneEditViewModel.overlapsWith` in `composeSceneEditViewModel` (C4.1, C4.5) `apps/vscode/src/views/storyboardPanelView.ts`
- [x] T012 web-shell host: compute `detectSceneOverlaps(plot, activeStoryboardId, dismissedPairs)` (memoised over `featureCollection`/`activeStoryboardId`) and merge `overlapsWith` into the `sceneEditViewModels` passed to `StoryboardPanel` (C4.1, C4.5) `apps/web-shell/src/StoryboardPanelMount.tsx`
- [x] T013 [test] VS Code host unit test: overlapping time-range Scenes get mutual `overlapsWith`; instant Scenes, touching endpoints, non-overlapping, and cross-Storyboard pairs get none `apps/vscode/tests/unit/storyboardPanelView.test.ts`
- [x] T014 [P][test] Storybook E2E: in light/dark/vscode, the two overlapping rows show the named badge and the clean rows do not; assert accessible name `shared/components/e2e/StoryboardOverlap.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — run `cd shared/components && node run-playwright.mjs StoryboardOverlap` (extracts bundled `@sparticuz/chromium`). Do NOT skip E2E assuming browsers can't install. See `docs/project_notes/playwright-installation-research.md`.

**Checkpoint**: US1 fully testable — warnings appear correctly in both hosts and all themes; no action is blocked.

## Phase 4: User Story 2 — Dismiss an intentional overlap (Priority: P2)

**Goal**: An author can dismiss an overlap warning; both affected rows clear, no Scene data changes, and the dismissed pair does not re-nag while unchanged.

**Independent Test**: With a mutual warning visible, click Dismiss on one row → both rows clear. Re-render (no data change) → still suppressed. (Re-warn-on-new-overlap is verified in US3.)

- [x] T015 [test] VS Code host unit test for dismissal: a `scene-overlap-dismiss` message adds the pair, removes the warning from both rows, leaves Scene data untouched, and a Scene with another live overlap keeps its (reduced) badge `apps/vscode/tests/unit/storyboardPanelView.test.ts`
- [x] T016 Add an inbound `scene-overlap-dismiss` message (carrying `sceneId` + `partnerSceneIds`) to the panel message contract `apps/vscode/src/types/storyboardPanelMessages.ts`
- [x] T017 VS Code host: hold a session-scoped `dismissedOverlapPairs: Set<string>`, handle the dismiss message by adding `overlapPairKey(sceneId, partner)` for each partner and re-pushing, and pass the set into `detectSceneOverlaps` (C4.2–C4.3) `apps/vscode/src/views/storyboardPanelView.ts`
- [x] T018 VS Code webview: wire the panel's `onSceneOverlapDismiss` to post the `scene-overlap-dismiss` message `apps/vscode/src/webview/web/storyboardPanel.tsx`
- [x] T019 web-shell host: hold `dismissedOverlapPairs` (a `useState`/`useRef` set), implement `onSceneOverlapDismiss` to add pair keys and trigger recompute, and pass the set into `detectSceneOverlaps` (C4.2–C4.3) `apps/web-shell/src/StoryboardPanelMount.tsx`
- [x] T020 [P][test] Storybook E2E: clicking Dismiss removes the badge from both rows; record the interaction video for the GIF `shared/components/e2e/StoryboardOverlap.spec.ts`

**Checkpoint**: US2 testable independently — dismissal clears both rows in both hosts; no plot write occurs (C4.6).

## Phase 5: User Story 3 — Warnings stay accurate as windows change (Priority: P3)

**Goal**: Warnings re-evaluate against current state on every Scene add/edit/delete and on panel open, with no manual refresh; a *new* overlap (including a re-created previously-dismissed pair) warns afresh.

**Independent Test**: Two overlapping Scenes warn; edit one window apart → both warnings vanish; edit back → warnings return. Dismiss a pair, pull apart, then re-overlap the same pair → it warns again.

- [x] T021 [test] VS Code host re-evaluation test: editing a window so Scenes no longer overlap drops both warnings; editing back re-adds them; deleting a Scene drops its partner's warning `apps/vscode/tests/unit/storyboardPanelView.test.ts`
- [x] T022 VS Code host: prune `dismissedOverlapPairs` to the currently-active overlap set on each recompute (`dismissed ← dismissed ∩ active`) so a re-created pair re-warns (FR-009, C4.4) `apps/vscode/src/views/storyboardPanelView.ts`
- [x] T023 web-shell host: apply the same prune-on-recompute to `dismissedOverlapPairs` (FR-009, C4.4) `apps/web-shell/src/StoryboardPanelMount.tsx`
- [x] T024 [P][test] Extend the helper unit tests to prove prune/re-warn semantics: a dismissed pair that resolves then re-overlaps appears again when its stale key is dropped `shared/components/src/storyboard/__tests__/overlap.test.ts`

**Checkpoint**: All three stories complete; live accuracy and re-warn-on-change verified.

## Phase 6: Polish & Cross-Cutting Concerns

### Verification

- [ ] T025 Run the full gate (`task verify`) and the Storybook E2E wrapper; fix any lint/type/test failures before evidence capture `specs/271-scene-overlap-warning/evidence/` (working tree)

### Evidence Collection

- [ ] T026 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/271-scene-overlap-warning/evidence/test-summary.md`
- [ ] T027 Create the usage demonstration: two overlapping time-range Scenes → named warning → dismiss → re-warn on re-overlap `specs/271-scene-overlap-warning/evidence/usage-example.md`
- [ ] T028 [P] Capture the three theme screenshots via the Storybook E2E (`overlap-light.png`, `overlap-dark.png`, `overlap-vscode.png`) `specs/271-scene-overlap-warning/evidence/screenshots/`
- [ ] T029 [P] Capture the dismiss interaction GIF (< 5s, < 2MB) from the E2E recording `specs/271-scene-overlap-warning/evidence/screenshots/interaction.gif`
- [ ] T030 [P] Write the E2E summary (pass rates, theme-variant coverage) `specs/271-scene-overlap-warning/evidence/e2e-summary.md`

### Media Content

- [ ] T031 Create the feature blog post — copy the first three sections verbatim from `evidence/opening-context.md`, write Screenshots/By the Numbers/Lessons Learned/What's Next from evidence (via Content Specialist) `specs/271-scene-overlap-warning/media/shipped-post.md`

### PR Creation

- [ ] T032 Create PR and publish blog: run `/speckit.pr`

**Task T032 must run last. It depends on all evidence and media tasks being complete.**

## Dependencies

**Story completion order**: Setup (Phase 1) → Foundation (Phase 2) → US1 (P1) → US2 (P2) → US3 (P3) → Polish.

- **Phase 2 (Foundation)** blocks everything — the pure helper (T003), its exports (T004), and the view-model field (T005) are consumed by every story. T002 (tests) precedes T003 (TDD).
- **US1 (Phase 3)** depends only on Foundation. T007 (badge) needs T006 (its test) first; T008/T009 need T007; T011/T012 (host wiring) need T005 + T003. T013/T014 verify.
- **US2 (Phase 4)** depends on US1 (the badge + `onSceneOverlapDismiss` thread must exist). T016 before T017/T018; T015 (test) before T017.
- **US3 (Phase 5)** depends on US2 (prune operates on the dismissed set). T021 (test) before T022; T022/T023 mirror each other per host.
- **Polish (Phase 6)** depends on US1–US3 all complete. Evidence (T026–T030) before media (T031); T031 before the PR task (T032). T032 is strictly last.

**Cross-host parity (FR-011)**: T011/T012, T017/T019, and T022/T023 are paired VS Code/web-shell edits — both must use the same shared `detectSceneOverlaps`; neither host gets a divergent rule.

## Implementation Strategy

**MVP = Phase 1 + 2 + 3 (US1).** Shipping through US1 already delivers the core value: accidental overlaps become visible, named, on the offending rows, in both hosts — the dismiss and live-edit refinements layer on top without rework.

**Incremental delivery**:
1. Land the pure helper with exhaustive unit tests (Foundation) — this is where correctness lives and it's fully testable in isolation.
2. Add the badge + host wiring (US1) — first visible increment; demo via the Storybook story.
3. Add dismissal (US2) — host-local session state, no persistence.
4. Add prune/re-warn (US3) — closes the loop on liveness; mostly tests since detection already runs in the existing refresh path.

**Parallel opportunities**: within US1, T010 (story) and T014 (E2E) run alongside the component/host work `[P]`. T013/T014 are independent verifiers. In Polish, T028/T029/T030 capture different artifacts in parallel `[P]`. The paired host edits (VS Code vs web-shell) touch different files and can be done concurrently once the shared helper exists.

**Constitution guardrails**: no schema change (II), no service call, no persisted state — dismissal is ephemeral session UI state, so Constitution IV.2 (`no-direct-persistence-in-frontend`) is satisfied by *not* writing. TS strict, no `any` (XV). Tests precede implementation for the helper and the badge (VII).
</content>
