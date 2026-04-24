# E2E Run Report — Log-Panel Suite

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Maps to**: SC-002, SC-005

## Baseline capture

| Field | Value |
|-------|-------|
| Capture window | Pending — first 10 consecutive CI runs on `main` post-merge |
| Expected runs | 10 |
| Scenarios per run | 5 |
| Playwright harness | `tests/e2e/playwright.config.ts` (timeout 60 s, retries 0 in CI, workers 1, trace on-first-retry) |
| Target | openvscode-server via `.github/workflows/ci.yml` |

## Per-scenario expectations (pre-merge)

| Scenario | Hotspot | Expected wall-clock (s) |
|----------|---------|-------------------------|
| log panel shows empty state when no tools have run | STAC-tree open + frame resolve | 8–12 |
| running a tool creates a log entry | Map click + command execute + frame resolve | 15–22 |
| log entries are shown most recent first | 2 × command execute (with 3 s pause) | 22–30 |
| clicking a log entry selects it | Command execute + single click | 15–22 |
| clicking a selected log entry deselects it | Command execute + two clicks | 16–23 |
| **Total** | | **76–109** |

Lower bound (76 s) and upper bound (109 s) straddle the SC-005 median
budget (≤ 90 s). Research R2 validated this budget against the observed
wall-clock of sibling active suites; no scenario-level timeout overrides
are applied (FR-004).

## SC-002 target

Ten of the last ten CI runs on `main` PASS. Any two consecutive main
failures within 24 h, or three in the last ten, triggers the R5 revert
rule documented in `../research.md`.

## SC-005 thresholds

| Threshold | Action |
|-----------|--------|
| 10-run median ≤ 85 s | Healthy — no action |
| 10-run median 85–90 s | **Warning** — open a tracking issue per research R2 |
| 10-run median > 90 s | **Breach** — consolidate Scenarios D + E into a single `test(...)` body |

## Post-merge update checklist

After the first 10 consecutive CI runs on `main`:

- [ ] Fill the table below with actual wall-clock per scenario
- [ ] Compute and record the 10-run median
- [ ] Attach a Playwright HTML-report zip to `trace-artefact.zip` (one
      representative successful run)
- [ ] Update `test-summary.md` `tests_passed` / `tests_failed` front matter
- [ ] If the median > 85 s, file the SC-005 warning tracking issue

| Run # | Date (UTC) | Commit SHA | Wall-clock (s) | Result |
|-------|------------|------------|----------------|--------|
|   1   | TBD        | TBD        | TBD            | TBD    |
|   2   | TBD        | TBD        | TBD            | TBD    |
|   3   | TBD        | TBD        | TBD            | TBD    |
|   4   | TBD        | TBD        | TBD            | TBD    |
|   5   | TBD        | TBD        | TBD            | TBD    |
|   6   | TBD        | TBD        | TBD            | TBD    |
|   7   | TBD        | TBD        | TBD            | TBD    |
|   8   | TBD        | TBD        | TBD            | TBD    |
|   9   | TBD        | TBD        | TBD            | TBD    |
|  10   | TBD        | TBD        | TBD            | TBD    |
| **Median** | | | **TBD** | |

## Trace artefact

`evidence/trace-artefact.zip` — pending first successful main-branch CI
run. Capture procedure: download the Playwright HTML-report artefact
from the GitHub Actions workflow, extract the `trace.zip` for Scenario D
(`clicking a log entry selects it`) and copy it into this directory.
Scenario D is chosen because it includes both the iframe navigation (so
SC-004 is inspectable) and a user-interaction event (`click`) that is
visible in the trace timeline.
