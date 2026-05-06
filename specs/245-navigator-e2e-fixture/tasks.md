# Tasks: Backlog Navigator E2E Test Fixture Decoupling

**Input**: Design documents from `/specs/245-navigator-e2e-fixture/`  
**Branch**: `245-navigator-e2e-fixture`

---

## Evidence Requirements

**Evidence Directory**: `specs/245-navigator-e2e-fixture/evidence/`  
**Media Directory**: `specs/245-navigator-e2e-fixture/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Playwright E2E pass counts + Vitest pass counts after refactor | After all specs pass |
| `usage-example.md` | Before/after grep output showing zero BACKLOG.md references in e2e/ | After desktop + mobile spec updates complete |
| `validation-output.txt` | Raw grep confirming SC-005 (zero e2e BACKLOG.md references) | After all specs updated |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook, What We're Building, How It Fits, Key Decisions) | Already captured during `/speckit.plan` |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by `/speckit.pr` |

---

## Phase 1: Foundation — Shared Mock Helper

**Purpose**: Create the shared helper that all 14 spec files will import. Must be complete before any spec file is modified.

**⚠️ BLOCKS ALL DOWNSTREAM PHASES** — no spec file can be updated until T001 is merged.

- [x] T001 Create shared mock helper module `apps/backlog-navigator/e2e/helpers/mock-github.ts`
- [x] T002 Verify TypeScript strict-mode compliance — run `pnpm typecheck` in `apps/backlog-navigator` (no `any`, explicit return types on exported function)

**Checkpoint**: `apps/backlog-navigator/e2e/helpers/mock-github.ts` exists, exports `mockGithubBacklogFetch(page: Page, fixturePath?: string): Promise<void>`, and passes typecheck.

## Phase 2: User Story 1 — Fixture File + Desktop Specs

**Goal**: All 5 desktop Playwright specs read the hand-curated fixture instead of the live `BACKLOG.md`. The fixture covers all required workflow states, categories, and parser edge cases.

**Independent Test**: `cd apps/backlog-navigator && node run-playwright.mjs` — all desktop specs pass regardless of repo-root `BACKLOG.md` content.

**Prerequisite**: Phase 1 complete (T001).

### Create the Fixture

- [x] T003 Create fixture directory and hand-author the 12-row fixture table `apps/backlog-navigator/e2e/fixtures/backlog-fixture.md`

  The fixture MUST reproduce the full BACKLOG.md structure:
  - Scoring/legend table header (same preamble as the live file)
  - Epics table: `| ID | Title | Description | Status |` — 2 rows (E01, E02)
  - Items table: `| ID | Category | Description | V | M | A | Total | Complexity | Status | Epic | Created | Updated |` — 12 rows

  Coverage matrix (verified against data-model.md):
  - Row 001: Feature / proposed / no epic — safe `selectOption('approved')` target
  - Row 002: Tech Debt / approved / E01 — contains Markdown link + `[[E01]]` tag
  - Row 003: Enhancement / clarified / no epic
  - Row 004: Bug / specified / E02
  - Row 005: Infrastructure / implementing / no epic
  - Row 006: Documentation / complete / no epic — triggers strikethrough render
  - Row 007: Research Spike / blocked / E01
  - Row 008: Feature / wont-do / no epic
  - Row 009: Enhancement / needs-interview / no epic
  - Row 010: Tech Debt / proposed / E02 — description has `\|` escaped pipe + Markdown link + `[[E02]]` tag (parser edge case)
  - Row 011: Bug / approved / no epic
  - Row 012: Feature / clarified / E01

### Update Desktop Specs (can run in parallel after T003)

- [x] T004 [P] Update `browse.spec.ts`: remove local `BACKLOG_PATH` + `mockGithubBacklogFetch`; add import from `./helpers/mock-github.js` `apps/backlog-navigator/e2e/browse.spec.ts`
- [x] T005 [P] Update `interaction.spec.ts`: remove local definitions; add shared import; update `selectOption('clarified')` → use row 001 (`proposed`) as target row so transition is non-trivial `apps/backlog-navigator/e2e/interaction.spec.ts`
- [x] T006 [P] Update `a11y.spec.ts`: remove local definitions; add shared import; update any status assertions to use known fixture rows `apps/backlog-navigator/e2e/a11y.spec.ts`
- [x] T007 [P] Update `realWrite.spec.ts`: remove local definitions; add shared import; update status assertion to use row 001 as the deterministic target `apps/backlog-navigator/e2e/realWrite.spec.ts`
- [x] T008 [P] Update `prMode.spec.ts`: remove local definitions; add shared import `apps/backlog-navigator/e2e/prMode.spec.ts`

### Verify

- [x] T009 Run desktop E2E suite: `cd apps/backlog-navigator && node run-playwright.mjs` — all desktop specs pass
- [x] T010 Confirm zero live references in desktop specs: `grep -r "BACKLOG\.md" apps/backlog-navigator/e2e/*.spec.ts` returns no output

**Checkpoint**: 5 desktop specs pass; no BACKLOG.md reference in any desktop spec file.

## Phase 3: User Story 1 (continued) — Mobile Specs

**Goal**: All 9 mobile Playwright specs read the fixture. The two specs with defensive conditional status logic (`interaction.mobile.spec.ts`, `push.mobile.spec.ts`) are simplified to deterministic row selection.

**Independent Test**: Run the mobile Playwright project specifically — `cd apps/backlog-navigator && node run-playwright.mjs` — all mobile specs pass.

**Prerequisite**: T001 (shared helper) and T003 (fixture file) complete.

**Note on fixture path**: Mobile specs live in `e2e/mobile/` (one level deeper than desktop). They must pass an explicit path to the shared helper: `join(__dirname, '..', '..', 'fixtures', 'backlog-fixture.md')`.

### Update Mobile Specs (can run in parallel — separate files)

- [x] T011 [P] Update `browse.mobile.spec.ts`: remove local `BACKLOG_PATH` + `mockGithubBacklogFetch`; add shared import with explicit fixture path `apps/backlog-navigator/e2e/mobile/browse.mobile.spec.ts`
- [x] T012 [P] Update `interaction.mobile.spec.ts`: remove local definitions; add shared import; **replace defensive conditional** (`includes('approved') ? 'specified' : 'approved'`) with `selectOption('approved')` on row 001 (guaranteed `proposed`) `apps/backlog-navigator/e2e/mobile/interaction.mobile.spec.ts`
- [x] T013 [P] Update `editor-rotation.mobile.spec.ts`: remove local definitions; add shared import with explicit fixture path `apps/backlog-navigator/e2e/mobile/editor-rotation.mobile.spec.ts`
- [x] T014 [P] Update `description-editor.mobile.spec.ts`: remove local definitions; add shared import with explicit fixture path `apps/backlog-navigator/e2e/mobile/description-editor.mobile.spec.ts`
- [x] T015 [P] Update `push.mobile.spec.ts`: remove local definitions; add shared import; **replace defensive conditional** with deterministic `selectOption('approved')` on row 001 `apps/backlog-navigator/e2e/mobile/push.mobile.spec.ts`
- [x] T016 [P] Update `pwa-offline.mobile.spec.ts`: remove local definitions; add shared import with explicit fixture path `apps/backlog-navigator/e2e/mobile/pwa-offline.mobile.spec.ts`
- [x] T017 [P] Update `screenshots.mobile.spec.ts`: remove local definitions; add shared import with explicit fixture path `apps/backlog-navigator/e2e/mobile/screenshots.mobile.spec.ts`

### Verify

- [x] T018 Run full E2E suite (desktop + mobile): `cd apps/backlog-navigator && node run-playwright.mjs` — all 14 specs pass
- [x] T019 Confirm zero live references across all e2e files: `grep -r "BACKLOG\.md" apps/backlog-navigator/e2e/` returns no output (SC-005)

**Checkpoint**: All 14 Playwright specs pass; zero BACKLOG.md references anywhere in `e2e/`.

## Phase 4: User Story 2 — Fixture Coverage Documentation

**Goal**: The fixture is self-documenting. A contributor can open `e2e/fixtures/README.md` and understand exactly what each row exists to exercise, and how to update the fixture if the format changes.

**Independent Test**: Read `e2e/fixtures/README.md` and confirm it contains: purpose statement, full coverage matrix table, update instructions, and the warning against automated regeneration.

**Prerequisite**: T003 (fixture file exists).

- [x] T020 Create fixtures README documenting each row's purpose, the coverage matrix, format-change instructions, and the "hand-curated only" warning `apps/backlog-navigator/e2e/fixtures/README.md`

**Checkpoint**: README exists alongside the fixture; it documents all 12 rows and the coverage invariants (one per workflow state, one per category).

## Phase 5: User Story 3 — Verify Round-Trip Gate Preserved

**Goal**: Confirm `liveBacklog.roundtrip.test.ts` is unchanged and continues to read the live `BACKLOG.md`. The refactor MUST NOT inadvertently modify this file.

**Independent Test**: Run `pnpm test` in `apps/backlog-navigator` and confirm `liveBacklog.roundtrip.test.ts` passes; inspect the file to confirm it still references the live path.

**Prerequisite**: All Phase 2–4 tasks complete (so the refactor is done and we can verify no collateral damage).

- [x] T021 Verify `liveBacklog.roundtrip.test.ts` is unmodified: confirm it references `../../../../../BACKLOG.md` (not the fixture path) — `grep "BACKLOG" apps/backlog-navigator/src/parser/__tests__/liveBacklog.roundtrip.test.ts`
- [x] T022 Run Vitest unit tests: `cd apps/backlog-navigator && pnpm test` — `liveBacklog.roundtrip.test.ts` passes with the live `BACKLOG.md`

**Checkpoint**: Vitest passes; round-trip gate reads live file; no fixture reference appears in the source of that test.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence capture, blog post, and PR creation.

**Prerequisite**: All previous phases complete.

### Final Verification

- [x] T023 Run `task verify` (lint + typecheck + test) and confirm all steps pass
- [x] T024 Confirm SC-005 one more time on the clean state: `grep -r "BACKLOG\.md" apps/backlog-navigator/e2e/` — must return zero results `specs/245-navigator-e2e-fixture/evidence/validation-output.txt`

### Evidence Collection

- [x] T025 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/245-navigator-e2e-fixture/evidence/test-summary.md`

  YAML front matter must include: `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body must include: Playwright pass counts (by project: desktop / mobile), Vitest pass counts, key scenarios verified.

- [x] T026 Create usage demonstration showing before/after grep output (confirms no BACKLOG.md references in e2e/) and a sample `mockGithubBacklogFetch` call from the new shared helper `specs/245-navigator-e2e-fixture/evidence/usage-example.md`

### Media Content

- [x] T027 Create feature blog post using cached opener from `evidence/opening-context.md` (copy Hook, What We're Building, How It Fits, Key Decisions verbatim; write By the Numbers from test-summary.md) `specs/245-navigator-e2e-fixture/media/shipped-post.md`

### PR Creation

- [ ] T028 Create PR and publish blog: run `/speckit.pr`

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

## Dependencies

### Phase Dependencies

- **Phase 1** (T001–T002): No dependencies — start immediately
- **Phase 2** (T003–T010): Depends on T001 (shared helper). T003 (fixture) must precede T004–T008; T004–T008 can run in parallel with each other
- **Phase 3** (T011–T019): Depends on T001 + T003. T011–T017 can run in parallel with each other (separate files)
- **Phase 4** (T020): Depends on T003 (fixture must exist to document)
- **Phase 5** (T021–T022): Depends on Phases 2–4 being complete (verify no collateral damage)
- **Phase 6** (T023–T028): Depends on all previous phases

### Parallel Opportunities Within Phases

```bash
# Phase 2 — after T003 fixture is written, these 5 run in parallel:
T004: browse.spec.ts
T005: interaction.spec.ts
T006: a11y.spec.ts
T007: realWrite.spec.ts
T008: prMode.spec.ts

# Phase 3 — all 7 mobile specs run in parallel:
T011: browse.mobile.spec.ts
T012: interaction.mobile.spec.ts   ← includes conditional removal
T013: editor-rotation.mobile.spec.ts
T014: description-editor.mobile.spec.ts
T015: push.mobile.spec.ts          ← includes conditional removal
T016: pwa-offline.mobile.spec.ts
T017: screenshots.mobile.spec.ts
```

## Implementation Strategy

### Incremental Delivery

1. **Phase 1** — Write and typecheck the shared helper. This is the only file that all 14 specs depend on; get it right first.
2. **Phase 2** — Author the fixture (T003), then update desktop specs in parallel (T004–T008). Run desktop E2E (T009). This is the minimum viable fix — CI is already stabilised after this phase.
3. **Phase 3** — Update mobile specs in parallel (T011–T017). The two conditional-removal tasks (T012, T015) are the trickiest; review those last if working sequentially.
4. **Phase 4** — Write the README. Quick task, can overlap with Phase 3 if working in parallel.
5. **Phase 5** — Verify the round-trip gate is untouched. Fast sanity check.
6. **Phase 6** — Evidence + blog post + PR.

### Key Risk

The fixture must exactly replicate the BACKLOG.md heading structure (scoring legend, epics table, items table in that order). If the preamble is missing or the column order is wrong, the parser will emit warnings and tests may behave unexpectedly. Cross-check the fixture against the live file structure before updating any spec.

### Commit Strategy

- Commit after T001 (helper alone — reviewable in isolation)
- Commit after T003 (fixture alone — reviewable in isolation)  
- Commit after T009 (desktop specs + first E2E green)
- Commit after T018 (mobile specs + full E2E green)
- Commit after T020 (README)
- Final commit after evidence collection
