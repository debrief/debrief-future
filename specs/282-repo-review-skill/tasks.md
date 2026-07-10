# Tasks: Repeatable Whole-Repo Review Skill (`/repo-review`)

**Feature**: 282-repo-review-skill | **Branch**: `claude/code-review-plan-95vovz`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

This feature ships **skill assets + one typed Python helper**, not runtime product code. The
"acceptance test" for the skill markdown itself is the inaugural review run (SC-001..SC-007);
the Python helper and structural checks have real pytest coverage.

## Evidence Requirements

**Evidence Directory**: `specs/282-repo-review-skill/evidence/`
**Media Directory**: `specs/282-repo-review-skill/media/`

Feature type: **Infrastructure + CLI** (developer tooling; a review skill plus a ledger CLI).
No UI, no Storybook, no web-shell workflow — evidence is config samples, CLI transcripts,
validation output, and a real inaugural-run report excerpt.

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | pytest results for `tests/repo_review/` (validation, reconciliation, structural checks) | After all helper tests pass |
| `usage-example.md` | End-to-end: invoke `/repo-review`, then triage + `/repo-review.fix` on one finding | After inaugural run |
| `cli-demo.txt` | Terminal transcript of `review-ledger.py validate / reconcile / record-fix-pr` | After helper complete |
| `ledger-sample.yaml` | A representative post-run ledger (2–3 findings, mixed statuses) | After inaugural run |
| `report-excerpt.md` | Quick-wins + one themed finding + methodology block from the real inaugural report | After inaugural run |
| `validation-output.txt` | `review-ledger.py validate` output for a valid and a deliberately-corrupt ledger | After helper complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook mermaid + What/How/Decisions) | During `/speckit.plan` (done) |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR #669 in debrief-future (already open on this branch) — updated with evidence | Final task |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by `/speckit.pr` |

## Phase 1: Setup

**Goal**: Directory scaffolding and the two machine-readable config assets that everything
else references (tier map, severity rubric). No behaviour yet.

- [ ] T001 Create skill-asset and artefact directory tree with `.gitkeep` files `.claude/review/playbooks/.gitkeep`, `docs/project_notes/reviews/.gitkeep`, `tests/repo_review/fixtures/.gitkeep`
- [ ] T002 [P] Author the machine-readable tier map — map every top-level source directory (`shared/`, `services/`, `apps/`, `scripts/`, `preview/`, `tools/`, `contrib/`) to tier 1/2/3 per plan.md Structure Decision `.claude/review/tier-map.yaml`
- [ ] T003 [P] Author the severity × effort rubric — Critical/High/Medium/Low defined in terms of user impact and data-loss risk, S/M/L effort definitions (FR-006) `.claude/review/severity-rubric.md`
- [ ] T004 [P] Add pytest package marker for the helper test suite `tests/repo_review/__init__.py`

## Phase 2: Foundation (Ledger schema + validating helper — blocks all stories)

**Goal**: The findings ledger contract and the typed Python helper that validates it. Every
run and every fix-handoff routes ledger writes through this helper, so it must exist and be
tested before any story that reads or writes findings. Corrupt-ledger-halts and
validate-on-write behaviour lands here.

**⚠️ This phase blocks Phases 3–8.** Ledger schema + helper are the shared substrate.

### Contract & schema

- [ ] T005 Copy the ledger JSON Schema from the contract into the runtime asset location (single source the helper loads) `.claude/review/ledger.schema.json`

### Typed helper — models & validation (FR-008)

- [ ] T006 Define strict-typed ledger dataclasses (Ledger, LedgerEntry, Location, RunRef) narrowing `yaml.safe_load` output at the boundary per Article XV.5 and data-model.md `scripts/review-ledger.py`
- [ ] T007 Implement `load()` — read YAML, jsonschema-validate against `ledger.schema.json`, narrow to dataclasses; raise a typed `LedgerCorruptError` with the jsonschema error path on failure (FR-008 halt-not-regenerate) `scripts/review-ledger.py`
- [ ] T008 Implement `save()` — validate the full document, sort findings by ID, atomic write (temp file + rename) per R-008 `scripts/review-ledger.py`
- [ ] T009 Implement `validate` subcommand (CLI entry) — exit 0 on valid, exit 1 printing the jsonschema error path (fix-handoff.md CLI contract) `scripts/review-ledger.py`

### Tests (foundation)

- [ ] T010 [P][test] Golden valid-ledger fixtures + assert `load()` accepts them and round-trips through `save()` unchanged (ordering normalised) `tests/repo_review/test_ledger_validation.py`
- [ ] T011 [P][test] Invalid-ledger fixtures (bad ID pattern, unknown enum, accepted-risk without reason, duplicate IDs, id ≥ next_id) each raise `LedgerCorruptError` `tests/repo_review/test_ledger_validation.py`
- [ ] T012 [P][test] Structural check: every playbook heuristic ID unique across playbooks and matches `^(CC|CB|TD|TQ)-\d+$` (guards R-004; will pass vacuously until Phase 3 adds playbooks, then enforces) `tests/repo_review/test_playbook_structure.py`
- [ ] T013 [P][test] Structural check: `tier-map.yaml` covers every top-level source directory and assigns no unknown paths (FR-003) `tests/repo_review/test_tier_map.py`

**Checkpoint**: `uv run pytest tests/repo_review/` green; `python scripts/review-ledger.py validate` works against a fixture ledger.

## Phase 3: User Story 1 — Trustworthy Verified-Only Report (P1)

**Goal**: Invoking `/repo-review` on a clean tree produces a dated report in
`docs/project_notes/reviews/` containing only adversarially-verified findings, each with
file:line evidence, severity, effort, and a coverage manifest — the core value proposition.

**Independent test**: Run `/repo-review`; spot-check 10 random findings against the code and
confirm all are real and correctly located (SC-001); confirm the coverage manifest accounts
for 100% of Tier 1 files (SC-002).

### Dimension playbooks (the review criteria — evolve by PR)

- [ ] T014 [P] Constitution-conformance playbook — turn each CONSTITUTION.md article (read at authoring time) into falsifiable checks with `CC-NN` heuristic IDs; include Article IV.5 boundary-type derivation, services-never-touch-UI, provenance, schema-tests-mandatory, offline-by-default `.claude/review/playbooks/constitution.md`
- [ ] T015 [P] Correctness-bug playbook — per-subsystem hunt heuristics with `CB-NN` IDs: async/race in host orchestration, data loss at serialisation boundaries, error-path handling in import pipelines, write-path atomicity `.claude/review/playbooks/correctness.md`
- [ ] T016 [P] Tech-debt playbook — #172 regression categories (dependency skew, type duplication, config drift, logging hygiene, workspace membership) + dead code, `TD-NN` IDs, framed as a regression check against the #172 end state `.claude/review/playbooks/tech-debt.md`
- [ ] T017 [P] Test-quality playbook — behaviour-vs-mock rubric, schema round-trip mandate compliance, untested-critical-path heuristics, `TQ-NN` IDs `.claude/review/playbooks/test-quality.md`

### Report template

- [ ] T018 Author the report template mirroring the eleven required sections + front-matter contract in `contracts/report-structure.md` `.claude/review/report-template.md`

### Workflow orchestration (recon → review→verify pipeline → synthesis)

- [ ] T019 Author the Workflow orchestration script — Phase A recon (work-list = subsystem × tier × dimension + playbook excerpts), Phase B `pipeline(cells, reviewStage, verifyStage)` with StructuredOutput candidate + adversarial-verifier schemas, Phase D synthesis stub; log per-phase spend + shortfalls into the coverage manifest, never trim (FR-004, FR-012, R-007) `.claude/review/workflow.js`
- [ ] T020 Define the candidate and verdict StructuredOutput JSON schemas the reviewer/verifier agents are forced to emit (dimension, title, failure_scenario, locations, heuristic, proposed severity / refuted+reason) — inline in the workflow script `.claude/review/workflow.js`

### Main skill command

- [ ] T021 Author `/repo-review` command — clean-tree gate (FR-013, R-009), capture git_sha + timestamp, invoke the workflow, enforce write boundary (only `docs/project_notes/reviews/` this phase), generated-file attribution rule (FR-014), synthesis writes report from template + assigns first-run ledger entries via the helper `.claude/commands/repo-review.md`
- [ ] T022 Synthesis: severity/effort assignment from the rubric, dedup, and coverage-manifest emission accounting for every tier-1 file (SC-002); dimension chapters appear even when empty (US1-S7) — encoded in the command's synthesis instructions `.claude/commands/repo-review.md`

**Checkpoint**: inaugural `/repo-review` run produces a valid report + first ledger; 10-finding spot-check passes (SC-001); coverage manifest complete (SC-002).

## Phase 4: User Story 2 — Ledger-Backed Delta Re-runs (P2)

**Goal**: A re-run reconciles confirmed findings against the prior ledger — matching by
defect identity (not line numbers), marking disappeared defects `fixed`, suppressing
`accepted-risk` re-detections — and opens the report with a delta section.

**Independent test**: After a first run, fix one finding, mark one `accepted-risk`, plant one
new defect, re-run; verify all three are classified correctly (SC-003).

### Reconciliation logic (helper)

- [ ] T023 Implement `reconcile` subcommand — stage-1 mechanical match on `(dimension, module_path, defect_slug)`, refresh line numbers on matches, mark ledger entries whose defect is absent from the run's findings as `fixed` with the run ref, emit unmatched-candidates + unmatched-open-entries JSON for stage-2 agent pairing (R-003, fix-handoff.md CLI) `scripts/review-ledger.py`
- [ ] T024 Implement pairing application — accept the synthesis agent's explicit stage-2 pairings, link them, and assign fresh `RR-NNN` (bump `next_id`) to genuinely new candidates (R-003) `scripts/review-ledger.py`

### Tests

- [ ] T025 [P][test] Reconciliation cases: exact-match refreshes lines; disappeared defect → `fixed`; line-drifted same defect still matches; new defect → new ID; `accepted-risk` re-detection stays suppressed (US2 scenarios + SC-003) `tests/repo_review/test_reconciliation.py`
- [ ] T026 [P][test] First-run behaviour: reconcile with no prior ledger creates the ledger and assigns IDs from `RR-001` (US2-S4) `tests/repo_review/test_reconciliation.py`
- [ ] T027 [P][test] Hand-edit honoured: an entry hand-set to `accepted-risk` survives reconciliation and is not re-opened (US2-S5) `tests/repo_review/test_reconciliation.py`

### Wire into the run

- [ ] T028 Synthesis calls `reconcile` + applies stage-2 pairings before writing; report gains the Delta Summary section (new/resolved/still-open by severity) and the "resolved since last review" + "accepted risks re-confirmed" lists (US2-S2/S3) `.claude/commands/repo-review.md`

**Checkpoint**: controlled re-run test classifies fix / accept-risk / new-defect correctly (SC-003).

## Phase 5: User Story 4 — One-Command Fix Handoff (P2)

**Goal**: `/repo-review.fix RR-NNN` loads a ledger entry and fast-tracks fix → test → PR in
the `/bugfix` shape, recording the PR URL, with no re-investigation of the defect.

**Independent test**: Take one confirmed finding, invoke `/repo-review.fix` in a fresh
session, and verify the PR fixes the described defect using only the ledger entry + code
(SC-009).

- [ ] T029 Implement `record-fix-pr` subcommand — set `fix_pr`, refuse unknown or non-`open` IDs, validate whole file before atomic write (R-008, fix-handoff.md CLI) `scripts/review-ledger.py`
- [ ] T030 [P][test] `record-fix-pr` sets the URL on an open entry, leaves status `open`, and rejects unknown/non-open IDs and non-GitHub URLs `tests/repo_review/test_reconciliation.py`
- [ ] T031 Author `/repo-review.fix` command mirroring `bugfix.md` front-matter + flow: normalise IDs, hard-halt preconditions (missing/corrupt ledger, unknown ID, non-open status, already-has-fix_pr), already-resolved short-circuit, batch handling, fix → test → `task verify` → PR → `record-fix-pr` (FR-016, fix-handoff.md) `.claude/commands/repo-review.fix.md`

**Checkpoint**: one real ledger finding taken to a merged-quality PR from the entry alone (SC-009); ledger records the PR URL, status stays `open`.

## Phase 6: User Story 5 — Themes & Prevention Guards (P2)

**Goal**: Synthesis clusters findings sharing a root pattern into named themes and proposes,
per theme, one typed permanent guard (lint rule / CI gate / CLAUDE.md instruction /
constitution amendment / playbook update) worded to be implementable without re-analysis.

**Independent test**: On a run with ≥ 2 multi-finding themes, verify the report's prevention
section gives each theme a typed, concrete guard proposal (SC-010).

- [ ] T032 Extend synthesis instructions — cluster confirmed findings (≥ 2 members) into themes with a slug, pattern paragraph, and member IDs; write `theme` onto each ledger entry (FR-017, data-model.md Theme) `.claude/commands/repo-review.md`
- [ ] T033 Add the `## Themes & Prevention` report section — one typed GuardProposal per theme with concrete detail (rule identifiers / draft text), marked advisory (guard adoption is a separate PR — FR-011/FR-017) `.claude/review/report-template.md`
- [ ] T034 Record adopted-guard effectiveness — GuardProposal `adopted_in` back-reference so a later run's delta can report whether the theme produced new findings (US5-S4); document the field in the report template `.claude/review/report-template.md`

**Checkpoint**: a run with clusters emits typed, concrete guard proposals; adopting one and re-running shows the guard-effectiveness note (SC-010).

## Phase 7: User Story 3 — Evidence-Backed Quantitative Claims (P3)

**Goal**: Tech-debt and test-quality claims cite real tool output (knip, dependency audit,
stricter-than-CI lint, coverage) and suspicious tests are validated by mutation spot-checks
in disposable worktrees; tool failures degrade claims to qualitative, never silently.

**Independent test**: Run the review and verify the tech-debt chapter cites knip + dependency
audit output, the test-quality chapter cites real coverage %, and ≥ 1 suspicious test was
mutation-validated.

### Report-only evidence configs (hermetic — never touch repo configs, FR-011)

- [ ] T035 [P] Strict ruff config extending the repo select-set (`B`, `S`, `PERF`, `RUF`, `SIM`) for the report-only lint pass (R-005) `.claude/review/ruff-strict.toml`
- [ ] T036 [P] Strict ESLint flat config layering `@typescript-eslint/strict-type-checked` + `no-floating-promises` family over the repo config (R-005) `.claude/review/eslint-strict.config.mjs`

### Evidence phase in the workflow

- [ ] T037 Add the Phase C evidence stage — run knip (existing `knip.json`), a cross-file dependency-version audit (reuse #172 skew categories), and the two strict-lint passes; capture raw outputs to `docs/project_notes/reviews/evidence/<date>/`; treat all hits as *leads* requiring verification, not findings (R-005, FR-010) `.claude/review/workflow.js`
- [ ] T038 Add coverage measurement — `uv run pytest --cov --cov-report=json` and per-package `vitest --coverage` (JSON summary), excluding Playwright E2E; synthesis names least-covered Tier 1 modules with numbers (US3-S2, R-010) `.claude/review/workflow.js`
- [ ] T039 Add mutation spot-checks — for each reviewer-flagged suspicious test, spawn a `isolation: 'worktree'` agent that breaks the code under test, re-runs only that test file, and confirms the finding only if the test still passes; worktree auto-discarded (US3-S3, R-006) `.claude/review/workflow.js`
- [ ] T040 Graceful degradation — any evidence tool failure downgrades the affected claims to qualitative and is recorded in the Methodology section; never blocks the run (US3-S4, FR-010) `.claude/commands/repo-review.md`

**Checkpoint**: report's tech-debt + test-quality chapters cite real tool numbers; ≥ 1 mutation spot-check ran; a simulated tool failure appears as an explicit qualitative downgrade.

## Phase 8: User Story 6 — Memory Integration & Playbook Self-Calibration (P3)

**Goal**: Confirmed Critical/High correctness bugs flow into `bugs.md`, ≥ 3-finding themes
mint failure-pattern docs, and each run reports per-heuristic confirmed/refuted counts with
prune/strengthen/add recommendations so the playbooks sharpen between runs.

**Independent test**: After a run, verify Critical/High correctness findings appear in
`bugs.md`; verify the methodology appendix attributes candidates to heuristics with tuning
recommendations.

- [ ] T041 Memory write-out — synthesis appends confirmed Critical/High correctness findings to `docs/project_notes/bugs.md` in the existing bullet format (date, defect, location, finding ID), and drafts a failure-pattern doc for any ≥ 3-finding theme (FR-018; extends the write boundary exactly per FR-011) `.claude/commands/repo-review.md`
- [ ] T042 Heuristic attribution — every candidate carries its generating heuristic ID (or `(unprompted)`); synthesis emits the Methodology per-heuristic confirmed/refuted table and the `## Playbook Tuning` section with prune/strengthen/add recommendations, `(unprompted)` clusters → add (FR-019, R-004) `.claude/commands/repo-review.md`
- [ ] T043 [P][test] Structural check: the Playbook Tuning recommendation logic is deterministic given attribution counts (zero-confirmed → prune; high-yield → strengthen; recurring unprompted → add) — unit-test the pure helper that computes recommendations `tests/repo_review/test_playbook_structure.py`

**Checkpoint**: a run appends to `bugs.md`, drafts a failure-pattern doc for a large theme, and its methodology names prune/strengthen/add heuristics (SC-011).

## Phase 9: Polish & Cross-Cutting Concerns

**Goal**: Prove the feature works end-to-end via a real inaugural run, capture evidence, run
CI green, write the feature post, and open/refresh the PR.

### Full verification

- [ ] T044 Run `task verify` (ruff + pyright + ESLint + pytest + vitest + Playwright) and confirm the helper + structural tests pass with the rest of the suite green (CLAUDE.md "Before Pushing")
- [ ] T045 Execute the inaugural `/repo-review` run on a clean tree; confirm report + ledger + evidence dir are produced and the coverage manifest is complete (SC-002); this run is both dogfood and the source of the evidence artifacts below

### Evidence Collection

- [ ] T046 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct` `specs/282-repo-review-skill/evidence/test-summary.md`
- [ ] T047 Create usage demonstration — invoke `/repo-review`, triage a finding, run `/repo-review.fix` on it `specs/282-repo-review-skill/evidence/usage-example.md`
- [ ] T048 [P] Capture ledger helper CLI transcript (`validate` / `reconcile` / `record-fix-pr`) `specs/282-repo-review-skill/evidence/cli-demo.txt`
- [ ] T049 [P] Capture `validate` output for a valid and a deliberately-corrupt ledger `specs/282-repo-review-skill/evidence/validation-output.txt`
- [ ] T050 [P] Capture a representative post-run ledger sample (2–3 findings, mixed statuses) `specs/282-repo-review-skill/evidence/ledger-sample.yaml`
- [ ] T051 [P] Capture a report excerpt (quick-wins + one themed finding + methodology block) from the real inaugural report `specs/282-repo-review-skill/evidence/report-excerpt.md`

### Documentation

- [ ] T052 Add an ADR recording the review-ledger design (YAML+JSON-Schema over LinkML rationale, defect-identity reconciliation, verified-only bar) `docs/project_notes/decisions.md`

### Media Content

- [ ] T053 Create feature blog post via the Content Specialist — first three sections copied verbatim from `evidence/opening-context.md`, remaining sections (By the Numbers, Lessons Learned, What's Next) from evidence `specs/282-repo-review-skill/media/shipped-post.md`

### PR Creation

- [ ] T054 Create PR and publish blog: run `/speckit.pr` (updates the existing PR #669 with evidence and opens the debrief.github.io blog PR)

**Task T054 must run last. It depends on all evidence and media tasks being complete.**

## Dependencies

**Phase order (story priority)**: Setup → Foundation → US1 (P1) → US2 (P2) → US4 (P2) →
US5 (P2) → US3 (P3) → US6 (P3) → Polish.

**Hard blocks**:

- **Phase 2 (Foundation) blocks Phases 3–8** — the ledger schema and validating helper are
  the shared substrate; nothing reads or writes findings without them.
- **Phase 3 (US1) is the MVP** and must precede all other stories: US2 reconciles *against*
  the ledger US1 creates; US4 fixes *findings* US1 produces; US5/US6 enrich US1's synthesis.
- **T023–T024 (reconcile)** depend on T006–T008 (ledger models/load/save).
- **T031 (`/repo-review.fix`)** depends on T029 (`record-fix-pr`) and on US1 having produced
  a ledger to read.
- **T032–T034 (themes)** and **T041–T042 (memory/calibration)** extend the synthesis
  instructions authored in T021–T022 and the report template in T018.
- **T037–T040 (evidence phase)** extend the workflow authored in T019.
- **Phase 9 (Polish)** depends on all prior phases; **T045 (inaugural run)** must precede the
  evidence-capture tasks T046–T051; **T054 (`/speckit.pr`)** is strictly last.

**Parallelizable**:

- Phase 1: T002/T003/T004 in parallel.
- Phase 2 tests: T010/T011/T012/T013 in parallel (after helper code T006–T009).
- Phase 3: all four playbooks T014/T015/T016/T017 in parallel (independent files).
- Phase 7 configs: T035/T036 in parallel.
- Evidence capture: T048/T049/T050/T051 in parallel (independent files).

## Implementation Strategy

**Incremental delivery** — each story is an independently valuable increment:

1. **MVP = Setup + Foundation + US1** (T001–T022). At this point `/repo-review` runs and
   produces a trustworthy verified-only report + first ledger. This alone delivers the core
   value; everything after compounds it. Ship/dogfood here before proceeding.
2. **US2** (T023–T028) makes re-runs meaningful (deltas, resolution tracking) — the step
   that turns a one-off audit into a repeatable capability.
3. **US4** (T029–T031) closes the loop from finding to merged fix — the highest-leverage
   value-capture mechanism (report → fixed code in one command).
4. **US5** (T032–T034) adds prevention (guards per theme) — turns point findings into
   permanent gates.
5. **US3** (T035–T040) hardens the tech-debt and test-quality dimensions with tool-grounded
   numbers; valuable but the review is usable without it.
6. **US6** (T041–T043) feeds institutional memory and sharpens the playbooks over time.
7. **Polish** (T044–T054) proves it end-to-end on the real repo and ships.

**Dogfooding note**: T045 runs the skill against this very repo. The inaugural run's own
findings, ledger, and report double as the feature's evidence — the most honest possible
demonstration that the review works. Expect it to be expensive (multi-million tokens); that
is designed-for and instrumented (FR-012, SC-007), not a problem to solve.

**Testing posture**: the Python helper and structural checks carry real pytest coverage
(Article VI). The skill markdown, playbooks, and workflow script are validated behaviourally
by the inaugural run against the SC-001..SC-011 criteria — there is no unit-testing a prompt,
so the acceptance test is the run itself.

**Constitution alignment**: no new dependencies (Article IX); strict typing on the helper
(Article XV); offline (Article I); spec-before-code satisfied by this feature's own speckit
trail (Article VIII). The two justified deviations (JSON-Schema-not-LinkML ledger; plain-JS
workflow script) are recorded in plan.md Complexity Tracking and will be reflected in the
ADR (T052).
