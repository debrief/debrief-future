# Usage Example — Log-Panel E2E Suite

**Feature**: 210 — Un-skip webview log-panel E2E suite

## Running the suite

The suite runs as part of the default VS Code E2E job. For ad-hoc local
invocation against a running openvscode-server (`http://localhost:8080` by
default), use the sibling `run-playwright.mjs` entry point used elsewhere
in the repository. From the repository root:

```sh
# Full E2E job (all active suites under tests/e2e/)
task test

# Just the log-panel suite (requires openvscode-server to be reachable at
# CODE_SERVER_URL, default http://localhost:8080):
pnpm exec playwright test \
  --config tests/e2e/playwright.config.ts \
  test-log-panel.spec.ts
```

In cloud Claude Code sessions, use the same bundled-chromium path that
sibling suites use:

```sh
CLAUDE_CODE=1 \
  pnpm exec playwright test \
    --config tests/e2e/playwright.config.ts \
    test-log-panel.spec.ts
```

`playwright.config.ts` auto-detects `CLAUDE_CODE=1` and uses the
`@sparticuz/chromium` bundle resolved via `.chromium-path` (see
`docs/project_notes/playwright-installation-research.md`).

## Expected output — 5 scenarios, all pass

```
Running 5 tests using 1 worker

  ✓ test-log-panel.spec.ts:14:3 › Log Panel › log panel shows empty state when no tools have run
  ✓ test-log-panel.spec.ts:27:3 › Log Panel › running a tool creates a log entry
  ✓ test-log-panel.spec.ts:43:3 › Log Panel › log entries are shown most recent first
  ✓ test-log-panel.spec.ts:64:3 › Log Panel › clicking a log entry selects it
  ✓ test-log-panel.spec.ts:80:3 › Log Panel › clicking a selected log entry deselects it

  5 passed (≈60–80s)
```

Wall-clock varies with openvscode-server warm-up; the ≤ 90 s SC-005 budget
covers the full 5-scenario run measured end-to-end from the Playwright
summary line.

## Running the skip-guard

The skip-guard is wired into `task lint` and runs on every CI lint job.
For ad-hoc invocation:

```sh
bash scripts/check-log-panel-skip-guard.sh
```

Expected output on a clean source file:

```
✅ Log-panel skip-guard passed (tests/e2e/test-log-panel.spec.ts has no skip/fixme)
```

If a contributor reintroduces any of `test.skip`, `test.fixme`,
`test.describe.skip`, or `test.describe.fixme` in `test-log-panel.spec.ts`,
`task lint` exits non-zero and prints the offending line:

```
❌ Log-panel skip-guard failed!

tests/e2e/test-log-panel.spec.ts must not contain test.skip, test.fixme,
test.describe.skip, or test.describe.fixme — see spec 210 FR-011.
Offending lines:

14:  test.fixme('temp negative-test', async () => {});
```

## Interpreting Playwright trace artefacts

On CI failure (or local with `retries: 1`), each failing scenario produces:

- A `.zip` trace in the `test-results/` directory
- A screenshot of the failing frame
- A video (if globally configured) — not enabled for this suite

Open a trace with:

```sh
pnpm exec playwright show-trace test-results/<scenario>/trace.zip
```

The trace timeline will navigate into a webview iframe URL (format:
`vscode-webview://<guid>/index.html?…`) when Scenario A's `getLogPanelFrame`
call resolves. That navigation is the visible proof SC-004 (assertion
against rendered DOM inside a webview iframe) is satisfied.

## What to expect when a contrived regression is injected

Example: removing `data-testid="log-panel"` from `LogPanel.tsx` line 277
triggers Scenario A's first `logPanel.waitFor({ state: 'visible',
timeout: 5_000 })` to time out. Playwright emits:

```
Error: locator.waitFor: Timeout 5000ms exceeded.
  waiting for locator('[data-testid="log-panel"]') to be visible
```

A screenshot + trace are persisted, and the `task test` job exits non-zero.
The contrived-regression spike documented in `contrived-regression-spike.md`
walks through this cycle end-to-end.
