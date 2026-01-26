# Tasks: Time Controller UI/UX

**Input**: Design documents from `/specs/025-time-controller/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete)

**Storybook Review**: Per user request, Storybook stories are created alongside each component for visual review during implementation.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/025-time-controller/evidence/`
**Media Directory**: `specs/025-time-controller/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with component test coverage | After all tests pass |
| usage-example.md | React code showing TimeController usage | After main component complete |
| storybook-states.png | Screenshot showing all UI states | After Storybook stories complete |
| playback-demo.gif | Animated demo of playback in action | After playback works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Create the TimeController component directory and basic structure

- [ ] T001 Create TimeController directory `shared/components/src/TimeController/`
- [ ] T002 Create component index with exports `shared/components/src/TimeController/index.ts`
- [ ] T003 [P] Add TimeController to main library exports `shared/components/src/index.ts`
- [ ] T004 [P] Create types file for component props and state `shared/components/src/TimeController/types.ts`

---

## Phase 2: Foundation (Shared Hooks & Utilities)

**Purpose**: Core infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create useTimePlayback hook for time state management `shared/components/src/TimeController/useTimePlayback.ts`
- [ ] T006 [test] Write useTimePlayback hook tests `shared/components/src/TimeController/useTimePlayback.test.ts`
- [ ] T007 [P] Create time formatting utilities `shared/components/src/TimeController/timeUtils.ts`
- [ ] T008 [P][test] Write time formatting utility tests `shared/components/src/TimeController/timeUtils.test.ts`
- [ ] T009 Create TimeController container component shell `shared/components/src/TimeController/TimeController.tsx`
- [ ] T010 Create TimeController Storybook stories shell (empty/loading states) `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: Foundation ready - Storybook shows empty/loading states for review

---

## Phase 3: User Story 1 - Manual Time Navigation (Priority: P1)

**Goal**: Analysts can manually navigate to specific points in time using a scrubber

**Independent Test**: Load tracks, drag the time scrubber, verify time display updates

### Storybook Story for US1

- [ ] T011 [US1] Add "Manual Navigation" story showing scrubber interaction `shared/components/src/TimeController/TimeController.stories.tsx`

### Components for US1

- [ ] T012 [US1] Create TimeDisplay component (shows current time HH:MM:SS) `shared/components/src/TimeController/TimeDisplay.tsx`
- [ ] T013 [P][test][US1] Write TimeDisplay unit tests `shared/components/src/TimeController/TimeDisplay.test.tsx`
- [ ] T014 [P][US1] Create TimeDisplay Storybook story `shared/components/src/TimeController/TimeDisplay.stories.tsx`
- [ ] T015 [US1] Create TimeScrubber component (draggable time slider) `shared/components/src/TimeController/TimeScrubber.tsx`
- [ ] T016 [P][test][US1] Write TimeScrubber unit tests (drag, click, range display) `shared/components/src/TimeController/TimeScrubber.test.tsx`
- [ ] T017 [P][US1] Create TimeScrubber Storybook story `shared/components/src/TimeController/TimeScrubber.stories.tsx`

### Integration for US1

- [ ] T018 [US1] Integrate TimeDisplay and TimeScrubber into TimeController `shared/components/src/TimeController/TimeController.tsx`
- [ ] T019 [test][US1] Write TimeController integration tests for manual navigation `shared/components/src/TimeController/TimeController.test.tsx`
- [ ] T020 [US1] Update main story to show manual navigation working `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: US1 complete - Storybook shows working time scrubber with display. Ready for review.

---

## Phase 4: User Story 2 - Animated Playback (Priority: P2)

**Goal**: Analysts can play/pause to watch tracks evolve over time

**Independent Test**: Press play, verify time advances automatically; press pause, verify it stops

### Storybook Story for US2

- [ ] T021 [US2] Add "Animated Playback" story showing play/pause in action `shared/components/src/TimeController/TimeController.stories.tsx`

### Components for US2

- [ ] T022 [US2] Create PlaybackControls component (play/pause button) `shared/components/src/TimeController/PlaybackControls.tsx`
- [ ] T023 [P][test][US2] Write PlaybackControls unit tests `shared/components/src/TimeController/PlaybackControls.test.tsx`
- [ ] T024 [P][US2] Create PlaybackControls Storybook story `shared/components/src/TimeController/PlaybackControls.stories.tsx`

### Hook Enhancement for US2

- [ ] T025 [US2] Add play/pause/auto-stop logic to useTimePlayback hook `shared/components/src/TimeController/useTimePlayback.ts`
- [ ] T026 [test][US2] Add playback tests to useTimePlayback tests `shared/components/src/TimeController/useTimePlayback.test.ts`

### Integration for US2

- [ ] T027 [US2] Integrate PlaybackControls into TimeController `shared/components/src/TimeController/TimeController.tsx`
- [ ] T028 [test][US2] Add playback integration tests to TimeController tests `shared/components/src/TimeController/TimeController.test.tsx`
- [ ] T029 [US2] Update main story to show playback animation `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: US2 complete - Storybook shows working play/pause with animated time. Ready for review.

---

## Phase 5: User Story 3 - Playback Speed Control (Priority: P3)

**Goal**: Analysts can adjust playback speed (1x, 2x, 4x, 8x)

**Independent Test**: During playback, change speed and verify time advances at the new rate

### Storybook Story for US3

- [ ] T030 [US3] Add "Speed Control" story showing speed selector `shared/components/src/TimeController/TimeController.stories.tsx`

### Components for US3

- [ ] T031 [US3] Create SpeedSelector component (dropdown with 1x/2x/4x/8x) `shared/components/src/TimeController/SpeedSelector.tsx`
- [ ] T032 [P][test][US3] Write SpeedSelector unit tests `shared/components/src/TimeController/SpeedSelector.test.tsx`
- [ ] T033 [P][US3] Create SpeedSelector Storybook story `shared/components/src/TimeController/SpeedSelector.stories.tsx`

### Hook Enhancement for US3

- [ ] T034 [US3] Add speed multiplier logic to useTimePlayback hook `shared/components/src/TimeController/useTimePlayback.ts`
- [ ] T035 [test][US3] Add speed multiplier tests to useTimePlayback tests `shared/components/src/TimeController/useTimePlayback.test.ts`

### Integration for US3

- [ ] T036 [US3] Integrate SpeedSelector into TimeController (row 3, right side) `shared/components/src/TimeController/TimeController.tsx`
- [ ] T037 [test][US3] Add speed control integration tests `shared/components/src/TimeController/TimeController.test.tsx`
- [ ] T038 [US3] Update main story to show speed control working `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: US3 complete - Storybook shows working speed selector. Ready for review.

---

## Phase 6: User Story 4 - Keyboard-Driven Control (Priority: P4)

**Goal**: Power users can control playback using Space (play/pause) and Arrow keys (scrub)

**Independent Test**: Focus the controller, press Space to toggle playback, use arrow keys to scrub

### Storybook Story for US4

- [ ] T039 [US4] Add "Keyboard Control" story with keyboard interaction hints `shared/components/src/TimeController/TimeController.stories.tsx`

### Hook Enhancement for US4

- [ ] T040 [US4] Add keyboard event handlers to useTimePlayback hook `shared/components/src/TimeController/useTimePlayback.ts`
- [ ] T041 [test][US4] Add keyboard interaction tests `shared/components/src/TimeController/useTimePlayback.test.ts`

### Integration for US4

- [ ] T042 [US4] Wire keyboard handlers to TimeController (focus management) `shared/components/src/TimeController/TimeController.tsx`
- [ ] T043 [test][US4] Add keyboard integration tests to TimeController tests `shared/components/src/TimeController/TimeController.test.tsx`
- [ ] T044 [US4] Update main story to document keyboard shortcuts `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: US4 complete - Keyboard shortcuts work. Ready for review.

---

## Phase 7: Track Display Mode (Full/Trail Toggle)

**Goal**: Users can toggle between "Full" track display and "Trail" mode

**Independent Test**: Toggle switch changes mode; component exposes mode via callback

### Components

- [ ] T045 Create DisplayModeToggle component (Full/Trail switch) `shared/components/src/TimeController/DisplayModeToggle.tsx`
- [ ] T046 [P][test] Write DisplayModeToggle unit tests `shared/components/src/TimeController/DisplayModeToggle.test.tsx`
- [ ] T047 [P] Create DisplayModeToggle Storybook story `shared/components/src/TimeController/DisplayModeToggle.stories.tsx`

### Integration

- [ ] T048 Integrate DisplayModeToggle into TimeController (row 3, center) `shared/components/src/TimeController/TimeController.tsx`
- [ ] T049 [test] Add display mode integration tests `shared/components/src/TimeController/TimeController.test.tsx`
- [ ] T050 Add "Display Mode" story to TimeController stories `shared/components/src/TimeController/TimeController.stories.tsx`

**Checkpoint**: Display mode toggle complete. Ready for review.

---

## Phase 8: Theming & UI States

**Goal**: Component supports light/dark theme and shows all UI states properly

### Theming

- [ ] T051 Add theme support using existing ThemeProvider `shared/components/src/TimeController/TimeController.tsx`
- [ ] T052 [P] Create theme-specific CSS variables `shared/components/src/TimeController/TimeController.css`
- [ ] T053 [P] Add "Light Theme" and "Dark Theme" stories `shared/components/src/TimeController/TimeController.stories.tsx`

### UI States

- [ ] T054 Implement Empty state ("No data loaded") `shared/components/src/TimeController/TimeController.tsx`
- [ ] T055 [P] Implement Loading state `shared/components/src/TimeController/TimeController.tsx`
- [ ] T056 [P] Add "UI States" story showing all states `shared/components/src/TimeController/TimeController.stories.tsx`
- [ ] T057 [test] Add UI state tests `shared/components/src/TimeController/TimeController.test.tsx`

**Checkpoint**: Theming and all UI states complete. Full Storybook review possible.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements and evidence collection

### Code Quality

- [ ] T058 Add JSDoc comments to all exported components and hooks `shared/components/src/TimeController/*.ts`
- [ ] T059 [P] Run linting and fix any issues `shared/components/src/TimeController/`
- [ ] T060 [P] Verify all tests pass with `pnpm test`

### Storybook Polish

- [ ] T061 Add comprehensive controls (argTypes) to all stories `shared/components/src/TimeController/*.stories.tsx`
- [ ] T062 [P] Add story documentation (descriptions, usage notes) `shared/components/src/TimeController/*.stories.tsx`
- [ ] T063 Verify Storybook builds without errors `pnpm storybook:build`

### Evidence Collection

- [ ] T064 Create evidence directory `specs/025-time-controller/evidence/`
- [ ] T065 Capture test summary with pass/fail counts `specs/025-time-controller/evidence/test-summary.md`
- [ ] T066 [P] Create usage example demonstrating TimeController integration `specs/025-time-controller/evidence/usage-example.md`
- [ ] T067 [P] Capture Storybook screenshots of all UI states `specs/025-time-controller/evidence/storybook-states.png`

### Media Content

- [ ] T068 Create shipped blog post `specs/025-time-controller/media/shipped-post.md`
- [ ] T069 [P] Create LinkedIn shipped summary `specs/025-time-controller/media/linkedin-shipped.md`

### PR Creation

- [ ] T070 Create PR and publish blog: run /speckit.pr

**Task T070 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-6 (User Stories)**: All depend on Phase 2 completion
- **Phase 7 (Display Mode)**: Depends on Phase 2, can parallel with US3/US4
- **Phase 8 (Theming)**: Depends on all components existing
- **Phase 9 (Polish)**: Depends on all feature work complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (P1) | Phase 2 only | - |
| US2 (P2) | US1 (needs scrubber) | - |
| US3 (P3) | US2 (needs playback) | US4 |
| US4 (P4) | US2 (needs playback) | US3 |

### Parallel Opportunities

Within each phase, tasks marked `[P]` can run in parallel:
- T003 + T004 (setup)
- T007 + T008 (utilities)
- T013 + T014 (TimeDisplay)
- T016 + T017 (TimeScrubber)
- T023 + T024 (PlaybackControls)
- T032 + T033 (SpeedSelector)
- T046 + T047 (DisplayModeToggle)
- T052 + T053 (theming)
- T054 + T055 + T056 (UI states)
- T059 + T060 (quality)
- T066 + T067 (evidence)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: User Story 1 (Manual Navigation)
4. **STOP and VALIDATE**: Review in Storybook
5. Deploy/demo if ready

### Storybook Review Cadence

Per user request, conduct Storybook review at each checkpoint:
- After Phase 2: Empty/loading states
- After Phase 3: Manual navigation working
- After Phase 4: Playback animation working
- After Phase 5: Speed control working
- After Phase 6: Keyboard shortcuts working
- After Phase 7: Display mode toggle working
- After Phase 8: Full theming and all states

### Incremental Delivery

Each user story adds independently testable value:
1. US1 → Basic time navigation (MVP)
2. US2 → Animated playback
3. US3 → Speed control
4. US4 → Keyboard shortcuts (power users)

---

## Notes

- `[P]` tasks can run in parallel (different files, no dependencies)
- `[test]` tasks are unit/integration tests
- `[US#]` label maps task to specific user story
- Storybook stories created alongside components for immediate visual review
- Each checkpoint is a natural review point
- Run `/speckit.pr` after all tasks complete to create PR with evidence
