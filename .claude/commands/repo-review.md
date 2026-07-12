---
description: Whole-repo review across four dimensions (constitution, correctness, tech-debt, test-quality) with verified-only findings, a dated report, and a findings ledger. Re-runs report deltas.
---

## User Input

```text
$ARGUMENTS
```

Arguments are optional. `--dimension <name>` limits the run to one dimension; `--tier <n>`
limits to one tier. With no arguments, the full four-dimension, three-tier review runs.

## Purpose

Audit the entire repository for defects and drift that per-feature review misses, and produce
a report the maintainer can act on **without re-checking any claim** — because every finding
survived an independent adversarial verification pass. Output is report-only: a dated report
plus a machine-readable findings ledger. No code is changed here; fixes flow through the
separate `/repo-review.fix` command.

See `specs/282-repo-review-skill/` for the full spec, and `docs/project_notes/reviews/` for
prior reports and the ledger. The operating runbook (triage → quick-wins → guard adoption →
playbook tuning) is in `spec.md`.

## Execution Flow

### Step 1 — Preconditions (hard gates)

1. **Clean working tree** (FR-013). Run `git status --porcelain`. If it prints anything,
   STOP: "Working tree is dirty — commit or stash before running /repo-review; the report's
   git_sha must identify exactly what was reviewed." Do not proceed.
2. **Capture run identity** (R-009): `git rev-parse HEAD` → `gitSha`; today's date → `runDate`.
3. **Validate the ledger if present**: `python scripts/review-ledger.py validate`. If it
   reports INVALID, STOP and surface the error — do not regenerate the ledger (FR-008). A
   missing ledger is fine (first run).

### Step 2 — Run the orchestration workflow

Invoke the Workflow tool with `.claude/review/workflow.js`, passing:

```
args = {
  gitSha, runDate,
  tierMapPath: '.claude/review/tier-map.yaml',
  playbookDir: '.claude/review/playbooks',
  ledgerPath: 'docs/project_notes/reviews/ledger.yaml',
  evidenceDir: `docs/project_notes/reviews/evidence/${runDate}`,
  priorLedgerExists: <bool>,
}
```

The workflow performs recon → per-cell review→verify pipeline → evidence → synthesis. It is
expected to be expensive on the first run (multi-million tokens, hours). **Do not cap or trim
coverage to save tokens** (FR-012) — if a hard limit forces partial coverage, that shortfall
must appear in the report's Coverage Manifest, never be silently dropped. Apply `--dimension`
/ `--tier` filters from `$ARGUMENTS` by narrowing the recon work-list.

### Step 3 — Verified-only discipline (enforced inside the workflow, restated here)

A candidate reaches the report ONLY if a **separate** adversarial verifier agent positively
confirms the defect (FR-005). Refuted candidates and undecidable candidates are counted in the
methodology section, not listed. "Verified" means confirmed, not merely unrefuted.

### Step 4 — Synthesis writes the outputs (the workflow's synthesis phase does this)

- **Report** → `docs/project_notes/reviews/${runDate}-repo-review.md` from
  `.claude/review/report-template.md`, following `contracts/report-structure.md`: front matter
  with spend/agent/candidate metrics, Quick Wins, Themes & Prevention, four dimension chapters
  (each present even if empty — US1-S7), Coverage Manifest, Methodology (per-heuristic
  confirmed/refuted table), Playbook Tuning, Accepted Risks. On generated files, attribute the
  finding to the generator/LinkML source, not the generated file (FR-014).
- **Ledger** → reconcile via `scripts/review-ledger.py reconcile` (dry run → decide stage-2
  pairings → `--pairings --write`). New findings get RR ids; disappeared open defects become
  `fixed`; `accepted-risk` re-detections are suppressed to the appendix; hand-set statuses are
  honoured (FR-009).
- **Delta** (re-runs only): Delta Summary section with the resolution rate — the fraction of
  the prior run's Critical/High findings now `fixed` or `accepted-risk` (FR-020). This is the
  review's headline value metric; show it alongside, never instead of, finding counts.
- **Memory** (FR-018, the ONLY writes outside `docs/project_notes/reviews/`): append confirmed
  Critical/High **correctness** findings to `docs/project_notes/bugs.md` in its existing bullet
  format (date, defect, location, RR id); draft a failure-pattern doc in `docs/project_notes/`
  for any theme spanning ≥ 3 findings.
- **Prevention** (FR-017): each theme carries exactly one typed, concrete, **advisory** guard
  proposal. Do not adopt guards here (no edits to lint configs, CI, CLAUDE.md, or the
  constitution — FR-011); adoption is a separate PR.
- **Calibration** (FR-019): the Methodology per-heuristic table and the Playbook Tuning
  section (prune / strengthen / add). Do not edit the playbooks during the run.

### Step 5 — Degradation, not silence (FR-010)

If any evidence tool fails to run (knip, dependency audit, strict lint, coverage, a mutation
spot-check), the affected claims are downgraded to qualitative and the failure is recorded in
the Methodology section. Never assert a number a failed tool did not produce; never silently
omit the tool.

### Step 6 — Report back

Tell the user: the report path, headline counts (confirmed by severity), the resolution rate
(re-runs), and a one-line pointer to the Quick Wins table and the runbook. Do not paste the
whole report.

## Write Boundary (FR-011)

This command may write ONLY to:
- `docs/project_notes/reviews/**` (report, ledger, evidence)
- `docs/project_notes/bugs.md` (append confirmed Critical/High correctness findings)
- new `docs/project_notes/failure-pattern-*.md` docs (themes ≥ 3 findings)

It MUST NOT modify source code, tests, lint/CI configs, CLAUDE.md, the constitution, the
playbooks, backlog, or open GitHub issues. Report-only is the design.
