# Tasks: CQL2 `array_filter` Evaluator

**Input**: Design documents from `/specs/185-cql2-array-filter/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per FR-010. Test tasks are included for every user story following test-first approach.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/185-cql2-array-filter/evidence/`
**Media Directory**: `specs/185-cql2-array-filter/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with test counts and coverage | After all tests pass |
| usage-example.md | TypeScript code showing compound filter construction and evaluation | After all stories complete |
| code-example-output.txt | Console output from running usage examples | After all stories complete |

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

**Purpose**: Create evidence directory and verify existing infrastructure

- [ ] T001 Create evidence directory `specs/185-cql2-array-filter/evidence/`
- [ ] T002 Verify existing filter engine tests pass: run `pnpm --filter @debrief/components test`

---

## Phase 2: Foundation (Type Definitions)

**Purpose**: Add all new types that block every user story. No evaluation or serialization logic yet — just the type model.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Add `PlatformField` type union to `shared/components/src/filter-engine/types.ts`
- [ ] T004 [P] Add `CompoundPredicate` discriminated union type to `shared/components/src/filter-engine/types.ts`
- [ ] T005 Add `ArrayFilterPredicate` interface to `shared/components/src/filter-engine/types.ts`
- [ ] T006 Add optional `arrayFilters` field to `FilterExpression` interface in `shared/components/src/filter-engine/types.ts`
- [ ] T007 Export new types from `shared/components/src/filter-engine/index.ts`
- [ ] T008 Verify all existing tests still pass (backward compatibility check): run `pnpm --filter @debrief/components test`

**Checkpoint**: Foundation ready — type model complete, all existing tests green. User story implementation can begin.

---

## Phase 3: User Story 1 — Compound Platform Filtering (Priority: P1)

**Goal**: Evaluate `array_filter()` expressions with compound AND/OR predicates per-element against the `platforms[]` array, using case-insensitive equality matching for all fields.

**Independent Test**: Construct STAC items with mixed platform arrays and verify compound predicates match only when conditions are satisfied by the same platform element.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [US1] Create test file with test scaffolding `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T010 [P][test] [US1] Write test: mixed platforms (GB surface + DE subsurface) with GB+subsurface compound filter returns NO match `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T011 [P][test] [US1] Write test: single platform (GB subsurface) with GB+subsurface filter returns match `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T012 [P][test] [US1] Write test: two GB platforms (surface + subsurface) with GB+subsurface filter returns match via second element `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T013 [P][test] [US1] Write test: OR sub-predicate (nationality GB OR US) AND domain subsurface `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T014 [P][test] [US1] Write test: empty platforms array returns false `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T015 [P][test] [US1] Write test: null/missing platform fields return false for that element `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T016 [P][test] [US1] Write test: multiple arrayFilters in one expression are AND'd together `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T017 [P][test] [US1] Write test: empty arrayFilters field matches all items (no-op) `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T018 [P][test] [US1] Write test: mixed expression with existing predicates + arrayFilters `shared/components/src/filter-engine/__tests__/array-filter.test.ts`

### Implementation for User Story 1

- [ ] T019 [US1] Implement `evaluateCompound()` internal function in `shared/components/src/filter-engine/matchers.ts`
- [ ] T020 [US1] Implement `matchArrayFilter()` exported function in `shared/components/src/filter-engine/matchers.ts`
- [ ] T021 [US1] Extend `matches()` in engine.ts to evaluate `expression.arrayFilters` as AND conditions `shared/components/src/filter-engine/engine.ts`
- [ ] T022 [US1] Run all tests and verify US1 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: Compound platform filtering works. Items can be filtered by per-element compound predicates with AND/OR logic.

---

## Phase 4: User Story 2 — CQL2 JSON Serialization Round-Trip (Priority: P1)

**Goal**: Serialize `array_filter` expressions to CQL2 JSON and deserialize CQL2 JSON containing `array_filter` back to evaluable expressions.

**Independent Test**: Round-trip `array_filter` expressions through serialize, deserialize, and evaluate — results must match direct evaluation.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T023 [US2] Create test file with test scaffolding `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T024 [P][test] [US2] Write test: serialize compound AND to CQL2 JSON with correct structure `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T025 [P][test] [US2] Write test: serialize compound OR to CQL2 JSON `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T026 [P][test] [US2] Write test: serialize mixed expression (predicates + arrayFilters) `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T027 [P][test] [US2] Write test: deserialize CQL2 JSON array_filter to ArrayFilterPredicate[] `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T028 [P][test] [US2] Write test: deserialize nested AND/OR compound predicate `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T029 [P][test] [US2] Write test: round-trip serialize → deserialize → evaluate produces same results `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T030 [P][test] [US2] Write test: deserialize CQL2 JSON with no array_filter returns empty array `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`

### Implementation for User Story 2

- [ ] T031 [US2] Implement `compoundPredicateToCql2()` internal function in `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T032 [US2] Implement `arrayFilterToCql2()` internal function in `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T033 [US2] Extend `filterExpressionToCql2Json()` to include arrayFilters in output `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T034 [US2] Implement `parseCql2Predicate()` internal function for deserialization `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T035 [US2] Implement `cql2JsonToArrayFilters()` exported function `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T036 [US2] Export `cql2JsonToArrayFilters` from `shared/components/src/filter-engine/index.ts`
- [ ] T037 [US2] Run all tests and verify US2 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: CQL2 JSON serialization and deserialization work. Expressions round-trip without information loss.

---

## Phase 5: User Story 3 — Hierarchical Vessel Class in Compound Predicates (Priority: P2)

**Goal**: Support taxonomy-expanded matching for `vessel_class` comparisons within `array_filter` sub-predicates, so filtering by a parent class (e.g., `frigate`) matches all child classes (e.g., `type23`, `type26`).

**Independent Test**: Construct items with specific vessel classes and verify parent-class compound predicates correctly expand and match.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T038 [test] [US3] Write test: GB nationality + vessel_class=frigate matches platform with vessel_class=surface/warship/frigate/type23 `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T039 [P][test] [US3] Write test: DE nationality + vessel_class=frigate does NOT match GB type23 platform (nationality mismatch on same element) `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T040 [P][test] [US3] Write test: vessel_class=warship expands to match all warship descendants `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T041 [P][test] [US3] Write test: vessel_class with unknown taxonomy node returns false `shared/components/src/filter-engine/__tests__/array-filter.test.ts`

### Implementation for User Story 3

- [ ] T042 [US3] Pass `DescendantMap` to `evaluateCompound()` and `matchArrayFilter()` in `shared/components/src/filter-engine/matchers.ts`
- [ ] T043 [US3] Add taxonomy-expanded comparison branch for `vessel_class` field in `evaluateCompound()` `shared/components/src/filter-engine/matchers.ts`
- [ ] T044 [US3] Run all tests and verify US3 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: Hierarchical vessel class matching works inside compound predicates. "British frigates" query correctly matches all frigate subtypes.

---

## Phase 6: User Story 4 — Negated Compound Predicates (Priority: P3)

**Goal**: Support negation of entire `array_filter` expressions via the `negated` flag, so analysts can exclude items matching compound platform criteria.

**Independent Test**: Negate `array_filter` expressions and verify items are excluded when any platform matches the compound predicate.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T045 [test] [US4] Write test: negated GB+subsurface filter excludes item with British submarine platform `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T046 [P][test] [US4] Write test: negated GB+subsurface filter includes item with only surface platforms `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T047 [P][test] [US4] Write test: negated array_filter with empty platforms returns true (no element to match) `shared/components/src/filter-engine/__tests__/array-filter.test.ts`
- [ ] T048 [P][test] [US4] Write test: serialization of negated array_filter wraps in NOT operator `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`
- [ ] T049 [P][test] [US4] Write test: deserialization of NOT-wrapped array_filter sets negated=true `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts`

### Implementation for User Story 4

- [ ] T050 [US4] Implement negation handling in `matchArrayFilter()` via XOR with `af.negated` `shared/components/src/filter-engine/matchers.ts`
- [ ] T051 [US4] Implement NOT wrapping in `arrayFilterToCql2()` when `af.negated` is true `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T052 [US4] Handle NOT-wrapped array_filter in `cql2JsonToArrayFilters()` deserialization `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T053 [US4] Run all tests and verify US4 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: Negation works for compound predicates. All 4 user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, media content, and PR creation.

### Verification

- [ ] T054 Run full test suite and verify all existing + new tests pass: `pnpm --filter @debrief/components test`
- [ ] T055 Run typecheck to verify no type errors: `pnpm -r typecheck`
- [ ] T056 Run lint to verify code quality: `pnpm lint`
- [ ] T057 Run full CI check: `task verify`
- [ ] T058 Validate quickstart.md examples are accurate against implementation `specs/185-cql2-array-filter/quickstart.md`

### Evidence Collection (REQUIRED)

- [ ] T059 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/185-cql2-array-filter/evidence/test-summary.md`
- [ ] T060 Create usage demonstration with code examples and expected output `specs/185-cql2-array-filter/evidence/usage-example.md`
- [ ] T061 [P] Capture code example output showing compound filter evaluation results `specs/185-cql2-array-filter/evidence/code-example-output.txt`

### Media Content

- [ ] T062 Create shipped blog post `specs/185-cql2-array-filter/media/shipped-post.md`
- [ ] T063 [P] Create LinkedIn shipped summary `specs/185-cql2-array-filter/media/linkedin-shipped.md`

### PR Creation

- [ ] T064 Create PR and publish blog: run /speckit.pr

**Task T064 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundation (Phase 2)
- **US2 (Phase 4)**: Depends on Foundation (Phase 2). Can run in parallel with US1.
- **US3 (Phase 5)**: Depends on US1 (Phase 3) — extends evaluateCompound() with taxonomy
- **US4 (Phase 6)**: Depends on US1 (Phase 3) and US2 (Phase 4) — adds negation to both evaluation and serialization
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only — no other story dependencies
- **User Story 2 (P1)**: Foundation only — can run in parallel with US1
- **User Story 3 (P2)**: Depends on US1 (extends the evaluator written in US1)
- **User Story 4 (P3)**: Depends on US1 and US2 (adds negation to both evaluation and serialization)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Type model (Foundation) before evaluation logic
- Evaluation before serialization integration
- Core implementation before edge case handling

### Parallel Opportunities

```
Phase 2 (Foundation):
  T003 + T004 can run in parallel (different type definitions)
  T005 depends on T003 + T004 (references both)
  T006 depends on T005 (references ArrayFilterPredicate)
  T007 depends on all above

Phase 3 (US1) and Phase 4 (US2):
  Can run in parallel — US1 writes matchers/engine, US2 writes cql2-json
  All test tasks marked [P] within each phase can run in parallel

Phase 5 (US3) and Phase 6 (US4):
  US3 depends on US1 only
  US4 depends on US1 + US2
  If US1 finishes first, US3 can start while US2 is still in progress
```

---

## Parallel Example: User Stories 1 + 2 (both P1)

```bash
# After Foundation (Phase 2) completes, launch US1 and US2 in parallel:

# US1 tests (all can run in parallel):
T010: mixed platforms no-match test
T011: single platform match test
T012: two-element match test
T013: OR sub-predicate test
T014: empty platforms test
T015: null fields test
T016: multiple arrayFilters test
T017: empty arrayFilters test
T018: mixed expression test

# US2 tests (all can run in parallel):
T024: serialize AND test
T025: serialize OR test
T026: serialize mixed expression test
T027: deserialize array_filter test
T028: deserialize nested AND/OR test
T029: round-trip test
T030: no array_filter returns empty test
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Type model ready, all existing tests green
2. Implement US1 (Compound Evaluation) → Per-element AND/OR filtering works
3. Implement US2 (CQL2 Serialization) → NL pipeline can generate and consume filters
4. Implement US3 (Taxonomy Expansion) → "British frigates" works with hierarchical matching
5. Implement US4 (Negation) → "Exclude British submarines" works
6. Polish phase → Evidence, media, PR

### Key Design Points

- **Additive only**: The `arrayFilters` field is optional on `FilterExpression`. All existing code continues to work.
- **Same file, different functions**: Most changes are new functions added to existing files, not modifications to existing functions. The only existing function modified is `matches()` in engine.ts (adding an arrayFilters loop) and `filterExpressionToCql2Json()` in cql2-json.ts (adding arrayFilter serialization).
- **Test isolation**: New tests are in separate test files (`array-filter.test.ts`, `array-filter-cql2.test.ts`) to avoid conflicting with existing test files.

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [US#] label maps task to specific user story for traceability
- [test] label indicates test task that should fail before implementation
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
