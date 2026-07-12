---
description: Fast-track a /repo-review ledger finding (RR-NNN) straight to fix, test, and PR — reads the ledger entry, no re-investigation. Batch multiple ids into one cleanup PR.
handoffs:
  - label: View PR
    agent: none
    prompt: PR created successfully
    send: false
---

## User Input

```text
$ARGUMENTS
```

`$ARGUMENTS` is one or more finding ids (with or without the `RR-` prefix), e.g. `RR-014` or
`14 19 23`. If empty, **ask** the user for at least one id — do not stop the session.

## Purpose

Turn a verified review finding into a merged fix with one command. The review already did the
investigation; the ledger entry carries everything needed (defect statement, locations,
failure scenario, and the verification note that doubles as a reproduction recipe). This is the
`/bugfix` fast-track applied to review findings — no specify/clarify/plan/tasks.

### Constitution compatibility

Like `/bugfix`, this restores behaviour that the finding proves is wrong; it is not new
significant implementation, so Article VIII's spec-before-code gate is satisfied by the finding
record plus the originating feature's spec.

## Execution Flow

### Step 1 — Parse and normalise ids

Extract ids from `$ARGUMENTS`; normalise to `RR-NNN` (zero-padded ≥ 3 digits). ERROR if none:
"Provide a finding id, e.g. `/repo-review.fix RR-014`."

### Step 2 — Load and check the ledger (hard halts — no guessing, US4-S3)

Run `python scripts/review-ledger.py validate` first. Then load
`docs/project_notes/reviews/ledger.yaml`. For each id, halt with a clear message if:

| Condition | Message |
|-----------|---------|
| Ledger missing/corrupt | Point at the ledger path + validation error (FR-008). |
| Id not found | "RR-NNN not found; run /repo-review or check the id." |
| Status ≠ `open` | Report the actual status (+ `status_reason` if accepted-risk). |
| Entry already has `fix_pr` | Show the PR url; require explicit user confirmation before continuing (it may have been abandoned). |

### Step 3 — Confirm the defect still exists

At current HEAD, reproduce or statically confirm the defect using the entry's
`failure_scenario` + `verification`. Line numbers may have drifted since `last_seen.git_sha` —
re-locate by defect, treat lines as hints. **If the defect no longer exists**: stop, tell the
user "already resolved — the next /repo-review run will mark it fixed", change nothing, record
nothing.

### Step 4 — Fix, test, verify

Implement the fix. Add or adjust a test that fails on the old behaviour and passes on the new
(prove the failure scenario is closed). Run `task verify` (or the CLAUDE.md fallback steps).
For a batch, group interdependent findings into one PR; unrelated ones may be split — decide
and say which.

### Step 5 — Commit, push, PR

Commit on the working branch; push; open a PR whose title references the finding id(s) and
whose body quotes the defect statement and failure scenario from the ledger.

### Step 6 — Record the PR on the ledger

For each fixed finding:
`python scripts/review-ledger.py record-fix-pr RR-NNN <pr-url>` (the helper validates the whole
file before writing). This sets `fix_pr` and **leaves status `open`** — only a later
`/repo-review` reconcile that observes the defect gone flips it to `fixed` (FR-016). Do not edit
the status by hand here.

### Step 7 — Report

Return the PR url and the ledger ids recorded. For a batch, list which findings went into which
PR.

## Notes

- This command changes source code (unlike `/repo-review`), but never edits the report or the
  ledger except via `record-fix-pr`.
- Keep the fix minimal and scoped to the finding; if fixing it properly requires a large
  refactor, stop and tell the user — that finding wants a spec, not a fast-track.
