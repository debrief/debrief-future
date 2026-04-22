# Usage Example: Reproducing the Reactivated Log-Panel E2E Suite

## What this example shows

How a reviewer, CI maintainer, or future-you can confirm the shipped state of feature #210:

- The three tests in `tests/e2e/test-log-panel.spec.ts` are discoverable and reported as **pending** (not silently dropped).
- Their pending status references the **new** blocker [#509](https://github.com/debrief/debrief-future/issues/509), not the closed `#143`.
- The stale suite-level `describe.skip` / `describe.fixme` and the `#143` blocker comment are both gone.

## Prerequisites

- Clone the repo at commit `0a5b008a` or later on branch `claude/speckit-specify-210-uRbqr`.
- Node 20+, pnpm 9+, Python 3.11+ (for sample catalogue tooling — not strictly required to run the reactivated suite).

## Step 1 — Provision the bundled Chromium

```sh
bash tests/e2e/scripts/ensure-chromium.sh
```

Expected tail:

```text
Installed: Google Chrome for Testing 145.0.7632.6
Chromium path written to .../tests/e2e/.chromium-path
Done.
```

## Step 2 — Build and install the Debrief VSIX

```sh
pnpm install
pnpm --filter @debrief/session-state build
pnpm --filter @debrief/utils build
pnpm --filter @debrief/components build
( cd apps/vscode && pnpm run package )
/opt/code-server/bin/code-server --install-extension apps/vscode/debrief-vscode-0.1.0.vsix
```

## Step 3 — Start code-server

```sh
nohup /opt/code-server/bin/code-server \
  --auth none --bind-addr 0.0.0.0:8080 --disable-telemetry \
  tests/e2e/test-workspace > /tmp/code-server.log 2>&1 &
until curl -sf http://localhost:8080/healthz >/dev/null; do sleep 1; done
echo "code-server ready"
```

## Step 4 — Run the reactivated suite

```sh
CHROMIUM_PATH=$(cat tests/e2e/.chromium-path) \
CODE_SERVER_URL=http://localhost:8080 \
  npx playwright test \
    --config tests/e2e/playwright.config.ts \
    tests/e2e/test-log-panel.spec.ts
```

### Expected output (the shipped state — FR-005 / R7(b) escape hatch active)

```text
Running 3 tests using 1 worker

  -  1 tests/e2e/test-log-panel.spec.ts:13:3 › Log Panel › log panel shows empty state when no tools have run
  -  2 tests/e2e/test-log-panel.spec.ts:29:3 › Log Panel › running a tool creates a log entry
  -  3 tests/e2e/test-log-panel.spec.ts:46:3 › Log Panel › log entries are shown most recent first

  3 skipped
```

Each `-` line is a `test.fixme` referencing **#509**. Crucially, the *describe* block is **active** — you're looking at three individually-pending tests, not a silently-dropped suite.

## Step 5 — Verify hygiene

### SC-001 adjusted for the R7(b) hand-off

```sh
grep -nE "(\.describe\.fixme|\.describe\.skip|#143|// blocked)" tests/e2e/test-log-panel.spec.ts
```

Expected: **no matches**. The legacy stale markers are gone. (The three `test.fixme` lines remain and explicitly point to #509, not to the closed blocker — exactly the policy-approved hand-off shape.)

### NFR-001 — no production code touched

```sh
git diff main...HEAD -- \
  'shared/components/src/LogPanel/**' \
  'apps/vscode/src/views/logPanelView.ts' \
  'apps/vscode/src/webview/**' \
  | head
```

Expected: empty diff.

## What you will *not* see in this example

- A green three-consecutive-runs stability loop — that was the happy-path SC-003 acceptance. This feature invoked FR-005 / R7(b) instead; see `stability-run.txt` for the reasoning and the hand-off to #509.
- A "3 passed" line for the log-panel suite — the three tests genuinely fail against the current preview environment. Forcing them to pass here would have required production-code or helper changes that NFR-001 explicitly puts out of scope.

## Follow-up

When [#509](https://github.com/debrief/debrief-future/issues/509) ships, the implementer removes the three `test.fixme(true, 'pending #509 — …')` lines and re-runs `npx playwright test ... test-log-panel.spec.ts` — the expected output flips to `3 passed`. That is when SC-002 and SC-003 are truly met.
