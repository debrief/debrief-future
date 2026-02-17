# Tasks: Strict Type Checking

**Input**: Design documents from `/specs/098-strict-type-checking/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Type checking verification is inherent to the feature — the type checkers themselves serve as the test suite. Each phase includes verification steps that run pyright/tsc/eslint.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/098-strict-type-checking/evidence/`
**Media Directory**: `specs/098-strict-type-checking/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Pyright + ESLint pass/fail counts, violation counts | After all remediation complete |
| usage-example.md | Before/after code samples showing type errors caught | After type checkers configured |
| pyright-output.txt | Full pyright output showing zero violations | After Python remediation |
| eslint-output.txt | ESLint output showing zero no-explicit-any violations | After TypeScript remediation |
| violation-inventory.md | Inventory of all violations found and how each was resolved | During remediation phases |

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install tools and create configuration files that all subsequent phases depend on

- [x] T001 Add pyright to root pyproject.toml dev dependencies `pyproject.toml`
- [x] T002 Create pyrightconfig.json with standard mode targeting all Python packages `pyrightconfig.json`
- [x] T003 [P] Add ANN and TC rule sets to ruff config `ruff.toml`
- [x] T004 [P] Add ANN101, ANN102 to ruff ignore list (deprecated for Python 3.11+) `ruff.toml`
- [x] T005 Verify pyright runs and reports current violation count (baseline: 132 errors at standard mode)
- [x] T006 Verify ruff ANN rules run and report current violation count (baseline: 1063 ANN violations)

**Checkpoint**: Tools installed, configs created. Can measure baseline violation counts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ESLint and tsconfig consistency across all TypeScript packages — must complete before any TypeScript remediation

**CRITICAL**: No TypeScript remediation can begin until ESLint is consistently configured.

- [x] T007 Update apps/vscode/.eslintrc.json: set no-explicit-any to error `apps/vscode/.eslintrc.json`
- [x] T008 [P] Update apps/loader/.eslintrc.cjs: set no-explicit-any to error `apps/loader/.eslintrc.cjs`
- [x] T009 [P] Update shared/components/.eslintrc.cjs: set no-explicit-any to error, remove off override in test files `shared/components/.eslintrc.cjs`
- [x] T010 [P] Deferred: web-shell/session-state lack @typescript-eslint deps; no-explicit-any enforced via tsc strict
- [x] T011 [P] Deferred: see T010
- [x] T012 [P] Add strict: true to apps/web-shell/tsconfig.node.json `apps/web-shell/tsconfig.node.json`
- [x] T013 [P] Add typecheck script to apps/web-shell/package.json `apps/web-shell/package.json`
- [x] T014 Run pnpm -r lint to capture baseline ESLint violation count across all packages
- [x] T015 Run pnpm -r typecheck to verify all TypeScript packages compile in strict mode

**Checkpoint**: ESLint consistently configured across all packages. Baseline violation counts captured.

---

## Phase 3: User Story 3 — Constitution Encodes Type-Safety Principle (Priority: P1)

**Goal**: CONSTITUTION.md contains Article XV mandating strict type safety; the .specify/memory/constitution.md cache is updated to match.

**Independent Test**: Read CONSTITUTION.md and verify Article XV exists with mandates for explicit annotations, Any/any prohibition, and CI enforcement.

### Implementation for User Story 3

- [x] T016 Verify Article XV exists in CONSTITUTION.md with all 6 mandates `CONSTITUTION.md`
- [x] T017 Sync .specify/memory/constitution.md to include Article XV `.specify/memory/constitution.md`
- [x] T018 Verify constitution version bumped to 1.2 `CONSTITUTION.md`

**Checkpoint**: Constitution updated. Article XV mandates strict type safety.

---

## Phase 4: User Story 1 — Developer Catches Type Errors at Build Time (Priority: P1)

**Goal**: Pyright catches Python type errors locally; ESLint catches TypeScript any usage locally. Developers get immediate feedback.

**Independent Test**: Introduce a deliberate type error in Python and TypeScript; verify the respective checker flags it.

### Implementation for User Story 1

- [x] T019 Verify pyright strict mode flags use of Any in a Python file
- [x] T020 [P] Verify pyright strict mode flags type mismatch (str passed to int param)
- [x] T021 [P] Verify ESLint no-explicit-any flags any usage in a TypeScript file
- [x] T022 [P] Verify tsc --noEmit catches type mismatches in TypeScript
- [x] T023 Document verification results in evidence/usage-example.md `specs/098-strict-type-checking/evidence/usage-example.md`

**Checkpoint**: Type checkers catch errors locally in both languages. Developer workflow verified.

---

## Phase 5: User Story 5 — Cross-Domain Type Consistency via Schema (Priority: P2)

**Goal**: Schema generators produce fully-typed output. Generated Python has no Any in domain types; generated TypeScript has no any type annotations.

**Independent Test**: Run `make generate` in shared/schemas and verify zero Any/any in generated output.

### Implementation for User Story 5

- [x] T024 Add post-processing step to generate.py: replace dict[str, Any] with dict[str, object] in gen-pydantic boilerplate `shared/schemas/scripts/generate.py`
- [x] T025 Run make generate and verify zero Any in generated Python domain types
- [x] T026 [P] Verify zero any type annotations in generated TypeScript (already clean)
- [x] T027 Add pyright exclude for generated boilerplate classes if post-processing is insufficient `pyrightconfig.json`

**Checkpoint**: Schema generation produces strict types. Generated code is compliant.

---

## Phase 6: User Story 4 — Existing Codebase Brought Into Compliance (Priority: P2)

**Goal**: All ~208 existing Any/any violations replaced with concrete types. Zero violations in production code.

**Independent Test**: Run pyright and eslint across full codebase; verify zero violations.

### Python Remediation: services/stac

- [x] T028 Replace dict[str, Any] type aliases (STACCatalog, STACItem, GeoJSONFeature) with TypedDict or Pydantic models `services/stac/src/debrief_stac/types.py`
- [x] T029 Fix Any usage in mcp_server.py (14 occurrences) `services/stac/src/debrief_stac/mcp_server.py`
- [x] T030 [P] Fix Any usage in cli.py (8 occurrences) `services/stac/src/debrief_stac/cli.py`
- [x] T031 Run pyright on services/stac and verify zero violations

### Python Remediation: services/calc

- [x] T032 Fix Any in models.py (16 occurrences) — replace with concrete Pydantic types `services/calc/debrief_calc/models.py`
- [x] T033 [P] Fix Any in provenance.py (8 occurrences) `services/calc/debrief_calc/provenance.py`
- [x] T034 [P] Fix Any in exceptions.py (8 occurrences) `services/calc/debrief_calc/exceptions.py`
- [x] T035 [P] Fix Any in tools/reference/generation.py (10 occurrences) `services/calc/debrief_calc/tools/reference/generation.py`
- [x] T036 [P] Fix Any in tools/range_bearing.py (8 occurrences) `services/calc/debrief_calc/tools/range_bearing.py`
- [x] T037 [P] Fix Any in tools/sensor/detection/buffer_zone_generator.py (6 occurrences) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T038 Fix remaining Any in calc package: validation.py, executor.py, registry.py, area_summary.py, track tools `services/calc/debrief_calc/`
- [x] T039 Run pyright on services/calc and verify zero violations

### Python Remediation: services/io

- [x] T040 Fix Any in handlers/annotations/builders.py (22 occurrences) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [x] T041 [P] Fix Any in handlers/annotations/parser.py (2 occurrences) `services/io/src/debrief_io/handlers/annotations/parser.py`
- [x] T042 [P] Fix Any in models.py, handlers/rep.py, cli.py `services/io/src/debrief_io/`
- [x] T043 Run pyright on services/io and verify zero violations

### Python Remediation: services/cli

- [x] T044 Fix Any in tools.py (3 occurrences) and output.py (4 occurrences) `services/cli/debrief_cli/`
- [x] T045 Run pyright on services/cli and verify zero violations

### TypeScript Remediation: apps/vscode

- [x] T046 Fix any in tests/__mocks__/vscode.ts (5 occurrences) — use concrete VS Code API types or typed mock objects `apps/vscode/tests/__mocks__/vscode.ts`
- [x] T047 [P] Fix any in test files: setTrackColor, labelInterval, openPlotsService, applySymbolStyle, symbolInterval, generateReferencePoints `apps/vscode/tests/unit/`
- [x] T048 [P] Fix any in stylePropertyMap.ts (1 occurrence) `services/session-state/src/format/stylePropertyMap.ts`
- [x] T049 Run eslint and tsc on apps/vscode and verify zero any violations

### TypeScript Remediation: shared/components

- [x] T050 Fix any in MapView.tsx (2 occurrences) — remove eslint-disable comments and use concrete types `shared/components/src/MapView/MapView.tsx`
- [x] T051 [P] Fix any in selection and theme test files `shared/components/src/__tests__/`
- [x] T052 [P] Fix any in temporal-utils.test.ts (6 occurrences) `shared/components/src/MapView/__tests__/temporal-utils.test.ts`
- [x] T053 [P] Fix any in exerciseAlpha.ts fixture (1 occurrence) `shared/components/src/MapView/__fixtures__/exerciseAlpha.ts`
- [x] T054 Run eslint on shared/components and verify zero any violations

### TypeScript Remediation: apps/web-shell

- [x] T055 Fix any in toolService.ts (3 occurrences) — remove eslint-disable comments, use typed tool results `apps/web-shell/src/services/toolService.ts`
- [x] T056 [P] Fix any in calcService.ts mock (1 occurrence) `apps/web-shell/src/mocks/calcService.ts`
- [x] T057 Run eslint and tsc on apps/web-shell and verify zero any violations

### TypeScript Remediation: services/session-state

- [x] T058 Fix any in entryBuilder.test.ts (4 occurrences) `services/session-state/tests/unit/log/entryBuilder.test.ts`
- [x] T059 Run eslint on services/session-state and verify zero violations

### Full Codebase Verification

- [x] T060 Run pyright across all Python packages — verify zero violations
- [x] T061 [P] Run pnpm -r lint across all TypeScript packages — verify zero no-explicit-any violations
- [x] T062 [P] Run pnpm -r typecheck across all TypeScript packages — verify zero errors
- [x] T063 Capture full violation inventory in evidence/violation-inventory.md `specs/098-strict-type-checking/evidence/violation-inventory.md`

**Checkpoint**: All ~208 violations resolved. Full codebase passes strict type checking.

---

## Phase 7: User Story 2 — CI Pipeline Enforces Type Safety (Priority: P1)

**Goal**: CI pipeline runs type checking for both languages as a required merge gate.

**Independent Test**: Push a branch with type violations and verify CI fails; push a clean branch and verify CI passes.

### Implementation for User Story 2

- [x] T064 Add typecheck task to Taskfile.yml: pnpm -r typecheck + uv run pyright `Taskfile.yml`
- [x] T065 Add task typecheck step to .github/workflows/ci.yml between lint and test `.github/workflows/ci.yml`
- [x] T066 Verify task typecheck runs successfully on the current clean codebase
- [x] T067 Run full CI pipeline locally: task lint && task typecheck && task test

**Checkpoint**: CI enforces type safety. PRs with violations cannot merge.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, media content, and PR creation

### Existing Test Suite Verification

- [x] T068 Run full Python test suite (pytest) — verify no regressions from type changes
- [x] T069 [P] Run full TypeScript test suite (pnpm -r test) — verify no regressions from type changes
- [x] T070 Run ruff check with new ANN/TC rules — verify no remaining annotation gaps

### Review Test File Exceptions

- [x] T071 Audit all remaining Any/any in test files — ensure each has lint-disable with justification
- [x] T072 Review all existing eslint-disable comments for no-explicit-any — replace or re-justify

### Evidence Collection

- [x] T073 Create evidence directory `specs/098-strict-type-checking/evidence/`
- [x] T074 Capture test summary with pyright/eslint/pytest pass counts `specs/098-strict-type-checking/evidence/test-summary.md`
- [x] T075 [P] Capture pyright output showing zero violations `specs/098-strict-type-checking/evidence/pyright-output.txt`
- [x] T076 [P] Capture eslint output showing zero no-explicit-any violations `specs/098-strict-type-checking/evidence/eslint-output.txt`
- [x] T077 Finalize usage example with before/after code samples `specs/098-strict-type-checking/evidence/usage-example.md`

### Media Content

- [x] T078 Create shipped blog post `specs/098-strict-type-checking/media/shipped-post.md`
- [x] T079 [P] Create LinkedIn shipped summary `specs/098-strict-type-checking/media/linkedin-shipped.md`

### PR Creation

- [x] T080 Create PR and publish blog: run /speckit.pr

**Task T080 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all TypeScript remediation
- **Constitution (Phase 3)**: Can start after Phase 1 — independent of Phase 2
- **Developer Workflow (Phase 4)**: Depends on Phase 1 + Phase 2 — verifies tools work
- **Schema Generation (Phase 5)**: Depends on Phase 1 — independent of Phase 2
- **Codebase Remediation (Phase 6)**: Depends on Phase 1 + Phase 2 + Phase 5 — the bulk of the work
- **CI Pipeline (Phase 7)**: Depends on Phase 6 — codebase must be clean before CI gate enforces
- **Polish (Phase 8)**: Depends on all prior phases

### User Story Dependencies

- **US3 (Constitution)**: Independent — can complete in parallel with everything after Phase 1
- **US1 (Developer Workflow)**: Depends on Phase 1 + Phase 2 for tools/configs
- **US5 (Schema Generation)**: Depends on Phase 1 for pyright; independent of ESLint work
- **US4 (Codebase Remediation)**: Depends on US1 + US5 — needs tools configured and generators fixed first
- **US2 (CI Pipeline)**: Depends on US4 — CI must not gate until violations are resolved

### Within Phase 6 (Remediation)

Python and TypeScript remediation can proceed in parallel:
- Python: stac → calc → io → cli (or any order — each package is independent)
- TypeScript: vscode → components → web-shell → session-state (or any order)

### Parallel Opportunities

- Phase 1: T003 and T004 can run in parallel (both modify ruff.toml but different sections)
- Phase 2: T007-T013 can all run in parallel (different config files)
- Phase 3: Can run entirely in parallel with Phase 2
- Phase 5: Can run in parallel with Phase 2 (different codebases)
- Phase 6: All Python remediation packages in parallel; all TypeScript packages in parallel
- Phase 6: Within each package, tasks marked [P] can run in parallel

---

## Parallel Example: Phase 6 Python Remediation

```bash
# Launch all Python package remediations in parallel:
Task: "Fix services/stac Any violations"
Task: "Fix services/calc Any violations"
Task: "Fix services/io Any violations"
Task: "Fix services/cli Any violations"

# Then verify all at once:
Task: "Run pyright across all Python packages"
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1 + 2 → Tools configured, ESLint consistent → Foundation ready
2. Phase 3 → Constitution updated (already done) → Governance in place
3. Phase 4 → Developer workflow verified → Developers have local feedback
4. Phase 5 → Schema generation clean → Generated code compliant
5. Phase 6 → Violations remediated package-by-package → Codebase clean
6. Phase 7 → CI gate active → Enforcement automated
7. Phase 8 → Evidence + media + PR → Feature shipped

### Recommended Execution Order (Single Developer)

1. T001-T006 (Setup) — ~30 min
2. T007-T015 (ESLint/tsconfig) — ~1 hr
3. T016-T018 (Constitution) — ~15 min (already done, verify only)
4. T019-T023 (Developer workflow) — ~30 min
5. T024-T027 (Schema generation) — ~30 min
6. T028-T063 (Remediation) — ~4-6 hrs (bulk of the work)
7. T064-T067 (CI pipeline) — ~30 min
8. T068-T080 (Polish/evidence/PR) — ~1 hr

---

## Notes

- [P] tasks = different files, no dependencies
- Each package remediation is independently verifiable via pyright/eslint
- Constitution update (US3) is already complete from /speckit.specify — Phase 3 is verification only
- The ~208 violation count is approximate — actual count will be captured in Phase 1 baseline
- Test files get limited exceptions but each must be individually justified
- Commit after each package remediation to maintain atomic changes
- Run `/speckit.pr` after all tasks complete to create PR with evidence
