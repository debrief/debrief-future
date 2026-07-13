<!--
  Repo-review report template (spec 282, FR-007 / contracts/report-structure.md).
  The synthesis phase fills this in and writes it to
  docs/project_notes/reviews/YYYY-MM-DD-repo-review.md.

  Rules:
  - Keep the section order below. Omit §Delta Summary on the inaugural run and
    §Accepted Risks Re-confirmed when there are none; every other section is
    mandatory, INCLUDING empty dimension chapters (state what was examined).
  - Front matter is required and machine-read; fill every field.
  - Every finding block corresponds to a ledger entry with the same id.
  - Generated-file findings name the source (schema/generator) as the primary
    location (FR-014).
-->
---
git_sha: <40-hex sha reviewed>
captured_at: <ISO-8601 timestamp>
run_date: <YYYY-MM-DD>
tokens_spent:
  recon: <int>
  review: <int>
  verify: <int>
  evidence: <int>
  synthesis: <int>
agents:
  review: <int>
  verify: <int>
  evidence: <int>
candidates:
  emitted: <int>
  confirmed: <int>
  refuted: <int>
  undecided_dropped: <int>
wall_clock_minutes: <int>
resolution_rate: <float|null>   # null on the inaugural run
---

# Repo Review — <YYYY-MM-DD>

_Reviewed `<sha>` across four dimensions. Verified-only: every finding below survived an
independent adversarial refutation pass. <confirmed> confirmed from <emitted> candidates
(<refuted> refuted, <undecided_dropped> undecided-and-dropped)._

## Delta Summary
<!-- Re-runs only. Omit entirely on the inaugural run. -->

- **Resolution rate** (prior run's Critical/High now fixed or accepted-risk): **<pct>%**
- New: <n> · Resolved since last review: <n> · Still open: <n>
- Headline metrics vs prior run: dead-code <n→n> · skewed deps <n→n> · Tier-1 coverage <pct→pct>
- **Guards**: <n> proposed to date · <n> adopted — the compounding metric alongside resolution rate
- Guard effectiveness: <theme> guard adopted in <PR> → <n> new findings this run
- Scope: <full sweep | churn-scoped vs <priorSha> — downgrades/skips listed in the Coverage Manifest>

**Resolved since last review**: RR-0xx, RR-0yy …
**Still open (carried)**: RR-0aa (Critical), …

## Quick Wins
<!-- severity ∈ {Critical, High} AND effort = S. Feed straight to /repo-review.fix. -->

| ID | Sev | Dimension | Title | Location |
|----|-----|-----------|-------|----------|
| RR-0xx | High | correctness | … | `path:line` |

## Themes & Prevention
<!-- One subsection per theme (>= 2 findings). Each proposes exactly one typed, advisory guard. -->

### Theme: <name> (RR-0xx, RR-0yy, …)

<one-paragraph pattern description>

**Guard proposal** — _type: <lint-rule | ci-gate | claude-md | constitution-amendment | playbook-update>_ (advisory; adopt via a separate PR):

> <concrete, implementable proposal — rule identifier + config, or draft CLAUDE.md/ADR text>

_Adopted in_: <PR url, filled by a later run> · _Effectiveness_: <later run notes new findings in this theme?>

## Findings: Constitution Conformance
<!-- Mandatory even if empty. If empty: "Examined <areas> against CC-01..CC-19; no confirmed violations." -->

### RR-0xx — <title> [<Severity>/<Effort>]
- **Locations**: `path:line`, …
- **Defect**: <one sentence>
- **Violates**: Article <n.n>   <!-- correctness chapter uses **Failure scenario** instead -->
- **Verified by**: <how the adversarial verifier confirmed it>
- **Heuristic**: CC-nn   **Theme**: <slug, if any>

## Findings: Correctness Bugs
<!-- Same block shape; use **Failure scenario** instead of **Violates**. -->

## Findings: Tech Debt
<!-- Same block shape. Include the regression verdict vs the #172 end state. Cite tool output. -->

## Findings: Test Quality & Coverage
<!-- Same block shape. Include per-package coverage numbers, or the explicit qualitative downgrade if coverage tooling failed. -->

## Coverage Manifest
<!-- Every area × tier × depth. Skipped/shortfall rows carry reasons (FR-003, FR-012). -->

| Area | Tier | Dimensions | Depth | Notes |
|------|------|-----------|-------|-------|
| shared/schemas | 1 | all | per-file | |
| … | | | | |
| apps/loader | 3 | all | sweep | |
| <area> | <t> | <dims> | not-covered-this-run | <reason — e.g. agent-cap reached> |

## Methodology

- **Spend**: recon <n>k · review <n>k · verify <n>k · evidence <n>k · synthesis <n>k (total <n>M tokens)
- **Agents**: <n> reviewers · <n> verifiers · <n> evidence
- **Candidates**: <emitted> emitted → <confirmed> confirmed, <refuted> refuted, <undecided_dropped> dropped-undecided
- **Tool runs**: knip ✓ · dependency-audit ✓ · ruff-strict ✓ · eslint-strict ✓ · pytest-cov ✓ · vitest-cov ✓ · mutation-checks <n>
- **Tool failures** (claims downgraded to qualitative): <none | tool: reason>

### Per-heuristic attribution

| Heuristic | Candidates | Confirmed | Refuted |
|-----------|-----------|-----------|---------|
| CB-03 | <n> | <n> | <n> |
| (unprompted) | <n> | <n> | — |

### Recall benchmark (vs bugs.md ground truth)

<!-- The review's only recall signal. 3-5 most recent real bugs; would the playbooks have caught each pre-fix? -->

| Bug (bugs.md date) | Defect class | Would-have-caught? | Heuristic (or miss -> Tuning "add") |
|--------------------|--------------|--------------------|-------------------------------------|
| <YYYY-MM-DD — title> | <class> | hit / miss | CB-nn / propose new |

## Playbook Tuning
<!-- Derived from the attribution table (FR-019). -->

- **Prune** (zero-confirmed heuristics): CB-nn, …
- **Strengthen** (high-yield): CB-nn, …
- **Add** (recurring unprompted defect classes): <describe the class → propose a new heuristic id>

## Accepted Risks Re-confirmed
<!-- One line per re-detected accepted-risk ledger entry. Omit section if none. -->

- RR-0zz — <title> — accepted because <status_reason>

## Next Actions (Runbook)

<!-- Always present — the report carries its own follow-through. Full runbook: specs/282-repo-review-skill/spec.md -->

1. **Triage today (~30 min)**: set every new ledger entry to fix-now / open / accepted-risk (with reason); `python scripts/review-ledger.py validate` after hand edits.
2. **Quick-wins batch this week**: `/repo-review.fix <ids from the Quick Wins table>` — one cleanup PR.
3. **Adopt one guard**: pick the highest-leverage proposal from Themes & Prevention; land it as its own PR.
4. **Playbook-tuning PR**: apply the prune/strengthen/add list above (including recall-benchmark misses).
5. **Sample-audit the refuted pile**: skim ~5 refuted candidates in the run's working notes — the only check on verifier false-refutations.
