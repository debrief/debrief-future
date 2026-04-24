---

description: "Task list for feature 209: LogPanel axe-core accessibility audit"
---

# Tasks: LogPanel Accessibility Audit (axe-core)

**Input**: Design documents from `/specs/209-logpanel-a11y-audit/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The audit Playwright spec is itself the primary test for this feature; a small vitest suite covers the post-processor.

**Organization**: Tasks grouped by user story per spec.md (US1 P1, US2 P2, US3 P3). Polish phase covers evidence, media, and PR.

---

## Evidence Requirements

**Evidence Directory**: `specs/209-logpanel-a11y-audit/evidence/`
**Media Directory**: `specs/209-logpanel-a11y-audit/media/`
**Downstream Evidence** (the feature's primary public artefact): `specs/176-log-panel-ux/evidence/a11y-audit.md`

### Feature classification

- **Type**: Infrastructure / Audit (test automation that produces a committed markdown artefact).
- **Rubric row**: closest match is **Infrastructure** (configuration sample + validation output) plus the `a11y-audit.md` as the domain-specific validation artefact.
- **Not a UI Component feature**: the LogPanel is *under audit*; we are not building a new component. No `screenshots/interaction.gif` task — the `a11y-audit.md` is the visual equivalent.

### Planned Artifacts

| Artifact | Description | Path | Captured When |
|----------|-------------|------|---------------|
| `test-summary.md` | Playwright + vitest counts with YAML front matter | `specs/209-logpanel-a11y-audit/evidence/test-summary.md` | After all tests pass |
| `usage-example.md` | Copy-pasteable `pnpm --filter @debrief/components a11y:audit` walkthrough + expected output | `specs/209-logpanel-a11y-audit/evidence/usage-example.md` | After runner works |
| `a11y-audit.md` | **Curated audit report** — coverage matrix, findings, classifications | `specs/176-log-panel-ux/evidence/a11y-audit.md` | After final audit run (zero fix-now remaining) |
| `a11y-audit-before.md` | Snapshot of the initial audit (pre-fixes) for before/after comparison in the PR | `specs/209-logpanel-a11y-audit/evidence/a11y-audit-before.md` | After first audit, before any fixes |
| `runner-output.txt` | Terminal transcript of a clean end-to-end run showing exit code 0 | `specs/209-logpanel-a11y-audit/evidence/runner-output.txt` | After final audit run |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building / How It Fits / Key Decisions) | During `/speckit.plan` (already done) |
| `media/shipped-post.md` | Feature post combining the cached opener + ship-time evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with the curated audit + fixes + evidence | Final task in Polish phase |
| Blog PR | PR in `debrief/debrief.github.io` with the shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire the new devDep, expose the runner as a package script, and gitignore the transient JSON dump. Everything in this phase touches `@debrief/components` package metadata or repo-root config — no feature source code yet.

- [ ] T001 Add `@axe-core/playwright` devDependency pinned to `^4.8.5` in `shared/components/package.json`
- [ ] T002 [P] Add `a11y:audit` and `a11y:audit:run-only` npm scripts (per `quickstart.md`) in `shared/components/package.json`
- [ ] T003 [P] Gitignore the transient JSON dump path (`specs/176-log-panel-ux/evidence/a11y-audit.json`) in `.gitignore`
- [ ] T004 Run `pnpm install` at repo root and confirm lockfile updates cleanly `pnpm-lock.yaml`

**Checkpoint**: `pnpm --filter @debrief/components exec axe --version` (or equivalent) resolves; new scripts visible via `pnpm --filter @debrief/components run`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the shared type definitions and the Storybook-build prerequisite that every user story depends on. No user-visible behaviour lands here.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [P] Define TypeScript types mirroring `contracts/axe-report.schema.json` (`AuditRun`, `CoverageEntry`, `Finding`, `AffectedPair`, `Theme`, `Severity`, `Classification`) in `shared/components/src/a11y/types.ts`
- [ ] T006 [P] Add the JSON Schema file to the package at `shared/components/src/a11y/axe-report.schema.json` (copy from `specs/209-logpanel-a11y-audit/contracts/axe-report.schema.json` so consumers can import it without crossing the `specs/` boundary)
- [ ] T007 Verify static Storybook builds cleanly via `pnpm --filter @debrief/components build-storybook` (pre-existing capability — sanity-check only; no code change expected)

**Checkpoint**: Shared types compile; `shared/components/storybook-static/` exists after build; user story work can begin.

---

## Phase 3: User Story 1 — Produce a trustworthy audit report (Priority: P1)

**Goal**: A single command produces a coverage matrix and an aggregated violations table for every LogPanel/ParameterEditor story in every supported theme, writing a machine-readable JSON dump and a curated human-readable markdown at `specs/176-log-panel-ux/evidence/a11y-audit.md` with YAML front matter.

**Independent Test**: After T017 completes, `specs/176-log-panel-ux/evidence/a11y-audit.md` exists with front matter (`git_sha`, `captured_at`, `axe_version`, `storybook_version`), a coverage matrix showing every `(story, theme)` cell filled, and an aggregated findings list. Any LogPanel story missing from the matrix fails the test.

### E2E Tests for User Story 1 (REQUIRED for UI components) 🎭

> The audit runner itself is the E2E test. This is not optional for this feature — it is the feature.
>
> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). `shared/components/playwright.config.ts` is already Claude Code–aware (`CLAUDE_CODE` env var). Full details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T008 [P][test] [US1] Create Playwright spec that fetches `/index.json`, filters by `importPath.startsWith('./src/LogPanel/')`, iterates each story × `{light, dark, vscode}`, and runs `AxeBuilder.include('#storybook-root').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()` `shared/components/e2e/LogPanel-a11y-axe.spec.ts`
- [ ] T009 [US1] Extend the spec to serialise results to the v2 schema and write the JSON dump to `specs/176-log-panel-ux/evidence/a11y-audit.json` `shared/components/e2e/LogPanel-a11y-axe.spec.ts`
- [ ] T010 [US1] Implement the non-zero-exit gate: if any `Finding.severity ∈ {serious, critical}` and `wcag_tags` include a `wcag21aa` tag, throw at end-of-spec `shared/components/e2e/LogPanel-a11y-axe.spec.ts`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Implement the `writeAuditRun(coverage, violations): AuditRun` aggregation helper — de-dups violations by `rule_id`, builds `pairs[]`, records `selector_varies` `shared/components/scripts/a11y-audit-lib.ts`
- [ ] T012 [P] [US1] Implement `readExistingClassifications(markdownPath): Map<rule_id, {classification, rationale, backlog_ref}>` parser for preserving triage across re-runs `shared/components/scripts/a11y-audit-lib.ts`
- [ ] T013 [US1] Implement the post-processor entrypoint: read JSON dump → merge classifications from existing markdown → render markdown per `contracts/a11y-audit.md.template.md` → write to `specs/176-log-panel-ux/evidence/a11y-audit.md` `shared/components/scripts/a11y-audit-report.ts` (depends on T011, T012)
- [ ] T014 [P][test] [US1] Vitest unit coverage for `a11y-audit-lib.ts` (aggregation, classification-preservation round-trip, unknown-rule default to `fix-now`) `shared/components/src/a11y/__tests__/a11y-audit-lib.test.ts`
- [ ] T015 [US1] Wire the `a11y:audit` script to run: `build-storybook` → `playwright test LogPanel-a11y-axe` → `tsx scripts/a11y-audit-report.ts` `shared/components/package.json` (finalises T002)
- [ ] T016 [US1] Execute the first audit end-to-end and confirm the committed markdown has a complete coverage matrix with zero gaps `pnpm --filter @debrief/components a11y:audit`
- [ ] T017 [US1] Copy the first-run report (before any triage or fixes) to `specs/209-logpanel-a11y-audit/evidence/a11y-audit-before.md` — this is the "before" snapshot for the PR

**Checkpoint**: US1 delivers a reproducible audit report. Classifications default to `fix-now`; no remediation yet. Runner exit code depends on findings — may be non-zero and that is expected going into US2.

---

## Phase 4: User Story 2 — Close the "fix-now" findings (Priority: P2)

**Goal**: Every finding classified `fix-now` in the initial audit is closed on this branch. Moderate/minor findings are either accepted with rationale or deferred with a backlog row. Re-running the audit produces zero `serious`/`critical` violations at WCAG 2.1 AA, and the runner exits zero.

**Independent Test**: After T023 completes, re-running `pnpm --filter @debrief/components a11y:audit` exits 0 and the committed `specs/176-log-panel-ux/evidence/a11y-audit.md` shows `fix_now_remaining: 0` in its front matter. Every `deferred` finding cites a valid `#NNN` backlog row.

### Implementation for User Story 2

- [ ] T018 [US2] Triage pass: for every Finding, set `Classification` to `fix-now` / `accepted` / `deferred` and fill `Rationale` directly in the committed markdown `specs/176-log-panel-ux/evidence/a11y-audit.md`
- [ ] T019 [P] [US2] For every `deferred` Finding, add a new backlog row under the Tech Debt category and link it from the Finding's `Backlog ref` field `BACKLOG.md`
- [ ] T020 [US2] Implement remediations for each `fix-now` Finding — scoped edits to `shared/components/src/LogPanel/**` (no cross-cutting refactors; anything architectural becomes a new `deferred` row) `shared/components/src/LogPanel/` (multiple files; scope depends on triage output)
- [ ] T021 [P][test] [US2] Add or extend vitest cases that lock in the a11y-relevant properties of any fixed component (e.g. `aria-label` presence, colour-contrast-significant className) `shared/components/src/LogPanel/__tests__/` (paths depend on which files T020 touches)
- [ ] T022 [US2] Re-run the audit; confirm `fix_now_remaining: 0` and no `serious`/`critical` at WCAG 2.1 AA; runner exits 0 `pnpm --filter @debrief/components a11y:audit`
- [ ] T023 [US2] Spot-check the `Resolved Previously` section of the markdown to confirm the fixed rules are archived with their final classification (sanity-check that preservation works across runs) `specs/176-log-panel-ux/evidence/a11y-audit.md`

**Checkpoint**: US2 delivers a clean WCAG 2.1 AA baseline for LogPanel. Every `deferred` finding has a backlog row; every `accepted` finding has a rationale.

---

## Phase 5: User Story 3 — Keep the audit reproducible (Priority: P3)

**Goal**: A developer with a clean checkout can re-run the audit with a single command and trust it. A newly-added LogPanel story is picked up automatically with zero runner edits.

**Independent Test**: On a freshly-cloned copy of the branch, running `pnpm install && pnpm --filter @debrief/components a11y:audit` writes the markdown in place (no diff if sources have not changed) and exits 0. Adding a stub story (e.g. `LogPanel.stub.stories.tsx`) and re-running covers it automatically; reverting the stub re-archives the rule.

### Implementation for User Story 3

- [ ] T024 [US3] Execute the reproducibility smoke test: clean checkout → `pnpm install` → `pnpm --filter @debrief/components a11y:audit` → capture stdout/stderr as the reproducibility transcript `specs/209-logpanel-a11y-audit/evidence/runner-output.txt`
- [ ] T025 [P] [US3] Execute the new-story-auto-coverage smoke test: add a temporary `shared/components/src/LogPanel/StubA11y.stories.tsx` with one export, re-run the audit, confirm the new story appears in the coverage matrix, then delete the stub and re-run `shared/components/src/LogPanel/StubA11y.stories.tsx` (created and deleted — final state is deleted)
- [ ] T026 [US3] Confirm `quickstart.md` matches the shipped behaviour (commands, paths, expected output); update any drift `specs/209-logpanel-a11y-audit/quickstart.md`
- [ ] T027 [US3] Add a one-sentence pointer from `CLAUDE.md` "Before Pushing" section (or `docs/project_notes/key_facts.md`) to `specs/176-log-panel-ux/evidence/a11y-audit.md` so the audit is discoverable `docs/project_notes/key_facts.md`

**Checkpoint**: US3 delivers end-to-end reproducibility. The audit is a one-line repeatable operation; new stories are covered automatically.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final checks, evidence capture, blog post, and PR creation. Nothing in this phase should change the behaviour of the audit — only package it for review and publication.

### Cross-Cutting

- [ ] T028 Run the full CI verification chain (`task verify` or the four-step fallback in `CLAUDE.md`) and confirm all steps pass before capturing evidence
- [ ] T029 [P] Review `specs/176-log-panel-ux/evidence/a11y-audit.md` for readability — confirm the coverage matrix renders, every Finding has a fleshed-out Rationale, no stray TODOs `specs/176-log-panel-ux/evidence/a11y-audit.md`

### Evidence Collection (REQUIRED)

- [ ] T030 Capture test summary using the template at `.specify/templates/evidence/test-summary-template.md` — include vitest counts (post-processor unit tests), Playwright counts (audit spec), and the axe-level coverage from the final audit run `specs/209-logpanel-a11y-audit/evidence/test-summary.md`
- [ ] T031 [P] Create usage demonstration — one-liner invocation, expected runtime, sample of the committed markdown tail `specs/209-logpanel-a11y-audit/evidence/usage-example.md`
- [ ] T032 [P] Confirm `specs/209-logpanel-a11y-audit/evidence/a11y-audit-before.md` exists (was captured in T017) and still reflects the pre-fix state `specs/209-logpanel-a11y-audit/evidence/a11y-audit-before.md`
- [ ] T033 [P] Confirm `specs/209-logpanel-a11y-audit/evidence/runner-output.txt` exists (was captured in T024) and shows exit code 0 at the tail `specs/209-logpanel-a11y-audit/evidence/runner-output.txt`

### Media Content

- [ ] T034 Create feature blog post by spawning the Content Specialist agent (`.claude/agents/media/content.md`). The agent MUST copy `specs/209-logpanel-a11y-audit/evidence/opening-context.md` verbatim as the first three sections (`## What We're Building`, `## How It Fits`, `## Key Decisions`) and then write the remaining sections (Screenshots — here, a snippet of the coverage matrix instead of an image — By the Numbers, Lessons Learned, What's Next) from evidence `specs/209-logpanel-a11y-audit/media/shipped-post.md`

### PR Creation

- [ ] T035 Create PR and publish blog: run `/speckit.pr`

**Task T035 must run last. It depends on every other task in Phase 6 being complete, which in turn depends on US1, US2, and US3 checkpoints.**

---

## Dependencies

### Phase dependencies

- **Phase 1 (Setup)** — no blockers. All four tasks land once and never repeat.
- **Phase 2 (Foundational)** — depends on Phase 1 (needs the devDep installed). Blocks all user stories.
- **Phase 3 (US1)** — depends on Phase 2 (needs shared types + a clean Storybook build).
- **Phase 4 (US2)** — depends on Phase 3 (needs the first audit's classifications as the triage input).
- **Phase 5 (US3)** — depends on Phase 4 (the reproducibility smoke test must verify the post-fix baseline stays clean on re-run).
- **Phase 6 (Polish)** — depends on US1 + US2 + US3 checkpoints. T035 (`/speckit.pr`) is the terminal task.

### Intra-phase dependencies

- **Phase 3**: T013 depends on T011 + T012. T014 runs parallel to T011–T013 (tests are in a separate file). T015 requires T009 + T013 to exist. T016 requires T015. T017 requires T016 (can only snapshot after a successful first run).
- **Phase 4**: T018 (triage) is sequential in the same file as T023 (spot-check) — do T018 first. T019 and T021 are parallel with T020 but each `[P]` operates on different files. T022 requires T018–T021 done.
- **Phase 5**: T025 runs parallel to T024 + T026 + T027; each targets a different file.
- **Phase 6**: T030 sequential (aggregates counts from US1–US3). T031–T033 are `[P]` — different files. T034 reads `opening-context.md` (already on disk from `/speckit.plan`). T035 is last.

### Notable non-dependencies

- The post-processor tests (T014) do not depend on the audit spec (T008–T010) — they unit-test the library in isolation.
- BACKLOG.md edits (T019) do not block T020; each `deferred` finding just needs a row before PR review.

---

## Implementation Strategy

### Incremental delivery

1. **Setup + Foundational (T001–T007)** — ~1 hour. Land as one reviewable commit.
2. **US1 (T008–T017)** — biggest single phase. Land in two commits: (a) spec + post-processor scaffolding including tests (T008–T014), (b) wiring + first-run artefacts (T015–T017). Branch is shippable here as an "audit-only, no fixes yet" feature if we want a staged PR; in practice we carry straight into US2.
3. **US2 (T018–T023)** — triage → fix → verify. One commit per logical fix; a final commit that re-runs the audit and updates the markdown. If a fix turns out architectural, re-classify as `deferred` and open a backlog row rather than stretching scope.
4. **US3 (T024–T027)** — smoke tests + docs pointer. One commit.
5. **Polish (T028–T035)** — verification, evidence, blog, PR.

### Parallel opportunities

Within each phase, every `[P]`-tagged task can run concurrently because it operates on a distinct file:

- **Phase 1**: T002 + T003 in parallel (package.json vs .gitignore).
- **Phase 2**: T005 + T006 in parallel (types vs schema copy).
- **Phase 3**: T011 + T012 in parallel (both in `a11y-audit-lib.ts` — actually sequential-safe because they add different named exports, but treat as parallel only if using an editor that handles co-edits; otherwise serialise). T014 runs in parallel with T011–T013 (separate test file).
- **Phase 4**: T019 + T021 in parallel with T020 (different files).
- **Phase 5**: T024 + T025 + T026 + T027 largely parallel (different files); run T024 first if single-operator since it produces the transcript referenced by T026.
- **Phase 6**: T031 + T032 + T033 in parallel (different evidence files).

### Single-operator order (default)

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007 →
T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 →
T018 → T019 → T020 → T021 → T022 → T023 →
T024 → T025 → T026 → T027 →
T028 → T029 → T030 → T031 → T032 → T033 → T034 → T035
```

### Scope guard

Anything discovered during US2 that cannot be fixed with an edit to `shared/components/src/LogPanel/**` (e.g. a global theme token change) is **deferred**, not fixed. Open a new Tech Debt backlog row and cite it from the Finding's `Backlog ref`. This keeps the feature finite and prevents audit work from turning into a theming refactor.

### Parallel example: Phase 3 (launching the Playwright spec + post-processor library together)

```bash
# Parallel work after T007 checkpoint:
Task: "Create audit Playwright spec  shared/components/e2e/LogPanel-a11y-axe.spec.ts"   # T008
Task: "Implement aggregation helper  shared/components/scripts/a11y-audit-lib.ts"       # T011
Task: "Implement classification parser  shared/components/scripts/a11y-audit-lib.ts"     # T012
Task: "Vitest suite for post-processor  shared/components/src/a11y/__tests__/a11y-audit-lib.test.ts"  # T014
```
