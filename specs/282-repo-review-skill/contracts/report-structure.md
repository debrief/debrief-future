# Contract: Review Report Structure (FR-007)

Every run writes `docs/project_notes/reviews/YYYY-MM-DD-repo-review.md`. This contract
defines the front matter and the required section order. `test_playbook_structure.py`-style
assertions in the skill's synthesis instructions treat this as the acceptance checklist;
the report template asset (`.claude/review/report-template.md`) is generated from it.

## Front matter (YAML, required)

```yaml
---
git_sha: <40-hex sha reviewed>            # R-009; matches evidence-freshness convention
captured_at: <ISO-8601 timestamp>
run_date: <YYYY-MM-DD>
tokens_spent:                              # FR-012 / SC-007
  recon: <int>
  review: <int>
  verify: <int>
  evidence: <int>
  synthesis: <int>
agents: { review: <int>, verify: <int>, evidence: <int> }
candidates: { emitted: <int>, confirmed: <int>, refuted: <int>, undecided_dropped: <int> }
wall_clock_minutes: <int>
resolution_rate: <float|null>              # FR-020; null on inaugural run
---
```

## Required sections, in order

| # | Section | Content contract |
|---|---------|------------------|
| 1 | `## Delta Summary` | Re-runs only (omit on inaugural run). New / resolved / still-open counts by severity; **resolution rate** of prior run's Critical/High (FR-020) shown alongside counts; headline evidence metrics side-by-side with prior run (US3-S5); guard-effectiveness notes for adopted guards (US5-S4) |
| 2 | `## Quick Wins` | Table of findings with severity ∈ {Critical, High} AND effort = S: ID, title, location, ready to feed `/repo-review.fix` |
| 3 | `## Themes & Prevention` | One subsection per theme (FR-017): pattern paragraph, member IDs, exactly one typed guard proposal worded to be implementable without re-analysis |
| 4 | `## Findings: Constitution Conformance` | Per-finding blocks (see below). Chapter MUST appear even with zero findings, stating what was examined (US1-S7) |
| 5 | `## Findings: Correctness Bugs` |〃 |
| 6 | `## Findings: Tech Debt` | 〃 — includes regression verdict vs the #172 end state |
| 7 | `## Findings: Test Quality & Coverage` | 〃 — includes per-package coverage numbers (US3-S2) or the explicit qualitative downgrade (US3-S4) |
| 8 | `## Coverage Manifest` | Every area × tier × depth; skipped/shortfall rows carry reasons (FR-003, FR-012) |
| 9 | `## Methodology` | Spend/agents/candidates from front matter in prose; tool failures; per-heuristic confirmed/refuted table (FR-019) |
| 10 | `## Playbook Tuning` | Prune / strengthen / add recommendations derived from §9 (FR-019) |
| 11 | `## Accepted Risks Re-confirmed` | One line per re-detected `accepted-risk` entry (US2-S3); omit if none |

## Per-finding block (sections 4–7)

```markdown
### RR-014 — <title> [High/S]
- **Locations**: `path/to/file.ts:123`, `path/to/other.ts:45`
- **Defect**: <one-sentence statement>
- **Failure scenario**: <inputs/state → wrong outcome> — or — **Violates**: Article IV.2
- **Verified by**: <how the adversarial verifier confirmed it>
- **Heuristic**: CB-03   **Theme**: relisted-boundary-type (if clustered)
```

Ordering within a chapter: severity (Critical first), then effort (S first).

## Invariants

- Every finding block corresponds to a ledger entry with matching ID and fields.
- No section may be silently omitted except §1 (inaugural) and §11 (none to report).
- Generated-file findings name the source (schema/generator) as primary location (FR-014).
