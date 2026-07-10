# Contract: `/repo-review.fix` Handoff (FR-016)

## Invocation

```text
/repo-review.fix RR-014               # single finding
/repo-review.fix RR-014 RR-019 RR-023 # batch → single cleanup PR (US4-S4)
```

IDs accepted with or without the `RR-` prefix; normalised to `RR-NNN`.

## Preconditions (hard halts, no guessing — US4-S3)

| Condition | Behaviour |
|-----------|-----------|
| Ledger missing/corrupt | Halt: point at ledger path and validation error (FR-008) |
| ID not in ledger | Halt: "RR-NNN not found; run `/repo-review` or check the ID" |
| Entry status ≠ `open` | Halt: report the actual status (+ `status_reason` if accepted-risk) |
| Entry already has `fix_pr` | Halt: show the PR URL; require explicit confirmation to proceed (PR may have been abandoned) |
| Batch where fixes are interdependent | Split: interdependent findings are fixed in one PR; unrelated ones may be separated — the session decides and says so |

## Input to the fix session (everything it needs — SC-009: no re-investigation)

From the ledger entry: `title`, `failure_scenario`, `locations` (line numbers may have
drifted since `last_seen.git_sha` — the session re-locates by defect, treating lines as
hints), `verification` (how the defect was confirmed — doubles as the reproduction recipe),
`dimension`, `severity`, `theme`.

## Workflow shape (mirrors `/bugfix`)

1. Load + validate ledger entry/entries.
2. Reproduce or statically confirm the defect at current HEAD. **If the defect no longer
   exists**: stop, report "already resolved — next `/repo-review` run will mark it fixed",
   make no changes, record nothing.
3. Fix → add/adjust tests proving the failure scenario no longer occurs → run `task verify`
   (or the CLAUDE.md fallback steps).
4. Commit, push, open PR. PR title references the finding ID(s); body quotes the defect
   statement and failure scenario from the ledger.
5. `python scripts/review-ledger.py record-fix-pr RR-NNN <pr-url>` for each finding
   (helper validates the whole file before writing — R-008).

## Postconditions

- Ledger entry: status **still `open`**, `fix_pr` set. Only the next run's reconciliation,
  observing the defect gone from the code, transitions it to `fixed` (FR-016 division of
  labour; keeps `fixed` meaning "verified gone", not "PR opened").
- No other ledger fields modified; no report files touched.

## Helper CLI contract (`scripts/review-ledger.py`)

```text
review-ledger.py validate                          # exit 0 valid / exit 1 with jsonschema error path
review-ledger.py reconcile --run-findings <json> --date <YYYY-MM-DD> --sha <sha>
                                                   # stage-1 mechanical match (R-003); emits
                                                   # matched/unmatched JSON for the synthesis agent,
                                                   # applies final pairings, marks disappeared → fixed
review-ledger.py record-fix-pr <RR-NNN> <pr-url>   # sets fix_pr; refuses non-open/unknown IDs
```

All subcommands: load → validate → operate → validate → atomic write (write temp, rename).
Fully typed, pyright-strict (Article XV).
