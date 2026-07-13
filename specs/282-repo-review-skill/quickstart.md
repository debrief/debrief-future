# Quickstart: `/repo-review`

## First time: run a pilot

The orchestration layer is validated behaviourally — its first-ever execution will find its
own bugs. Shake it down cheaply before committing to the full multi-million-token run:

```text
/repo-review --dimension correctness --tier 1
```

Fix what breaks, then run the full review.

## Run a review

```text
# clean working tree required — commit or stash first
/repo-review          # re-runs are churn-scoped vs the prior run's sha
/repo-review --full   # force a full sweep (do this roughly annually)
```

What happens: recon builds the work-list from `.claude/review/tier-map.yaml`; reviewer
agents sweep each area × dimension using the playbooks in `.claude/review/playbooks/`;
every candidate finding is adversarially verified before it can be reported; evidence tools
run (strict lint, dependency audit, knip, coverage, targeted mutation checks); synthesis
clusters themes, proposes guards, reconciles the ledger, and writes the report.

Outputs:

- `docs/project_notes/reviews/YYYY-MM-DD-repo-review.md` — the report (delta summary,
  quick wins, themes & prevention, four findings chapters, coverage manifest, methodology,
  playbook tuning)
- `docs/project_notes/reviews/ledger.yaml` — findings ledger (created on first run)
- `docs/project_notes/reviews/evidence/YYYY-MM-DD/` — raw tool outputs
- Appends to `docs/project_notes/bugs.md` for Critical/High correctness bugs; new
  failure-pattern docs for themes with ≥ 3 findings

Expect the inaugural run to be expensive (multi-million tokens, hours). That is by design
and fully instrumented in the report's methodology section. Re-runs are cheaper and open
with a delta.

## After the run (the runbook, condensed — full version in spec.md)

1. **Triage same day (~30 min)**: read Delta Summary + Quick Wins; for each new ledger
   entry decide fix-now / leave `open` / `accepted-risk` (edit `ledger.yaml` by hand —
   `status_reason` is mandatory for accepted-risk; validate with
   `python scripts/review-ledger.py validate`).
2. **Quick-wins batch within a week**:

   ```text
   /repo-review.fix RR-014 RR-019 RR-023
   ```

   One session, one cleanup PR, ledger entries get their `fix_pr` recorded.
3. **Adopt one guard**: pick the highest-leverage proposal from Themes & Prevention and
   land it as its own PR.
4. **Playbook-tuning PR**: apply the Playbook Tuning section's prune/strengthen/add
   recommendations to `.claude/review/playbooks/` — including any recall-benchmark misses
   (each report scores the playbooks against the last few real bugs from `bugs.md`).
5. **Sample-audit ~5 refuted candidates** from the run's working notes — the only check on
   verifier false-refutations.
6. **Judge by resolution rate and guard adoption**: the next run's Delta Summary reports what
   fraction of this run's Critical/High findings you actually resolved, and how many proposed
   guards were adopted. Those numbers — not the finding count — are whether the review is
   working.

## Fix a single finding

```text
/repo-review.fix RR-042
```

The session loads the ledger entry (defect, locations, failure scenario, verification
recipe), confirms the defect still exists, fixes it, proves it with tests, runs
`task verify`, opens a PR referencing RR-042, and records the PR URL on the entry. Status
flips to `fixed` only when the next review run verifies the defect is gone.

## Maintain the ledger by hand

`ledger.yaml` is yours to edit — set `accepted-risk` (with a reason), re-open entries,
add notes. Always finish with:

```sh
python scripts/review-ledger.py validate
```

The skill halts on a corrupt ledger rather than regenerating it; your status history is the
single source of truth.

## Where things live

| Thing | Path |
|-------|------|
| Skill commands | `.claude/commands/repo-review.md`, `.claude/commands/repo-review.fix.md` |
| Playbooks (review criteria — evolve by PR) | `.claude/review/playbooks/*.md` |
| Severity/effort rubric | `.claude/review/severity-rubric.md` |
| Tier map | `.claude/review/tier-map.yaml` |
| Ledger + reports + evidence | `docs/project_notes/reviews/` |
| Ledger helper CLI | `scripts/review-ledger.py` |
| Helper tests | `tests/repo_review/` |
