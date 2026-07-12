# Usage Example: `/repo-review` and `/repo-review.fix`

This walks the full loop: run a review, triage a finding, fix it, and see the next run close
the loop. The ledger-helper transcripts below are **real output** from
`scripts/review-ledger.py` (see `cli-demo.txt`, `validation-output.txt`). The multi-agent
review run itself is described rather than pasted — it is expensive by design and is the
skill's behavioural acceptance test, run by the maintainer against the live repo.

## 1. Run a review

```text
/repo-review
```

Preconditions gate the run: the working tree must be clean (the report's `git_sha` must
identify exactly what was reviewed), and any existing ledger must pass validation. The
orchestration workflow then runs recon → per-cell review→verify pipeline → evidence →
synthesis, and writes:

- `docs/project_notes/reviews/2026-08-01-repo-review.md` — the report
- `docs/project_notes/reviews/ledger.yaml` — the findings ledger (created on first run)
- `docs/project_notes/reviews/evidence/2026-08-01/` — raw knip / lint / coverage output

Every finding in the report survived an independent adversarial verification pass; refuted and
undecidable candidates are counted in the Methodology section, not listed.

## 2. Triage (same day, ~30 min)

Read the Delta Summary and Quick Wins, then set each new ledger entry's disposition by hand.
The ledger is designed to be hand-edited; validate afterwards:

```text
$ python scripts/review-ledger.py validate
OK: docs/project_notes/reviews/ledger.yaml is valid
```

A corrupt ledger is refused rather than regenerated, so your status history is never lost:

```text
$ python scripts/review-ledger.py validate --ledger bad.yaml
INVALID: findings/1: 'status_reason' is a required property
```

## 3. Fix a quick win

```text
/repo-review.fix RR-004
```

The session loads the ledger entry (defect statement, locations, failure scenario, and the
verification note that doubles as a reproduction recipe), confirms the defect still exists at
HEAD, fixes it, proves the fix with a test, runs `task verify`, opens a PR referencing RR-004,
and records the PR on the ledger — leaving status `open`:

```text
$ python scripts/review-ledger.py record-fix-pr RR-004 https://github.com/debrief/debrief-future/pull/999
OK: recorded https://github.com/debrief/debrief-future/pull/999 on RR-004
```

Status stays `open` deliberately: only the next review run, observing the defect gone from the
code, flips it to `fixed`. That keeps `fixed` meaning "verified gone", not "PR opened".

## 4. Re-run — reconciliation reports the delta

On the next run, reconciliation matches findings by **defect identity**
`(dimension, module_path, defect_slug)`, not line numbers (which churn). Real dry-run output:

```text
$ python scripts/review-ledger.py reconcile --run-findings run.json --date 2026-08-01 --sha <sha>
{
  "matched": ["RR-001"],
  "newly_fixed": [],
  "assigned": {},
  "unmatched_candidates": [1],
  "unmatched_open_entries": []
}
```

`RR-001` is re-detected (its line number is refreshed even though it moved); the second
candidate is new and, on finalising, is assigned a fresh id:

```text
$ python scripts/review-ledger.py reconcile ... --pairings pairings.json --write
{
  "matched": ["RR-001"],
  "newly_fixed": [],
  "assigned": {"1": "RR-004"},
  "unmatched_candidates": [],
  "unmatched_open_entries": []
}
```

If instead a previously-open defect had disappeared from the code, it would appear in
`newly_fixed` and its ledger status would become `fixed`. The report's Delta Summary then leads
with the **resolution rate** — the fraction of the prior run's Critical/High findings now fixed
or accepted-risk — which is the review's honest success metric, not the finding count.
