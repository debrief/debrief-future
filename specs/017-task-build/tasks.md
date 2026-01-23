# Tasks: Task Build Management

**Input**: Design documents from `/specs/017-task-build/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

---

## Evidence Requirements

**Evidence Directory**: `specs/017-task-build/evidence/`
**Media Directory**: `specs/017-task-build/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Summary of task commands working (all tests pass) | After all tasks verified |
| usage-example.md | Terminal session showing task commands | After all tasks work |
| cli-demo.txt | Output of `task --list` and key commands | After Taskfile complete |
| cache-demo.txt | Before/after timing showing cache effectiveness | After caching verified |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | ✅ Created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | ✅ Created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create the Taskfile.yml skeleton and remove old Makefile

- [ ] T001 Create Taskfile.yml with version and vars section `Taskfile.yml`
- [ ] T002 [P] Add preconditions for uv and pnpm checks `Taskfile.yml`
- [ ] T003 Remove old Makefile (replaced by Taskfile.yml) `Makefile`

---

## Phase 2: Foundational - Install Task

**Purpose**: Implement the `install` task that all other tasks depend on (User Story 5)

**Goal**: Single command installs all Python and Node dependencies with caching

**Independent Test**: Run `task install` on fresh checkout, verify both uv and pnpm succeed

- [ ] T004 Implement `install` task with uv sync and pnpm install `Taskfile.yml`
- [ ] T005 Add source-based caching for lockfiles (uv.lock, pnpm-lock.yaml) `Taskfile.yml`
- [ ] T006 Verify install skips when lockfiles unchanged

**Checkpoint**: `task install` works with caching - foundation ready for dependent tasks

---

## Phase 3: User Story 1 - Run All Tests (Priority: P1) 🎯 MVP

**Goal**: Single command runs all Python and TypeScript tests

**Independent Test**: Run `task test` and verify pytest + pnpm test both execute

### Implementation for User Story 1

- [ ] T007 Implement `test` task with deps on install `Taskfile.yml`
- [ ] T008 Add pytest execution for Python tests `Taskfile.yml`
- [ ] T009 Add pnpm test execution for TypeScript tests `Taskfile.yml`
- [ ] T010 Verify non-zero exit on test failure
- [ ] T011 Verify install runs automatically on fresh checkout

**Checkpoint**: `task test` runs all tests with auto-install - MVP complete

---

## Phase 4: User Story 2 - Build All Artifacts (Priority: P2)

**Goal**: Single command builds all TypeScript and prepares Python packages

**Independent Test**: Run `task build` and verify artifacts created

### Implementation for User Story 2

- [ ] T012 Implement `build` task with deps on install `Taskfile.yml`
- [ ] T013 Add pnpm build for TypeScript compilation `Taskfile.yml`
- [ ] T014 Add source-based caching for build artifacts `Taskfile.yml`
- [ ] T015 Verify cached build completes in < 5 seconds

**Checkpoint**: `task build` works with caching

---

## Phase 5: User Story 3 - Development Watch Mode (Priority: P2)

**Goal**: Watch mode for automatic rebuilding during development

**Independent Test**: Run `task dev`, modify a file, verify recompilation

### Implementation for User Story 3

- [ ] T016 Implement `dev` task with deps on install `Taskfile.yml`
- [ ] T017 Add interactive: true for proper Ctrl+C handling `Taskfile.yml`
- [ ] T018 Verify watch mode starts and responds to file changes

**Checkpoint**: `task dev` starts watch mode with auto-install

---

## Phase 6: User Story 4 - Lint and Auto-Fix (Priority: P3)

**Goal**: Check and auto-fix code style across Python and TypeScript

**Independent Test**: Introduce a style violation, run `task lint`, then `task lint:fix`

### Implementation for User Story 4

- [ ] T019 Implement `lint` task with deps on install `Taskfile.yml`
- [ ] T020 Add ruff check and format for Python `Taskfile.yml`
- [ ] T021 Add pnpm lint for TypeScript `Taskfile.yml`
- [ ] T022 Implement `lint:fix` task with auto-fix commands `Taskfile.yml`
- [ ] T023 Verify lint reports violations with file locations

**Checkpoint**: `task lint` and `task lint:fix` work

---

## Phase 7: User Story 6 - Clean and Help (Priority: P3)

**Goal**: Utility tasks for cleaning artifacts and showing help

**Independent Test**: Run `task clean` and verify artifacts removed, `task --list` shows all tasks

### Implementation for User Story 6

- [ ] T024 Implement `clean` task to remove build artifacts `Taskfile.yml`
- [ ] T025 Add desc field to all tasks for help output `Taskfile.yml`
- [ ] T026 Verify `task --list` shows all tasks with descriptions

**Checkpoint**: All utility tasks complete

---

## Phase 8: CI Integration

**Purpose**: Update GitHub Actions to use Task commands

- [ ] T027 Update CI workflow to install Task `arduino/setup-task@v2` `.github/workflows/ci.yml`
- [ ] T028 Replace direct uv/pnpm calls with task commands `.github/workflows/ci.yml`
- [ ] T029 Verify CI passes with task commands

**Checkpoint**: CI uses identical commands to local development

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence collection, and PR creation

### Documentation

- [ ] T030 Update README.md with new task commands `README.md`
- [ ] T031 [P] Copy quickstart.md content to appropriate location `docs/`

### Evidence Collection

- [ ] T032 Create evidence directory `specs/017-task-build/evidence/`
- [ ] T033 Capture task list output in `specs/017-task-build/evidence/cli-demo.txt`
- [ ] T034 [P] Capture cache timing demonstration in `specs/017-task-build/evidence/cache-demo.txt`
- [ ] T035 Create usage example in `specs/017-task-build/evidence/usage-example.md`
- [ ] T036 Create test summary in `specs/017-task-build/evidence/test-summary.md`

### Media Content

- [ ] T037 Create shipped blog post in `specs/017-task-build/media/shipped-post.md`
- [ ] T038 [P] Create LinkedIn shipped summary in `specs/017-task-build/media/linkedin-shipped.md`

### PR Creation

- [ ] T039 Create PR and publish blog: run /speckit.pr

**Task T039 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1
- **Phases 3-7 (User Stories)**: All depend on Phase 2 (install task must exist)
- **Phase 8 (CI)**: Depends on Phases 3-7 (all tasks must exist)
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

All user stories depend on the `install` task from Phase 2, but are otherwise independent:

- **User Story 1 (test)**: Can start after Phase 2
- **User Story 2 (build)**: Can start after Phase 2
- **User Story 3 (dev)**: Can start after Phase 2
- **User Story 4 (lint)**: Can start after Phase 2

### Parallel Opportunities

Since all task implementations go into the same `Taskfile.yml`, parallelization is limited. However:

- T002 and T003 can run in parallel (different files)
- Evidence collection tasks (T033, T034) can run in parallel
- Media tasks (T037, T038) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational install task (T004-T006)
3. Complete Phase 3: test task (T007-T011)
4. **STOP and VALIDATE**: Verify `task test` works
5. This delivers the most valuable task immediately

### Incremental Delivery

1. Setup + Foundational → `task install` works
2. Add test task → `task test` works (MVP!)
3. Add build task → `task build` works
4. Add dev task → `task dev` works
5. Add lint tasks → `task lint` and `task lint:fix` work
6. Add utility tasks → `task clean` works
7. Update CI → Same commands everywhere
8. Polish → Documentation and evidence complete

---

## Notes

- All tasks modify `Taskfile.yml` - sequential execution required for most tasks
- [P] tasks affect different files and can run in parallel
- Verify each user story independently before proceeding
- Evidence is required - capture artifacts proving each command works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
