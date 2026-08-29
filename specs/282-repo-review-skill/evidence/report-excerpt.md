# Report Excerpt (format demonstration)

> **This is an illustrative excerpt showing the report *format*, not the output of a real
> review run.** The findings below are plausible examples used to demonstrate the section
> shapes defined in `contracts/report-structure.md`; they are **not** confirmed defects. The
> real inaugural run (SC-001) produces `docs/project_notes/reviews/YYYY-MM-DD-repo-review.md`
> with verified-only findings and is run by the maintainer against the live repo.

---
git_sha: 0123456789abcdef0123456789abcdef01234567
captured_at: 2026-08-01T09:00:00Z
run_date: 2026-08-01
tokens_spent: { recon: 180000, review: 4200000, verify: 3100000, evidence: 900000, synthesis: 620000 }
agents: { review: 41, verify: 63, evidence: 7 }
candidates: { emitted: 88, confirmed: 24, refuted: 51, undecided_dropped: 13 }
wall_clock_minutes: 74
resolution_rate: null
---

# Repo Review — 2026-08-01

_Reviewed `0123456` across four dimensions. Verified-only: every finding below survived an
independent adversarial refutation pass. 24 confirmed from 88 candidates (51 refuted, 13
undecided-and-dropped)._

## Quick Wins

| ID | Sev | Dimension | Title | Location |
|----|-----|-----------|-------|----------|
| RR-004 | High | correctness | Unawaited save promise can lose the last edit on rapid close | `apps/vscode/src/services/…:210` |
| RR-011 | High | tech-debt | `eslint` range diverges across three packages | `apps/web-shell/package.json:42` |

## Themes & Prevention

### Theme: relisted-boundary-types (RR-004, RR-018)

Two write paths re-list a subset of a source type by hand instead of deriving it with
`Pick`/`Omit`. Both already omit a field the source has grown — the ADR-033 silent-drop class.

**Guard proposal** — _type: lint-rule_ (advisory; adopt via a separate PR):

> Extend the existing `no-geojson-feature`-style check with a `no-relisted-boundary-type` rule
> that flags an object type literal whose keys are a strict subset of an imported type's keys
> and suggests `Pick<Source, …>`. Wire into `shared/eslint-rules`.

_Adopted in_: — · _Effectiveness_: —

## Findings: Correctness Bugs

### RR-004 — Unawaited save promise can lose the last edit on rapid close [High/S]
- **Locations**: `apps/vscode/src/services/example.ts:210`
- **Defect**: the save promise is not awaited before the panel disposes.
- **Failure scenario**: user edits, then closes the panel within ~100ms; the write is
  cancelled mid-flight and the last edit is lost with no error surfaced.
- **Verified by**: verifier traced the disposal path and confirmed no `await`/flush before teardown.
- **Heuristic**: CB-05   **Theme**: relisted-boundary-types

## Findings: Tech Debt

### RR-011 — `eslint` range diverges across three packages [High/S]
- **Locations**: `apps/web-shell/package.json:42`, `apps/loader/package.json:38`
- **Defect**: three packages pin different `eslint` ranges (`^8.50`, `^8.57`, `^8.44`).
- **Failure scenario**: lint behaviour differs per package; a rule passes in one and fails in
  CI for another — the #172 US1 skew, regressed.
- **Verified by**: dependency-audit output (attached in the evidence dir) lists the three ranges.
- **Heuristic**: TD-01

## Methodology

- **Spend**: recon 180k · review 4.2M · verify 3.1M · evidence 900k · synthesis 620k (total ≈ 9.0M tokens)
- **Candidates**: 88 emitted → 24 confirmed, 51 refuted, 13 dropped-undecided
- **Tool runs**: knip ✓ · dependency-audit ✓ · ruff-strict ✓ · eslint-strict ✓ · pytest-cov ✓ · vitest-cov ✓ · mutation-checks 4
- **Tool failures**: none

### Per-heuristic attribution (excerpt)

| Heuristic | Candidates | Confirmed | Refuted |
|-----------|-----------|-----------|---------|
| CB-05 | 9 | 5 | 4 |
| CB-13 | 6 | 0 | 6 |
| TD-01 | 3 | 3 | 0 |
| (unprompted) | 4 | 3 | — |

## Playbook Tuning

- **Prune**: CB-13 (0/6 confirmed this run — numeric-formula heuristic produced only noise).
- **Strengthen**: TD-01 (3/3), CB-05 (5/9).
- **Add**: the 3 confirmed `(unprompted)` finds were all missing-`await` in *disposal* paths —
  propose a new CB heuristic for teardown/dispose async hazards.
