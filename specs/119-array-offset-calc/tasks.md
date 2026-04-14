---

description: "Task list for Array Offset Calculations (119)"
---

# Tasks: Array Offset Calculations

**Input**: Design documents from `/specs/119-array-offset-calc/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/array-offset.md

**Tests**: Tests are REQUIRED for this feature. Cross-language golden tests are mandatory (Constitution I.4 — reproducibility) to prove TypeScript and Python implementations produce identical results within 1-metre tolerance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/119-array-offset-calc/evidence/`
**Media Directory**: `specs/119-array-offset-calc/media/` (planning-post.md + linkedin-planning.md already present)

**Feature Type**: Library/SDK (pure calculation functions, no UI)

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + pytest results with front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct) | After all tests pass |
| usage-example.md | TypeScript + Python code examples invoking `computeArrayCentre()` with expected outputs | After integration complete |
| golden-parity.md | Cross-language parity proof — same inputs produce same outputs in TS and Python within 1m tolerance | After parity tests pass |
| worm-through-turn.png | Before/after map screenshot showing bearing line origins shifted through a vessel turn (PLAIN vs WORM) | After rendering integration |
| benchmark.md | Performance measurement for 1000 contacts recalculation (SC-004: < 1s) | After implementation complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Already created during /speckit.plan | ✅ Done |
| media/linkedin-planning.md | Already created during /speckit.plan | ✅ Done |
| media/shipped-post.md | Blog post celebrating completion (three modes working, golden parity) | During Polish phase |
| media/linkedin-shipped.md | LinkedIn shipped summary (150-200 words) | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task (T049) via /speckit.pr |
| Blog PR | PR in debrief.github.io publishing shipped-post.md | Triggered by /speckit.pr |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding — directory structure and module stubs

- [x] T001 Create TypeScript module stub `shared/components/src/MapView/array-offset.ts` (empty exports for `computeArrayCentre`, `computePlainOffset`, `backtrackAlongTrack`, `interpolateMeasuredPosition`, `haversineDistanceMetres`)
- [x] T002 [P] Create Python package scaffold `services/calc/debrief_calc/tools/sensor/array_offset.py` (empty function stubs matching contract signatures)
- [x] T003 [P] Create evidence + test fixture directories `specs/119-array-offset-calc/evidence/` and `shared/schemas/src/fixtures/valid/track-feature-array-offset-01.json` (placeholder — real content in Phase 2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared primitives (haversine distance, golden fixtures) that all three mode stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Shared Geo Primitive

- [x] T004 [P] Implement `haversineDistanceMetres(lon1, lat1, lon2, lat2)` in `shared/components/src/MapView/array-offset.ts` (uses mean earth radius 6371000m; pure function, no dependencies)
- [x] T005 [P] Implement `haversine_distance_metres(lon1, lat1, lon2, lat2)` in `services/calc/debrief_calc/tools/sensor/array_offset.py` (stdlib math only — parity with TS implementation)
- [x] T006 [P][test] Write haversine unit tests in `shared/components/src/MapView/array-offset.test.ts` covering zero distance, equatorial distance, polar distance, antimeridian crossing
- [x] T007 [P][test] Write haversine unit tests in `services/calc/tests/tools/sensor/test_array_offset.py` with identical cases to T006

### Golden Test Fixture

- [x] T008 Create cross-language golden test fixture `shared/schemas/src/fixtures/valid/track-feature-array-offset-01.json` covering all 7 contract test cases (PLAIN x2, WORM x2, MEASURED x2, zero-offset)
- [x] T009 [P][test] Add fixture validation test `shared/components/src/MapView/array-offset.test.ts` that loads the fixture and asserts fixture schema (track coordinates, sensor config, expected origins per case)
- [x] T010 [P][test] Add fixture validation test `services/calc/tests/tools/sensor/test_array_offset.py` that loads the same fixture and asserts identical schema

### Primary Dispatch Scaffold

- [x] T011 Implement `computeArrayCentre()` dispatcher skeleton in `shared/components/src/MapView/array-offset.ts` — returns hostPosition when offset is null/0 or mode is null; stubs throw for PLAIN/WORM/MEASURED until stories complete
- [x] T012 [P] Implement `compute_array_centre()` dispatcher skeleton in `services/calc/debrief_calc/tools/sensor/array_offset.py` — mirrors TS dispatch logic
- [x] T013 [test] Write dispatcher unit tests for null offset, zero offset, null mode, explicit `contact.origin` override in `shared/components/src/MapView/array-offset.test.ts`
- [x] T014 [P][test] Write dispatcher unit tests (mirror of T013) in `services/calc/tests/tools/sensor/test_array_offset.py`

**Checkpoint**: Foundation ready — shared haversine, golden fixture, and dispatcher scaffolding in place. All three mode stories can now proceed in parallel.

---

## Phase 3: User Story 1 - PLAIN mode backtracks along vessel heading (Priority: P1)

**Goal**: Deliver the foundational PLAIN mode calculation — backtrack from vessel position along the vessel's course by the sensor offset distance.

**Independent Test**: Given a vessel at (0.0, 50.0) heading 090° with offset 500m in PLAIN mode, verify the array centre is approximately (-0.007146, 50.0) — 500m west, matching contract Case 1 within 1m tolerance.

### Tests for User Story 1 (write FIRST, ensure they FAIL before implementation) ⚠️

- [x] T015 [P][US1][test] Write PLAIN mode unit tests in `shared/components/src/MapView/array-offset.test.ts` — covers contract Cases 1, 2, 7 (eastward, northward, zero-offset) plus acceptance scenarios from spec US1
- [x] T016 [P][US1][test] Write PLAIN mode unit tests in `services/calc/tests/tools/sensor/test_array_offset.py` — mirror of T015 with identical expected values
- [x] T017 [P][US1][test] Write cross-language parity test in `services/calc/tests/tools/sensor/test_array_offset_parity.py` — asserts Python and TS PLAIN outputs match golden fixture within 1m tolerance

### Implementation for User Story 1

- [x] T018 [US1] Implement `computePlainOffset(hostPosition, courseDeg, offsetMetres)` in `shared/components/src/MapView/array-offset.ts` — uses existing `geodesicDestination()` from `sensor-utils.ts` with reverse bearing `(courseDeg + 180) % 360`
- [x] T019 [P][US1] Implement `compute_plain_offset(host_position, course_deg, offset_metres)` in `services/calc/debrief_calc/tools/sensor/array_offset.py` — parity with TS; implements `geodesic_destination()` helper locally if not available
- [x] T020 [US1] Wire PLAIN branch into `computeArrayCentre()` dispatcher in `shared/components/src/MapView/array-offset.ts` — call `interpolateTrackCourse()` from `sensor-utils.ts` to resolve course at contact timestamp (depends on T018)
- [x] T021 [P][US1] Wire PLAIN branch into `compute_array_centre()` dispatcher in `services/calc/debrief_calc/tools/sensor/array_offset.py` (depends on T019)
- [x] T022 [US1] Integrate `computeArrayCentre()` into `prepareSensorContacts()` in `shared/components/src/MapView/sensor-utils.ts` — replace direct host position assignment with dispatcher call (preserves explicit `contact.origin` override)
- [x] T023 [US1][test] Update `shared/components/src/MapView/sensor-utils.test.ts` to cover the new integration path — verify existing tests still pass and new PLAIN-mode test case produces expected origin shift

**Checkpoint**: PLAIN mode fully functional, rendered bearing lines originate from backtracked position, cross-language parity verified. User Story 1 is independently testable and deliverable.

---

## Phase 4: User Story 2 - WORM mode traces along historical track (Priority: P2)

**Goal**: Deliver WORM mode — walk backward along the vessel's actual track geometry by the offset distance, accurately modelling towed-array behaviour through turns.

**Independent Test**: Given a track with a 90° right turn at position (-5.0, 50.0) and a sensor offset of 2000m in WORM mode, verify the array centre lies on the pre-turn leg at the correct accumulated distance (contract Case 4), within 5m tolerance.

### Tests for User Story 2 (write FIRST, ensure they FAIL before implementation) ⚠️

- [x] T024 [P][US2][test] Write WORM mode unit tests in `shared/components/src/MapView/array-offset.test.ts` — covers contract Cases 3 (straight line, matches PLAIN) and 4 (through-turn), plus acceptance scenarios from spec US2 (track exhaustion fallback, single-position track)
- [x] T025 [P][US2][test] Write WORM mode unit tests in `services/calc/tests/tools/sensor/test_array_offset.py` — mirror of T024 with identical expected values
- [x] T026 [P][US2][test] Extend cross-language parity test in `services/calc/tests/tools/sensor/test_array_offset_parity.py` — assert Python and TS WORM outputs match golden fixture within 5m tolerance (accounts for accumulated rounding)

### Implementation for User Story 2

- [x] T027 [US2] Implement `backtrackAlongTrack(trackCoordinates, trackPositions, contactTimeMs, offsetMetres)` in `shared/components/src/MapView/array-offset.ts` — binary search for starting index, walk backward accumulating haversine segment distances, interpolate on final segment, clamp to earliest point when track exhausted
- [x] T028 [P][US2] Implement `backtrack_along_track(track_coordinates, track_positions, contact_time_iso, offset_metres)` in `services/calc/debrief_calc/tools/sensor/array_offset.py` — parity with T027
- [x] T029 [US2] Wire WORM branch into `computeArrayCentre()` dispatcher in `shared/components/src/MapView/array-offset.ts` (depends on T027)
- [x] T030 [P][US2] Wire WORM branch into `compute_array_centre()` dispatcher in `services/calc/debrief_calc/tools/sensor/array_offset.py` (depends on T028)

**Checkpoint**: WORM mode fully functional and independently deliverable. Bearing line origins visibly shift through vessel manoeuvres.

---

## Phase 5: User Story 3 - MEASURED mode uses actual array position data (Priority: P2)

**Goal**: Deliver MEASURED mode — interpolate the array centre from the sensor's measured position time-series, with graceful fallback to PLAIN when measured data doesn't cover the contact timestamp.

**Independent Test**: Given measured positions at T1=(-5.001, 49.998) and T3=(-4.901, 50.098) and a contact at the midpoint time T2, verify the array centre is interpolated to approximately (-4.951, 50.048) within 1m tolerance (contract Case 5). Verify Case 6 (contact before measured range) falls back to PLAIN.

### Tests for User Story 3 (write FIRST, ensure they FAIL before implementation) ⚠️

- [x] T031 [P][US3][test] Write MEASURED mode unit tests in `shared/components/src/MapView/array-offset.test.ts` — covers contract Cases 5 (midpoint interpolation), 6 (fallback to PLAIN), plus acceptance scenarios from spec US3 (exact timestamp match, empty measured_positions, unsorted input)
- [x] T032 [P][US3][test] Write MEASURED mode unit tests in `services/calc/tests/tools/sensor/test_array_offset.py` — mirror of T031 with identical expected values
- [x] T033 [P][US3][test] Extend cross-language parity test in `services/calc/tests/tools/sensor/test_array_offset_parity.py` — assert Python and TS MEASURED outputs match golden fixture within 1m tolerance including fallback case

### Implementation for User Story 3

- [x] T034 [US3] Implement `interpolateMeasuredPosition(measuredPositions, contactTimeMs)` in `shared/components/src/MapView/array-offset.ts` — sort positions by time if unsorted, binary search for bracket, linear interpolate lon/lat; return null when out of range
- [x] T035 [P][US3] Implement `interpolate_measured_position(measured_positions, contact_time_iso)` in `services/calc/debrief_calc/tools/sensor/array_offset.py` — parity with T034
- [x] T036 [US3] Wire MEASURED branch into `computeArrayCentre()` dispatcher in `shared/components/src/MapView/array-offset.ts` — on null result, fall through to `computePlainOffset()` call (FR-004) (depends on T034)
- [x] T037 [P][US3] Wire MEASURED branch into `compute_array_centre()` dispatcher in `services/calc/debrief_calc/tools/sensor/array_offset.py` (depends on T035)

**Checkpoint**: All three modes (PLAIN, WORM, MEASURED) fully functional. Bearing lines render with correct array centres for every sensor configuration.

---

## Phase 6: User Story 4 - Mode and offset changes invalidate and recalculate origins (Priority: P3)

**Goal**: Verify that when an analyst changes a sensor's `array_centre_mode` or `offset`, all contact origins recalculate correctly — satisfied by the existing React-driven stateless render pipeline (no explicit cache to build), but must be proven with integration tests.

**Independent Test**: Mount a sensor rendering layer with 50 contacts in PLAIN mode, capture origin positions, change `array_centre_mode` to WORM via prop update, re-render, and verify all 50 origins recalculated (differ where vessel manoeuvred). Repeat for offset distance change.

### Tests for User Story 4 ⚠️

- [x] T038 [P][US4][test] Write integration test in `shared/components/src/MapView/sensor-utils.test.ts` — call `prepareSensorContacts()` with mode=PLAIN, then mode=WORM (same inputs otherwise), assert origins differ where vessel manoeuvred (FR-005)
- [x] T039 [P][US4][test] Write integration test in `shared/components/src/MapView/sensor-utils.test.ts` — call `prepareSensorContacts()` with offset=500m, then offset=1000m, assert origins differ by correct backtrack delta (FR-006)
- [x] T040 [P][US4][test] Write performance benchmark in `shared/components/src/MapView/array-offset.test.ts` — generate 1000 contacts, measure `prepareSensorContacts()` runtime in WORM mode, assert < 1000ms (SC-004)

### Implementation for User Story 4

No new code — this story is satisfied by the existing stateless render pipeline. The tests above prove the requirement holds. If T040 fails the 1-second budget, raise a profiling task; do not prematurely add memoisation (RQ-7 decision).

**Checkpoint**: Mode/offset changes prove recalculation works; all four user stories are independently functional and tested.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence capture, media content, and PR creation.

### Cross-Cutting Polish

- [x] T041 Run full test suite (`uv run pytest services/calc/tests/tools/sensor/` and `pnpm --filter @debrief/components test -- --grep "array-offset|sensor-utils"`) and fix any remaining failures
- [x] T042 Run `task verify` (lint + typecheck + test) from repo root to match CI gate

### Evidence Collection (REQUIRED)

- [x] T043 Capture test summary using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/119-array-offset-calc/evidence/test-summary.md` — include YAML front matter (feature, captured_at, git_sha, tests_passed, tests_failed, tests_skipped, coverage_pct) and describe key scenarios (PLAIN straight-line, WORM through-turn, MEASURED fallback, 1000-contact benchmark)
- [x] T044 [P] Create usage demonstration in `specs/119-array-offset-calc/evidence/usage-example.md` — side-by-side TypeScript and Python code invoking `computeArrayCentre()` for each of the three modes, with expected outputs
- [x] T045 [P] Capture cross-language parity proof in `specs/119-array-offset-calc/evidence/golden-parity.md` — table of 7 golden test cases with TS output, Python output, delta metres, tolerance status (all PASS)
- [x] T046 [P] Capture WORM-through-turn visual evidence `specs/119-array-offset-calc/evidence/worm-through-turn.png` — screenshot of map showing bearing line origins for the same contacts in PLAIN (straight backtrack) vs WORM (follows track through turn)
- [x] T047 [P] Capture performance benchmark in `specs/119-array-offset-calc/evidence/benchmark.md` — 1000-contact recalculation timing for each mode, confirming SC-004 (< 1s)

### Media Content (REQUIRED)

- [x] T048 Create shipped blog post in `specs/119-array-offset-calc/media/shipped-post.md` using Content Specialist agent (`.claude/agents/media/content.md`) — sections: What We Built (three modes + golden parity), Screenshots (WORM-through-turn), Lessons Learned (cross-language parity, haversine sufficiency), What's Next (Phase 5 residuals #120 deferred)
- [x] T049 [P] Create LinkedIn shipped summary in `specs/119-array-offset-calc/media/linkedin-shipped.md` — 150-200 words, hook opening, link to full shipped post

### PR Creation (REQUIRED — must be final task)

- [x] T050 Create PR and publish blog: run `/speckit.pr`

**Task T050 must run last. It depends on all evidence, media, and polish tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (shared haversine + fixture + dispatcher scaffold)
- **User Story 1 (Phase 3, P1)**: Depends on Foundational — delivers baseline PLAIN mode and the `prepareSensorContacts()` integration
- **User Story 2 (Phase 4, P2)**: Depends on Foundational (not US1) — WORM is independently testable via direct `backtrackAlongTrack()` unit tests, but the map-level visual effect requires US1's integration wiring
- **User Story 3 (Phase 5, P2)**: Depends on Foundational AND US1 — MEASURED mode falls back to PLAIN (FR-004), so US1's `computePlainOffset()` must exist
- **User Story 4 (Phase 6, P3)**: Depends on US1, US2, US3 — invalidation/recalculation test exercises all three mode branches
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies (Summary)

- US1 (P1) → foundation only
- US2 (P2) → foundation only (can run parallel to US1)
- US3 (P2) → foundation + US1 (for PLAIN fallback)
- US4 (P3) → US1 + US2 + US3

### Within Each User Story

- Tests are written FIRST and must FAIL before implementation (Constitution VII.1)
- TypeScript and Python implementations can be written in parallel ([P] tasks with different files)
- Wiring into the dispatcher is the final implementation step per story

### Parallel Opportunities

- T002, T003 parallel with T001 (different files)
- T004, T005 parallel (TS + Python haversine — different files)
- T006, T007 parallel (haversine tests)
- T009, T010 parallel (fixture validation tests)
- T012, T014 parallel with T011, T013
- Within US1: T015, T016, T017 parallel (test writing); T019 parallel to T018; T021 parallel to T020
- Within US2: T024, T025, T026 parallel; T028 parallel to T027; T030 parallel to T029
- Within US3: T031, T032, T033 parallel; T035 parallel to T034; T037 parallel to T036
- Within US4: T038, T039, T040 all parallel (independent test files/scenarios)
- Polish: T044, T045, T046, T047 parallel; T049 parallel to T048

---

## Parallel Example: User Story 1 Kickoff

```bash
# After Foundational phase complete, launch all US1 tests in parallel (TDD):
Task: "T015 [US1][test] Write PLAIN unit tests in shared/components/src/MapView/array-offset.test.ts"
Task: "T016 [US1][test] Write PLAIN unit tests in services/calc/tests/tools/sensor/test_array_offset.py"
Task: "T017 [US1][test] Write parity test in services/calc/tests/tools/sensor/test_array_offset_parity.py"

# After tests fail, launch parallel implementations:
Task: "T018 [US1] Implement computePlainOffset in shared/components/src/MapView/array-offset.ts"
Task: "T019 [US1] Implement compute_plain_offset in services/calc/debrief_calc/tools/sensor/array_offset.py"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup (Phase 1) + Foundational (Phase 2) — shared haversine and golden fixture in place
2. Deliver US1 (PLAIN + integration into `prepareSensorContacts`) — most contacts now have correct origins for straight-line travel; MVP shippable
3. Deliver US2 (WORM) in parallel with US3 (MEASURED) — full mode coverage
4. Verify US4 (invalidation) — proves the stateless architecture satisfies FR-005/FR-006
5. Polish — evidence, shipped post, PR

### Parallel Team Strategy

With two developers after Phase 2:

1. Developer A: US1 (PLAIN + `prepareSensorContacts` integration)
2. Developer B: US2 (WORM — pure math, no integration coupling)
3. Once US1 merges, either developer picks up US3 (MEASURED — needs PLAIN fallback)
4. US4 tests written by whoever finishes US3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Tests MUST fail before implementation (Constitution VII.1)
- Cross-language parity is non-negotiable — the same golden fixture drives both test suites
- No new external dependencies (Constitution IX.1) — stdlib math only
- Commit after each task or logical group
- Feature is Library/SDK type — no Storybook, no VS Code webview E2E, no UI screenshots other than the WORM-through-turn comparison
- **Evidence is required** — particularly the golden-parity proof and performance benchmark
- Run `/speckit.pr` (T050) after all other tasks complete to create PR and publish shipped blog post
