# Feature Specification: Un-skip Webview Log-Panel E2E Suite

**Feature Branch**: `210-unskip-log-panel-e2e`
**Created**: 2026-04-22
**Status**: Draft
**Input**: User description: "Un-skip webview log-panel E2E suite — `tests/e2e/test-log-panel.spec.ts` is currently `test.describe.fixme(...)` pending issue #143 (webview iframe selector instability in code-server). Once #143 resolves, convert back to active tests; these cover the real integration path (code-server → LogPanel webview iframe → VS Code message bus) that Storybook cannot exercise. (requires #143, #176)"

## Background

`#143` (STAC-tree E2E reliability) and `#176` (Log Panel UX) are both complete. `#143`'s evidence summary lists `test-log-panel.spec.ts` as "Re-enabled", but the file on `main` still wraps its three tests in `test.describe.fixme(...)` with a stale comment referring to the resolved blocker. The tests therefore never run in CI: the integration path from **code-server → LogPanel webview iframe → VS Code message bus** has zero live coverage — regressions in that path can only be caught manually.

`#176` built out the full LogPanel unit + Storybook suite, but Storybook renders the panel in isolation. It cannot exercise the two production concerns the E2E suite is designed to prove:

1. The panel actually mounts inside the VS Code extension's webview iframe hierarchy when a plot is opened.
2. Real tool invocations in the extension host emit `LogEntry` messages that reach the panel over the VS Code `postMessage` bridge.

Neighbouring suites that use the **same** helpers (`codeServerPage.openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`) already run green — `test-analysis-tool.spec.ts`, `test-capture-log-evidence.spec.ts`, and the `#143` batch. The selectors the log-panel tests need (`[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, `.log-panel__entry`) are all present in production code post-`#176`. The suite should be ready to pass without code changes; the only required work is reactivation plus verification.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log-panel webview integration is continuously verified (Priority: P1)

As a developer merging changes that touch the LogPanel code path (panel component, webview wiring, log message bus, tool-completion hooks), when CI runs on my pull request, the three log-panel E2E tests execute against the real code-server + extension-host + webview-iframe stack and fail loudly if the integration breaks, so that regressions in the "tool-run → log-entry-visible" path are caught before merge instead of at user-report time.

**Why this priority**: This is the core value of the feature. Today these three tests are silently absent from CI; the whole point of the backlog item is to get them running and gating merges.

**Independent Test**: Run `cd tests && pnpm e2e test-log-panel.spec.ts` (or the equivalent full E2E invocation) against a fresh code-server preview; observe all three tests execute — none marked `skipped`, `fixme`, or `pending` — and pass within the test runner's configured timeout.

**Acceptance Scenarios**:

1. **Given** a clean checkout on this branch, **When** the E2E suite runs against a code-server preview with `Exercise Alpha` in the sample catalogue, **Then** `test-log-panel.spec.ts` reports **3 tests, 0 skipped, 0 pending** and all three pass.
2. **Given** the re-enabled suite runs in CI on this PR, **When** CI completes, **Then** the CI summary lists all three log-panel tests as executed (not skipped), with no `fixme` / `skip` annotations remaining in the file.
3. **Given** a future regression silently breaks the webview message bus (e.g. LogPanel stops receiving `LogEntry` messages), **When** CI runs that change, **Then** at least one of the three tests fails and blocks merge.

---

### User Story 2 - Dead-marker hygiene: no references to resolved blockers (Priority: P2)

As a developer reading `tests/e2e/test-log-panel.spec.ts`, when I look for "why is this skipped?", I should find either active code (no skip at all) or an explicit reference to a **currently open** blocker — never a stale `fixme` pointing at a closed issue, because stale markers erode trust in CI annotations and obscure which tests are genuinely pending.

**Why this priority**: Dead `fixme`/`skip` markers are a recurring CLAUDE.md tripwire (Constitution Article I.3 — "no silent failures"). This story guarantees the comment block above `test.describe` is either removed or pointed at a live concern.

**Independent Test**: Grep the file for `#143`, `fixme`, `skip` — none should match against `test.describe` calls after this feature ships.

**Acceptance Scenarios**:

1. **Given** the merged change, **When** `grep -E "fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts` is run, **Then** no match is returned (the blocker comment and the `fixme` wrapper are both gone).
2. **Given** a future author needs to re-skip one of these tests, **When** they read the file, **Then** the current `describe` block is ordinary `test.describe(...)` — they know they need to justify a fresh skip rather than inheriting a stale one.

---

### User Story 3 - Suite stays green across cloud + local preview environments (Priority: P3)

As a developer running the Playwright suite locally or in a cloud sandbox, when I execute `test-log-panel.spec.ts`, it passes in the same environments where its sibling suites (`test-analysis-tool.spec.ts`, `test-capture-log-evidence.spec.ts`) currently pass, because all three share the same fixtures and webview-iframe helpers.

**Why this priority**: Reactivation is worthless if the suite is flaky. This story forces the implementer to run it enough times to have confidence parity with the neighbours.

**Independent Test**: Run `test-log-panel.spec.ts` three consecutive times against the same preview — all three runs pass.

**Acceptance Scenarios**:

1. **Given** a code-server preview with the sample catalogue, **When** the suite is run three times back-to-back, **Then** all three runs report 3/3 pass.
2. **Given** the suite runs on the Heroku review-app environment via `.github/workflows/heroku-e2e.yml`, **When** the workflow is dispatched against this PR, **Then** the log-panel tests pass.

---

### Edge Cases

- **Exercise Alpha missing from catalogue**: The tests call `codeServerPage.openPlotViaStacTree('Exercise Alpha')`. If the fixture catalogue ever loses that name, the first test fails immediately with a tree-navigation error rather than a log-panel error. Mitigation: relies on the same fixture the green sibling suites already depend on; no fresh risk introduced by this feature.
- **Tool identifiers drift**: Tests invoke `Debrief: Range Bearing` and `Debrief: Track Stats` via the command palette. If either command is renamed or removed, tests 2 and 3 fail. Mitigation: both commands are verified live by `test-analysis-tool.spec.ts` — drift would be caught there too.
- **Webview-iframe selector regression (original `#143` class of bug)**: If the underlying instability returns for a different reason, the suite fails loudly rather than silently — which is the intended behaviour. A future `skip`/`fixme` would require its own new blocker issue and explicit justification.
- **Sample catalogue changes ordering**: Test 3 asserts "most recent first" via entry count ≥ 2, not via text content, so it is robust to sample-data re-ordering.
- **Partial un-skip by accident**: If an implementer converts `describe.fixme` → `describe` but leaves an inner `test.skip`, one test would silently disappear. Mitigation: SC-002 mandates the full three-test count.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The three tests inside `tests/e2e/test-log-panel.spec.ts` MUST execute as active tests — no `test.describe.fixme`, `test.describe.skip`, `test.fixme`, or `test.skip` at any level of the file.
- **FR-002**: The file MUST NOT contain any comment referencing `#143` as a current blocker (the issue is resolved; the reference is stale).
- **FR-003**: All three tests MUST pass against the same preview environments used by the sibling suites `test-analysis-tool.spec.ts` and `test-capture-log-evidence.spec.ts` (code-server local, Heroku review app).
- **FR-004**: The full E2E test invocation that runs in CI (per `CLAUDE.md` "Before Pushing" step 4) MUST succeed on the branch with the three log-panel tests active and passing.
- **FR-005**: If any of the three tests cannot be made to pass within this feature, the implementer MUST NOT land the change by re-applying `fixme` — instead they MUST open a new blocker issue, document the specific failure mode, and reference the **new** issue (not `#143`). The backlog item is "un-skip and verify", not "un-skip at any cost".
- **FR-006**: Evidence of passing runs MUST be captured under `specs/210-unskip-log-panel-e2e/evidence/` per the project evidence-capture convention (test summary template with `git_sha` + `captured_at` front matter), showing at minimum one full pass of `test-log-panel.spec.ts`.
- **FR-007**: The backlog entry for item `210` MUST be marked `complete` on merge (struck-through in `BACKLOG.md`), with a link to the spec directory, consistent with the repository's backlog-closure pattern.

### Non-Functional Requirements

- **NFR-001**: Reactivation MUST NOT introduce code changes to LogPanel production code (`shared/components/src/LogPanel/**`, `apps/vscode/src/views/logPanelView.ts`, message-bus wiring). If a test fails, the failure surfaces a real bug — in which case the fix belongs in a separate issue, not silently bundled here.
- **NFR-002**: Test runtime per test MUST remain within the individual timeouts already specified in the file (5s for the empty-state test, 15s for the tool-run tests). This feature does not relax timeouts to force passes.

### Key Entities

- **`tests/e2e/test-log-panel.spec.ts`**: The sole file modified by this feature. Currently contains one `test.describe.fixme(...)` block wrapping three tests (empty state, single tool entry, multiple entries ordered most-recent-first). Target state: `test.describe(...)` (active) with the stale `#143` comment removed.
- **Evidence artefact**: New test-summary document under `specs/210-unskip-log-panel-e2e/evidence/` capturing the passing run(s) per `.specify/templates/evidence/test-summary-template.md`.
- **Backlog entry `210`**: Row in `BACKLOG.md` to be struck through and linked to this spec on merge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `grep -E "\.fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts` returns **zero matches** after this feature ships.
- **SC-002**: A Playwright run of `tests/e2e/test-log-panel.spec.ts` reports exactly **3 tests, 3 passed, 0 skipped, 0 pending, 0 failed** in a single execution against a known-good code-server preview.
- **SC-003**: Three consecutive back-to-back runs of the file each report the SC-002 outcome (stability evidence — no flake).
- **SC-004**: CI on the PR for this feature completes the full "Before Pushing" verification (`task verify` plus the Playwright E2E step) with green status, and the CI artefact lists the three log-panel tests as **executed** (not skipped) — verified by inspecting the CI output/artefact for this branch.
- **SC-005**: After merge, any future PR that silently breaks the LogPanel webview integration is blocked: simulated by temporarily reverting `apps/vscode/src/views/logPanelView.ts` to a version that does not wire the message bus and confirming the suite fails. (Validation step only — not a permanent CI fixture.)

## Assumptions

- **A-001**: `#143` (STAC-tree E2E reliability) is fully merged and the `openPlotViaStacTree` helper is stable — backed by `specs/143-fix-stac-tree/evidence/test-summary.md` and the green status of `test-analysis-tool.spec.ts` and `test-capture-log-evidence.spec.ts`, which use the same helpers.
- **A-002**: `#176` (Log Panel UX) is fully merged and the production selectors used by the tests (`[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, `.log-panel__entry`) are present — backed by `specs/176-log-panel-ux/` status `complete`.
- **A-003**: The sample catalogue used by the code-server preview still contains an `Exercise Alpha` plot and the `Debrief: Range Bearing` + `Debrief: Track Stats` commands still resolve — backed by the fact that sibling suites rely on the same entries.
- **A-004**: No production code changes are needed for the tests to pass. If this assumption proves wrong during implementation, the feature's scope expands into FR-005 territory: the implementer stops, documents the real failure, and opens a fresh blocker issue rather than silently re-skipping.
- **A-005**: The cloud/Heroku Playwright path (`run-playwright.mjs` + `@sparticuz/chromium`) already exercises this file in dry-run mode — i.e. the file is discovered and reported-as-pending — so reactivation is a one-line change (`fixme` → active) rather than a test-runner configuration change.

## Out of Scope

- **O-001**: Reactivating `tests/e2e/test-storyboard-capture.spec.ts` — it carries a separate `test.describe.skip(...)` block referencing `#143` and belongs to the Storyboarding epic (#216); out of scope for this Tech Debt item.
- **O-002**: Adding new LogPanel E2E test cases — this feature reactivates the existing three only. Additional coverage (e.g. filtering, selection sync, flip-card edit face) is a separate backlog item.
- **O-003**: Refactoring the webview-iframe helpers (`getLogPanelFrame`, `getWebviewFrame`) — they are known-working and shared with sibling suites.
- **O-004**: Migrating these tests to the web-shell Playwright path — the whole value proposition of the suite is that it exercises the **code-server** → webview-iframe path specifically. The web-shell already has its own log-panel E2E at `apps/web-shell/playwright/tests/log-panel.spec.ts`.
- **O-005**: Re-running `@axe-core/playwright` accessibility audit on LogPanel stories — tracked separately as backlog item `209`.

## Dependencies

- **D-001**: `#143` — Fix STAC Tree E2E Test Reliability (`specs/143-fix-stac-tree/`, status **complete**).
- **D-002**: `#176` — Log Panel UX (`specs/176-log-panel-ux/`, status **complete**).
- **D-003**: The shared Playwright fixture `tests/e2e/fixtures/base.ts` exposing `codeServerPage` with `openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`, `executeCommand` — already in place.

## Risks

- **R-001** (Low): The tests fail on reactivation for a reason unrelated to the original `#143` blocker (e.g. subtle selector drift post-`#176`). Mitigation: FR-005 forbids silent re-skip; implementer opens a fresh issue and records the failure mode.
- **R-002** (Low): Tests are flaky — sometimes pass, sometimes fail. Mitigation: SC-003 mandates three consecutive green runs before the spec counts as met.
- **R-003** (Very Low): Reactivation exposes a real production bug in the LogPanel message bus. Mitigation: this is the *desired* outcome — the suite doing its job. The fix is a separate issue per NFR-001.
