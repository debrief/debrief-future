# Quickstart: Un-skip Webview Log-Panel E2E Suite

**Audience**: The implementer who will take this spec through `/speckit.implement`, or anyone validating the feature post-merge.

## What this feature delivers

Three E2E tests in `tests/e2e/test-log-panel.spec.ts` flip from **skipped (via `test.describe.fixme`)** to **active, executed, and passing** in CI. That's it.

- No production code is touched.
- No new tests are written.
- No dependencies change.
- One file is edited. Evidence is captured. Backlog is updated.

## The one-line change

**Before** (`tests/e2e/test-log-panel.spec.ts` lines 11–14):

```ts
// Blocked by issue #143 (webview iframe selector instability in openvscode-server).
// Converted from `skip` to `fixme` so CI flags it as a known-pending suite
// rather than silently dropping the whole describe block. Feature 176 decision 9A.
test.describe.fixme('Log Panel', () => { // blocked: webview iframe (#143)
```

**After**:

```ts
test.describe('Log Panel', () => {
```

The three-line comment block is deleted along with the `.fixme` and the trailing `// blocked: …` comment. Grep should return zero matches for `fixme`, `\.skip\b`, or `#143` anywhere in the file (SC-001).

## How to run the suite

The project's "Before Pushing" gate (`CLAUDE.md`) plus the cloud-friendly Playwright path cover this:

**Cloud / Claude Code sandbox (recommended for CI-parity):**

```sh
# From repo root
bash tests/e2e/scripts/ensure-chromium.sh          # one-time; writes .chromium-path
CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts
# or equivalent: cd tests/e2e && CLAUDE_CODE=1 node <playwright-runner>
```

**Heroku review app (dispatch the workflow):**

```sh
# From a branch with this feature, dispatch .github/workflows/heroku-e2e.yml
gh workflow run heroku-e2e.yml --ref claude/speckit-specify-210-uRbqr
```

**Local macOS / Windows:**

```sh
pnpm exec playwright install chromium
pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts
```

Expected output for any of the above:

```text
Running 3 tests using 1 worker
  ✓  test-log-panel.spec.ts:18:1 › Log Panel › log panel shows empty state when no tools have run (3.2s)
  ✓  test-log-panel.spec.ts:31:1 › Log Panel › running a tool creates a log entry (9.8s)
  ✓  test-log-panel.spec.ts:47:1 › Log Panel › log entries are shown most recent first (13.4s)

  3 passed (26.4s)
```

(Timings indicative — SC-002 only requires 3 pass / 0 skip / 0 fail, within the file's existing per-test timeouts.)

## Stability check (SC-003)

After a single green run, run the file three consecutive times:

```sh
for i in 1 2 3; do
  echo "=== Run $i ==="
  CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts || exit 1
done
echo "All three runs passed"
```

All three runs must report 3/3 pass. Any flake — one pass + one fail + one pass — counts as a failure for SC-003 and triggers FR-005.

## If the tests fail on reactivation

**Do not re-apply `fixme`.** Per spec FR-005 and research R7:

1. Capture the failure — screenshot, error log, Playwright trace.
2. Open a new issue describing the specific failure mode (e.g. "Log-panel webview frame not discoverable in CI — selector X not found within Y ms").
3. Either (a) leave the reactivated tests failing in the PR (loud CI failure is a valid signal) and hand the fix to a separate feature, **or** (b) land a `test.fixme` on the individual failing test(s) — not the whole `describe` — referencing the **new** issue, not `#143`.
4. Update `specs/221-unskip-log-panel-e2e/evidence/test-summary.md` to document the partial success and the hand-off.

## Evidence deliverable (FR-006)

One file: `specs/221-unskip-log-panel-e2e/evidence/test-summary.md`, following `.specify/templates/evidence/test-summary-template.md`. Minimum content:

- YAML front matter with `git_sha` and `captured_at`.
- One Playwright terminal output block showing 3 passed / 0 skipped / 0 failed.
- Confirmation line "3/3 tests passed × 3 consecutive runs" (if SC-003 was also validated in the same capture).
- Environment line identifying which preview path was used (cloud sandbox / Heroku review app / local).

## Backlog update (FR-007)

On merge, in `BACKLOG.md`:

- Find the row with `| 210 | Tech Debt | Un-skip webview log-panel E2E suite — …`.
- Wrap every cell in `~~…~~` strikethrough.
- Replace the feature-description cell with a strikethrough link to `specs/221-unskip-log-panel-e2e/spec.md`, matching the pattern used by rows `~~215~~`, `~~216~~`, `~~206~~`.
- Change status cell from `proposed` to `complete`.

## Acceptance self-check before opening PR

Run each of these from repo root. All must be ✅.

```sh
# SC-001: no skip markers or stale #143 refs
grep -E "\.fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts && echo "FAIL" || echo "✅ SC-001"

# NFR-001: no production code touched
git diff --name-only main...HEAD -- 'shared/components/src/LogPanel/**' \
    'apps/vscode/src/views/logPanelView.ts' 'apps/vscode/src/webview/**' \
  | grep . && echo "FAIL" || echo "✅ NFR-001"

# FR-006: evidence artefact exists
test -f specs/221-unskip-log-panel-e2e/evidence/test-summary.md && echo "✅ FR-006" || echo "FAIL"

# FR-007: backlog updated
grep -E "^\| ~~210~~" BACKLOG.md && echo "✅ FR-007" || echo "FAIL"

# Repo-wide pre-push gate
task verify && echo "✅ task verify"
```

## Related files (read-only during this feature)

- `tests/e2e/models/code-server-page.ts` — `openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`, `executeCommand`. Do not modify.
- `tests/e2e/fixtures/base.ts` — `codeServerPage` fixture wiring. Do not modify.
- `tests/e2e/test-analysis-tool.spec.ts`, `tests/e2e/test-capture-log-evidence.spec.ts` — reference sibling suites; the behaviour contract for "the helpers work" is their green status.
- `specs/143-fix-stac-tree/evidence/test-summary.md` — historical evidence that the STAC-tree blocker is closed.
- `specs/176-log-panel-ux/` — the feature that produced the LogPanel selectors the tests rely on.
