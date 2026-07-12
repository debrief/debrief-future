---
feature: "282-repo-review-skill"
captured_at: "2026-07-12T07:40:40Z"
git_sha: "2e621c38"
tests_passed: 36
tests_failed: 0
tests_skipped: 0
coverage_pct: 75
---

# Test Summary: Repeatable Whole-Repo Review Skill

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 36 |
| Passed | 36 |
| Failed | 0 |
| Skipped | 0 |
| Coverage (`scripts/review-ledger.py`) | 75% |

Coverage is measured on the ledger helper. The uncovered 25% is the `argparse` CLI wrapper
layer (`_cmd_*`, `main`, parser wiring); the core logic — load / validate / save / reconcile /
`record_fix_pr` / `tuning_recommendation` — is exercised directly by the unit tests. The CLI
layer is exercised for real in `evidence/cli-demo.txt` and `evidence/validation-output.txt`.

## Test Breakdown

### Ledger validation (`test_ledger_validation.py`)

| Test | Status |
|------|--------|
| load accepts the valid fixture | Pass |
| save round-trips the document unchanged | Pass |
| save normalises finding order by id | Pass |
| missing file → empty ledger | Pass |
| rejects bad id pattern | Pass |
| rejects unknown enum value | Pass |
| rejects accepted-risk without status_reason | Pass |
| rejects unknown schema version | Pass |
| rejects additional property | Pass |
| rejects non-GitHub fix_pr url | Pass |

### Reconciliation + fix handoff (`test_reconciliation.py`)

| Test | Status |
|------|--------|
| exact identity match refreshes line numbers | Pass |
| disappeared open defect → fixed | Pass |
| line drift still matches (identity, not lines) | Pass |
| new defect gets a fresh RR id | Pass |
| accepted-risk re-detection stays suppressed | Pass |
| accepted-risk hand edit not re-opened when absent | Pass |
| first run creates ledger from RR-001 | Pass |
| stage-2 pairing links a moved defect | Pass |
| unpaired dry run reports unmatched sets | Pass |
| record-fix-pr sets url, leaves status open | Pass |
| record-fix-pr rejects unknown id | Pass |
| record-fix-pr rejects non-open status | Pass |

### Structural + tuning (`test_playbook_structure.py`, `test_tier_map.py`)

| Test | Status |
|------|--------|
| every playbook exists | Pass |
| each playbook uses only its own heuristic prefix | Pass |
| heuristic ids globally unique (≥ 12 defined) | Pass |
| tuning recommendation logic (7 parametrised cases) | Pass |
| tier map uses tiers 1/2/3 | Pass |
| every source dir is covered by the tier map | Pass |
| no unknown top-level paths in the tier map | Pass |
| every mapped path has a note | Pass |

## Key Scenarios Verified

- **Corrupt ledger halts, never regenerates** (FR-008): an `accepted-risk` entry missing its
  `status_reason` is refused with the schema error path (`findings/1: 'status_reason' is a
  required property`), exit 1 — see `validation-output.txt`.
- **Defect identity, not line numbers** (R-003): a finding whose line moved 142→158 still
  matches its ledger entry; identity is `(dimension, module_path, defect_slug)`.
- **Status lifecycle**: disappeared open defects become `fixed`; `accepted-risk` re-detections
  are suppressed and hand-set statuses survive reconciliation (FR-009).
- **Fix handoff leaves status open** (FR-016): `record-fix-pr` records the PR url but does not
  flip status — only a later reconcile that sees the defect gone marks it `fixed`.
- **Deterministic playbook tuning** (FR-019): prune / strengthen / add recommendations are a
  pure function of per-heuristic confirmed/refuted counts.

## Known Issues

- None. The full multi-agent inaugural review run (T045 / SC-001) is the skill's behavioural
  acceptance test and is intended to be run by the maintainer against the live repo; it is
  expensive by design (multi-million tokens) and instrumented rather than executed as part of
  the unit suite.

## Environment

- Runner: pytest 7.x (`uv run pytest tests/repo_review/`)
- Branch: `claude/code-review-plan-95vovz`
- Python: 3.11.15
