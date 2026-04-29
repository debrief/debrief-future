---
feature: 233-resuspend-log-panel-e2e
captured_at: 2026-04-29
git_sha: 4ce7b09
status: open
shape: precursor follow-up — extends Hybrid A+D to support extension→webview state simulation
---

# Follow-up: Add extension-state injection to the cloud E2E framework

## What this tracks

Four log-panel tests are per-test-`fixme`-d on this branch (per spec §60 narrow-mute fallback):

1. `running a tool creates a log entry` (`test-log-panel.spec.ts:39`)
2. `log entries are shown most recent first` (`test-log-panel.spec.ts:55`)
3. `clicking a log entry selects it` (`test-log-panel.spec.ts:75`)
4. `clicking a selected log entry deselects it` (`test-log-panel.spec.ts:92`)

All four require **live extension → webview state messages** to flow into the LogPanel webview iframe — specifically `timeline:update` postMessages fired by `LogPanelViewProvider` after a tool execution appends to the LogService.

## Why they don't pass under Hybrid A+D

The cloud E2E framework documented at `docs/project_notes/webview-e2e-research.md` ("Hybrid A+D") works by:

1. Intercepting `*.vscode-cdn.net` requests via `tests/e2e/helpers/cdn-interceptor.ts`, serving `pre/index.html` from disk so the webview iframe can boot.
2. Capturing the `webview-ready` MessagePort handshake via `tests/e2e/helpers/webview-injector.ts` and injecting bundled extension HTML directly through the captured port.
3. Mocking `acquireVsCodeApi()` so the React app can call it without errors.

The framework's explicit limitation (already documented at line 319 of `webview-e2e-research.md`):

> **Still cannot validate:**
> - Extension ↔ webview message passing (e.g., selection sync)
> - Live data loading from STAC stores into webview
> - Extension commands that update webview state

The four muted tests fall squarely in this category. They drive the `Debrief: Range Bearing` command (which DOES execute in the real extension host), but the resulting `timeline:update` message that the host posts back to the LogPanel webview never reaches the *injected* iframe — it's dispatched to a different (real) webview instance that no longer has its content rendered after the framework's port-capture.

## Concrete demonstration

For test #1 (the active one) the `getLogPanelFrame()` helper has to manually dispatch a synthesised `session:change` MessageEvent inside the LogPanel iframe so the React app exits its initial `log-panel-empty-no-plot` state. This is a per-helper workaround. Tests #2-#5 would each need similar bespoke dispatching for `timeline:update`, plus the map iframe would need `mapState:update` (or equivalent) to render leaflet features for the click step. The test bodies cannot do this themselves without spec scope creep (spec §131 puts the bodies out of scope).

## Proposed follow-up shape

A precursor PR (probably ~1 dev-day, complexity Medium) that adds an "extension-state simulator" to the test fixtures. Concretely:

1. Extend `apps/vscode/dist/webview/*` bundles, or wrap them with a thin shim, that exposes a `window.__debriefTestHooks` object with helpers like `setActiveSession({ plotName })`, `appendLogEntry({ ... })`, `setMapData({ ... })`. The injected content would call these in response to test-driven `postMessage` calls from the parent.
2. Add a `DebriefWebview` page-object method `simulateLogEntry(...)` that wraps the `evaluate(...)` call to dispatch the right MessageEvent inside the inner frame.
3. Re-activate the four muted tests, each calling the simulator at the appropriate point.
4. Update the skip-guard back to its strict regex (block ALL skip/fixme forms in `test-log-panel.spec.ts`).
5. Update spec 233's FR-001 / FR-005 / SC-001 to revert the §60 narrow-mute relaxation.

This is a small, well-contained piece of work — it just needs operator time and isn't blocked by anything upstream.

## Why this isn't in this PR

- **Scope.** Spec 233 is "re-activate the suite" not "extend the test framework". The §60 narrow-mute fallback exists precisely so we don't pile framework work onto a re-activation PR.
- **Atomicity.** The atomic-commit constraint (research.md Decision 2) means each FR set lands as one commit. The framework extension would dwarf the un-mute commit.
- **Evidence.** This branch demonstrates the un-mute mechanics, the cloud-env reproduction, the helper bug discovery, and the narrow-mute fallback. The framework gap is real and now openly tracked, rather than implicit.

## Pointers

| Reference | Purpose |
|-----------|---------|
| `docs/project_notes/webview-e2e-research.md` "Limitations" | Authoritative description of what Hybrid A+D can't do |
| `tests/e2e/fixtures/base.ts` `buildContentQueue()` | Where the new `appendLogEntry` simulator would be invoked |
| `tests/e2e/helpers/webview-injector.ts` | The MessagePort capture site |
| `tests/e2e/helpers/extension-content.ts` | Where the `__debriefTestHooks` shim would be added |
| `tests/e2e/test-log-panel.spec.ts:39,55,75,92` | The four `test.fixme(...)` callers waiting for re-activation |

When the framework extension PR lands, this file should be deleted in the same PR (delete it from `evidence/`) and a one-line entry added to the spec's "Resolved" section.
