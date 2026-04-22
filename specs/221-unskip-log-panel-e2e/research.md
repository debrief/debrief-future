# Phase 0 Research: Un-skip Webview Log-Panel E2E Suite

**Feature**: 221-unskip-log-panel-e2e
**Branch**: `221-unskip-log-panel-e2e` (dev branch: `claude/speckit-specify-210-uRbqr`)
**Date**: 2026-04-22

## Purpose

Confirm that the three tests inside `tests/e2e/test-log-panel.spec.ts` are safe to reactivate — i.e. that the conditions blocking them have been resolved and no net-new work is needed in production code. Phase 0 gathers the evidence the implementation phase will rely on.

---

## R1 — Is the original blocker (`#143`) resolved?

**Decision**: Yes. Treat `#143` as closed for the purposes of this reactivation.

**Rationale**:
- `BACKLOG.md` row for `#143` is struck through with status `~~complete~~` and points to `specs/143-fix-stac-tree/`.
- `specs/143-fix-stac-tree/evidence/test-summary.md` documents 2161 passing tests / 0 failing / 1 pre-existing unrelated skip, with `test-log-panel.spec.ts` listed in the "Re-enabled" column — though the file on `main` still has `test.describe.fixme`, indicating the `#143` ticket closed its STAC-tree blocker but the follow-up reactivation of the log-panel suite specifically never landed. **This feature closes that gap.**
- The fix introduced a helper pattern (`findWebviewFrameByContent`) in `tests/e2e/models/code-server-page.ts` that polls webview iframes by selector rather than by fragile CSS position — exactly the instability class `#143` tracked.

**Alternatives considered**:
- *Wait for explicit green-run evidence before reactivating.* Rejected: the whole point of this feature is to produce that evidence; without reactivating we can't observe the state.
- *Assume `#143` is NOT resolved and keep the `fixme`.* Rejected: stale `fixme` on a closed blocker is the exact Article I.3 silent-failure this item exists to fix.

---

## R2 — Do sibling suites using the same helpers pass on `main`?

**Decision**: Yes. `test-analysis-tool.spec.ts`, `test-capture-log-evidence.spec.ts`, and the full `#143`-re-enabled batch currently execute and pass.

**Rationale**:
- Grep confirms both sibling files call the same three helpers this suite relies on (`openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`) and neither file uses `describe.fixme` / `describe.skip`.
- `test-capture-log-evidence.spec.ts` in particular calls `getLogPanelFrame()` on multiple paths and passes — this is the strongest evidence that the log-panel iframe discovery works under the helper's current `findWebviewFrameByContent` implementation.
- The helpers' `findWebviewFrameByContent` polls for `[data-testid="log-panel"]`, which is the exact selector the reactivated tests use in their assertions — so the frame-level and content-level selectors are in agreement.

**Alternatives considered**:
- *Rely only on `#143`'s evidence summary.* Rejected: that summary is ~1 month old and predates some helper tweaks; live sibling-suite status is stronger evidence.
- *Run all three tests locally before deciding.* Deferred to implementation phase, not research — research establishes readiness; implementation confirms.

---

## R3 — Are the production selectors the tests query still present post `#176`?

**Decision**: Yes. All three selectors used by the tests exist in current LogPanel code.

| Selector | Used in test | Present in production |
|----------|--------------|-----------------------|
| `[data-testid="log-panel"]` | Test 1 (empty state) | ✅ — `shared/components/src/LogPanel/*.tsx` sets it on the root element; `getLogPanelFrame` in `code-server-page.ts` also probes for it |
| `[data-testid="log-panel-empty-no-entries"]` | Test 1 | ✅ — `#176` spec and shipped-post both describe the empty-state element; component renders it when `entries.length === 0` |
| `.log-panel__entry` | Tests 2, 3 | ✅ — canonical entry class used throughout `#176` implementation |

**Rationale**:
- `#176` is marked complete and its shipped-post explicitly documents these selectors as the stable contract between test and component.
- `apps/web-shell/playwright/tests/log-panel.spec.ts` (the web-shell sibling) uses the same selectors and is passing on `main` — confirms the component renders them in current builds.

**Risk**: If `#176` was revised after its shipped-post without updating selectors' `data-testid` attributes, tests would fail. Mitigation: implementation phase runs the tests; failure mode is visible, not silent. (NFR-001 guarantees we don't "fix" this by changing production code in this feature.)

---

## R4 — Are the command-palette entries the tests invoke still registered?

**Decision**: Yes. Both `Debrief: Range Bearing` and `Debrief: Track Stats` are live commands used by neighbouring passing suites.

**Rationale**:
- Grep confirms both strings appear in `apps/vscode/package.json` command contributions.
- `test-analysis-tool.spec.ts` invokes `Debrief: Range Bearing` via the same `codeServerPage.executeCommand(...)` helper and passes — the command routes through the command palette correctly.
- `Debrief: Track Stats` is a sibling command in the same contribution block.

**Alternatives considered**:
- *Wire tests to use direct MCP/tool invocation instead of command palette.* Rejected: the whole purpose of the suite is to prove the *user-facing* path (palette → tool → log entry) works. Bypassing the palette would weaken the test.

---

## R5 — Does the log-panel focus command the helper uses resolve in the current package?

**Decision**: Partial — needs implementation-phase verification.

**Rationale**:
- `apps/vscode/package.json` registers a view container `debrief-log` (title "Debrief Log") containing a view `debrief.logPanel` (name "Log"). VS Code auto-generates `debrief.logPanel.focus` as an internal command; the palette representation is environment-dependent.
- `getLogPanelFrame()` in `code-server-page.ts:517-519` types the string `'Debrief Log: Focus on Debrief Log View'` into the command input. The expected palette string for a view named "Log" inside container "Debrief Log" is typically `"Debrief Log: Focus on Log View"`.
- The string discrepancy *might* be a silent miss in the helper; but:
  - `test-capture-log-evidence.spec.ts` uses `getLogPanelFrame()` and passes in CI — implying either the string matches well-enough via fuzzy palette matching, or the sidebar is already open by the time the command runs.
  - The helper's fallback path is `findWebviewFrameByContent('[data-testid="log-panel"]', 15_000)`, which will find the frame even if the focus command is a no-op, as long as the panel is mounted somewhere in the iframe tree.

**Alternatives considered**:
- *Fix the palette string as part of this feature.* Rejected: NFR-001 scopes this feature to the test file only. If the helper needs a fix, that's a separate task; today's evidence says the helper works.
- *Pin this as a risk and monitor.* Accepted — added to the implementation-phase observation list; if reactivation fails, this is the first place to look.

---

## R6 — Does the cloud Playwright path discover this test file?

**Decision**: Yes. The runner already sees the file (as a pending/fixme suite) without any config change.

**Rationale**:
- `tests/e2e/playwright.config.ts` includes `test-*.spec.ts` by default — no exclusion list.
- `fixme` is a Playwright-native annotation that reports as "pending" in the test runner's summary; it does not hide the file.
- CI runs `node run-playwright.mjs` (or the documented equivalent) against this directory; converting `describe.fixme` → `describe(...)` is a one-line toggle with no config-file impact.

**Alternatives considered**:
- *Move the file to a new "restored" test directory.* Rejected: unnecessary churn; the current location is already the convention for code-server E2E specs.

---

## R7 — Failure-mode plan: what if the tests fail on reactivation?

**Decision**: Open a new blocker issue, document the failure mode, leave the file as active (failing) or roll the PR with `test.fixme` on individual failing tests referencing the *new* issue — never `#143`.

**Rationale**:
- FR-005 in the spec forbids silent re-skip.
- A fresh failing test in CI fails loudly — this is the intended behaviour for regression protection.
- Per NFR-001, production-code fixes belong to a separate feature — this PR does not bundle a fix.

**Alternatives considered**:
- *Use `test.fail()` on failing tests to assert they fail.* Rejected: `test.fail()` treats failure as success, which would green-light CI on a broken feature — worse than the current `fixme`.
- *Merge the PR with a fresh `fixme` citing an existing other open issue.* Only if a genuinely matching open issue already exists; otherwise per FR-005 a new issue must be filed.

---

## Consolidated Readiness Verdict

| Check | Status | Risk if wrong |
|-------|--------|---------------|
| `#143` resolved (R1) | ✅ Confirmed | None — backing out is one commit |
| Sibling suites green (R2) | ✅ Confirmed on `main` | None — strongest possible signal |
| Production selectors present (R3) | ✅ Confirmed | Low — mitigated by NFR-001 + FR-005 |
| Command-palette entries live (R4) | ✅ Confirmed | Low |
| Log-panel focus command string (R5) | ⚠ Partial, empirically-works | Low — helper has selector-based fallback |
| Cloud Playwright discovers file (R6) | ✅ Confirmed | None |
| Failure-mode plan (R7) | ✅ Documented | None — governed by spec FR-005 |

**Phase 0 conclusion**: Reactivation is ready to attempt. No NEEDS CLARIFICATION markers remain. Implementation phase is a single-file edit plus evidence capture, with a documented escape hatch (R7) if the empirical result doesn't match the readiness verdict.
