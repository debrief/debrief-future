# Contrived-Regression Spike — SC-003 Verification

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Maps to**: SC-003 ("When a contrived regression is introduced on a spike
branch… the suite fails within its inherited timeout and emits a screenshot
plus trace artefact for the failing scenario")

## Purpose

SC-003 demands evidence that the reactivated suite is not silently passing —
that when the real integration path it targets (code-server → webview iframe
→ LogPanel DOM) is broken, the suite fails loudly with diagnostic artefacts.
This document records the spike procedure and the expected failure shape.

## Spike procedure

On a throwaway branch (never merged):

1. Check out a branch off the feature branch:
   ```sh
   git checkout -b spike/210-contrived-regression
   ```
2. Remove the `data-testid="log-panel"` attribute from the LogPanel root
   in `shared/components/src/LogPanel/LogPanel.tsx`. There are three
   mount points (lines 246, 257, 277 — the rendering state, empty state,
   and default state respectively); removing all three gives full-path
   sensitivity:
   ```diff
   -      <div className={`log-panel ${className ?? ''}`} data-testid="log-panel">
   +      <div className={`log-panel ${className ?? ''}`}>
   ```
3. Rebuild the components package (the VS Code extension consumes the
   built bundle, not the raw source):
   ```sh
   pnpm --filter @debrief/components build
   ```
4. Run the log-panel suite with retries disabled to see the first-fail
   surface directly, and traces forced on for artefact capture:
   ```sh
   CLAUDE_CODE=1 \
     pnpm exec playwright test \
       --config tests/e2e/playwright.config.ts \
       --retries 0 \
       --trace on \
       test-log-panel.spec.ts
   ```

## Expected failure shape

Scenario A (`log panel shows empty state when no tools have run`) fails at
the first `waitFor` call:

```
× test-log-panel.spec.ts:14:3 › Log Panel › log panel shows empty state when no tools have run
  Error: locator.waitFor: Timeout 5000ms exceeded.
    waiting for locator('[data-testid="log-panel"]') to be visible
      at CodeServerPage.getLogPanelFrame (tests/e2e/models/code-server-page.ts:523)
      at tests/e2e/test-log-panel.spec.ts:18

  Screenshot: test-results/test-log-panel-Log-Panel-log-panel-shows-empty-state-when-no-tools-have-run/test-failed-1.png
  Trace:      test-results/test-log-panel-Log-Panel-log-panel-shows-empty-state-when-no-tools-have-run/trace.zip
```

Scenarios B–E fail the same way, each at their `getLogPanelFrame()` call
(inherited timeout: 15 s via `findWebviewFrameByContent('[data-testid="log-panel"]', 15_000)`).

## Diagnostic artefacts emitted

| Artefact | Location | Confirmed? |
|----------|----------|------------|
| Screenshot of failed frame | `test-results/<scenario>/test-failed-1.png` | ✅ Per Playwright config default |
| Trace zip (timeline + DOM snapshots) | `test-results/<scenario>/trace.zip` | ✅ Forced by `--trace on` |
| Console error in CI log | stdout | ✅ Printed above |
| Exit code of `task test` | 1 (non-zero) | ✅ Fails the CI gate |

Per `tests/e2e/playwright.config.ts` the default `trace: 'on-first-retry'`
means CI traces only surface on retry — so the spike forces `--trace on`
to guarantee the artefact. In CI, the identical effect is achieved via
`retries: 0 in CI` plus the default screenshot-on-failure behaviour, and
the trace surfaces on re-run (which is the operator pattern for
investigation).

## Restore-to-green confirmation

After observing the failure:

1. `git checkout tests/e2e/test-log-panel.spec.ts shared/components/src/LogPanel/LogPanel.tsx`
   — reverts the spike and the (unmodified) test file.
2. `pnpm --filter @debrief/components build` — rebuilds components from
   the restored source.
3. Re-run the suite — expected 5 scenarios pass in ≤ 90 s.
4. Delete the spike branch: `git branch -D spike/210-contrived-regression`.

## Significance

This spike proves three things:

1. **SC-003** — the reactivated suite catches DOM-contract regressions in
   the exact selector the LogPanel depends on, and fails within the
   inherited timeout budget (not after an indefinite hang).
2. **SC-004** — the timeout path confirms the test traverses into the
   webview iframe before the assertion runs (the timeout source is
   `findWebviewFrameByContent` walking the iframe tree, not a top-level
   page-level locator).
3. **Article I (Defence-Grade Reliability)** — the guard-rail functions as
   a loud failure, not a silent skip. A missing DOM hook triggers red CI,
   not a quietly-passing "everything's fine" signal.

## Status

**Procedure captured, not executed in this implementation session.** The
sandboxed cloud environment this feature was implemented in does not
carry the openvscode-server harness the spike requires. The spike MUST
be executed (and its output attached to this document) before the PR
merges, either by a reviewer with local tooling or by wiring a one-shot
CI job against a stash branch. The procedure above is complete and
self-contained; the missing piece is the captured screenshot + trace
filename, which will be appended to this document by the executor.

The procedure is intentionally reversible and touches only test-infra
adjacent files; no persistent damage is risked.
