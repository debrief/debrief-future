# Tasks: Client-Side CQL2 Filter Engine

**Input**: Design documents from `/specs/126-cql2-filter-engine/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/filter-engine.ts

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the filter engine works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/126-cql2-filter-engine/evidence/`
**Media Directory**: `specs/126-cql2-filter-engine/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with pass/fail/coverage | After all tests pass |
| usage-example.md | TypeScript code demonstrating filter API | After all stories complete |
| filter-output-samples.json | Sample filter inputs and matching results | After US1 + US2 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Install dependency, create module directory structure, define types

- [x] T001 Install cql2-filters-parser dependency in shared/components `shared/components/package.json`
- [x] T002 Create filter-engine module directory and barrel export `shared/components/src/filter-engine/index.ts`
- [x] T003 [P] Create types module from contract definitions `shared/components/src/filter-engine/types.ts`
- [x] T004 [P] Add taxonomy JSON adapter to convert fixture format to VesselTaxonomyNode[] `shared/components/src/filter-engine/taxonomy.ts`
- [x] T005 Add filter-engine subpath export to package.json `shared/components/package.json`

**Checkpoint**: Module structure exists, types compile, dependency installed

---

## Phase 2: Foundation — Taxonomy Expansion + Per-Type Matchers

**Purpose**: Core matching infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement taxonomy descendant expansion: pre-compute nodeId → Set\<fullPath\> map `shared/components/src/filter-engine/taxonomy.ts`
- [x] T007 [test] Write taxonomy expansion tests (parent/leaf/unknown/empty tree) `shared/components/src/filter-engine/__tests__/taxonomy.test.ts`
- [x] T008 Implement per-filter-type matcher functions (all 9 types) `shared/components/src/filter-engine/matchers.ts`
- [x] T009 [test] Write matcher tests for each filter type `shared/components/src/filter-engine/__tests__/matchers.test.ts`

**Checkpoint**: All 9 matchers work individually, taxonomy expansion verified

---

## Phase 3: User Story 1 — Filter with AND Logic (Priority: P1)

**Goal**: Evaluate multiple predicates combined with AND logic against STAC item array

**Independent Test**: Provide engine with 2+ filter predicates and verify only items matching ALL predicates are returned

### Implementation

- [x] T010 Implement createFilterEngine factory and filter/matches methods (AND-only path) `shared/components/src/filter-engine/engine.ts`
- [x] T011 [test] Write engine AND logic tests (single predicate, multi-predicate, empty filter, no matches) `shared/components/src/filter-engine/__tests__/engine.test.ts`

**Checkpoint**: AND filtering works, empty filter returns all items

---

## Phase 4: User Story 2 — Filter with OR Logic (Priority: P2)

**Goal**: Support OR groups that are AND'd with top-level predicates

**Independent Test**: Provide engine with OR group of two vessel-class predicates + nationality, verify (vessel A OR vessel B) AND nationality result

### Implementation

- [x] T012 Extend engine.filter to handle orGroups (OR within AND evaluation) `shared/components/src/filter-engine/engine.ts`
- [x] T013 [test] Write engine OR logic tests (OR-only, mixed AND+OR, multi OR groups, single-predicate OR) `shared/components/src/filter-engine/__tests__/engine.test.ts`

**Checkpoint**: AND+OR filtering works, single-predicate OR groups behave as AND

---

## Phase 5: User Story 3 — All SRD Filter Types (Priority: P3)

**Goal**: Verify every metadata filter type works end-to-end with real mock fixtures

**Independent Test**: For each of 9 filter types, apply a predicate against mock data and verify correct matching

### Implementation

- [x] T014 Create test fixture helper to load mock items from #125 fixtures as StacBrowserItem[] `shared/components/src/filter-engine/__tests__/fixtures.ts`
- [x] T015 [test] Write integration tests against real #125 fixtures (all 9 filter types, hierarchical vessel-class, duration buckets, title search) `shared/components/src/filter-engine/__tests__/integration.test.ts`

**Checkpoint**: All 9 filter types verified against 100-item mock data set

---

## Phase 6: User Story 4 — CQL2 JSON Serialisation (Priority: P4)

**Goal**: Serialise FilterExpression to valid OGC CQL2 JSON

**Independent Test**: Construct AND+OR filter state, serialise to CQL2 JSON, verify structure conforms to spec

### Implementation

- [x] T016 Implement toCql2Json serialisation (AND, OR, mixed, empty, all operator mappings) `shared/components/src/filter-engine/cql2-json.ts`
- [x] T017 Wire toCql2Json into FilterEngine interface `shared/components/src/filter-engine/engine.ts`
- [x] T018 [test] Write CQL2 JSON serialisation tests (AND-only, OR-only, mixed, empty, array-contains, LIKE) `shared/components/src/filter-engine/__tests__/cql2-json.test.ts`

**Checkpoint**: CQL2 JSON output is spec-compliant for all filter combinations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, documentation, media, and PR creation

- [x] T019 Verify all tests pass and run full test suite `shared/components/`
- [x] T020 Update barrel export in filter-engine/index.ts with all public API `shared/components/src/filter-engine/index.ts`

### Evidence Collection (REQUIRED)

- [x] T021 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/126-cql2-filter-engine/evidence/test-summary.md`
- [x] T022 Create usage demonstration in `specs/126-cql2-filter-engine/evidence/usage-example.md`
- [x] T023 [P] Capture sample filter inputs and outputs in `specs/126-cql2-filter-engine/evidence/filter-output-samples.json`

### Media Content

- [ ] T024 Create shipped blog post in `specs/126-cql2-filter-engine/media/shipped-post.md`
- [ ] T025 [P] Create LinkedIn shipped summary in `specs/126-cql2-filter-engine/media/linkedin-shipped.md`

### PR Creation

- [ ] T026 Create PR and publish blog: run /speckit.pr

**Task T026 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — AND)**: Depends on Phase 2
- **Phase 4 (US2 — OR)**: Depends on Phase 3 (extends engine.ts)
- **Phase 5 (US3 — All Types)**: Depends on Phase 2 (integration testing, can start after Phase 2)
- **Phase 6 (US4 — CQL2 JSON)**: Depends on Phase 2 (independent of US1/US2 evaluation logic)
- **Phase 7 (Polish)**: Depends on all user stories complete

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel (types + taxonomy are independent files)
- **Phase 2**: T006/T007 (taxonomy) and T008/T009 (matchers) are parallel tracks
- **Phase 5 + Phase 6**: Can be developed in parallel (US3 tests fixtures, US4 serialises — independent)
- **Phase 7**: T023, T025 can run in parallel with other evidence tasks

---

## Implementation Strategy

### Incremental Delivery

1. Setup → types and structure ready
2. Foundation → matchers and taxonomy verified individually
3. US1 (AND) → basic filtering works
4. US2 (OR) → full expression evaluation
5. US3 (All Types) → integration-tested against real fixtures
6. US4 (CQL2 JSON) → serialisation complete
7. Polish → evidence captured, PR created

### Key Design Decisions (from research.md)

- Thin evaluator on own `FilterExpression` type, NOT on library AST (R2)
- Taxonomy tree as constructor parameter, pre-computed descendant maps (R5)
- CQL2 JSON built directly from FilterExpression, not via library AST (R6)
- Duration buckets are range checks, not categories (R4)

---

## Notes

- [P] tasks = different files, no dependencies
- Tests included in each phase — spec requires comprehensive verification
- Commit after each task or logical group
- The `cql2-filters-parser` library is used for CQL2 validation during testing, not for runtime evaluation
- Taxonomy JSON fixture uses `{ [id]: { label, children } }` format — adapter in taxonomy.ts converts to `VesselTaxonomyNode[]`
- Run `/speckit.pr` after all tasks complete to create PR with evidence
