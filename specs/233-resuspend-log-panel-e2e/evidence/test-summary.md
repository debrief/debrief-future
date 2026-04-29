---
feature: "233-resuspend-log-panel-e2e"
captured_at: "2026-04-29T13:30:00Z"
git_sha: "4ce7b09"
tests_passed: 1
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Re-activate Log Panel E2E Suite (post-#142)

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 5 |
| Passed | 1 |
| Failed | 0 |
| Skipped (per-test fixme) | 4 |
| Coverage | n/a (integration suite) |

The deliverable is the suite returned to active CI coverage with at least one
passing assertion and zero failures, so PRs no longer inherit five failures
from a fixme-d-but-CI-relevant suite. Per spec §60 narrow-mute fallback the
four state-dependent scenarios are per-test-`fixme`-d with a follow-up
tracker (`evidence/followup-test-state-injection.md`).

## Test Breakdown

### `tests/e2e/test-log-panel.spec.ts` (Log Panel)

| Test | Status | Notes |
|------|--------|-------|
| `log panel shows empty state when no tools have run` | ✅ Pass | Verifies the LogPanel React app renders `[data-testid="log-panel"]` and the `log-panel-empty-no-entries` empty state when a plot is open but no tools have run. |
| `running a tool creates a log entry` | ⏸️ fixme | Requires extension→webview `timeline:update` flow. Hybrid A+D limitation. |
| `log entries are shown most recent first` | ⏸️ fixme | Same Hybrid A+D limitation. |
| `clicking a log entry selects it` | ⏸️ fixme | Same Hybrid A+D limitation. |
| `clicking a selected log entry deselects it` | ⏸️ fixme | Same Hybrid A+D limitation. |

## Key Scenarios Verified

- **Webview boots in cloud E2E** — the LogPanel iframe loads from disk via `tests/e2e/helpers/cdn-interceptor.ts`, the MessagePort handshake completes, and the bundled React app mounts inside `#active-frame` (proves Patch 3 from #142 fires for the LogPanel container, not just the Activity / Results panels that existing tests already covered).
- **Auto-generated focus command** — clicking the "Debrief Log" activity-bar tab + executing the auto-generated focus command (`Debrief Log: Focus on Log View`) reliably switches the active sidebar container and triggers `resolveWebviewView`, with no flake across local re-runs.
- **Skip-guard contract (narrowed)** — the restored `scripts/check-log-panel-skip-guard.sh` blocks describe-level mutes (`test.describe.skip(...)`, `test.describe.fixme(...)`) but allows per-test `test.fixme(...)`. Pre-state and post-state transcripts captured in `evidence/skip-guard-validation.txt`.
- **Taskfile re-wiring** — the `bash scripts/check-log-panel-skip-guard.sh` line is restored under `task lint` (Taskfile.yml). The `#210/#233` mute-explanation comment is removed in the same edit.
- **Probe disposal (FR-006)** — `tests/e2e/test-webview-probe.spec.ts` deleted. `tests/e2e/helpers/webview-injector.ts` retained because three other specs still import it (verified at T019b — see `evidence/muted-suite-triage.md` "Orphan helpers" section).

## Known Issues

- Tests #2-#5 are per-test `fixme`'d. Each requires live extension state to flow into the webview iframe (tool execution → `timeline:update` postMessage → LogPanel re-renders), which Hybrid A+D explicitly does not support per `docs/project_notes/webview-e2e-research.md` "Limitations". Reactivation tracked in `evidence/followup-test-state-injection.md`.
- One pre-existing pytest failure in `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts` (`ReadOnlyFilesystemError` chmod-based test) reproduces on `origin/main`. Not introduced by this branch — verified via stash + checkout-from-main + retest.

## Environment

- Runner: Playwright 1.58.2 with `@sparticuz/chromium 143.0.4`
- Server: openvscode-server v1.109.5 (with `tests/e2e/scripts/patch-webview.sh` patches 1, 1b, 2, 3 applied)
- Extension: `apps/vscode/debrief-vscode-0.1.0.vsix` built from this branch
- Branch: `claude/implement-speckit-233-eIUQu`
- Date: 2026-04-29
- Invocation: `pnpm exec playwright test --config tests/e2e/playwright.config.ts test-log-panel`
