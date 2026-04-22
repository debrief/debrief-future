# Tasks: Kind discriminator for TimelineEntry

**Input**: Design documents from `/specs/208-timeline-entry-kind/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/timeline-entry-kind.ts, quickstart.md

**Feature type**: Schema change + library/SDK refactor (type-surface + schema-surface; no new runtime).
**Tests**: Not explicitly requested, but included because the spec's success criteria (SC-002, SC-004, SC-005) are only verifiable via tests.

---

## Evidence Requirements

**Evidence Directory**: `specs/208-timeline-entry-kind/evidence/`
**Media Directory**: `specs/208-timeline-entry-kind/media/`

This feature is a **Schema Change** (per the Quality Rubric) with a **Library/SDK refactor** component. It is **not** a UI component (no new visual surface — LogPanel output must remain unchanged per FR-004/SC-003), so theme-variant screenshots and interaction GIFs do not apply. Instead, the visible-change evidence is targeted: before/after comparison screenshots of the three export-tool stories whose rendering is intentionally corrected by the migration (see research.md R2).

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Full CI pass summary (lint, typecheck, pytest, vitest, Playwright). YAML front matter with `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`, `git_sha`, `captured_at`. | After all tests green |
| `evidence/usage-example.md` | Code snippet: gating on `entry.kind === 'snapshot'` + the old (wrong) pattern as a counter-example. Includes the Python and TS shapes of `activity_type` on the schema. | After consumer migration complete |
| `evidence/round-trip-evidence.md` | Schema round-trip proof (Python LogEntry with `activity_type: 'snapshot'` → JSON → TypeScript LogEntry → JSON → Python LogEntry). Required per Quality Rubric for schema changes. | After LinkML regen + adherence tests pass |
| `evidence/semantic-gate-grep.txt` | Terminal transcript of `rg "category === 'snapshot'"` across the tree, showing zero semantic-gate hits remain (SC-001 proof). | After consumer migration complete |
| `evidence/projection-purity-check.txt` | Transcript of grep on `apps/vscode/src/views/logPanelView.ts` demonstrating no tool-ID string literal is referenced in the kind-resolution path (SC-005 proof). | After projection implemented |
| `evidence/screenshots/export-tool-before.png` | Storybook screenshot of an export-tool card rendered with the *old* `isSnapshot` behaviour (manual-checkpoint placeholder shown) — captured before migration. | Before Phase 3 consumer migration |
| `evidence/screenshots/export-tool-after.png` | Same story, rendered with `kind: 'tool'` fallback — parameter chips shown correctly. | After Phase 3 consumer migration |
| `evidence/screenshots/manual-checkpoint-after.png` | A fixture story with explicit `kind: 'snapshot'` — manual-checkpoint placeholder shown correctly. Demonstrates the semantic gate still fires for the right entries. | After Phase 3 consumer migration |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Momentum-track planning post | During `/speckit.plan` (done) |
| `media/linkedin-planning.md` | 176-word LinkedIn planning summary | During `/speckit.plan` (done) |
| `media/shipped-post.md` | Shipped blog post | During Phase 6 Polish |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | During Phase 6 Polish |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence + shipped post links | Final task in Phase 6 (via `/speckit.pr`) |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Prepare directories and confirm the worktree is configured for the feature.

- [ ] T001 Create evidence directory structure `specs/208-timeline-entry-kind/evidence/screenshots/`
- [ ] T002 [P] Confirm worktree branch is `208-timeline-entry-kind` and CI baseline (`task verify`) passes on the untouched branch before changes begin — this is the pre-migration baseline for SC-003 regression comparisons.

**Checkpoint**: Empty evidence directory exists; pre-change CI is green, establishing the regression baseline.

---

## Phase 2: Foundation — Schema + Type + Projection

**Purpose**: All the type-surface and schema-surface changes that sit *underneath* the consumer migration. Each item here is non-observable in isolation (no rendering changes, no behaviour changes), and all user stories depend on it. Maps to commit 1 and commit 2 of research.md R6.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. The consumer migration in US1 cannot proceed until `TimelineEntry.kind` exists and is populated.

### Schema layer (LinkML) — maps to research.md R1

- [ ] T003 Add `ActivityType` enum + optional `activity_type` slot to `LogEntry` class in `shared/schemas/src/linkml/log-entry.yaml` per data-model.md §1
- [ ] T004 Regenerate Pydantic models — produces updated `shared/schemas/src/generated/pydantic/` (run via existing `gen-pydantic` workflow)
- [ ] T005 [P] Regenerate TypeScript types — produces updated `shared/schemas/src/generated/typescript/types.ts` (run via existing `gen-typescript` workflow)
- [ ] T006 [P] Regenerate JSON Schema — produces updated `shared/schemas/src/generated/json-schema/` (run via existing `gen-json-schema` workflow)
- [ ] T007 [P] [test] Add LinkML golden fixtures for `activity_type` in `shared/schemas/fixtures/` — three fixtures: (a) valid with `activity_type: 'snapshot'`, (b) valid with field absent, (c) invalid with `activity_type: 'invalid'` (must fail validation). File path examples: `shared/schemas/fixtures/log-entry-with-activity-type.json`, `shared/schemas/fixtures/log-entry-no-activity-type.json`, `shared/schemas/fixtures/log-entry-invalid-activity-type.json`
- [ ] T008 [test] Verify LinkML adherence tests (round-trip + structural comparison) pass with new field and fixtures — run existing schema adherence suite; no new test file, but add fixture references to `shared/schemas/tests/` if required

### UI projection type (TypeScript) — maps to data-model.md §3

- [ ] T009 Add `TimelineEntryKind` union export + optional `kind?: TimelineEntryKind` field on the `TimelineEntry` interface in `shared/components/src/LogPanel/types.ts` per data-model.md §3

### Host projection (TypeScript) — maps to data-model.md §4 and research.md R1

- [ ] T010 Add `kindFromActivityType` helper and wire `kind` field in `toTimelineEntry` function in `apps/vscode/src/views/logPanelView.ts` per data-model.md §4. Implementation must match `contracts/timeline-entry-kind.ts` reference shape.
- [ ] T011 [test] Add projection fallback unit test in `apps/vscode/src/views/__tests__/logPanelView.test.ts` (create file if absent). Covers FR-006: LogEntry without `activity_type` projects to `kind: 'tool'`; with `activity_type: 'snapshot'` projects to `kind: 'snapshot'`; never throws.
- [ ] T012 [P] [test] Add projection totality unit test in `apps/vscode/src/views/__tests__/logPanelView.test.ts` covering SC-002: every sample-catalogue LogEntry yields a defined `kind`.

### Import the generated schema type into the host

- [ ] T013 Import `ActivityType` from the regenerated schema package into `apps/vscode/src/views/logPanelView.ts` and use it as the argument type of `kindFromActivityType` (no inline string literals).

**Checkpoint**: `task verify` passes. `TimelineEntry.kind` exists and is populated on every projected entry, but no consumer reads it yet — observable behaviour unchanged. This is commit-2 from R6.

---

## Phase 3: User Story 1 — Replace visual-category snapshot gate (Priority: P1)

**Goal**: Migrate the single existing semantic-gate call site (`LogEntry.tsx:114`) off visual-category detection and onto the new `entry.kind === 'snapshot'` read. Rebaseline Storybook stories affected by the intentional export-tool rendering fix.

**Independent Test**: `rg "category === 'snapshot'" shared/components/src/LogPanel/LogEntry.tsx` returns zero hits. A LogEntry with `activity_type: 'snapshot'` still renders the manual-checkpoint placeholder; an export-tool entry (e.g. `export-png`) no longer does. Storybook snapshot tests pass against rebaselined targets.

### Capture before-state evidence (must happen BEFORE the code edit)

- [ ] T014 [US1] Capture pre-migration Storybook screenshot of an export-tool entry (rendering with the incorrect "manual checkpoint" placeholder) to `specs/208-timeline-entry-kind/evidence/screenshots/export-tool-before.png`. This is the "before" half of the evidence pair demonstrating the latent-bug fix per research.md R2. Must run before T015.

### Consumer migration

- [ ] T015 [US1] Replace the visual-category check on line 114 of `shared/components/src/LogPanel/LogEntry.tsx`: change `const isSnapshot = resolveToolCategory(entry.toolName).category === 'snapshot'` to `const isSnapshot = entry.kind === 'snapshot'` per data-model.md §5. Do NOT remove the `resolveToolCategory` import — it is still used for icon/colour rendering per FR-008.
- [ ] T016 [US1] [test] Add/update unit test in `shared/components/src/LogPanel/__tests__/LogEntry.test.tsx` — assert that `isSnapshot` branch is driven by `entry.kind`, not by `entry.toolName` category (pass a fixture with `kind: 'snapshot'` but `toolName: 'calculate-range'`; pass a fixture with `kind: 'tool'` but `toolName: 'export-png'`).

### Rebaseline Storybook

- [ ] T017 [US1] Update LogPanel Storybook story fixtures (if any) that asserted the old "manual checkpoint placeholder for export tools" behaviour — set `kind: 'snapshot'` explicitly on fixtures that *should* render the manual-checkpoint placeholder; leave export-tool fixtures with `kind` absent (fallback `'tool'`). Files likely affected: `shared/components/src/LogPanel/LogPanel.stories.tsx`, `shared/components/src/LogPanel/LogEntry.stories.tsx` (if present).
- [ ] T018 [US1] Re-run affected Storybook snapshot tests and rebaseline where the new output matches the data-model.md §5 intended behaviour. Review each rebaselined story against research.md R2 to confirm the change is *intended* (export-tool → normal chips) and not an unintended regression. Reviewer note goes into the commit message.

### Capture after-state evidence

- [ ] T019 [US1] [P] Capture post-migration Storybook screenshot of the same export-tool entry (now rendering correctly with parameter chips) to `specs/208-timeline-entry-kind/evidence/screenshots/export-tool-after.png`.
- [ ] T020 [US1] [P] Capture Storybook screenshot of a fixture with explicit `kind: 'snapshot'` showing the manual-checkpoint placeholder (to prove the semantic gate fires for the *right* entries) to `specs/208-timeline-entry-kind/evidence/screenshots/manual-checkpoint-after.png`.

**Checkpoint**: US1 delivered. `LogEntry.tsx` reads semantic `kind`, not visual category. Export-tool entries render correctly (latent bug fixed). Manual-checkpoint fixtures still render the placeholder. This is commit-3 from R6.

---

## Phase 4: User Story 2 — Exhaustiveness guarantee on the closed union (Priority: P2)

**Goal**: Prove that adding a fourth value to `TimelineEntryKind` forces every consumer switch/branch to be updated. Verifies SC-004.

**Independent Test**: A deliberate-regression canary test either compiles (with `@ts-expect-error` on a non-exhaustive switch) or fails CI. Running `tsc --noEmit` on a branch that extends the union without updating consumers produces an error at every switch.

### Exhaustiveness canary test

- [ ] T021 [US2] [test] Add exhaustiveness canary unit test in `shared/components/src/LogPanel/__tests__/kind-exhaustiveness.test.ts` (new file). Mirrors the `exhaustiveKindSwitch` pattern from `contracts/timeline-entry-kind.ts`: a function whose `default` branch assigns to `const _exhaustive: never = k`. Test also includes a commented-out block with `// @ts-expect-error` demonstrating the compile-time error when the union grows — reviewers uncomment locally to verify the guarantee holds.
- [ ] T022 [US2] [P] Document the exhaustiveness contract in `shared/components/src/LogPanel/types.ts` as a JSDoc note on `TimelineEntryKind`, pointing at the canary test file. Helps future developers understand why the union is closed.

**Checkpoint**: US2 delivered. Fourth-kind additions break the build at every consumer, as per SC-004.

---

## Phase 5: User Story 3 — PROV-sourced kind (no tool-name heuristics) (Priority: P3)

**Goal**: Prove the host projection derives `kind` from an explicit PROV schema field, not from tool-name matching. Verifies SC-005 and FR-005.

**Independent Test**: A static-grep lint step against `apps/vscode/src/views/logPanelView.ts` finds no tool-ID string literals in the kind-resolution path. If a reviewer adds a `tool === 'manual-checkpoint'` heuristic, the drift test fails.

### Drift test — asserts SC-001 (no residual semantic gates) and SC-005 (no tool-name heuristics)

- [ ] T023 [US3] [test] Add semantic-gate drift test in `shared/components/src/LogPanel/__tests__/semantic-gate-drift.test.ts` (new file). Reads `LogEntry.tsx` source at runtime (`fs.readFileSync`), asserts it does NOT contain the literal `resolveToolCategory(entry.toolName).category === 'snapshot'` pattern nor any equivalent `category === 'snapshot'` regex against a `ToolCategory` expression. Directly covers SC-001.
- [ ] T024 [US3] [P] [test] Add projection-purity drift test in `apps/vscode/src/views/__tests__/projection-purity.test.ts` (new file). Reads `logPanelView.ts` source, locates the `kindFromActivityType` function, and asserts its body does not contain known tool-ID string literals (`'manual-checkpoint'`, `'export-png'`, `'export-csv'`, `'export-geojson'`, etc.). Directly covers SC-005.

### Capture grep-based evidence

- [ ] T025 [US3] Capture semantic-gate grep evidence to `specs/208-timeline-entry-kind/evidence/semantic-gate-grep.txt` — a terminal transcript of `rg "category === 'snapshot'"` across the worktree, annotated to show each remaining hit is inside a *rendering* path (icon/colour), not a semantic gate. Human reviewer cross-check against SC-001.
- [ ] T026 [US3] [P] Capture projection-purity grep evidence to `specs/208-timeline-entry-kind/evidence/projection-purity-check.txt` — a transcript of `rg "'(manual-checkpoint|export-png|export-csv|export-geojson)'" apps/vscode/src/views/logPanelView.ts` showing zero hits in the kind-resolution path.

**Checkpoint**: US3 delivered. Drift tests guard against future regressions of SC-001 and SC-005.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, short ADR note, media content, and PR creation.

### Documentation

- [ ] T027 [P] Add a short ADR-style entry to `docs/project_notes/decisions.md` noting the semantic separation between `LogEntry.activity_type` (PROV, semantic) and `ToolCategory` (UI, visual). One paragraph; links back to this spec.
- [ ] T028 [P] Log this feature in `docs/project_notes/issues.md` with the PR URL (added once PR is created — staged here as a placeholder).

### Evidence Collection (REQUIRED)

- [ ] T029 Capture test summary using the template at `.specify/templates/evidence/test-summary-template.md` in `specs/208-timeline-entry-kind/evidence/test-summary.md`. YAML front matter MUST include `feature: 208-timeline-entry-kind`, `captured_at` (ISO 8601), `git_sha` (current branch HEAD), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body MUST describe the key verified scenarios: (a) LinkML adherence pass with new field + fixtures, (b) projection fallback to `'tool'` for absent `activity_type`, (c) projection emits `'snapshot'` for `activity_type: 'snapshot'`, (d) LogEntry.tsx renders manual-checkpoint placeholder only when `kind === 'snapshot'`, (e) exhaustiveness canary compiles, (f) semantic-gate + projection-purity drift tests pass.
- [ ] T030 Create usage demonstration in `specs/208-timeline-entry-kind/evidence/usage-example.md`. Include: TypeScript snippet showing `entry.kind === 'snapshot'` gate, Python snippet showing `LogEntry(..., activity_type=ActivityType.snapshot)`, the old (wrong) visual-category pattern as a counter-example, and a one-sentence explanation of when to use each.
- [ ] T031 [P] Create schema round-trip proof in `specs/208-timeline-entry-kind/evidence/round-trip-evidence.md` per Quality Rubric for Schema Change features. Show a Python `LogEntry` instance with `activity_type: 'snapshot'` → serialised JSON → deserialised in TypeScript via the regenerated types → re-serialised JSON → deserialised back to Python. Assert byte-level JSON equality after normalisation.
- [ ] T032 [P] Verify all three theme-variant viewings of the rebaselined Storybook stories (light / dark / vscode) render consistently — capture any additional screenshots that reveal per-theme regressions, to `specs/208-timeline-entry-kind/evidence/screenshots/`. (Likely no action needed if theme variants are unaffected; recorded here for completeness.)

### CI Verification (REQUIRED before PR)

- [ ] T033 Run `task verify` from worktree root — confirms lint + typecheck + unit tests all green. Re-run if any prior step changed code.
- [ ] T034 Run Playwright E2E suites: `cd apps/web-shell && node run-playwright.mjs` — confirms LogPanel-adjacent web-shell flows pass against the rebaselined behaviour. (The code-server LogPanel E2E suite at `tests/e2e/test-log-panel.spec.ts` is currently `test.describe.fixme(...)` per backlog #210; not in scope for this feature.)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### Media Content

- [ ] T035 Spawn the Content Specialist agent (`.claude/agents/media/content.md`) via Task tool with `subagent_type: "content-specialist"` to draft the shipped blog post at `specs/208-timeline-entry-kind/media/shipped-post.md`. Provide: the evidence summary, the latent-bug fix narrative from research.md R2, a short "Lessons Learned" on visual-vs-semantic separation, and a "What's Next" pointer to the three downstream features (snapshot button / tune marker / manual rationale). Track: `credibility`. Include a reference to the planning post from `media/planning-post.md`.
- [ ] T036 [P] Spawn Content Specialist to draft the LinkedIn shipped summary at `specs/208-timeline-entry-kind/media/linkedin-shipped.md`. 150–200 words; hook on the latent-bug-fix angle; link placeholder to the shipped post.

### PR Creation (FINAL TASK — must run last)

- [ ] T037 Create PR and publish blog: run `/speckit.pr`. This task MUST be final — all evidence, media, and drift tests must already be complete and committed. It creates the feature PR in `debrief-future` (with evidence and shipped-post links) and publishes the shipped post to `debrief.github.io` as a second PR.

**Task T037 must run last. It depends on T001–T036 being complete.**

---

## Dependencies

### Phase Order

- **Phase 1 (Setup)**: No dependencies — run first.
- **Phase 2 (Foundation)**: Depends on Phase 1. BLOCKS all user stories — the schema, projection, and type declarations must exist before any consumer can read `entry.kind`.
- **Phase 3 (US1 — consumer migration)**: Depends on Phase 2 complete. Blocks T019 / T020 on T015 (screenshots need the migrated code).
- **Phase 4 (US2 — exhaustiveness)**: Depends on Phase 2 (needs `TimelineEntryKind` to exist). Independent of US1 and US3 — can run in parallel with either.
- **Phase 5 (US3 — drift tests)**: Depends on Phase 3 completion — the semantic-gate drift test (T023) asserts the migrated state of `LogEntry.tsx`, which only exists after T015 lands.
- **Phase 6 (Polish)**: Depends on Phases 1–5 complete. Evidence captures the end state; the PR task depends on all evidence and media.

### Within-phase ordering

**Phase 2**:
- T003 (schema edit) must precede T004, T005, T006 (regenerations).
- T004/T005/T006 are parallelisable ([P]).
- T007 (fixtures) parallels the regenerations (no file overlap).
- T008 (adherence tests) depends on T004–T007.
- T009 (TS type) can run in parallel with the schema regenerations but is semantically paired with T005 (same target package).
- T010 (projection) depends on T005 (needs the regenerated `ActivityType` type) and T009 (needs `TimelineEntryKind`).
- T011 / T012 (projection tests) depend on T010.
- T013 (import) depends on T010.

**Phase 3**:
- T014 (before-screenshot) must run BEFORE T015. Capturing post-migration as "before" is a soft failure for evidence.
- T015 (code edit) precedes T016/T017/T018 (tests and rebaselines).
- T019 / T020 (after-screenshots) depend on T015 and T017/T018.

**Phase 4**: T021 precedes T022 (docs pointer depends on the test file existing).

**Phase 5**:
- T023 (semantic-gate drift test) must be added *after* T015 ensures the pattern is actually gone — otherwise the test fails immediately.
- T024 parallels T023.
- T025 / T026 depend on their respective test tasks (or at least on the final code state).

**Phase 6**:
- Evidence tasks (T029–T032) precede media tasks (T035–T036).
- T033 / T034 (CI) precede T029 (needs test results).
- T037 (PR creation) depends on everything prior.

### Parallel Opportunities

- **Phase 2 schema regenerations** — T005, T006, T007 run in parallel.
- **Phase 2 projection tests** — T011, T012 run in parallel.
- **Phase 3 after-screenshots** — T019, T020 run in parallel.
- **Phase 4** — T022 parallels the rest once T021 exists.
- **Phase 5 drift tests** — T023, T024 parallel; T025, T026 parallel.
- **Phase 6 documentation** — T027, T028 parallel.
- **Phase 6 evidence** — T031, T032 parallel with T029 / T030.
- **Phase 6 media** — T036 parallels T035.

### Cross-phase parallelism

Once Phase 2 is complete, Phase 4 (US2 exhaustiveness) can run in parallel with Phase 3 (US1 consumer migration), since they touch disjoint files. Phase 5 must wait for Phase 3 before its drift test can pass.

---

## Implementation Strategy

### Incremental Delivery (matches research.md R6 commit plan)

1. **Commit 1 — Schema + regeneration** (Phase 1 + Phase 2 schema tasks: T001–T008). Adds the `activity_type` slot + enum, regenerates Pydantic / TS / JSON Schema, lands fixtures, passes LinkML adherence. At this commit the field exists in the schema and generated types but no code reads it — observable behaviour unchanged.

2. **Commit 2 — TimelineEntry type + projection + projection tests** (Phase 2 TS tasks: T009–T013). Adds `TimelineEntryKind`, wires `kindFromActivityType`, adds fallback and totality unit tests, imports `ActivityType` into the host. At this commit `TimelineEntry.kind` is always populated but `LogEntry.tsx` still uses the old visual-category check — observable behaviour unchanged.

3. **Commit 3 — Consumer migration + rebaseline + US2/US3 tests** (Phase 3 + Phase 4 + Phase 5: T014–T026). Switches `LogEntry.tsx` line 114 to the semantic gate, rebaselines affected Storybook stories, lands exhaustiveness canary and drift tests. At this commit export-tool entries no longer render the manual-checkpoint placeholder (intentional latent-bug fix per research.md R2) — this is the only visible behaviour change.

4. **Commit 4 — Evidence + docs + media + PR** (Phase 6: T027–T037). Captures all evidence, writes the shipped post and LinkedIn summary, adds the ADR note, runs `/speckit.pr`.

Each commit builds and passes CI independently. Commits 1 and 2 can be reviewed before commit 3 lands — useful if the schema change needs separate sign-off.

### Scope of caution

- **T014 must run before T015** — once the consumer migration lands, there is no way to recreate the "before" export-tool rendering for evidence. If T014 is skipped, revert commit 3 temporarily to recapture, or accept missing evidence.
- **T018 (Storybook rebaseline)** is the single highest-risk task. Every rebaselined assertion must be reviewed against research.md R2 to confirm the behaviour change is *intended*. A reviewer seeing unexpected changes outside the export-tool stories should treat that as a regression and investigate before merging.
- The `task verify` step in T033 covers the vast majority of regression risk. If `task verify` is green and the Storybook rebaselines have been reviewed, the feature is safe to merge.

### Parallel team strategy

Not applicable — the feature is small enough for a single developer. Single-track sequential implementation in the commit order above is the intended path.

---

## Notes

- [P] tasks = different files, no dependencies within a phase.
- [US1] / [US2] / [US3] labels map tasks to spec.md user stories.
- [test] marks test tasks (unit tests, drift tests, fixture additions).
- SC-001 is covered by T023 (drift test) + T025 (evidence).
- SC-002 is covered by T011 and T012 (projection totality tests).
- SC-003 is covered by T033 + T034 (CI + E2E) against the Phase 1 baseline.
- SC-004 is covered by T021 (exhaustiveness canary).
- SC-005 is covered by T024 (projection-purity drift test) + T026 (evidence).
- Evidence is required — artefacts under `evidence/` feed the shipped post and the PR description.
- `/speckit.pr` must be the final action. Running it before all evidence is captured will produce an incomplete PR description.
