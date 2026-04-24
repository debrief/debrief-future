# Quickstart: Running the Reactivated Log-Panel E2E Suite

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This quickstart tells a developer how to run the reactivated log-panel suite locally and how to interpret its output — before the PR merges and after.

## Prerequisites

- `Node.js >= 18`, `pnpm` installed.
- `@sparticuz/chromium` present in root `devDependencies` (already pinned).
- Debrief VS Code extension buildable (`pnpm --filter @debrief/vscode-extension run package`).
- Pre-seeded STAC config and sample catalog (global-setup handles both — no manual work).

No additional setup beyond what sibling active E2E suites require.

## Running the suite locally (recommended path)

```sh
# From repo root — one-shot local run (auto-provisions code-server + Chromium)
bash tests/e2e/scripts/cloud-e2e-setup.sh

# Run only the log-panel suite (after setup-only)
bash tests/e2e/scripts/cloud-e2e-setup.sh --setup-only
cd tests/e2e
npx playwright test test-log-panel.spec.ts
```

**Expected output** (success):

```text
Running 5 tests using 1 worker

  ✓  1 [chromium] › test-log-panel.spec.ts:N › Log Panel › log panel shows empty state when no tools have run (N.Ns)
  ✓  2 [chromium] › test-log-panel.spec.ts:N › Log Panel › running a tool creates a log entry (N.Ns)
  ✓  3 [chromium] › test-log-panel.spec.ts:N › Log Panel › log entries are shown most recent first (N.Ns)
  ✓  4 [chromium] › test-log-panel.spec.ts:N › Log Panel › clicking a log entry selects it (N.Ns)
  ✓  5 [chromium] › test-log-panel.spec.ts:N › Log Panel › clicking a selected log entry deselects it (N.Ns)

  5 passed (≈ 70–85s)
```

If the "5 passed" wall-clock exceeds ~90 s on your machine — that's within the SC-005 tolerance for an individual run; SC-005 measures the *median* across 10 consecutive CI runs.

## Running the suite in CI

No action required. CI picks it up automatically once `test.describe.fixme` is replaced with `test.describe` (the job scans `tests/e2e/*.spec.ts` via the playwright config's `testMatch`).

To tail the output on a PR:

```sh
# Via gh CLI in a local clone:
gh run watch --repo debrief/debrief-future
# Or inspect the HTML report artefact after a failed run:
#   Actions → run → Artifacts → "playwright-report"
```

## Interpreting a failure

Failure modes, in decreasing order of expected frequency:

1. **`openPlotViaStacTree` timeout** — the STAC tree pre-seed step failed. Look at the extension output channel in the HTML report's captured state. This is a `#143`-family regression; file a bug referencing #143 rather than this feature.
2. **`getLogPanelFrame` times out at `findWebviewFrameByContent('[data-testid="log-panel"]', 15_000)`** — the LogPanel webview didn't render, or its `data-testid` was renamed. If the DOM changed, that's a LogPanel-component regression against FR-008 — file a bug referencing #176. If the frame simply didn't resolve, see research.md R5 (mitigation path: revert to `fixme`, file new ticket).
3. **Entry creation scenarios fail with 0 entries** — `Debrief: Range Bearing` / `Debrief: Track Stats` didn't produce a log entry. Check whether `debrief-calc` is available in the test environment (sibling `test-analysis-tool.spec.ts` gates on this via `test.fixme('requires debrief-calc service')`). If the calc service is unavailable in CI, this is an environment issue, not a suite issue.
4. **Selection assertions fail** — `log-panel__entry--selected` class not applied. The LogEntry component's selection code path regressed. File a LogPanel-component bug.

## Verification checklist (post-merge)

After the PR lands on `main`:

- [ ] `grep -c 'test.describe.fixme\|test.describe.skip' tests/e2e/test-log-panel.spec.ts` returns `0` (SC-001).
- [ ] The GitHub Actions E2E job summary lists the 5 log-panel scenarios as passed, not skipped (FR-001, User Story 2).
- [ ] After 10 consecutive `main` runs, 10 of 10 pass without retries beyond the configured policy (SC-002).
- [ ] Median wall-clock across those 10 runs is ≤ 90 s for the log-panel suite specifically (inspect the HTML report's per-suite timing) (SC-005).

## Verifying SC-003 (diagnostic artefacts) via a contrived regression

On a throwaway branch:

```sh
# 1. Break the LogPanel DOM contract deliberately
sed -i 's/data-testid="log-panel"/data-testid="log-panel-DELIBERATELY-BROKEN"/' \
  shared/components/src/LogPanel/LogPanel.tsx

# 2. Rebuild the extension
pnpm --filter @debrief/vscode-extension run package

# 3. Run the suite (expect failure)
cd tests/e2e
npx playwright test test-log-panel.spec.ts
```

**Expected**:

- All 5 scenarios fail at `getLogPanelFrame()` within the 15 s frame-probe timeout.
- Local `retries: 1` fires, triggering `trace: 'on-first-retry'`.
- `tests/e2e/playwright-report/` contains an HTML report and a `trace.zip` for each failing scenario (SC-003).
- `npx playwright show-trace <path-to-trace.zip>` opens the interactive viewer showing the frame-probe attempts.

Discard the branch afterwards — this is purely a verification ritual.

## Not covered by this quickstart

- Editing workflows on log entries — covered by `test-log-edit-face.spec.ts` (still `.skip`, separate reactivation effort).
- Parameter-tune propagation across entries — covered by `test-event-log-propagation.spec.ts` (still `.skip`).
- Accessibility audits of the LogPanel — covered by backlog item #209 (`@axe-core/playwright` audit).
- Snapshot / tune discriminator UI — covered by #208 (`kind` discriminator on TimelineEntry).
