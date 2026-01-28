# Tasks: Temporal Track Rendering

**Input**: Design documents from `/specs/030-temporal-track-rendering/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/030-temporal-track-rendering/evidence/`
**Media Directory**: `specs/030-temporal-track-rendering/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with utility function tests | After all tests pass |
| usage-example.md | Code example showing TemporalTrackLayer usage | After component complete |
| storybook-full-track.png | Screenshot of full-track mode with marker | After Storybook story exists |
| storybook-snail-trail.png | Screenshot of snail-trail mode | After Storybook story exists |

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

## Phase 1: Setup

**Purpose**: Project structure verification and type exports

- [ ] T001 Export DisplayMode type from utils `shared/components/src/utils/types.ts`
- [ ] T002 [P] Create temporal-utils module `shared/components/src/MapView/temporal-utils.ts`

---

## Phase 2: Foundation (Utility Functions)

**Purpose**: Core algorithms that all user stories depend on

**⚠️ CRITICAL**: All rendering logic depends on these utility functions

- [ ] T003 Implement findNearestPointIndex binary search `shared/components/src/MapView/temporal-utils.ts`
- [ ] T004 Implement sliceTrackToTime function `shared/components/src/MapView/temporal-utils.ts`
- [ ] T005 Implement extractTemporalData function `shared/components/src/MapView/temporal-utils.ts`
- [ ] T006 [test] Write unit tests for temporal-utils `shared/components/src/MapView/__tests__/temporal-utils.test.ts`

**Checkpoint**: Utility functions ready - component implementation can begin

---

## Phase 3: User Story 1 - Full-Track Mode with Time Indicator (Priority: P1) 🎯 MVP

**Goal**: Display complete track path with highlight marker at current time position

**Independent Test**: Load tracks in full-track mode, move time scrubber, verify marker moves while full track remains visible

### Implementation for User Story 1

- [ ] T007 [US1] Create TrackHighlightMarker component `shared/components/src/MapView/TrackHighlightMarker.tsx`
- [ ] T008 [US1] Create useTemporalTrack hook `shared/components/src/MapView/useTemporalTrack.ts`
- [ ] T009 [US1] Create TemporalTrackLayer component (full-track mode) `shared/components/src/MapView/TemporalTrackLayer.tsx`
- [ ] T010 [US1] Add currentTime and displayMode props to MapView `shared/components/src/MapView/MapView.tsx`
- [ ] T011 [US1] Integrate TemporalTrackLayer into MapView for temporal tracks `shared/components/src/MapView/MapView.tsx`
- [ ] T012 [US1] [test] Write component test for full-track rendering `shared/components/src/MapView/__tests__/TemporalTrackLayer.test.tsx`

**Checkpoint**: Full-track mode complete - tracks show entire path with moving highlight marker

---

## Phase 4: User Story 2 - Snail-Trail Mode (Priority: P1)

**Goal**: Display only track path from start up to current time position

**Independent Test**: Load tracks in snail-trail mode, advance time, verify track grows from start to current time

### Implementation for User Story 2

- [ ] T013 [US2] Add snail-trail mode rendering to TemporalTrackLayer `shared/components/src/MapView/TemporalTrackLayer.tsx`
- [ ] T014 [US2] Update useTemporalTrack hook for trail mode geometry `shared/components/src/MapView/useTemporalTrack.ts`
- [ ] T015 [US2] [test] Write component test for snail-trail rendering `shared/components/src/MapView/__tests__/TemporalTrackLayer.test.tsx`

**Checkpoint**: Both display modes work - can switch between full-track and snail-trail

---

## Phase 5: User Story 3 - Real-Time Track Updates During Playback (Priority: P2)

**Goal**: Smooth 10fps updates during playback without visual stuttering

**Independent Test**: Start playback, verify track updates smoothly at 10+ fps with up to 20 tracks

### Implementation for User Story 3

- [ ] T016 [US3] Optimize useTemporalTrack with memoization `shared/components/src/MapView/useTemporalTrack.ts`
- [ ] T017 [US3] Add render key optimization for efficient GeoJSON updates `shared/components/src/MapView/TemporalTrackLayer.tsx`
- [ ] T018 [US3] Handle rapid time changes (debouncing/throttling) `shared/components/src/MapView/useTemporalTrack.ts`

**Checkpoint**: Playback is smooth - no stuttering or dropped frames at 10fps

---

## Phase 6: User Story 4 - Mode Switching (Priority: P3)

**Goal**: Instant mode switching while maintaining current time position

**Independent Test**: Switch modes while viewing tracks at specific time, verify display updates correctly

### Implementation for User Story 4

- [ ] T019 [US4] Ensure mode prop change triggers immediate re-render `shared/components/src/MapView/TemporalTrackLayer.tsx`
- [ ] T020 [US4] Handle mode switch during playback `shared/components/src/MapView/useTemporalTrack.ts`

**Checkpoint**: Mode switching works - can toggle between modes seamlessly

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, Storybook stories, evidence collection

### Storybook Stories

- [ ] T021 Create TemporalTrack story with full-track mode `shared/components/src/MapView/TemporalTrack.stories.tsx`
- [ ] T022 [P] Add snail-trail mode story variant `shared/components/src/MapView/TemporalTrack.stories.tsx`
- [ ] T023 [P] Add playback demo story with time controls `shared/components/src/MapView/TemporalTrack.stories.tsx`

### Documentation

- [ ] T024 Export new components from package index `shared/components/src/index.ts`
- [ ] T025 [P] Update MapView JSDoc with temporal props `shared/components/src/MapView/MapView.tsx`

### Evidence Collection (REQUIRED)

- [ ] T026 Create evidence directory `specs/030-temporal-track-rendering/evidence/`
- [ ] T027 Run tests and capture results in `specs/030-temporal-track-rendering/evidence/test-summary.md`
- [ ] T028 Create usage example in `specs/030-temporal-track-rendering/evidence/usage-example.md`
- [ ] T029 [P] Capture Storybook screenshot (full-track) `specs/030-temporal-track-rendering/evidence/storybook-full-track.png`
- [ ] T030 [P] Capture Storybook screenshot (snail-trail) `specs/030-temporal-track-rendering/evidence/storybook-snail-trail.png`

### Media Content (REQUIRED)

- [ ] T031 Create shipped blog post `specs/030-temporal-track-rendering/media/shipped-post.md`
- [ ] T032 [P] Create LinkedIn shipped summary `specs/030-temporal-track-rendering/media/linkedin-shipped.md`

### PR Creation (REQUIRED - must be final task)

- [ ] T033 Create PR and publish blog: run /speckit.pr

**Task T033 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundation (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation
- **User Story 2 (Phase 4)**: Depends on Foundation (can run parallel with US1)
- **User Story 3 (Phase 5)**: Depends on US1 and US2 (needs both modes working)
- **User Story 4 (Phase 6)**: Depends on US1 and US2 (needs both modes to switch between)
- **Polish (Phase 7)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Foundation → TrackHighlightMarker → useTemporalTrack → TemporalTrackLayer → MapView integration
- **User Story 2 (P1)**: Foundation → Extend TemporalTrackLayer for trail mode
- **User Story 3 (P2)**: US1 + US2 → Add performance optimizations
- **User Story 4 (P3)**: US1 + US2 → Ensure mode switching works

### Parallel Opportunities

- T001, T002: Setup tasks can run in parallel
- T021, T022, T023: Storybook stories can run in parallel
- T029, T030: Screenshot capture can run in parallel
- T031, T032: Media content can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (utility functions + tests)
3. Complete Phase 3: User Story 1 (full-track mode)
4. Complete Phase 4: User Story 2 (snail-trail mode)
5. **STOP and VALIDATE**: Both modes work independently
6. Can demo/ship at this point - playback optimization and mode switching are enhancements

### Incremental Delivery

1. Setup + Foundation → Core algorithms ready
2. Add US1 → Full-track mode works → Demo
3. Add US2 → Snail-trail mode works → Demo
4. Add US3 → Playback is smooth → Performance validated
5. Add US4 → Mode switching polished → Feature complete
6. Polish → Evidence + Media → PR created

---

## Notes

- [P] tasks = different files, no dependencies
- [USN] label maps task to specific user story
- Each user story should be independently completable
- Commit after each task or logical group
- **Evidence is required** - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
