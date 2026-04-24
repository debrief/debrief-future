# Tasks: Array Offset Calculations

**Input**: Design documents from `/specs/119-array-offset-calc/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/array-offset.md

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/119-array-offset-calc/evidence/`
**Media Directory**: `specs/119-array-offset-calc/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + pytest results with test counts and coverage | After all tests pass |
| usage-example.md | Code example showing all 3 modes with expected outputs | After all modes implemented |
| cross-language-parity.md | Side-by-side TS/Python output comparison for golden cases | After parity tests pass |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Project scaffolding and test fixtures

- [ ] T001 Create TypeScript array offset module `shared/components/src/MapView/array-offset.ts`
- [ ] T002 [P] Create TypeScript test file `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T003 [P] Create Python array offset module `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T004 [P] Create Python test file `services/calc/tests/tools/sensor/test_array_offset.py`
- [ ] T005 [P] Create multi-mode golden test fixture `shared/schemas/src/fixtures/valid/track-feature-array-offset-01.json`

**Checkpoint**: All file scaffolds in place, ready for implementation.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Shared geo utility functions that all three modes depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 [P] Implement `haversineDistanceMetres()` in TypeScript `shared/components/src/MapView/array-offset.ts`
- [ ] T007 [P] Implement `haversine_distance_metres()` in Python `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T008 [P] [test] Write unit tests for haversine distance (TS) `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T009 [P] [test] Write unit tests for haversine distance (Python) `services/calc/tests/tools/sensor/test_array_offset.py`
- [ ] T010 Implement dispatch function `computeArrayCentre()` in TypeScript with null/zero-offset short-circuit `shared/components/src/MapView/array-offset.ts`
- [ ] T011 [P] Implement dispatch function `compute_array_centre()` in Python with null/zero-offset short-circuit `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T012 [test] Write tests for zero-offset and null-mode pass-through (TS + Python) `shared/components/src/MapView/__tests__/array-offset.test.ts`

**Checkpoint**: Foundation ready — haversine distance and dispatch shell in place. User story implementation can begin.

---

## Phase 3: User Story 1 — PLAIN Mode (Priority: P1)

**Goal**: Calculate array centre by backtracking along vessel heading. This is the fundamental mode and the fallback for MEASURED mode.

**Independent Test**: Provide a track with known positions and courses, a sensor with a known offset, verify calculated array centres match expected coordinates within 1 metre.

### Tests for User Story 1

- [ ] T013 [P] [test] [US1] Write PLAIN mode unit tests (TS): straight heading, varying courses, zero offset `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T014 [P] [test] [US1] Write PLAIN mode unit tests (Python): straight heading, varying courses, zero offset `services/calc/tests/tools/sensor/test_array_offset.py`

### Implementation for User Story 1

- [ ] T015 [US1] Implement `computePlainOffset()` in TypeScript using `geodesicDestination()` and reverse bearing `shared/components/src/MapView/array-offset.ts`
- [ ] T016 [P] [US1] Implement `compute_plain_offset()` in Python with geodesic destination formula `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T017 [US1] Wire PLAIN mode into `computeArrayCentre()` dispatch (TS) `shared/components/src/MapView/array-offset.ts`
- [ ] T018 [P] [US1] Wire PLAIN mode into `compute_array_centre()` dispatch (Python) `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T019 [US1] Integrate `computeArrayCentre()` into `prepareSensorContacts()` — replace direct host position with offset-adjusted origin `shared/components/src/MapView/sensor-utils.ts`
- [ ] T020 [test] [US1] Write integration test: `prepareSensorContacts()` returns PLAIN-adjusted origins when sensor has offset and PLAIN mode `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T021 [test] [US1] Verify golden test case 1 (east heading, 500m backtrack) and case 2 (north heading, 1000m backtrack) pass in both languages `services/calc/tests/tools/sensor/test_array_offset.py`

**Checkpoint**: PLAIN mode works end-to-end. Bearing lines originate from offset position behind vessel. All contacts with zero offset still render at vessel position.

---

## Phase 4: User Story 2 — WORM Mode (Priority: P2)

**Goal**: Calculate array centre by walking backward along the vessel's actual track path, accurately modelling towed array behaviour through turns.

**Independent Test**: Provide a track with a known right-angle turn, a sensor with an offset that places the array centre before/after the turn point, verify the calculated position lies on the track path at the correct distance.

### Tests for User Story 2

- [ ] T022 [P] [test] [US2] Write WORM mode unit tests (TS): straight line, through turn, offset exceeds track length, single-position track `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T023 [P] [test] [US2] Write WORM mode unit tests (Python): same cases as TS `services/calc/tests/tools/sensor/test_array_offset.py`

### Implementation for User Story 2

- [ ] T024 [US2] Implement `backtrackAlongTrack()` in TypeScript — binary search for position index, backward segment walk with geodesic distance accumulation, interpolation on final segment `shared/components/src/MapView/array-offset.ts`
- [ ] T025 [P] [US2] Implement `backtrack_along_track()` in Python — same algorithm `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T026 [US2] Wire WORM mode into `computeArrayCentre()` dispatch (TS) `shared/components/src/MapView/array-offset.ts`
- [ ] T027 [P] [US2] Wire WORM mode into `compute_array_centre()` dispatch (Python) `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T028 [test] [US2] Verify golden test case 3 (straight line = same as PLAIN) and case 4 (through turn) pass in both languages `services/calc/tests/tools/sensor/test_array_offset.py`

**Checkpoint**: WORM mode works. Bearing lines through vessel turns originate from the track path behind the vessel, not along a straight backtrack.

---

## Phase 5: User Story 3 — MEASURED Mode (Priority: P2)

**Goal**: Calculate array centre by interpolating from measured position time-series, with automatic fallback to PLAIN when measured data doesn't cover the contact timestamp.

**Independent Test**: Provide a sensor with known measured positions, contacts at times within and outside the measured range, verify interpolated positions match expected values and fallback to PLAIN occurs correctly.

### Tests for User Story 3

- [ ] T029 [P] [test] [US3] Write MEASURED mode unit tests (TS): midpoint interpolation, exact timestamp match, fallback to PLAIN, empty measured positions `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T030 [P] [test] [US3] Write MEASURED mode unit tests (Python): same cases as TS `services/calc/tests/tools/sensor/test_array_offset.py`

### Implementation for User Story 3

- [ ] T031 [US3] Implement `interpolateMeasuredPosition()` in TypeScript — binary search on measured timestamps, linear interpolation of lon/lat `shared/components/src/MapView/array-offset.ts`
- [ ] T032 [P] [US3] Implement `interpolate_measured_position()` in Python — same algorithm `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T033 [US3] Wire MEASURED mode into `computeArrayCentre()` dispatch with PLAIN fallback (TS) `shared/components/src/MapView/array-offset.ts`
- [ ] T034 [P] [US3] Wire MEASURED mode into `compute_array_centre()` dispatch with PLAIN fallback (Python) `services/calc/debrief_calc/tools/sensor/array_offset.py`
- [ ] T035 [test] [US3] Verify golden test case 5 (midpoint interpolation) and case 6 (fallback to PLAIN) pass in both languages `services/calc/tests/tools/sensor/test_array_offset.py`
- [ ] T036 [test] [US3] Test with existing fixture `track-feature-sensors-measured-01.json` — verify MEASURED mode produces interpolated origins from its measured_positions array `shared/components/src/MapView/__tests__/array-offset.test.ts`

**Checkpoint**: MEASURED mode works. Contacts within measured time range get interpolated origins. Contacts outside measured range fall back to PLAIN.

---

## Phase 6: User Story 4 — Mode/Offset Change Recalculation (Priority: P3)

**Goal**: Verify that changing array centre mode or offset distance causes all contact origins to recalculate correctly.

**Independent Test**: Compute origins for a set of contacts, change mode/offset in input data, recompute, verify new origins differ from previous values and match expected results.

### Tests for User Story 4

- [ ] T037 [test] [US4] Write recalculation test (TS): call `prepareSensorContacts()` with PLAIN, call again with WORM, verify origins differ where vessel manoeuvred `shared/components/src/MapView/__tests__/array-offset.test.ts`
- [ ] T038 [P] [test] [US4] Write recalculation test (Python): same mode switch scenario `services/calc/tests/tools/sensor/test_array_offset.py`
- [ ] T039 [P] [test] [US4] Write offset change test: same mode, different offset values produce different origins `shared/components/src/MapView/__tests__/array-offset.test.ts`

### Implementation for User Story 4

- [ ] T040 [US4] Verify `prepareSensorContacts()` naturally recalculates when sensor props change — no explicit invalidation code needed (document in test) `shared/components/src/MapView/__tests__/array-offset.test.ts`

**Checkpoint**: Mode/offset changes recalculate all origins. No explicit cache invalidation required — React re-render triggers recomputation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-language parity, code cleanup, evidence collection, and PR creation

### Cross-Language Parity

- [ ] T041 [test] Create cross-language parity test file — verify all 7 golden test cases produce identical results (within 1m tolerance) in TypeScript and Python `services/calc/tests/tools/sensor/test_array_offset_parity.py`
- [ ] T042 Export Python array offset functions in sensor __init__.py `services/calc/debrief_calc/tools/sensor/__init__.py`
- [ ] T043 Run full CI verification: `task verify` (lint + typecheck + test)

### Evidence Collection

- [ ] T044 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/119-array-offset-calc/evidence/test-summary.md`
- [ ] T045 Create usage demonstration showing all 3 modes with code examples and expected output `specs/119-array-offset-calc/evidence/usage-example.md`
- [ ] T046 [P] Capture cross-language parity comparison — side-by-side TS/Python outputs for golden cases `specs/119-array-offset-calc/evidence/cross-language-parity.md`

### Media Content

- [ ] T047 Create shipped blog post `specs/119-array-offset-calc/media/shipped-post.md`
- [ ] T048 [P] Create LinkedIn shipped summary `specs/119-array-offset-calc/media/linkedin-shipped.md`

### PR Creation

- [ ] T049 Create PR and publish blog: run /speckit.pr

**Task T049 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — haversine + dispatch shell BLOCKS all user stories
- **Phase 3 (PLAIN/P1)**: Depends on Phase 2 — includes rendering pipeline integration
- **Phase 4 (WORM/P2)**: Depends on Phase 2 — can run in parallel with Phase 3 (different functions, no file conflicts in array-offset.ts if coordinated)
- **Phase 5 (MEASURED/P2)**: Depends on Phase 2 + Phase 3 (PLAIN must be complete for fallback)
- **Phase 6 (Recalculation/P3)**: Depends on Phases 3, 4, 5 (needs all modes implemented)
- **Phase 7 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 PLAIN (P1)**: Foundation only — no dependencies on other stories
- **US2 WORM (P2)**: Foundation only — independent of US1 for algorithm, but shares dispatch and integration in `sensor-utils.ts`
- **US3 MEASURED (P2)**: Depends on US1 (PLAIN) because MEASURED falls back to PLAIN when data is unavailable
- **US4 Recalculation (P3)**: Depends on US1, US2, US3 — tests mode switching across all modes

### Within Each User Story

- Tests written first, verified to cover the acceptance scenarios
- Implementation follows (TS and Python can run in parallel)
- Wired into dispatch function
- Golden test cases verified

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 can all run in parallel with T001
- **Phase 2**: T006/T007 (haversine) can run in parallel; T008/T009 (tests) can run in parallel
- **Phase 3**: T015/T016 (PLAIN TS/Python) can run in parallel; T017/T018 (dispatch wiring) can run in parallel
- **Phase 4**: T024/T025 (WORM TS/Python) can run in parallel; T026/T027 can run in parallel
- **Phase 5**: T031/T032 (MEASURED TS/Python) can run in parallel; T033/T034 can run in parallel
- **Phase 7**: T046, T048 can run in parallel with each other and with T045

---

## Parallel Example: Phase 3 (PLAIN Mode)

```bash
# Write tests in parallel:
T013: PLAIN mode unit tests (TypeScript)
T014: PLAIN mode unit tests (Python)

# Implement in parallel:
T015: computePlainOffset() in TypeScript
T016: compute_plain_offset() in Python

# Wire dispatch in parallel:
T017: Wire PLAIN into computeArrayCentre() (TS)
T018: Wire PLAIN into compute_array_centre() (Python)
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1 + 2**: Foundation — haversine distance, dispatch shell, golden fixtures
2. **Phase 3 (US1)**: PLAIN mode — simplest mode, renders offset bearing lines, integrates into rendering pipeline
3. **Phase 4 (US2)**: WORM mode — track backtracking algorithm, most complex geometry
4. **Phase 5 (US3)**: MEASURED mode — interpolation + PLAIN fallback
5. **Phase 6 (US4)**: Recalculation verification — confirms React reactivity handles invalidation
6. **Phase 7**: Parity tests, evidence, media, PR

### Key Design Notes

- **No schema changes**: All needed fields exist from #116
- **One integration point**: `sensor-utils.ts:prepareSensorContacts()` line 421-427 — the only rendering code that changes
- **Pure functions**: All calculation functions are stateless with well-defined inputs/outputs
- **Cross-language parity**: Same golden test cases validate both TS and Python implementations
- **Backward compatible**: `contact.origin` override still takes precedence; null/zero offset returns vessel position unchanged

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US2/US3/US4] labels map tasks to specific user stories for traceability
- Each user story is independently completable and testable after Phase 2 foundation
- Commit after each phase completion
- Stop at any checkpoint to validate the story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
