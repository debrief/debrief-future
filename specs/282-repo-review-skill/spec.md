# Feature Specification: Repeatable Whole-Repo Review Skill (`/repo-review`)

**Feature Branch**: `282-repo-review-skill`
**Created**: 2026-07-10
**Status**: Draft
**Input**: User description: "Interview me to produce a plan on how I can use Claude Code to review this repo — let's discuss how the review can add value. The output will be a spec that I will pass to a future Claude Code programming session."

## Context & Interview Decisions

This spec was produced from a structured interview (2026-07-10). The decisions below are
**settled** — the implementing session should not re-litigate them, only refine mechanics.

| Decision | Choice |
|----------|--------|
| Review dimensions | All four: constitution conformance, correctness bugs, tech-debt refresh, test quality & coverage |
| Scope | Whole repo, tiered by risk |
| Tier 1 (deepest) | `shared/schemas` + generators (`shared/schemas/scripts/generate.py`, adherence tests); `services/*` Python (debrief-stac, debrief-io, debrief-calc, debrief-config, debrief-data, debrief-tools, debrief-session) |
| Tier 2 | STAC write/save paths (`@debrief/stac-writer`, saveSession, session-state), VS Code extension + web-shell hosts, shared React components |
| Tier 3 (lightest) | scripts/, tooling, preview/, docs apps (spec-navigator, backlog-navigator) |
| Output | Written report in `docs/project_notes/reviews/` + machine-readable findings ledger. **No** backlog items, GitHub issues, or fix PRs are produced by the review itself |
| Signal bar | Verified-only: every reported finding survives an adversarial refutation pass |
| Execution model | Multi-agent workflow (parallel reviewer agents per subsystem × dimension, adversarial verifiers, synthesis) |
| Evidence gathering | Static analysis suite (knip, dependency audit, extended lint), coverage measurement (pytest --cov, vitest coverage), mutation-style spot checks on suspicious tests |
| Repeatability | Findings ledger with stable IDs and status (open / fixed / accepted-risk); re-runs diff against it |
| Prioritisation | Severity (Critical/High/Medium/Low) × effort (S/M/L); report leads with a quick-wins table |
| Token budget | "Whatever it takes" — log spend per phase, never silently trim coverage |
| Prior art | #172 (March 2026 tech-debt review) is the baseline for the tech-debt dimension; existing audit docs (`stac-data-quality-audit.md`, `viewport-mutation-audit.md`) set the report register |

### Why this adds value (interview rationale)

The repo has ~200 delivered specs, ~230 Python files and ~1,300 TypeScript files, built
feature-by-feature through speckit. Per-feature review is strong; **cross-feature** review is
not — nothing currently checks whether the constitution still matches reality across the whole
codebase, whether the March 2026 debt cleanup has regressed, or whether tests written under
per-feature pressure actually verify behaviour. The value proposition is a *trustworthy* report:
verified-only findings mean the maintainer can act on it directly without re-checking each claim.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Full Review and Get a Trustworthy Report (Priority: P1)

As the project maintainer, I invoke `/repo-review` in a Claude Code session and, when it
completes, I have a single dated report in `docs/project_notes/reviews/` containing only
findings that survived adversarial verification, each with file:line evidence, a severity,
and an effort estimate — so I can act on the report without re-checking any claim myself.

**Why this priority**: This is the entire value proposition. Without a trustworthy first
report, the ledger and re-run mechanics have nothing to track.

**Independent Test**: Invoke `/repo-review` on the current main branch; verify a report is
produced, spot-check 10 randomly chosen findings against the code, and confirm all 10 are
real (correct file:line, described defect actually present).

**Acceptance Scenarios**:

1. **Given** a clean checkout of main, **When** `/repo-review` is invoked, **Then** a report is written to `docs/project_notes/reviews/YYYY-MM-DD-repo-review.md` with YAML front matter containing `git_sha` and `captured_at` (matching the existing evidence-freshness convention).
2. **Given** the review has completed, **When** the maintainer reads the report, **Then** every finding includes: stable ID, dimension, severity, effort, repo-relative file:line reference(s), a one-sentence defect statement, a concrete failure scenario (or constitution article violated), and how it was verified.
3. **Given** the four dimensions and the tier map, **When** reviewer agents are dispatched, **Then** Tier 1 areas receive per-file-depth review on all four dimensions, Tier 2 receives subsystem-level review, and Tier 3 receives a sweep pass — and the report's coverage manifest states exactly what was and was not reviewed at each depth.
4. **Given** a candidate finding from a reviewer agent, **When** the verification phase runs, **Then** an independent adversarial agent attempts to refute it against the actual code, and the finding appears in the report only if it survives; refuted candidates are counted (not listed) in the report's methodology section.
5. **Given** the review touches generated code (e.g. `shared/schemas/src/generated`), **When** a defect is found there, **Then** the finding is attributed to the generator or LinkML source, not the generated file.
6. **Given** the run completes, **When** the maintainer reads the methodology section, **Then** it records per-phase token spend, agent counts, candidate-vs-confirmed finding counts, and wall-clock duration.
7. **Given** the review finds nothing in some dimension, **When** the report is written, **Then** that dimension's chapter still appears, stating what was examined and that no confirmed findings resulted (absence of findings is itself a result, backed by the coverage manifest).

---

### User Story 2 - Re-run the Review and See Only What Changed (Priority: P2)

As the project maintainer, I re-run `/repo-review` weeks later and the new report opens with
a delta section — new findings, findings resolved since last run, findings still open — and
items I previously marked `accepted-risk` in the ledger do not reappear as findings.

**Why this priority**: Repeatability is what turns a one-off audit into an institutional
capability, but it depends entirely on US1 existing first.

**Independent Test**: After a first run, fix one ledger finding, mark another
`accepted-risk`, introduce one new defect, then re-run; verify the delta classifies all
three correctly.

**Acceptance Scenarios**:

1. **Given** a prior run's ledger exists, **When** the review completes, **Then** each confirmed finding is reconciled against the ledger: matched to an existing entry (same defect, same location ± drift) or added as new with a fresh stable ID.
2. **Given** a ledger entry whose defect no longer exists in the code, **When** reconciliation runs, **Then** the entry's status becomes `fixed` with the resolving run's date, and it appears in the report's "resolved since last review" list.
3. **Given** a ledger entry with status `accepted-risk`, **When** the same defect is re-detected, **Then** it is suppressed from the findings chapters and listed only in a one-line "accepted risks re-confirmed" appendix.
4. **Given** no prior ledger exists, **When** the review runs, **Then** it behaves as a first run (US1) and creates the ledger.
5. **Given** the ledger file, **When** a human edits a status by hand (e.g. `open` → `accepted-risk` with a reason), **Then** the next run honours the edit — the ledger is the single source of truth for finding status and is designed to be hand-editable.

---

### User Story 3 - Evidence-Backed Quantitative Claims (Priority: P3)

As the project maintainer, I want the report's claims about dead code, dependency skew, lint
gaps, and test coverage to cite actual tool output — not the model's impression — so the
tech-debt and test-quality chapters are quantitative and comparable between runs.

**Why this priority**: Reading-only review already delivers most of the value; tool-grounded
numbers harden two of the four dimensions and enable trend tracking, but the skill is usable
without them.

**Independent Test**: Run the review and verify the tech-debt chapter cites knip and
dependency-audit output, the test-quality chapter cites real coverage percentages, and at
least one suspicious test was validated by a mutation spot check.

**Acceptance Scenarios**:

1. **Given** the evidence phase, **When** it runs, **Then** knip (using the existing `knip.json`), a dependency-version audit across all `package.json`/`pyproject.toml` files (re-using the #172 skew categories), and ruff/ESLint with an agreed stricter-than-CI rule set are executed, and their raw outputs are attached under the run's evidence directory.
2. **Given** coverage measurement, **When** `pytest --cov` and vitest coverage runs complete, **Then** the test-quality chapter reports per-package coverage and names the least-covered Tier 1 modules with numbers.
3. **Given** a reviewer flags a test as suspicious (asserting mocks, tautological, or never-failing), **When** the mutation spot-check runs, **Then** the code under test is deliberately broken in a scratch worktree, the test is re-run, and the finding is confirmed only if the test still passes; the worktree is discarded afterwards.
4. **Given** any evidence tool fails to run (e.g. coverage tooling breaks), **When** the report is written, **Then** the affected claims are explicitly downgraded to qualitative and the tool failure is recorded in the methodology section — never silently omitted.
5. **Given** two runs with evidence, **When** the delta section is written, **Then** headline metrics (dead-code count, skewed-dependency count, Tier 1 coverage %) are shown side-by-side with the prior run.

---

### Edge Cases

- **Dirty working tree at invocation**: the skill refuses to start and tells the user to commit or stash — the report's `git_sha` must identify exactly what was reviewed.
- **All candidates in a dimension refuted**: the dimension chapter still appears with its coverage statement (see US1 scenario 7); the skill must not lower the verification bar to have "something to show".
- **Verification deadlock** (verifier can neither confirm nor refute): the finding is dropped from the report but kept in the run's working notes; verified-only means *confirmed*, not *unrefuted*.
- **Finding spans multiple locations** (e.g. the same re-listed boundary type in 6 files): one ledger entry with multiple location references, not six entries.
- **Location drift between runs**: reconciliation matches on defect identity (dimension + defect description + module), not raw line numbers; line numbers are refreshed on each run.
- **Agent-count or context exhaustion mid-run**: the run completes with what it has and the coverage manifest marks unreviewed areas as `not-covered-this-run`; partial coverage is reported, never silently truncated (budget decision: log, don't trim).
- **Ledger merge conflict / corrupt ledger**: the skill validates the ledger on load; on parse failure it halts with instructions rather than regenerating and losing status history.
- **Constitution amended between runs**: conformance findings cite the article text as of the run's `git_sha`; a finding against a since-deleted article is auto-resolved as `fixed (article removed)`.
- **Review of the skill's own files**: the skill's assets (`.claude/commands/repo-review.md`, playbooks, templates) are Tier 3 scope like any other tooling — no self-exemption.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a `/repo-review` skill invocable from a Claude Code session in this repo, delivered as `.claude/commands/repo-review.md` plus supporting assets (playbooks, templates, ledger schema) under a dedicated directory (proposed: `.claude/review/` or `docs/project_notes/reviews/_assets/` — implementer's choice, recorded in plan.md).
- **FR-002**: The skill MUST review four dimensions, each driven by a written playbook checked into the repo:
  - **Constitution conformance** — a checklist derived article-by-article from `CONSTITUTION.md` (including Article IV.5 boundary-type derivation / ADR-033, services-never-touch-UI, provenance, schema tests mandatory, offline-by-default), each item stated as a falsifiable check.
  - **Correctness bugs** — hunt heuristics per subsystem type (async/race in host orchestration, data loss at serialisation boundaries, error-path handling in import pipelines, atomicity in write paths).
  - **Tech-debt refresh** — the #172 categories (dependency skew, type duplication, config drift, logging hygiene, workspace membership) plus dead code, run as a regression check against the #172 end state.
  - **Test quality & coverage** — rubric distinguishing behaviour-verifying tests from mock-asserting/tautological ones; schema round-trip mandate compliance; untested critical paths.
- **FR-003**: The skill MUST apply the tier map (see Context table) and MUST emit a coverage manifest enumerating every reviewed area with its depth, and every skipped area with the reason.
- **FR-004**: The skill MUST orchestrate execution as a multi-agent workflow: recon phase (build subsystem inventory + work-list), parallel review phase (agents scoped to subsystem × dimension), verification phase (independent adversarial agent per candidate finding, prompted to refute), evidence phase (US3 tooling), synthesis phase (dedup, severity/effort assignment, report + ledger writing). Review and verification SHOULD be pipelined (a candidate verifies while other reviewers still run) rather than barriered.
- **FR-005**: A finding MUST appear in the report only after an adversarial verification agent, given the candidate and access to the code, fails to refute it and positively confirms the defect. Verifier and originating reviewer MUST be separate agent invocations.
- **FR-006**: Every reported finding MUST carry: stable ID (`RR-NNN`, monotonically assigned, never reused), dimension, severity ∈ {Critical, High, Medium, Low}, effort ∈ {S, M, L}, one or more repo-relative file:line locations, defect statement, failure scenario or violated constitution article, and verification note. Severity definitions MUST be written in terms of user impact and data-loss risk and included in the playbook so runs are consistent.
- **FR-007**: The report MUST be written to `docs/project_notes/reviews/YYYY-MM-DD-repo-review.md` with YAML front matter (`git_sha`, `captured_at`, run metrics), and MUST contain in order: delta summary (re-runs only), quick-wins table (High/Critical × S effort), per-dimension chapters, coverage manifest, methodology (spend, agent counts, candidate/confirmed/refuted counts, tool failures), accepted-risks appendix.
- **FR-008**: The system MUST maintain a machine-readable findings ledger (single YAML or JSON file under `docs/project_notes/reviews/`) where each entry has: ID, status ∈ {open, fixed, accepted-risk}, status reason (for accepted-risk), first-seen run, last-seen run, and the finding fields from FR-006. The ledger MUST be hand-editable and MUST be validated on load (halt on corruption, per edge cases).
- **FR-009**: On each run the system MUST reconcile confirmed findings against the ledger: match existing entries by defect identity (tolerant of line drift), mark disappeared defects `fixed`, suppress `accepted-risk` re-detections from the findings chapters, and add new entries with fresh IDs.
- **FR-010**: The evidence phase MUST run knip, a cross-file dependency-version audit, and stricter-than-CI lint configurations; MUST measure Python and TypeScript test coverage; and MUST support mutation spot-checks in disposable worktrees for reviewer-flagged suspicious tests. Tool failures degrade claims to qualitative with explicit notice (never blocking the run, never silent).
- **FR-011**: The review MUST NOT modify any file outside `docs/project_notes/reviews/` (and its own scratch/evidence areas). It produces no fixes, no backlog entries, no GitHub issues. Report-only is a deliberate interview decision.
- **FR-012**: The system MUST log token spend per phase and MUST NOT trim planned coverage to save tokens; if a hard limit (agent cap, context) forces partial coverage, the shortfall MUST be visible in the coverage manifest.
- **FR-013**: The skill MUST refuse to run on a dirty working tree.
- **FR-014**: Findings in generated artefacts MUST be attributed to their source (LinkML schema, generator script, template), with the generated location listed as evidence only.
- **FR-015**: The skill MUST be operable end-to-end in a Claude Code cloud session (no `gh` CLI assumptions; Playwright/coverage via the existing `run-playwright.mjs` / `uv` / `pnpm` conventions documented in CLAUDE.md).

### Key Entities

- **Review Run**: one invocation of the skill; identified by date + `git_sha`; owns a report, evidence directory, and run metrics.
- **Finding**: a confirmed defect; the unit of the ledger; carries ID, dimension, severity, effort, locations, status lifecycle (open → fixed | accepted-risk).
- **Candidate**: a reviewer-agent output that has not yet been verified; exists only inside a run; becomes a Finding or is refuted/dropped.
- **Ledger**: the machine-readable registry of all Findings across runs; single source of truth for status; hand-editable.
- **Dimension Playbook**: checked-in instructions per dimension (checklists, heuristics, severity rubric) that reviewer agents are prompted with; versioned with the repo so review criteria evolve by PR.
- **Tier Map**: the checked-in mapping of repo areas to review depth (Tier 1/2/3); editable as the repo grows.
- **Coverage Manifest**: per-run record of what was reviewed at what depth and what was skipped and why.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the inaugural run, a human spot-check of 10 randomly sampled findings confirms ≥ 9 as real defects correctly located (target: 10/10 — verified-only is the product).
- **SC-002**: The inaugural report's coverage manifest accounts for 100% of Tier 1 files (reviewed or explicitly excluded with reason); no Tier 1 area is silently absent.
- **SC-003**: A controlled re-run test (fix one finding, accept-risk one, plant one defect) classifies all three correctly in the delta section.
- **SC-004**: Every finding in the report can be navigated to via its file:line reference without searching; zero references point at non-existent lines at the run's `git_sha`.
- **SC-005**: The report is actionable standalone: the maintainer can select any quick-win finding and hand it to a fix session using only the report text (no re-investigation needed to understand the defect).
- **SC-006**: The four dimension playbooks, report template, ledger schema, and tier map exist as reviewed, checked-in artefacts — the skill's behaviour is reproducible from the repo alone, not from any one session's memory.
- **SC-007**: Methodology section of every report includes per-phase token spend and candidate→confirmed→refuted counts, enabling cost/precision tracking across runs.

## Out of Scope

- Automatic fixing of findings (a future session may consume the report; see FR-011).
- Backlog/GitHub issue creation from findings.
- Per-PR review gating (the existing `/code-review` skill and CI cover incoming changes; this skill audits the existing codebase).
- Scheduled/cron execution (the skill is manually invoked; scheduling can be layered on later without spec changes).
- Reviewing external/contrib repositories.

## Notes for the Implementing Session

- Match the register of existing audits (`docs/project_notes/stac-data-quality-audit.md`, `viewport-mutation-audit.md`) for report prose.
- The #172 spec (`specs/172-review-technical-debt/`) defines the tech-debt categories and their intended end state — the tech-debt playbook should be written as a regression check against it.
- The constitution playbook should be generated by reading `CONSTITUTION.md` at implementation time and turning each article into falsifiable checks; do not paraphrase from this spec.
- Workflow orchestration should use the Claude Code Workflow tool (pipelined review→verify, per the FR-004 shape); the skill document should carry the workflow script or reference it as an asset.
- Expect the inaugural run to be expensive (multi-million tokens). That is accepted; instrument it (FR-012, SC-007) rather than constraining it.
