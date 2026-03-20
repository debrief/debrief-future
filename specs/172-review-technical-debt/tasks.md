# Tasks: Review Technical Debt

**Input**: Design documents from `/specs/172-review-technical-debt/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Review Decisions Applied**: This task list incorporates all decisions from the `/speckit.review` session:
- Types belong in `@debrief/schemas`; service imports change from `@debrief/components` → `@debrief/schemas`
- `GeoJSONFeature` replaced with appropriate schema types (strong typing everywhere), not just `SafeFeature`
- `SafeFeature` used only at JSON.parse/MCP boundaries
- `AnnotationFeature` replaced with `SchemaAnnotationFeature` union + fixture tests
- `MCPToolDefinition` types move to `@debrief/utils`; `fromMCPTool` function stays in `@debrief/components/ToolMatch`
- TimeRange converters built proactively
- CI regression guard for `GeoJSONFeature` reintroduction
- Web-shell domain extraction kept but requires detailed service-level unit tests
- `GeoJSONFeature` removed from `@debrief/utils` after consolidation

---

## Evidence Requirements

**Evidence Directory**: `specs/172-review-technical-debt/evidence/`
**Media Directory**: `specs/172-review-technical-debt/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Full CI results (pytest + vitest + typecheck + lint) | After all changes pass CI |
| usage-example.md | Before/after import paths and version alignment | After type consolidation complete |
| config-sample.txt | Unified dependency versions and ESLint config | After dependency alignment |
| validation-output.txt | `task verify` output proving CI passes | After final verification |

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

## Phase 1: Setup (Baseline Validation)

**Purpose**: Establish that existing CI passes before making changes (Article VII — test-first)

- [ ] T001 Run `task verify` to capture baseline CI state and confirm all tests pass
- [ ] T002 [P] Capture current dependency versions for comparison `specs/172-review-technical-debt/evidence/baseline-versions.txt`

**Checkpoint**: Baseline established — all existing tests pass before any changes

---

## Phase 2: Foundation (Schema Investigation)

**Purpose**: Investigate schema derivation for DebriefFeature types before consolidation (review decision 3B). Re-export `DebriefFeature` union and type guards from `@debrief/schemas` for service consumption.

- [ ] T003 Investigate whether `DebriefFeature` union type can be generated from LinkML or should be hand-maintained in `@debrief/schemas` `shared/schemas/src/generated/typescript/types.ts`
- [ ] T004 Add `DebriefFeature` union type and type guards to `@debrief/schemas` exports (either generated or as a hand-maintained companion module) `shared/schemas/src/generated/typescript/index.ts`
- [ ] T005 Replace `AnnotationFeature` with `SchemaAnnotationFeature` in the `DebriefFeature` union `shared/components/src/utils/types.ts`
- [ ] T006 [test] Add annotation fixture validation tests — verify real annotation data matches one of the 7 schema annotation types `shared/components/src/utils/__tests__/annotation-types.test.ts`
- [ ] T007 Update `isAnnotationFeature` type guard to narrow to `SchemaAnnotationFeature` `shared/components/src/utils/types.ts`

**Checkpoint**: Schema types are the single source of truth. `DebriefFeature` importable from `@debrief/schemas`. Annotation fixture tests pass.

---

## Phase 3: User Story 1 — Align Dependency Versions Across Packages (Priority: P1)

**Goal**: All shared dependencies use consistent version ranges across the monorepo.

**Independent Test**: Run `pnpm install` and `uv sync` across all workspace members; verify CI passes with unified versions.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Align `@storybook/*` from `^8.0.0` → `^8.4.0` `apps/loader/package.json`
- [ ] T009 [P] [US1] Align `@typescript-eslint/*` from `^6.13.0` → `^6.21.0` `apps/vscode/package.json`
- [ ] T010 [P] [US1] Align `eslint` from `^8.55.0` → `^8.57.1` `apps/vscode/package.json`
- [ ] T011 [P] [US1] Align `eslint-plugin-react` from `^7.33.0` → `^7.37.5` `apps/loader/package.json`
- [ ] T012 [P] [US1] Align `@types/leaflet` to `^1.9.8` across packages `shared/components/package.json`
- [ ] T013 [P] [US1] Align `pydantic` from `>=2.0.0` → `>=2.12.5` in all Python service pyproject.toml files `services/*/pyproject.toml`
- [ ] T014 [P] [US1] Align `ruff` from `>=0.1.0` → `>=0.8.0` `shared/schemas/pyproject.toml`
- [ ] T015 [US1] Run `pnpm install && uv sync` to verify dependency resolution succeeds
- [ ] T016 [US1] Run `task verify` to confirm CI passes with aligned versions

**Checkpoint**: Zero dependency version mismatches (SC-001). All 7 mismatched dependencies aligned.

---

## Phase 4: User Story 2 — Consolidate Duplicated Type Definitions (Priority: P1)

**Goal**: Single canonical definition for each shared type. Use schema types for strong typing; `SafeFeature` at boundaries only.

**Independent Test**: Search codebase for duplicate type names; verify only canonical definitions remain.

### 4a: MCPToolDefinition Consolidation

- [ ] T017 [US2] Move `MCPToolDefinition`, `MCPToolResponse`, `MCPContentItem`, `DebriefAnnotations` type definitions to `@debrief/utils` `shared/utils/src/mcp-types.ts`
- [ ] T018 [US2] Export new MCP types from `@debrief/utils` index `shared/utils/src/index.ts`
- [ ] T019 [US2] Update `apps/vscode/src/types/tool.ts` to import MCP types from `@debrief/utils` instead of defining locally `apps/vscode/src/types/tool.ts`
- [ ] T020 [US2] Update `apps/web-shell/src/services/toolService.ts` to import MCP types from `@debrief/utils` instead of relative path to vscode `apps/web-shell/src/services/toolService.ts`

### 4b: GeoJSONFeature → Schema Types (vscode tools)

- [ ] T021 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/track/styling/labelInterval.ts`
- [ ] T022 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/track/styling/setTrackColor.ts`
- [ ] T023 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/track/styling/symbolInterval.ts`
- [ ] T024 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/track/styling/applySymbolStyle.ts`
- [ ] T025 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T026 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/track/manipulation/generateCoursesSpeeds.ts`
- [ ] T027 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/shape/manipulation/enlargeShape.ts`
- [ ] T028 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts`
- [ ] T029 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts`
- [ ] T030 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/vscode/src/types/import.ts`

### 4c: GeoJSONFeature → Schema Types (web-shell, shared, services)

- [ ] T031 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/tools/track/analysis/trackStats.ts`
- [ ] T032 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`
- [ ] T033 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/tools/track/analysis/rangeBearing.ts`
- [ ] T034 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts`
- [ ] T035 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/tools/region/analysis/areaSummary.ts`
- [ ] T036 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/web-shell/src/services/toolService.ts`
- [ ] T037 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `shared/components/src/ExerciseListView/types.ts`
- [ ] T038 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `shared/components/diff/src/diffFeatureCollections.ts`
- [ ] T039 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `services/session-state/src/types/results.ts`
- [ ] T040 [P] [US2] Replace local `GeoJSONFeature` with appropriate schema type `apps/loader/src/renderer/types/results.ts`

### 4d: Remove GeoJSONFeature from @debrief/utils

- [ ] T041 [US2] Remove `GeoJSONFeature` and `GeoJSONFeatureCollection` interfaces from `@debrief/utils` (keep `SafeFeature` for boundary use) `shared/utils/src/types.ts`
- [ ] T042 [US2] Update `shared/utils/src/index.ts` exports to remove `GeoJSONFeature` and `GeoJSONFeatureCollection` `shared/utils/src/index.ts`

### 4e: TimeRange Converters

- [ ] T043 [US2] Add `timeRangeFromISO`, `timeRangeToISO`, `timeRangeFromMinMax` converter utilities `services/session-state/src/types/temporal.ts`
- [ ] T044 [test] [US2] Add unit tests for TimeRange converter utilities `services/session-state/src/types/__tests__/temporal.test.ts`

### 4f: Regression Guard

- [ ] T045 [US2] Add CI lint rule (grep-based or ESLint no-restricted-syntax) to prevent reintroduction of `interface GeoJSONFeature` definitions

- [ ] T046 [US2] Run `tsc --noEmit` across all TypeScript packages to verify type consolidation compiles

**Checkpoint**: GeoJSONFeature definitions reduced from 21 to 0 (SC-002). MCPToolDefinition consolidated. TimeRange converters available. Regression guard active.

---

## Phase 5: User Story 3 — Fix Python Workspace and Tooling Alignment (Priority: P2)

**Goal**: All Python services correctly registered in uv workspace and ruff configuration.

**Independent Test**: Run `uv sync` and `uv run pytest` — all services discovered.

### Implementation for User Story 3

- [ ] T047 [P] [US3] Add `services/debrief-tools` to uv workspace members `pyproject.toml`
- [ ] T048 [P] [US3] Add `services/session-state-py` to uv workspace members `pyproject.toml`
- [ ] T049 [P] [US3] Add `debrief_cli` to ruff `known-first-party` list `ruff.toml`
- [ ] T050 [US3] Run `uv sync` and verify all services install correctly
- [ ] T051 [US3] Run `uv run pytest` and verify tests for debrief-tools and debrief-session are discovered

**Checkpoint**: All Python services aligned (SC-004). `uv sync` and `uv run pytest` discover everything.

---

## Phase 6: User Story 4 — Unify Configuration and Add Missing Lint Coverage (Priority: P2)

**Goal**: Consistent ESLint configuration across all TypeScript packages.

**Independent Test**: Run `pnpm lint` across all packages; verify none are skipped.

### Implementation for User Story 4

- [ ] T052 [P] [US4] Create ESLint config extending shared base `shared/config-ts/.eslintrc.cjs`
- [ ] T053 [P] [US4] Create ESLint config extending shared base `shared/utils/.eslintrc.cjs`
- [ ] T054 [P] [US4] Create ESLint config extending shared base `apps/web-shell/.eslintrc.cjs`
- [ ] T055 [P] [US4] Create ESLint config extending shared base `services/session-state/.eslintrc.cjs`
- [ ] T056 [US4] Add lint scripts to package.json for each newly-covered package (if missing)
- [ ] T057 [US4] Run `pnpm lint` across all packages and fix any new lint errors surfaced
- [ ] T058 [US4] Document tsconfig `module` setting rationale (ESNext vs NodeNext vs ES2022) `docs/project_notes/decisions.md`

**Checkpoint**: ESLint coverage at 100% of TypeScript packages (SC-005). All formats consistent.

---

## Phase 7: User Story 5 — Add Coverage Thresholds to Untested Services (Priority: P2)

**Goal**: Test coverage thresholds for debrief-config (83% current) and debrief-calc (87% current).

**Independent Test**: Run pytest with --cov; verify threshold enforcement triggers on violations.

### Implementation for User Story 5

- [ ] T059 [P] [US5] Add `[tool.coverage.report] fail_under = 80` to debrief-config `services/config/pyproject.toml`
- [ ] T060 [P] [US5] Add `[tool.coverage.report] fail_under = 80` to debrief-calc `services/calc/pyproject.toml`
- [ ] T061 [US5] Run `uv run pytest --cov` for both services to verify thresholds enforce correctly

**Checkpoint**: 100% of Python services have coverage thresholds (SC-006).

---

## Phase 8: User Story 6 — Break Cross-Layer Architectural Violations (Priority: P3)

**Goal**: No service-layer code imports from `@debrief/components`; domain logic in service packages.

**Independent Test**: Grep for prohibited import patterns; verify zero violations.

### 8a: Fix Service Import Paths

- [ ] T062 [P] [US6] Change `calcService.ts` import of `DebriefFeature` from `@debrief/components` → `@debrief/schemas` `apps/vscode/src/services/calcService.ts`
- [ ] T063 [P] [US6] Change `sessionManager.ts` imports of `TrackFeature`, `ReferenceLocation` from `@debrief/components` → `@debrief/schemas` `apps/vscode/src/services/sessionManager.ts`
- [ ] T064 [P] [US6] Change `mcpToolAdapter.ts` to import `MCPToolDefinition` type from `@debrief/utils` (keep `fromMCPTool` function import from `@debrief/components/ToolMatch`) `apps/vscode/src/services/mcpToolAdapter.ts`

### 8b: Web-Shell Domain Logic Extraction

- [ ] T065 [US6] Design extraction plan: identify target service package, new exports, and delegation pattern for web-shell tool code (~1000 lines across 5 files)
- [ ] T066 [US6] Extract domain logic from `trackStats.ts` to service package `apps/web-shell/src/tools/track/analysis/trackStats.ts`
- [ ] T067 [US6] Extract domain logic from `rangeBearing.ts` to service package `apps/web-shell/src/tools/track/analysis/rangeBearing.ts`
- [ ] T068 [US6] Extract domain logic from `moveShape.ts` to service package `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`
- [ ] T069 [US6] Extract domain logic from `areaSummary.ts` to service package `apps/web-shell/src/tools/region/analysis/areaSummary.ts`
- [ ] T070 [US6] Extract domain logic from `bufferZoneGenerator.ts` to service package `apps/web-shell/src/tools/sensor/detection/bufferZoneGenerator.ts`
- [ ] T071 [test] [US6] Write service-level unit tests for extracted trackStats domain logic
- [ ] T072 [test] [US6] Write service-level unit tests for extracted rangeBearing domain logic
- [ ] T073 [test] [US6] Write service-level unit tests for extracted moveShape domain logic
- [ ] T074 [test] [US6] Write service-level unit tests for extracted areaSummary domain logic
- [ ] T075 [test] [US6] Write service-level unit tests for extracted bufferZoneGenerator domain logic
- [ ] T076 [US6] Update `apps/web-shell/src/services/toolService.ts` documentation (remove GeoJSONFeature casting workaround)

### 8c: Verify No Cross-Layer Violations Remain

- [ ] T077 [US6] Grep for prohibited import patterns: `@debrief/components` in service-layer code; verify zero results
- [ ] T078 [US6] Run `task verify` to confirm all existing tests still pass after refactoring

**Checkpoint**: Zero cross-layer imports (SC-007). Web-shell delegates to service packages. All extracted code has unit tests.

---

## Phase 9: User Story 7 — Update Technical Debt Assessment Guide (Priority: P3)

**Goal**: Guide reflects current state with resolved items marked and new sections added.

**Independent Test**: Review guide covers all 15 categories from March 2026 review.

### Implementation for User Story 7

- [ ] T079 [US7] Mark resolved items in Section 1 (dependency skew): `@sparticuz/chromium` and `@playwright/test` aligned `docs/technical-debt-assessment-guide.md`
- [ ] T080 [US7] Update Section 2 (tsconfig): reflect `tsconfig.base.json` and `noUncheckedIndexedAccess` relaxation `docs/technical-debt-assessment-guide.md`
- [ ] T081 [P] [US7] Add Section 11: Logging hygiene `docs/technical-debt-assessment-guide.md`
- [ ] T082 [P] [US7] Add Section 12: Workspace membership drift `docs/technical-debt-assessment-guide.md`
- [ ] T083 [P] [US7] Add Section 13: Error boundary coverage `docs/technical-debt-assessment-guide.md`
- [ ] T084 [P] [US7] Add Section 14: Deprecated code tracking `docs/technical-debt-assessment-guide.md`
- [ ] T085 [P] [US7] Add Section 15: Cross-layer import violations `docs/technical-debt-assessment-guide.md`

**Checkpoint**: Guide covers all 15 categories (SC-008).

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, and PR creation.

### Final Verification

- [ ] T086 Run full `task verify` — lint, typecheck, and test must all pass (SC-009)
- [ ] T087 Run quickstart.md validation commands `specs/172-review-technical-debt/quickstart.md`

### Evidence Collection

- [ ] T088 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/172-review-technical-debt/evidence/test-summary.md`
- [ ] T089 Create usage demonstration showing before/after import paths and version alignment `specs/172-review-technical-debt/evidence/usage-example.md`
- [ ] T090 [P] Capture configuration sample: unified dependency versions `specs/172-review-technical-debt/evidence/config-sample.txt`
- [ ] T091 [P] Capture `task verify` output `specs/172-review-technical-debt/evidence/validation-output.txt`

### Media Content

- [ ] T092 Create shipped blog post `specs/172-review-technical-debt/media/shipped-post.md`
- [ ] T093 [P] Create LinkedIn shipped summary `specs/172-review-technical-debt/media/linkedin-shipped.md`

### PR Creation

- [ ] T094 Create PR and publish blog: run /speckit.pr

**Task T094 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — establishes baseline
- **Phase 2 (Foundation)**: Depends on Phase 1 — schema investigation before type work
- **Phase 3 (US1)**: Depends on Phase 1 — can run in parallel with Phase 2
- **Phase 4 (US2)**: Depends on Phase 2 (schema types available) and Phase 3 (versions aligned)
- **Phase 5 (US3)**: Depends on Phase 1 — independent of other phases
- **Phase 6 (US4)**: Depends on Phase 1 — independent of other phases
- **Phase 7 (US5)**: Depends on Phase 1 — independent of other phases
- **Phase 8 (US6)**: Depends on Phase 2 (schema types) and Phase 4 (type consolidation complete)
- **Phase 9 (US7)**: Depends on Phases 3-8 (needs to reflect what was actually fixed)
- **Phase 10 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Independent — can start after baseline
- **US2 (P1)**: Depends on Foundation (schema investigation) and US1 (version alignment)
- **US3 (P2)**: Independent — can run in parallel with US1 and US2
- **US4 (P2)**: Independent — can run in parallel with US1 and US2
- **US5 (P2)**: Independent — can run in parallel with US1 and US2
- **US6 (P3)**: Depends on US2 (type consolidation must be complete before fixing imports)
- **US7 (P3)**: Depends on all other stories (documents what was resolved)

### Parallel Opportunities

**Phase 3 (US1)**: All dependency alignment tasks T008-T014 can run in parallel.

**Phase 4 (US2)**: All GeoJSONFeature replacement tasks T021-T040 can run in parallel (different files).

**Phase 5-7 (US3, US4, US5)**: These three user stories are fully independent and can run in parallel with each other.

**Phase 8 (US6)**: Import fix tasks T062-T064 can run in parallel. Domain extraction tasks T066-T070 can run in parallel. Test tasks T071-T075 can run in parallel.

**Phase 9 (US7)**: New section tasks T081-T085 can run in parallel.

---

## Implementation Strategy

### Incremental Delivery

1. **Baseline** (Phase 1) → Confirm CI passes
2. **Schema foundation** (Phase 2) → DebriefFeature available from @debrief/schemas
3. **Dependency alignment** (Phase 3/US1) → Zero version mismatches
4. **Type consolidation** (Phase 4/US2) → Single canonical types, regression guard
5. **Python workspace + ESLint + coverage** (Phases 5-7/US3-5) → Config hygiene, can be parallel
6. **Cross-layer fixes** (Phase 8/US6) → Clean dependency graph, domain logic in services
7. **Documentation** (Phase 9/US7) → Guide reflects current reality
8. **Polish** (Phase 10) → Evidence, media, PR

### Risk Mitigations

- **AnnotationFeature → SchemaAnnotationFeature**: Fixture tests (T006) validate data compatibility before union change
- **GeoJSONFeature removal**: CI regression guard (T045) prevents reintroduction
- **Web-shell extraction**: Service-level unit tests (T071-T075) required per Article VI
- **Dependency alignment**: Each package tested individually before cross-package verification

---

## Notes

- [P] tasks = different files, no dependencies — can run in parallel
- Each tool file (T021-T040) needs individual assessment: determine whether the code works on tracks (→ `TrackFeature`), references (→ `ReferenceLocation`), or any feature (→ `DebriefFeature`)
- `SafeFeature` should ONLY be used at JSON.parse/MCP boundaries, NOT as a replacement for typed schema types
- Run `task verify` after each phase checkpoint to catch regressions early
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
