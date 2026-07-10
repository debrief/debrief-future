# Research: Repeatable Whole-Repo Review Skill (282)

All Technical Context unknowns resolved. Each decision below records what was chosen, why,
and what was rejected.

## R-001: Skill asset location

**Decision**: `.claude/review/` for playbooks, severity rubric, tier map, report template,
and workflow script; commands themselves in `.claude/commands/` per existing convention.

**Rationale**: Assets are consumed by the commands and must be versioned/reviewed by PR
(spec: "review criteria evolve by PR"). `.claude/` already hosts commands and agents, so
tooling-that-instructs-Claude has an established home there. Run-time *artefacts* (ledger,
reports) go to `docs/project_notes/reviews/` where the project keeps audits and memory files.

**Alternatives considered**: `docs/project_notes/reviews/_assets/` — rejected: mixes
instructions with outputs and puts agent-facing prompt material in the human docs tree.
`.specify/` — rejected: reserved for the speckit pipeline.

## R-002: Ledger format — YAML validated by JSON Schema

**Decision**: `docs/project_notes/reviews/ledger.yaml`, loaded with `yaml.safe_load`,
validated against `contracts/ledger.schema.json` via the existing `jsonschema` package, then
narrowed into typed Python dataclasses (Article XV.5 boundary validation).

**Rationale**: FR-008 requires hand-editability — YAML's comments and multi-line strings
beat JSON for a file the maintainer edits during triage. JSON Schema (not LinkML) because
the ledger is single-consumer dev-process metadata (justified in plan.md Complexity
Tracking). `jsonschema` and PyYAML are already in `uv.lock` — zero new dependencies
(Article IX).

**Alternatives considered**: JSON ledger — rejected (no comments, painful hand-edits).
SQLite — rejected (not diffable/reviewable in PRs, overkill for ≤ a few hundred entries).
One-file-per-finding — rejected (reconciliation and delta reporting want one atomic read).

## R-003: Defect-identity matching for reconciliation (FR-009)

**Decision**: Two-stage match. Stage 1 (mechanical, in `scripts/review-ledger.py
reconcile`): candidate key = `(dimension, module_path, defect_slug)` where `module_path` is
the file path normalised to its containing package/module and `defect_slug` is a short
kebab-case defect identifier assigned at synthesis (e.g. `relisted-boundary-type`,
`unawaited-promise-in-save`). Exact key match → same finding, refresh line numbers. Stage 2
(agent judgement): unmatched candidates plus unmatched open ledger entries in the same
dimension are handed to the synthesis agent with both descriptions to decide moved/renamed
matches; only its explicit pairings link them, otherwise the candidate gets a new `RR-NNN`.

**Rationale**: Line numbers churn far too fast to key on (edge case in spec). A pure-LLM
match on every pair is expensive and non-deterministic; a pure-mechanical match misses file
moves. The two-stage split makes the common case deterministic and testable (pytest) and
reserves judgement for the residue.

**Alternatives considered**: Content-hash of the offending snippet — rejected: any
reformat breaks it. Fuzzy text similarity thresholds — rejected: untunable, silently wrong;
explicit agent pairing is auditable in the run's working notes.

## R-004: Heuristic ID scheme (FR-019)

**Decision**: Per-playbook prefixes — `CC-*` (constitution conformance), `CB-*`
(correctness bugs), `TD-*` (tech debt), `TQ-*` (test quality) — numbered sequentially,
never reused (retired heuristics keep their ID with a `retired:` marker and the run/PR that
retired them). Every candidate a reviewer emits must cite the heuristic ID that prompted it;
`(unprompted)` is allowed and is itself a signal — recurring unprompted finds in the tuning
appendix become "add a heuristic" recommendations.

**Rationale**: Stable IDs make the confirmed/refuted attribution mechanical and let tuning
PRs reference exactly what changed. The retired-not-deleted rule preserves cross-run
comparability of the tuning appendix.

**Alternatives considered**: Free-text heuristic names — rejected: attribution becomes
string-matching guesswork across runs.

## R-005: Stricter-than-CI lint configuration (FR-010)

**Decision**: Report-only lint passes using dedicated configs shipped as skill assets, never
touching the repo's real configs: `ruff check --config .claude/review/ruff-strict.toml`
(extends repo select-set with `B` bugbear, `S` bandit-security, `PERF`, `RUF`, `SIM`) and
`eslint --config .claude/review/eslint-strict.config.mjs` (repo config +
`@typescript-eslint/strict-type-checked` + `no-floating-promises` family), both run with
output captured to the run's evidence directory. Reviewer agents treat hits as *leads* to
investigate, not findings — a lint hit still needs adversarial verification like any other
candidate.

**Rationale**: FR-011 forbids modifying lint configs; separate config files keep the strict
pass hermetic. Treating output as leads (not findings) preserves the verified-only bar —
most bugbear/security hits are noise until a human-grade failure scenario is attached.

**Alternatives considered**: Temporarily editing repo configs — rejected (FR-011, dirty
tree). `--select ALL` — rejected: thousands of style hits drown the signal; the chosen rule
families target defects, not style.

## R-006: Mutation spot-check mechanics (FR-010, US3)

**Decision**: For each reviewer-flagged suspicious test, the evidence phase spawns an agent
with `isolation: 'worktree'` (Claude Code disposable git worktree). The agent introduces a
targeted breakage in the code under test (invert a condition / return wrong value at the
asserted path), runs *only* the suspicious test file (`uv run pytest path::test` or
`pnpm vitest run <file>`), and reports pass/fail. Test still passing ⇒ mock-assertion
finding confirmed. Worktree auto-discards; the main tree is never touched.

**Rationale**: Worktree isolation is built into the runtime, keeps FR-013's clean-tree
guarantee, and scoping to the single test file keeps each spot-check to seconds/minutes.
Selective application (reviewer-flagged only) keeps this affordable — it is a verification
instrument, not a coverage sweep.

**Alternatives considered**: mutmut/Stryker full mutation testing — rejected: new
dependencies (Article IX), hours of runtime, and the spec wants targeted spot checks, not
mutation scores.

## R-007: Workflow orchestration shape (FR-004)

**Decision**: `workflow.js` implements: **Phase A recon** — one agent builds the work-list
(subsystem inventory × tier map × four dimensions) and per-cell playbook excerpts.
**Phase B review→verify pipeline** — `pipeline(cells, reviewStage, verifyStage)`: each
cell's reviewer emits schema-validated candidates (StructuredOutput), and each candidate
fans out to an adversarial verifier immediately — no barrier; verification of cell 1 runs
while cell 40 is still reviewing. **Phase C evidence** — parallel: strict lint, dependency
audit, knip, coverage runs, plus worktree mutation checks for flagged tests. **Phase D
synthesis** — single agent (highest effort) with all confirmed findings + evidence: dedup,
theme clustering, severity/effort via the rubric, guard proposals, then invokes
`scripts/review-ledger.py reconcile` and writes report + memory entries. Budget/agent-cap
shortfalls are logged per cell into the coverage manifest (FR-012: log, never trim).

**Rationale**: Matches the spec's pipelined requirement verbatim; per-cell agents keep each
context small enough for per-file depth in Tier 1; a single synthesis context is required
because theme clustering is inherently cross-finding (a legitimate barrier).

**Alternatives considered**: One agent per dimension over the whole repo — rejected:
context exhaustion guarantees shallow Tier 1 coverage. Barrier between review and verify —
rejected by spec (FR-004 "SHOULD be pipelined").

## R-008: Fix-PR recording (FR-016)

**Decision**: `scripts/review-ledger.py record-fix-pr RR-NNN <pr-url>` — sets the entry's
`fix_pr` field, refuses non-`open` entries and unknown IDs. `/repo-review.fix` calls it
after opening the PR. Status remains `open` until run-time reconciliation observes the
defect gone (FR-016's explicit division of labour).

**Rationale**: Keeps every ledger mutation behind the validated helper (schema check on
write, not just read), so hand edits and skill edits go through the same gate.

**Alternatives considered**: Fix skill edits YAML directly — rejected: bypasses validation;
two writers with different habits corrupt the file eventually.

## R-009: Clean-tree gate and run identity (FR-013, FR-007)

**Decision**: The skill's first step runs `git status --porcelain` — any output aborts with
the spec's message. Run identity = `git rev-parse HEAD` captured once and stamped into
report front matter (`git_sha`, `captured_at`), the evidence directory name, and every
ledger entry's `last_seen` run reference. Matches the existing evidence-freshness
front-matter convention (`.specify/templates/evidence/test-summary-template.md`).

## R-010: Coverage measurement commands (US3)

**Decision**: Python: `uv run pytest --cov --cov-report=json` (coverage JSON to the
evidence dir; per-package rollups computed by the synthesis phase). TypeScript:
`pnpm --filter '!@debrief/web-shell' test -- --coverage` with vitest's JSON summary
reporter per package. Playwright E2E is excluded from coverage measurement (instrumenting
it adds noise, and CLAUDE.md already separates it from unit tests).

**Rationale**: Reuses the exact test invocations CI runs (CLAUDE.md "Before Pushing"),
adding only coverage flags — no new tooling, numbers comparable across runs.
