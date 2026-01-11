# Tasks: debrief-config

**Input**: Design documents from `/specs/003-debrief-config/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included as Constitution Article VI.2 requires tests for all service code.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/003-debrief-config/evidence/`
**Media Directory**: `specs/003-debrief-config/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts | After all tests pass |
| usage-example.md | Python + TypeScript code examples with output | After core features work |
| cross-language-demo.txt | Terminal session: Python write → TypeScript read | After US5 complete |
| config-sample.json | Example config.json showing full structure | After registration works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created (Phase 0) |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created (Phase 0) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Python + TypeScript Projects)

**Purpose**: Project scaffolding for both language implementations

### Python Service Setup

- [x] T001 Create Python service directory structure `services/config/`
- [x] T002 Create pyproject.toml with dependencies `services/config/pyproject.toml`
- [x] T003 [P] Create package __init__.py `services/config/src/debrief_config/__init__.py`
- [x] T004 [P] Create README.md `services/config/README.md`

### TypeScript Package Setup

- [x] T005 [P] Create TypeScript package directory structure `shared/config-ts/`
- [x] T006 [P] Create package.json with dependencies `shared/config-ts/package.json`
- [x] T007 [P] Create tsconfig.json `shared/config-ts/tsconfig.json`
- [x] T008 [P] Create vitest.config.ts `shared/config-ts/vitest.config.ts`

**Checkpoint**: Both project scaffolds exist, dependencies installable

---

## Phase 2: Foundational (Core Infrastructure)

**Purpose**: Shared infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Python Core Models

- [x] T009 Create exceptions module `services/config/src/debrief_config/exceptions.py`
- [x] T010 [P] Create Pydantic models (Config, StoreRegistration) `services/config/src/debrief_config/models.py`

### TypeScript Core Types

- [x] T011 [P] Create TypeScript types `shared/config-ts/src/types.ts`
- [x] T012 [P] Create Zod schemas `shared/config-ts/src/schemas.ts`
- [x] T013 [P] Create exception classes `shared/config-ts/src/errors.ts`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 4 - Cross-Platform Config Location (Priority: P1) 🎯 MVP

**Goal**: Config file stored in platform-appropriate XDG location on all platforms

**Independent Test**: Run on Linux, verify config at `~/.config/debrief/config.json`

### Tests for US4

- [x] T014 [test] Write Python path resolution tests `services/config/tests/test_paths.py`
- [x] T015 [P][test] Write TypeScript path resolution tests `shared/config-ts/tests/paths.test.ts`

### Implementation for US4

- [x] T016 [US4] Implement Python paths module with platformdirs `services/config/src/debrief_config/paths.py`
- [x] T017 [US4] Implement TypeScript paths module with custom platform logic `shared/config-ts/src/paths.ts`
- [x] T018 [US4] Add XDG_CONFIG_HOME override support (Python) `services/config/src/debrief_config/paths.py`
- [x] T019 [P][US4] Add XDG_CONFIG_HOME override support (TypeScript) `shared/config-ts/src/paths.ts`

**Checkpoint**: Config paths resolve correctly on all platforms

---

## Phase 4: User Story 1 + 2 - Register and List Stores (Priority: P1)

**Goal**: Register STAC stores and list them from both languages

**Independent Test**: Call `register_store()` from Python, verify store in `list_stores()` response

### Tests for US1/US2

- [x] T020 [test] Write Python store registration tests `services/config/tests/test_core.py`
- [x] T021 [P][test] Write Python STAC validation tests `services/config/tests/test_validation.py`

### Implementation for US1/US2

- [x] T022 [US1] Implement STAC catalog validation `services/config/src/debrief_config/validation.py`
- [x] T023 [US1] Implement config file read/write with atomic writes `services/config/src/debrief_config/storage.py`
- [x] T024 [US1] Implement register_store() function `services/config/src/debrief_config/core.py`
- [x] T025 [US2] Implement list_stores() function `services/config/src/debrief_config/core.py`
- [x] T026 [US1/US2] Export public API from __init__.py `services/config/src/debrief_config/__init__.py`
- [x] T027 [test] Write integration tests for store workflow `services/config/tests/test_integration.py`

**Checkpoint**: Python store registration and listing works end-to-end

---

## Phase 5: User Story 5 - TypeScript Config Access (Priority: P1)

**Goal**: TypeScript library provides identical API, reads/writes same config file

**Independent Test**: Register store from Python, read from TypeScript, verify data matches

### Tests for US5

- [x] T028 [test] Write TypeScript config read tests `shared/config-ts/tests/config.test.ts`
- [x] T029 [P][test] Write TypeScript store registration tests `shared/config-ts/tests/stores.test.ts`

### Implementation for US5

- [x] T030 [US5] Implement config file read with file locking `shared/config-ts/src/storage.ts`
- [x] T031 [US5] Implement listStores() function `shared/config-ts/src/config.ts`
- [x] T032 [US5] Implement registerStore() function `shared/config-ts/src/config.ts`
- [x] T033 [US5] Implement STAC validation `shared/config-ts/src/validation.ts`
- [x] T034 [US5] Export public API from index.ts `shared/config-ts/src/index.ts`
- [x] T035 [test] Write cross-language integration tests `shared/config-ts/tests/integration.test.ts`

**Checkpoint**: TypeScript can read/write config, interoperates with Python

---

## Phase 6: User Story 3 - Remove Store Registration (Priority: P2)

**Goal**: Remove store registrations without deleting underlying catalogs

**Independent Test**: Register store, remove it, verify no longer in list

### Tests for US3

- [x] T036 [test] Write Python remove_store tests `services/config/tests/test_core.py`
- [x] T037 [P][test] Write TypeScript removeStore tests `shared/config-ts/tests/stores.test.ts`

### Implementation for US3

- [x] T038 [US3] Implement remove_store() in Python `services/config/src/debrief_config/core.py`
- [x] T039 [US3] Implement removeStore() in TypeScript `shared/config-ts/src/config.ts`
- [x] T040 [US3] Update public API exports (Python) `services/config/src/debrief_config/__init__.py`
- [x] T041 [P][US3] Update public API exports (TypeScript) `shared/config-ts/src/index.ts`

**Checkpoint**: Store removal works from both languages

---

## Phase 7: User Story 6 - User Preferences (Priority: P3)

**Goal**: Store user preferences as key-value pairs

**Independent Test**: Set preference, restart app, verify preference persisted

### Tests for US6

- [x] T042 [test] Write Python preferences tests `services/config/tests/test_preferences.py`
- [x] T043 [P][test] Write TypeScript preferences tests `shared/config-ts/tests/preferences.test.ts`

### Implementation for US6

- [x] T044 [US6] Implement get_preference() in Python `services/config/src/debrief_config/core.py`
- [x] T045 [US6] Implement set_preference() in Python `services/config/src/debrief_config/core.py`
- [x] T046 [US6] Implement getPreference() in TypeScript `shared/config-ts/src/config.ts`
- [x] T047 [US6] Implement setPreference() in TypeScript `shared/config-ts/src/config.ts`
- [x] T048 [US6] Update public API exports (Python) `services/config/src/debrief_config/__init__.py`
- [x] T049 [P][US6] Update public API exports (TypeScript) `shared/config-ts/src/index.ts`

**Checkpoint**: Preferences work from both languages

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence, media, and PR creation

### Documentation

- [x] T050 Update Python README with usage examples `services/config/README.md`
- [x] T051 [P] Create TypeScript README `shared/config-ts/README.md`
- [x] T052 [P] Run and verify quickstart.md examples `specs/003-debrief-config/quickstart.md`

### Evidence Collection (REQUIRED)

- [x] T053 Create evidence directory `specs/003-debrief-config/evidence/`
- [x] T054 Capture pytest results in `specs/003-debrief-config/evidence/test-summary.md`
- [x] T055 [P] Capture vitest results in `specs/003-debrief-config/evidence/test-summary.md`
- [x] T056 Create usage demonstration `specs/003-debrief-config/evidence/usage-example.md`
- [x] T057 [P] Capture cross-language demo `specs/003-debrief-config/evidence/cross-language-demo.txt`
- [x] T058 [P] Capture sample config.json `specs/003-debrief-config/evidence/config-sample.json`

### Media Content (REQUIRED)

- [x] T059 Create shipped blog post `specs/003-debrief-config/media/shipped-post.md`
- [x] T060 [P] Create LinkedIn shipped summary `specs/003-debrief-config/media/linkedin-shipped.md`

### PR Creation (REQUIRED - MUST BE FINAL)

- [x] T061 Create PR and publish blog: run /speckit.pr

**Task T061 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US4 - Paths)**: Depends on Phase 2 - BLOCKS US1, US2, US5
- **Phase 4 (US1+US2)**: Depends on Phase 3
- **Phase 5 (US5)**: Depends on Phase 4 (needs Python implementation to test interop)
- **Phase 6 (US3)**: Depends on Phase 5 (needs both languages working)
- **Phase 7 (US6)**: Depends on Phase 5 (can run parallel with Phase 6)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US4 - Paths | Phase 2 | Foundation complete |
| US1 - Register Store | US4 | Paths working |
| US2 - List Stores | US4 | Paths working |
| US5 - TypeScript Access | US1, US2 | Python implementation complete |
| US3 - Remove Store | US1, US2 | Store registration working |
| US6 - Preferences | US4 | Paths working (independent of stores) |

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 → T002 → [T003, T004] in parallel
[T005, T006, T007, T008] can run in parallel with Python setup
```

**Phase 2 (Foundational)**:
```
T009 → T010 (Python models depend on exceptions)
[T011, T012, T013] all parallel (TypeScript independent)
```

**Phase 4 (US1+US2)**:
```
T020, T021 parallel (different test files)
T022 → T023 → T024 → T025 sequential (core workflow)
```

**Phase 5 (US5)**:
```
T028, T029 parallel (different test files)
T030 → T031 → T032 sequential (build on storage)
T033 can run parallel with T031/T032
```

---

## Implementation Strategy

### MVP First (Phases 1-4)

1. Complete Phase 1: Setup both projects
2. Complete Phase 2: Foundational models and types
3. Complete Phase 3: Cross-platform paths (US4)
4. Complete Phase 4: Store registration (US1+US2) in Python
5. **STOP and VALIDATE**: Test Python end-to-end
6. Can demo: "Register store, list stores, persisted config"

### Full Implementation (Phases 5-7)

7. Complete Phase 5: TypeScript full implementation (US5)
8. **STOP and VALIDATE**: Test cross-language interop
9. Complete Phase 6: Remove store (US3)
10. Complete Phase 7: Preferences (US6)
11. **STOP and VALIDATE**: All user stories complete

### Evidence & Ship (Phase 8)

12. Complete Phase 8: Evidence collection, media, PR creation
13. Run /speckit.pr to create PR and publish blog

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [test] tasks = test files, write FIRST and ensure they FAIL
- [USn] label maps task to specific user story
- Both Python and TypeScript must pass tests before story is complete
- Cross-language tests (T035) are critical for verifying interop
- Evidence is required - PR will include artifacts from evidence/
- Run `/speckit.pr` after all tasks complete to create PR with evidence
