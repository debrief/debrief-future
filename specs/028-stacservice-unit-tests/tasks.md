# Tasks: stacService Unit Tests

**Input**: Design documents from `/specs/028-stacservice-unit-tests/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete)

**Tests**: This feature IS tests - all tasks are test implementation.

**Organization**: Tasks are grouped by method priority from spec.md. Each method group can be implemented and verified independently.

---

## Evidence Requirements

**Evidence Directory**: `specs/028-stacservice-unit-tests/evidence/`
**Media Directory**: `specs/028-stacservice-unit-tests/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with pass/fail counts, coverage % | After all tests pass |
| usage-example.md | Example test showing the mocking pattern | After Phase 2 complete |
| coverage-report.txt | Console output showing >80% coverage | After coverage verification |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Complete (from /speckit.plan) |
| media/linkedin-planning.md | LinkedIn summary for planning | Complete (from /speckit.plan) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Create test file structure with mocking infrastructure

- [ ] T001 Create test file with Vitest imports and fs mock `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T002 [P] Add mock helper functions (mockValidCatalog, mockMissingFile, mockReadError) `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T003 [P] Add mock STAC data factories (createMockCatalog, createMockItem, createMockFeatureCollection) `apps/vscode/tests/unit/stacService.test.ts`

---

## Phase 2: Foundational (Mock Data Structures)

**Purpose**: Complete mock data structures that all test groups depend on

- [ ] T004 Add mock StacStore type helper `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T005 [P] Add mock GeoJSON feature factories (track, location, polygon, null geometry) `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T006 [P] Add beforeEach/afterEach hooks for test isolation `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: Test infrastructure ready - method test groups can now begin

---

## Phase 3: loadPlotData() Tests (Priority: CRITICAL) 🎯 MVP

**Goal**: Test the method that had the bug - ensure consistent return type

**Independent Test**: `pnpm test -- --grep "loadPlotData"`

### Tests

- [ ] T007 [test] Test loadPlotData returns tracks, locations, otherFeatures for valid data `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T008 [P][test] Test loadPlotData categorizes LineString with times as Track `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T009 [P][test] Test loadPlotData categorizes Point with kind=LOCATION as Location `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T010 [P][test] Test loadPlotData categorizes other geometries as otherFeatures `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T011 [test] Test loadPlotData returns empty arrays when no GeoJSON asset (BUG FIX) `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T012 [P][test] Test loadPlotData returns empty arrays when GeoJSON file missing `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T013 [P][test] Test loadPlotData returns null when item not found `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T014 [P][test] Test loadPlotData skips features with null geometry `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T015 [P][test] Test loadPlotData handles LineString without times as otherFeature `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T016 [P][test] Test loadPlotData handles Point without kind=LOCATION as otherFeature `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T017 [test] Test loadPlotData always returns consistent object structure or null `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: loadPlotData fully tested - the critical bug case is covered

---

## Phase 4: validateStorePath() Tests (Priority: High)

**Goal**: Test store path validation logic

**Independent Test**: `pnpm test -- --grep "validateStorePath"`

### Tests

- [ ] T018 [test] Test validateStorePath returns valid:true for valid STAC catalog `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T019 [P][test] Test validateStorePath returns valid:false when catalog.json missing `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T020 [P][test] Test validateStorePath returns valid:false for invalid STAC format `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T021 [P][test] Test validateStorePath returns valid:false for malformed JSON `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T022 [P][test] Test validateStorePath returns valid:false for null catalog `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T023 [test] Test validateStorePath handles read errors gracefully `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: validateStorePath fully tested

---

## Phase 5: listCatalogs() Tests (Priority: High)

**Goal**: Test catalog listing and caching

**Independent Test**: `pnpm test -- --grep "listCatalogs"`

### Tests

- [ ] T024 [test] Test listCatalogs returns root catalog `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T025 [P][test] Test listCatalogs returns child catalogs from links `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T026 [P][test] Test listCatalogs counts items in each catalog `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T027 [P][test] Test listCatalogs returns empty array when root catalog missing `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T028 [P][test] Test listCatalogs handles child catalog load failures gracefully `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T029 [test] Test listCatalogs uses cached catalogs on repeated calls `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T030 [P][test] Test listCatalogs uses title from catalog, falling back to id `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: listCatalogs fully tested

---

## Phase 6: listItems() Tests (Priority: High)

**Goal**: Test item listing, sorting, and caching

**Independent Test**: `pnpm test -- --grep "listItems"`

### Tests

- [ ] T031 [test] Test listItems returns items from catalog links `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T032 [P][test] Test listItems sorts items by datetime descending `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T033 [P][test] Test listItems returns empty array for catalog with no items `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T034 [P][test] Test listItems handles item load failures gracefully `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T035 [test] Test listItems uses cached items on repeated calls `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T036 [P][test] Test listItems uses title from properties, falling back to id `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: listItems fully tested

---

## Phase 7: loadPlot() Tests (Priority: High)

**Goal**: Test plot metadata loading

**Independent Test**: `pnpm test -- --grep "loadPlot"`

### Tests

- [ ] T037 [test] Test loadPlot returns plot with correct metadata `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T038 [P][test] Test loadPlot counts tracks (LineString features) `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T039 [P][test] Test loadPlot counts locations (Point features) `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T040 [P][test] Test loadPlot calculates time extent from track times `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T041 [P][test] Test loadPlot returns null when item not found `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T042 [P][test] Test loadPlot handles missing GeoJSON asset `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T043 [P][test] Test loadPlot handles empty feature collection `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T044 [P][test] Test loadPlot skips features with null geometry `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T045 [test] Test loadPlot handles features without times array `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: loadPlot fully tested

---

## Phase 8: Write Methods Tests (Priority: Medium)

**Goal**: Test addAsset, addFeatures, hasAsset, saveTrackColors

**Independent Test**: `pnpm test -- --grep "addAsset|addFeatures|hasAsset|saveTrackColors"`

### addAsset Tests

- [ ] T046 [test] Test addAsset copies source file to assets directory `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T047 [P][test] Test addAsset creates assets directory if needed `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T048 [P][test] Test addAsset adds asset reference to item JSON `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T049 [P][test] Test addAsset uses filename stem as default asset key `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T050 [P][test] Test addAsset uses provided asset key when specified `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T051 [P][test] Test addAsset throws when item not found `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T052 [test] Test addAsset clears item cache after update `apps/vscode/tests/unit/stacService.test.ts`

### addFeatures Tests

- [ ] T053 [test] Test addFeatures appends features to existing GeoJSON `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T054 [P][test] Test addFeatures creates new GeoJSON file when none exists `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T055 [P][test] Test addFeatures updates item bbox from features `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T056 [P][test] Test addFeatures throws when item not found `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T057 [P][test] Test addFeatures clears item cache after update `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T058 [P][test] Test addFeatures returns updated feature count `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T059 [test] Test addFeatures handles various geometry types `apps/vscode/tests/unit/stacService.test.ts`

### hasAsset Tests

- [ ] T060 [test] Test hasAsset returns true when asset exists `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T061 [P][test] Test hasAsset returns false when asset does not exist `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T062 [P][test] Test hasAsset returns false when item not found `apps/vscode/tests/unit/stacService.test.ts`

### saveTrackColors Tests

- [ ] T063 [test] Test saveTrackColors updates item properties with track colors `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T064 [P][test] Test saveTrackColors writes updated item to disk `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T065 [P][test] Test saveTrackColors clears item cache after update `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T066 [P][test] Test saveTrackColors returns true on success `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T067 [P][test] Test saveTrackColors returns false when item not found `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T068 [test] Test saveTrackColors returns false on write error `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: All write methods fully tested

---

## Phase 9: Utility Methods Tests (Priority: Low)

**Goal**: Test clearCache

**Independent Test**: `pnpm test -- --grep "clearCache"`

### Tests

- [ ] T069 [test] Test clearCache clears catalog cache `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T070 [P][test] Test clearCache clears item cache `apps/vscode/tests/unit/stacService.test.ts`

**Checkpoint**: All public methods have tests

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Verify coverage, collect evidence, create media content

### Coverage Verification

- [ ] T071 Run full test suite and verify all tests pass `apps/vscode/`
- [ ] T072 Run coverage and verify >80% for stacService.ts `apps/vscode/`

### Evidence Collection (REQUIRED)

- [ ] T073 Capture test summary in `specs/028-stacservice-unit-tests/evidence/test-summary.md`
- [ ] T074 [P] Create usage example showing mocking pattern in `specs/028-stacservice-unit-tests/evidence/usage-example.md`
- [ ] T075 [P] Capture coverage report in `specs/028-stacservice-unit-tests/evidence/coverage-report.txt`

### Media Content (REQUIRED)

- [ ] T076 Create shipped blog post in `specs/028-stacservice-unit-tests/media/shipped-post.md`
- [ ] T077 [P] Create LinkedIn shipped summary in `specs/028-stacservice-unit-tests/media/linkedin-shipped.md`

### PR Creation (REQUIRED - must be final task)

- [ ] T078 Create PR and publish blog: run /speckit.pr

**Task T078 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 - BLOCKS all test groups
- **Phases 3-9 (Test Groups)**: All depend on Phase 2 completion
  - Can proceed in priority order (P3 MVP → P4 → P5 → ...)
  - Or in parallel if desired (all tests go in same file)
- **Phase 10 (Polish)**: Depends on all test phases complete

### Test Group Independence

All test groups (Phases 3-9) can theoretically run in parallel since they test different methods. However, they all contribute to the same test file, so sequential implementation is recommended to avoid merge conflicts.

**Recommended order**: MVP first (loadPlotData), then by priority (validateStorePath → listCatalogs → listItems → loadPlot → write methods → clearCache)

### Within Each Test Group

- Setup mock data for the specific method
- Implement tests in order (happy path → edge cases → error cases)
- Verify tests pass before moving to next group

### Parallel Opportunities

- All tasks marked [P] within a phase can be written simultaneously
- T002 and T003 (mock helpers and factories) can be developed in parallel
- T005 and T006 (feature factories and hooks) can be developed in parallel
- Within each test group, parallel tests can be implemented together

---

## Implementation Strategy

### MVP First (Phase 3 Only)

1. Complete Phase 1: Setup (test file, imports, fs mock)
2. Complete Phase 2: Foundation (mock helpers, data factories)
3. Complete Phase 3: loadPlotData tests (CRITICAL method)
4. **STOP and VALIDATE**: Run tests, verify the bug case is covered
5. Can ship with just loadPlotData tests if needed

### Full Implementation

1. Setup + Foundation → Test infrastructure ready
2. Add loadPlotData tests → Run and verify (MVP!)
3. Add validateStorePath tests → Run and verify
4. Add listCatalogs tests → Run and verify
5. Add listItems tests → Run and verify
6. Add loadPlot tests → Run and verify
7. Add write method tests → Run and verify
8. Add clearCache tests → Run and verify
9. Verify >80% coverage → Polish phase
10. Collect evidence, create media, submit PR

### Test Count Summary

| Phase | Method(s) | Test Count |
|-------|-----------|------------|
| 3 | loadPlotData | 11 |
| 4 | validateStorePath | 6 |
| 5 | listCatalogs | 7 |
| 6 | listItems | 6 |
| 7 | loadPlot | 9 |
| 8 | addAsset, addFeatures, hasAsset, saveTrackColors | 23 |
| 9 | clearCache | 2 |
| **Total** | | **64 tests** |

---

## Notes

- All tests go in single file: `apps/vscode/tests/unit/stacService.test.ts`
- Tests invoke actual StacService methods (not duplicated logic)
- All fs operations are mocked - no real file system access
- Target: >80% line coverage for `stacService.ts`
- Evidence is required before PR creation
- Run `/speckit.pr` after T078 to create PR with evidence
