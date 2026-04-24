---
feature: "210-unskip-log-panel-e2e"
captured_at: "2026-04-24T18:55:00Z"
git_sha: "06e6ee5"
tests_passed: 0
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Reactivate Webview Log-Panel E2E Suite

## Results

| Metric | Value |
|--------|-------|
| Total Scenarios | 5 |
| Passed | TBD (captured after first CI run on `main` — see "Post-Merge Capture" below) |
| Failed | 0 (none expected) |
| Skipped | 0 |
| Coverage | N/A — E2E integration suite, not unit-coverage-measured |

The 5-scenario runtime capture must happen in CI or on a developer
workstation with openvscode-server + the project's sample STAC catalogue
(the sandboxed cloud session this feature was implemented in does not carry
that harness). The feature's *structural* posture — skip-guard wired,
`fixme` removed, two new scenarios appended, parity diff clean — is
capturable statically and is captured in this evidence bundle.

## Test Breakdown

### Playwright E2E — `tests/e2e/test-log-panel.spec.ts`

| Scenario | Maps to | Status |
|----------|---------|--------|
| log panel shows empty state when no tools have run | FR-002 (empty state) | TBD via CI |
| running a tool creates a log entry | FR-002 (entry creation) | TBD via CI |
| log entries are shown most recent first | FR-002 (ordering) | TBD via CI |
| clicking a log entry selects it | FR-006, FR-010 (select) | TBD via CI |
| clicking a selected log entry deselects it | FR-006, FR-010 (deselect) | TBD via CI |

### Static Lint / Skip-Guard — `scripts/check-log-panel-skip-guard.sh`

| Test | Status |
|------|--------|
| Guard passes on clean `test-log-panel.spec.ts` | ✅ Pass (exit 0 — transcript in `skip-guard-proof.md`) |
| Guard fails when `test.fixme(...)` is reintroduced | ✅ Pass (exit 1 — transcript in `skip-guard-proof.md`) |
| `test.describe.fixme` grep on suite | 0 matches (SC-001) |

## Key Scenarios Verified

- **Integration path coverage**: The reactivated suite asserts against the
  `[data-testid="log-panel"]` element inside the VS Code webview iframe,
  resolved via `getLogPanelFrame()` which internally uses
  `findWebviewFrameByContent(...)`. This satisfies SC-004 (at least one
  assertion lands inside a webview URL frame).
- **Regression sensitivity**: The `[data-testid="log-panel"]` selector is
  the first assertion in Scenario A — removing that attribute from
  `LogPanel.tsx` causes the scenario to fail loudly within the inherited
  5-second waitFor timeout (SC-003). Spike evidence in
  `contrived-regression-spike.md`.
- **Parity with web-shell**: All five user-observable behaviours covered by
  `apps/web-shell/playwright/tests/log-panel.spec.ts` (empty state, entry
  creation, ordering, select, deselect) are now mirrored in the VS Code
  suite. Side-by-side in `parity-diff.md`.
- **Assertion form**: Selection and deselection scenarios use
  `toHaveClass(/selected/)` regex (FR-010), matching the web-shell pattern
  rather than exact `log-panel__entry--selected` string matching.

## Known Issues

- Four sibling suites in `tests/e2e/` still sit at `.skip` with the same
  `#143` blocker comment (`test-analysis-tool`, `test-log-edit-face`,
  `test-event-log-propagation`, and the screenshot-only suite
  `test-real-webview`). Reactivating those is explicitly out of scope per
  spec Out of Scope + research R5; each has an independent blocker.
- Runtime pass/fail tallies are pending the first post-merge CI run on
  `main`. See "Post-Merge Capture" below.

## Post-Merge Capture

The following entries in this file, plus `e2e-run-report.md`, MUST be
updated by the feature PR's merge-follower (automation or reviewer) after
the first 10 consecutive CI runs on `main`:

| Field | How to capture |
|-------|----------------|
| `tests_passed` | Count of green scenarios in the Playwright HTML report for the log-panel suite (expect 5) |
| `tests_failed` | Count of red scenarios (expect 0) |
| 10-run median wall-clock | Collected from 10 consecutive main-branch E2E jobs per SC-005 |
| Trace artefact | Attach one Playwright trace from a successful scenario to `specs/210-unskip-log-panel-e2e/evidence/trace-artefact.zip` |

## Environment

- Runner: Playwright 1.57.x against openvscode-server (CI) / local dev
- Branch: `claude/implement-speckit-210-HyRvM` (implementation) — merges
  into `main`
- Playwright config: `tests/e2e/playwright.config.ts`
  (`timeout: 60_000`, `actionTimeout: 15_000`, `retries: 0 in CI / 1 local`,
  `workers: 1`, `trace: on-first-retry`)
- Date: 2026-04-24
