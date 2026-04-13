# Tasks: Platform Registry — Unified Vessel Class + Platform Tree

**Input**: Design documents from `/specs/180-platform-registry/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/platform-registry-api.md

---

## Evidence Requirements

**Evidence Directory**: `specs/180-platform-registry/evidence/`
**Media Directory**: `specs/180-platform-registry/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts and coverage | After all tests pass |
| usage-example.md | Python + TypeScript code examples with output | After both loaders complete |
| validation-output.txt | Terminal output showing load-time error messages for malformed registries | After validation tests pass |

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

## Phase 1: Setup (Package Scaffolding)

**Purpose**: Create the `shared/data/` dual-language package structure

- [ ] T001 Create Python package scaffolding `shared/data/pyproject.toml`
- [ ] T002 [P] Create Python source directory with __init__.py `shared/data/src/debrief_data/__init__.py`
- [ ] T003 [P] Create TypeScript package config `shared/data/package.json`
- [ ] T004 [P] Create TypeScript compiler config `shared/data/tsconfig.json`
- [ ] T005 [P] Create Vitest config `shared/data/vitest.config.ts`
- [ ] T006 Register Python package in root uv workspace `pyproject.toml`
- [ ] T007 Create test directories `shared/data/tests/` and `shared/data/src/ts/__tests__/`
- [ ] T008 Verify workspace integration: `uv sync && pnpm install`

**Checkpoint**: Package scaffolding complete — both `debrief-data` (Python) and `@debrief/data` (TypeScript) are valid workspace members.

---

## Phase 2: Foundation (Registry Data + Shared Types)

**Purpose**: Create the registry JSON file, type definitions, and golden fixture that all stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Author the platform registry JSON file seeded with 10 known platforms `shared/data/platform-registry.json`
- [ ] T010 [P] Define ResolvedPlatform dataclass and PlatformRegistry class signature (Python) `shared/data/src/debrief_data/registry.py`
- [ ] T011 [P] Define ResolvedPlatform interface and PlatformRegistry class signature (TypeScript) `shared/data/src/ts/registry.ts`
- [ ] T012 [P] Create TypeScript barrel export `shared/data/src/ts/index.ts`
- [ ] T013 Create golden fixture with expected resolution for all 10 platforms `shared/data/tests/fixtures/expected-platforms.json`
- [ ] T014 Implement tree-walking parser that reads JSON, discriminates nodes vs platforms vs _class metadata, and builds platform index (Python) `shared/data/src/debrief_data/registry.py`
- [ ] T015 [P] Implement tree-walking parser with same logic (TypeScript) `shared/data/src/ts/registry.ts`
- [ ] T016 [P] Export load_registry, PlatformRegistry, ResolvedPlatform from Python __init__.py `shared/data/src/debrief_data/__init__.py`

**Checkpoint**: Foundation ready — registry JSON exists, both loaders can parse the tree and build an internal index. User story implementation can now begin.

---

## Phase 3: User Story 1 — Resolve Platform Identity (Priority: P1)

**Goal**: Look up a single platform by ID and return fully resolved metadata with position-derived fields

**Independent Test**: Call `resolve("NELSON")` and verify all 8 returned fields match golden fixture values

### Tests for User Story 1

- [ ] T017 [test] Write Python tests for resolve(): known ID, unknown ID, empty/null ID `shared/data/tests/test_registry.py`
- [ ] T018 [P][test] Write TypeScript tests for resolve(): same scenarios `shared/data/src/ts/__tests__/registry.test.ts`

### Implementation for User Story 1

- [ ] T019 Implement resolve() method on PlatformRegistry (Python) — index lookup returning ResolvedPlatform or None `shared/data/src/debrief_data/registry.py`
- [ ] T020 [P] Implement resolve() method on PlatformRegistry (TypeScript) — same semantics, returns ResolvedPlatform or undefined `shared/data/src/ts/registry.ts`
- [ ] T021 Run Python tests: `uv run pytest shared/data/tests/test_registry.py -k "resolve" -v`
- [ ] T022 [P] Run TypeScript tests: `pnpm --filter @debrief/data test -- --grep "resolve"`

**Checkpoint**: `resolve()` works in both languages. Any platform ID can be looked up to get full metadata.

---

## Phase 4: User Story 2 — Enumerate All Platforms + Cross-Language Parity (Priority: P2)

**Goal**: List all registered platforms with resolved metadata; verify Python and TypeScript produce identical results

**Independent Test**: Call `listPlatforms()` and verify 10 entries returned, sorted by ID, with all fields matching the golden fixture

### Tests for User Story 2

- [ ] T023 [test] Write Python tests for list_platforms(): count, sort order, all fields match golden fixture `shared/data/tests/test_registry.py`
- [ ] T024 [P][test] Write TypeScript tests for listPlatforms(): same assertions against same golden fixture `shared/data/src/ts/__tests__/registry.test.ts`
- [ ] T025 [P][test] Write cross-language parity test (Python): load golden fixture, resolve each platform, assert field-by-field equality `shared/data/tests/test_registry.py`
- [ ] T026 [P][test] Write cross-language parity test (TypeScript): same fixture, same assertions `shared/data/src/ts/__tests__/registry.test.ts`

### Implementation for User Story 2

- [ ] T027 Implement list_platforms() on PlatformRegistry (Python) — return sorted list of all ResolvedPlatform `shared/data/src/debrief_data/registry.py`
- [ ] T028 [P] Implement listPlatforms() on PlatformRegistry (TypeScript) — same semantics `shared/data/src/ts/registry.ts`
- [ ] T029 Run all Python tests: `uv run pytest shared/data/tests/ -v`
- [ ] T030 [P] Run all TypeScript tests: `pnpm --filter @debrief/data test`

**Checkpoint**: Enumeration works; cross-language parity confirmed via golden fixture for all 10 platforms.

---

## Phase 5: User Story 3 — Navigate Vessel Class Taxonomy Tree (Priority: P3)

**Goal**: Traverse the vessel class hierarchy to find platforms by class path, and validate class paths

**Independent Test**: Call `findByClass("surface/warship/frigate")` and verify all frigate platforms returned; call `findByClass("surface")` and verify only surface platforms; call `isValidClass("fremm")` on a class with no platforms

### Tests for User Story 3

- [ ] T031 [test] Write Python tests for find_by_class(): by domain, by role, by type; empty class node; invalid path `shared/data/tests/test_registry.py`
- [ ] T032 [P][test] Write TypeScript tests for findByClass(): same scenarios `shared/data/src/ts/__tests__/registry.test.ts`
- [ ] T033 [P][test] Write Python tests for is_valid_class(): valid path, invalid path, empty string `shared/data/tests/test_registry.py`
- [ ] T034 [P][test] Write TypeScript tests for isValidClass(): same scenarios `shared/data/src/ts/__tests__/registry.test.ts`

### Implementation for User Story 3

- [ ] T035 Implement find_by_class() on PlatformRegistry (Python) — walk subtree, collect platforms, sort by ID `shared/data/src/debrief_data/registry.py`
- [ ] T036 [P] Implement findByClass() on PlatformRegistry (TypeScript) — same semantics `shared/data/src/ts/registry.ts`
- [ ] T037 [P] Implement is_valid_class() on PlatformRegistry (Python) `shared/data/src/debrief_data/registry.py`
- [ ] T038 [P] Implement isValidClass() on PlatformRegistry (TypeScript) `shared/data/src/ts/registry.ts`
- [ ] T039 Run all Python tests: `uv run pytest shared/data/tests/ -v`
- [ ] T040 [P] Run all TypeScript tests: `pnpm --filter @debrief/data test`

**Checkpoint**: All 4 API operations work in both languages. Tree traversal and class validation are complete.

---

## Phase 6: Load-Time Validation (Cross-Cutting)

**Purpose**: Harden the loaders with validation error reporting per FR-010

### Tests

- [ ] T041 [test] Write Python validation tests: missing file, invalid JSON, missing vessel_classes root, duplicate platform ID, missing name, missing nationality `shared/data/tests/test_registry.py`
- [ ] T042 [P][test] Write TypeScript validation tests: same error scenarios `shared/data/src/ts/__tests__/registry.test.ts`

### Implementation

- [ ] T043 Add load-time validation to Python loader: check root key, detect duplicates, validate required fields per contract error table `shared/data/src/debrief_data/registry.py`
- [ ] T044 [P] Add load-time validation to TypeScript loader: same checks, same error messages `shared/data/src/ts/registry.ts`
- [ ] T045 Run full test suite both languages: `uv run pytest shared/data/tests/ -v && pnpm --filter @debrief/data test`

**Checkpoint**: All validation error conditions produce clear, actionable error messages in both languages.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, media content, and PR

### Verification

- [ ] T046 Run full CI check: `task verify` (or fallback: ruff + eslint + pyright + tsc + pytest + vitest)
- [ ] T047 Validate quickstart.md examples work end-to-end

### Evidence Collection

- [ ] T048 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/180-platform-registry/evidence/test-summary.md`
- [ ] T049 Create usage demonstration with Python and TypeScript examples and output `specs/180-platform-registry/evidence/usage-example.md`
- [ ] T050 [P] Capture validation error output showing load-time error messages for malformed registries `specs/180-platform-registry/evidence/validation-output.txt`

### Media Content

- [ ] T051 Create shipped blog post `specs/180-platform-registry/media/shipped-post.md`
- [ ] T052 [P] Create LinkedIn shipped summary `specs/180-platform-registry/media/linkedin-shipped.md`

### PR Creation

- [ ] T053 Create PR and publish blog: run /speckit.pr

**Task T053 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1: Resolve (Phase 3)**: Depends on Foundation
- **US2: Enumerate + Parity (Phase 4)**: Depends on Foundation (can run parallel to US1 if staffed)
- **US3: Tree Traversal (Phase 5)**: Depends on Foundation (can run parallel to US1/US2 if staffed)
- **Validation (Phase 6)**: Depends on Foundation parser being complete (can run after Phase 2, parallel to stories)
- **Polish (Phase 7)**: Depends on all previous phases being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundation — no cross-story dependencies
- **US2 + US4 (P2)**: Depends only on Foundation — parity tests verify resolve() and listPlatforms() together
- **US3 (P3)**: Depends only on Foundation — no cross-story dependencies

### Within Each User Story

- Tests written FIRST, verified to FAIL before implementation
- Implementation in Python + TypeScript in parallel where possible
- Tests run and pass after implementation

### Parallel Opportunities

- T002–T005 (Setup scaffolding files) can all run in parallel
- T010–T012 (type definitions) can all run in parallel
- T014–T015 (tree parser in both languages) can run in parallel
- T017–T018 (US1 tests) can run in parallel
- T019–T020 (US1 implementation) can run in parallel
- T023–T026 (US2 tests) can run in parallel
- T027–T028 (US2 implementation) can run in parallel
- T031–T034 (US3 tests) can run in parallel
- T035–T038 (US3 implementation) can run in parallel
- T041–T042 (validation tests) can run in parallel
- T043–T044 (validation implementation) can run in parallel
- Phases 3–6 can run in parallel if staffed by different developers

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
Task T017: "Python resolve() tests"
Task T018: "TypeScript resolve() tests"

# Then implementation (parallel):
Task T019: "Python resolve() implementation"
Task T020: "TypeScript resolve() implementation"

# Then verify (parallel):
Task T021: "Run Python resolve tests"
Task T022: "Run TypeScript resolve tests"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Package exists, registry parsed, index built
2. Add US1 (resolve) → Single platform lookup works in both languages
3. Add US2 (enumerate + parity) → All platforms listable, cross-language drift impossible
4. Add US3 (tree traversal) → Full taxonomy navigation works
5. Add Validation → Malformed registries produce clear errors
6. Polish → Evidence captured, blog post written, PR created

### Single Developer Flow

For one developer, work sequentially through phases. Within each phase, implement Python first then TypeScript (or vice versa) to establish the pattern, then implement the other language by mirroring.

---

## Notes

- [P] tasks = different files, no dependencies between them
- [test] tasks = test files, written before implementation
- All Python tests in `shared/data/tests/test_registry.py`
- All TypeScript tests in `shared/data/src/ts/__tests__/registry.test.ts`
- Golden fixture at `shared/data/tests/fixtures/expected-platforms.json` is the single parity truth
- Both loaders read the same `shared/data/platform-registry.json` — no format conversion needed
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
