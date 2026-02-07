# Tasks: Nested Child Selection

**Input**: Design documents from `/specs/053-nested-child-selection/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the spec requires schema adherence tests (Constitution VI), golden fixture tests, and round-trip tests. Test-first approach per Constitution VII.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/053-nested-child-selection/evidence/`
**Media Directory**: `specs/053-nested-child-selection/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with pass/fail counts and coverage | After all tests pass |
| usage-example.md | TypeScript code demonstrating path utilities and store actions | After foundation complete |
| golden-fixture-results.txt | Golden fixture test output showing all path parse/validate cases | After golden tests pass |
| round-trip-evidence.md | Demonstration of path serialisation round-trips | After US3 complete |

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

## Phase 1: Setup (Schema & Project Structure)

**Purpose**: Add schema definitions and project scaffolding before any implementation

- [x] T001 Add AddressingMode enum to LinkML schema `shared/schemas/src/linkml/session-state.yaml`
- [x] T002 Add LevelDefinition class to LinkML schema `shared/schemas/src/linkml/session-state.yaml`
- [x] T003 Update FeatureSelection description in LinkML schema to document path semantics `shared/schemas/src/linkml/session-state.yaml`
- [x] T004 Regenerate TypeScript types from updated LinkML schema `shared/schemas/src/generated/typescript/types.ts`
- [x] T005 Regenerate Pydantic models from updated LinkML schema `shared/schemas/src/generated/python/models.py`
- [x] T006 [P] Create selectionPath.ts module stub with type exports `services/session-state/src/utils/selectionPath.ts`
- [x] T007 [P] Create evidence directory `specs/053-nested-child-selection/evidence/`

---

## Phase 2: Foundation — Path Utilities & Level Registry (Blocking)

**Purpose**: Core path infrastructure that MUST be complete before ANY user story can be implemented

**⚠ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [test] Write golden fixture tests from contracts/golden-fixtures.json `services/session-state/src/utils/__tests__/selectionPath.golden.test.ts`
- [x] T009 [test] Write unit tests for escapeSegment and unescapeSegment `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T010 [P][test] Write unit tests for normalisePath `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T011 [P][test] Write unit tests for parsePath (root-only, single-level, multi-level, escaped) `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T012 [P][test] Write unit tests for buildPath round-trips `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T013 [P][test] Write unit tests for getRoot, getDepth, isRootPath, getParent `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T014 [P][test] Write unit tests for validatePathStructure (valid + all invalid cases) `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T015 [P][test] Write unit tests for validatePathSemantics against level registry `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T016 [P][test] Write unit tests for getLevelRegistry `services/session-state/src/utils/__tests__/selectionPath.test.ts`

### Implementation for Foundation

- [x] T017 Implement getLevelRegistry with positions (index) and segments (id) `services/session-state/src/utils/selectionPath.ts`
- [x] T018 Implement escapeSegment and unescapeSegment per RFC 6901 `services/session-state/src/utils/selectionPath.ts`
- [x] T019 Implement normalisePath (trim, strip trailing slash) `services/session-state/src/utils/selectionPath.ts`
- [x] T020 Implement parsePath (split on /, pair level/address, build ParsedPath) `services/session-state/src/utils/selectionPath.ts`
- [x] T021 Implement buildPath (join root + level/address pairs) `services/session-state/src/utils/selectionPath.ts`
- [x] T022 [P] Implement getRoot (fast: split on first /) `services/session-state/src/utils/selectionPath.ts`
- [x] T023 [P] Implement getDepth, isRootPath `services/session-state/src/utils/selectionPath.ts`
- [x] T024 [P] Implement getParent (remove last two segments) `services/session-state/src/utils/selectionPath.ts`
- [x] T025 Implement validatePathStructure (non-empty, no empty segments, valid escapes, even child segments) `services/session-state/src/utils/selectionPath.ts`
- [x] T026 Implement validatePathSemantics (level names known, addressing mode conformance) `services/session-state/src/utils/selectionPath.ts`
- [x] T027 Export all path utilities from session-state package index `services/session-state/src/index.ts`
- [x] T028 Run all path utility tests — verify all pass `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T029 Run golden fixture tests — verify all pass `services/session-state/src/utils/__tests__/selectionPath.golden.test.ts`

**Checkpoint**: Path utilities complete and tested. All golden fixtures pass. User story implementation can now begin.

---

## Phase 3: User Story 1 — Select a Position Within a Track (Priority: P1) 🎯 MVP

**Goal**: An analyst clicks an individual position point within a track and the selection state records a path identifying both the track and the specific position.

**Independent Test**: Click a position on a rendered track → verify selection state contains `track-id/positions/N`.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T030 [test] [US1] Write store test: setSelection with position path records correct state `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T031 [P][test] [US1] Write store test: clicking different position on same track replaces selection `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T032 [P][test] [US1] Write store test: single-segment path (flat ID) works identically to current behaviour `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T033 [P][test] [US1] Write store test: primary is set to the path when setSelection called with one path `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T034 [P][test] [US1] Write selector test: selectedRootIds extracts unique roots from paths `services/session-state/src/store/__tests__/features.selection-path.test.ts`

### Implementation for User Story 1

- [x] T035 [US1] Add selectedRootIds selector to features slice `services/session-state/src/store/slices/features.ts`
- [x] T036 [US1] Add getPathsForRoot selector to features slice `services/session-state/src/store/slices/features.ts`
- [x] T037 [US1] Update setSelection action to normalise paths before storing `services/session-state/src/store/slices/features.ts`
- [x] T038 [US1] Update FeatureSelection type documentation to note path semantics `services/session-state/src/types/features.ts`
- [x] T039 [US1] Update webview SelectionChangedMessage to include paths `apps/vscode/src/webview/messages.ts`
- [x] T040 [US1] Update mapView click handler to emit position-level paths when position points are clicked `apps/vscode/src/webview/web/mapView.tsx`
- [x] T041 [US1] Update MapView component to highlight child-selected positions distinctly `shared/components/src/MapView/MapView.tsx`
- [x] T042 [US1] Update SetSelectionMessage in extension to accept paths `apps/vscode/src/webview/messages.ts`
- [x] T043 [US1] Run US1 store tests — verify all pass `services/session-state/src/store/__tests__/features.selection-path.test.ts`

**Checkpoint**: User Story 1 complete. Position selection works end-to-end. Backward compatibility verified with flat IDs.

---

## Phase 4: User Story 2 — Mixed-Depth Multi-Selection (Priority: P2) + User Story 4 — Tool Receives Leaf-Only Selection (Priority: P2)

**Goal (US2)**: Analyst selects a whole track (parent) and Ctrl+clicks a position on another track (child). Both coexist in the selection with mixed depths.

**Goal (US4)**: Tools receive exactly the leaf paths the user selected — no implicit parent entries.

**Independent Test (US2)**: Select a whole track → Ctrl+click a position on another track → verify both entries coexist in selection.

**Independent Test (US4)**: Select a position → invoke a tool → verify tool receives only the position path, not the parent track ID.

### Tests for User Stories 2 & 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T044 [test] [US2] Write store test: addToSelection with child path alongside existing root path `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T045 [P][test] [US2] Write store test: parent and child paths coexist in same selection `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T046 [P][test] [US2] Write store test: clearSelection removes all paths at all depths `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T047 [P][test] [US2] Write store test: multi-position paths from different parents coexist `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T048 [test] [US4] Write tool match test: selectedRootIds for tool matching extracts correct kinds `apps/vscode/src/services/__tests__/toolMatchAdapter.selection-path.test.ts`
- [x] T049 [P][test] [US4] Write tool match test: position-only selection does not produce phantom parent entry `apps/vscode/src/services/__tests__/toolMatchAdapter.selection-path.test.ts`
- [x] T050 [P][test] [US4] Write tool match test: tool requiring whole-track does not match position-only selection `apps/vscode/src/services/__tests__/toolMatchAdapter.selection-path.test.ts`

### Implementation for User Stories 2 & 4

- [x] T051 [US2] Update addToSelection to normalise paths and deduplicate `services/session-state/src/store/slices/features.ts`
- [x] T052 [US2] Update removeFromSelection to use exact path match `services/session-state/src/store/slices/features.ts`
- [x] T053 [US2] Add isPathSelected and hasChildSelection selectors `services/session-state/src/store/slices/features.ts`
- [x] T054 [US2] Update useSelection hook to support path-based toggle and add `shared/components/src/hooks/useSelection.ts`
- [x] T055 [US4] Update ToolMatchAdapter.updateSelection to use getRoot for root extraction `apps/vscode/src/services/toolMatchAdapter.ts`
- [x] T056 [US4] Verify leaf-only semantics: tool receives exactly the paths in featureIds, not parents `apps/vscode/src/services/toolMatchAdapter.ts`
- [x] T057 [US4] Update MCP setSelection tool to pass paths through without modification `services/session-state/src/server/tools/setSelection.ts`
- [x] T058 Run US2 + US4 tests — verify all pass

**Checkpoint**: Mixed-depth selection works. Leaf-only semantics verified. Tool matching uses root extraction.

---

## Phase 5: User Story 3 — Deeply Nested Selection (Priority: P3)

**Goal**: Selection model supports 3+ levels of nesting (track > segment > position) without degradation.

**Independent Test**: Construct a 3-level path `track-001/segments/leg-alpha/positions/3` → parse → verify all levels extractable → verify round-trip.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T059 [test] [US3] Write store test: setSelection with 3-level path stores correctly `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T060 [P][test] [US3] Write path test: parsePath extracts all 3 levels from track/segments/id/positions/idx `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T061 [P][test] [US3] Write path test: getParent on 3-level path returns 2-level path `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T062 [P][test] [US3] Write path test: getDepth returns 2 for 3-level path `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T063 [P][test] [US3] Write round-trip test: buildPath → parsePath → buildPath produces identical output `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T064 [P][test] [US3] Write performance test: parse/validate 1000 paths with 4+ depth completes < 16ms `services/session-state/src/utils/__tests__/selectionPath.test.ts`

### Implementation for User Story 3

- [x] T065 [US3] Verify parsePath handles arbitrary depth (no hard-coded limits) `services/session-state/src/utils/selectionPath.ts`
- [x] T066 [US3] Verify validatePathSemantics validates multi-level paths correctly `services/session-state/src/utils/selectionPath.ts`
- [x] T067 [US3] Verify selectedRootIds works correctly with deeply nested paths `services/session-state/src/store/slices/features.ts`
- [x] T068 [US3] Add segments level to MapView selection highlighting (if visual representation exists) `shared/components/src/MapView/MapView.tsx`
- [x] T069 Run US3 tests — verify all pass including performance

**Checkpoint**: Arbitrary nesting depth verified. 4+ levels parse and validate within performance budget. Round-trip integrity confirmed.

---

## Phase 6: Edge Cases & Validation

**Purpose**: Cover all edge cases from spec.md to ensure robustness

### Tests for Edge Cases

- [x] T070 [test] Write test: unresolvable path retained in selection, not removed `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T071 [P][test] Write test: feature ID with escaped slash (track~1alpha) parses correctly `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T072 [P][test] Write test: parent and child coexist — no deduplication or collapsing `services/session-state/src/store/__tests__/features.selection-path.test.ts`
- [x] T073 [P][test] Write test: empty path rejected by validatePathStructure `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T074 [P][test] Write test: trailing slash normalised away `services/session-state/src/utils/__tests__/selectionPath.test.ts`
- [x] T075 [P][test] Write test: invalid escape sequence (~2) detected by validation `services/session-state/src/utils/__tests__/selectionPath.test.ts`

### Implementation for Edge Cases

- [x] T076 Verify normalisePath strips trailing slash in store actions `services/session-state/src/store/slices/features.ts`
- [x] T077 Verify setSelection silently filters empty/invalid paths `services/session-state/src/store/slices/features.ts`
- [x] T078 Run all edge case tests — verify all pass

**Checkpoint**: All spec edge cases covered. Validation handles malformed paths gracefully.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, media content, and PR creation

- [x] T079 Run full test suite and verify all tests pass
- [x] T080 [P] Run quickstart.md validation — verify all code examples are accurate `specs/053-nested-child-selection/quickstart.md`
- [x] T081 [P] Update session-state package exports to include all new utilities `services/session-state/src/index.ts`

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation

- [x] T082 Capture test summary with pass/fail counts and coverage `specs/053-nested-child-selection/evidence/test-summary.md`
- [x] T083 Create usage demonstration showing path utilities and store actions `specs/053-nested-child-selection/evidence/usage-example.md`
- [x] T084 [P] Capture golden fixture test output `specs/053-nested-child-selection/evidence/golden-fixture-results.txt`
- [x] T085 [P] Create round-trip evidence showing path serialisation integrity `specs/053-nested-child-selection/evidence/round-trip-evidence.md`

### Media Content

- [x] T086 Create shipped blog post `specs/053-nested-child-selection/media/shipped-post.md`
- [x] T087 [P] Create LinkedIn shipped summary `specs/053-nested-child-selection/media/linkedin-shipped.md`

### PR Creation

- [x] T088 Create PR and publish blog: run /speckit.pr

**Task T088 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — MVP target
- **US2 + US4 (Phase 4)**: Depends on Phase 2 completion; benefits from US1 being done first (shared store changes)
- **US3 (Phase 5)**: Depends on Phase 2 completion; validates depth already handled by foundation
- **Edge Cases (Phase 6)**: Depends on Phases 2-5; covers all spec edge cases
- **Polish (Phase 7)**: Depends on all previous phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundation (Phase 2) — Shares store changes with US1, recommend sequential after US1
- **User Story 4 (P2)**: Grouped with US2 — shares tool matching infrastructure
- **User Story 3 (P3)**: Can start after Foundation (Phase 2) — Primarily validates depth handling already built in Phase 2

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Types/models before services
- Services before UI integration
- Core implementation before cross-cutting concerns

### Parallel Opportunities

- All Phase 1 schema tasks run sequentially (same file), but T006/T007 can run in parallel
- Phase 2 tests (T008-T016) can all run in parallel
- Phase 2 implementation: T022/T023/T024 can run in parallel (independent utility functions)
- Phase 3 tests (T030-T034) can mostly run in parallel
- Phase 4 tests (T044-T050) can mostly run in parallel
- Phase 5 tests (T059-T064) can all run in parallel
- Phase 6 tests (T070-T075) can all run in parallel
- Phase 7 evidence collection (T082-T085) can mostly run in parallel

---

## Parallel Example: Foundation Phase

```bash
# Launch all foundation tests in parallel:
Task: "Golden fixture tests" (T008)
Task: "escapeSegment tests" (T009)
Task: "normalisePath tests" (T010)
Task: "parsePath tests" (T011)
Task: "buildPath tests" (T012)
Task: "helper function tests" (T013)
Task: "validatePathStructure tests" (T014)
Task: "validatePathSemantics tests" (T015)
Task: "getLevelRegistry tests" (T016)

# After tests fail, implement utilities with parallel opportunities:
Task: "getRoot" (T022) | Task: "getDepth + isRootPath" (T023) | Task: "getParent" (T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema changes)
2. Complete Phase 2: Foundation (path utilities + tests)
3. Complete Phase 3: User Story 1 (position selection)
4. **STOP and VALIDATE**: Test position selection independently
5. Capture evidence and ship if ready

### Incremental Delivery

1. Setup + Foundation → Path utilities ready
2. Add User Story 1 → Test independently → MVP!
3. Add User Stories 2 + 4 → Test mixed-depth + leaf-only → Enhanced selection
4. Add User Story 3 → Test deep nesting → Full capability
5. Edge Cases → Robustness verified → Production-ready
6. Polish → Evidence + media + PR → Feature shipped

### Single Developer Strategy (Recommended)

All stories share the same store file and path utilities. Sequential execution avoids merge conflicts:

1. Phase 1 → Phase 2 → Phase 3 (MVP checkpoint)
2. Phase 4 → Phase 5 → Phase 6 (full feature)
3. Phase 7 (ship it)

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- [test] tasks must be written BEFORE corresponding implementation
- All path utility functions are pure (no side effects, no store access)
- Store action signatures are unchanged — only semantics widened
- No new external dependencies added
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
