# Feature Specification: Reactivate Webview Log-Panel E2E Suite

**Feature Branch**: `210-unskip-log-panel-e2e`
**Created**: 2026-04-24
**Status**: Draft
**Input**: User description: "Un-skip webview log-panel E2E suite — `tests/e2e/test-log-panel.spec.ts` is currently `test.describe.fixme(...)` pending issue #143 (webview iframe selector instability in code-server). Once #143 resolves, convert back to active tests; these cover the real integration path (code-server → LogPanel webview iframe → VS Code message bus) that Storybook cannot exercise. (requires #143, #176)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Log-panel integration path is guarded by CI (Priority: P1)

As a maintainer of the VS Code extension, when a pull request touches the LogPanel webview, its renderer, or the VS Code ↔ webview message bus, I need the CI E2E suite to exercise the real integration path (openvscode-server → sidebar view → LogPanel webview iframe → extension host message bus) and fail when the integration breaks. Storybook and the web-shell tests cannot cover this path because they both bypass the VS Code extension host and its iframe boundary.

**Why this priority**: This is the core intent of the item. The suite currently exists in `tests/e2e/test-log-panel.spec.ts` but is disabled via `test.describe.fixme(...)`. Every merge that touches LogPanel, the webview message bus, or the sidebar activation sequence goes out without coverage of the real integration path. Reactivating the suite restores the safety net.

**Independent Test**: Run `pnpm test:e2e -- test-log-panel` locally against openvscode-server and confirm the three existing scenarios execute (no `fixme` annotation), pass, and produce a Playwright trace for each.

**Acceptance Scenarios**:

1. **Given** a fresh CI run against the current branch, **When** the E2E job executes, **Then** the log-panel suite runs without any `skip` or `fixme` markers and all its tests report pass/fail status rather than being skipped.
2. **Given** a change that breaks the LogPanel webview contract (e.g. removes the `[data-testid="log-panel"]` root), **When** CI runs, **Then** the log-panel suite fails within its own timeout budget and captures a screenshot/trace artefact for the failing scenario.
3. **Given** the log-panel suite passes on `main`, **When** another E2E suite (e.g. STAC tree, selection sync) regresses, **Then** the log-panel suite continues to pass (no hidden cross-suite coupling introduced by reactivation).

---

### User Story 2 — Reviewers get visible signal, not silent skips (Priority: P2)

As a reviewer looking at a CI report, I need the log-panel suite to appear as active tests with pass/fail results rather than as `[fixme]` entries, so that the suite's health is visible in the summary and any regression is surfaced immediately rather than masked behind the `pending` status.

**Why this priority**: Silent skips erode trust in CI coverage. The existing `fixme` was intentional (Feature 176 decision 9A) but was meant to be temporary — its dependencies (#143, #176) have now shipped, so the masking is no longer justified.

**Independent Test**: Inspect the CI run summary after merge and confirm the log-panel suite's scenarios appear in the pass/fail tallies, not in the skipped/pending tally.

**Acceptance Scenarios**:

1. **Given** the Playwright JUnit/HTML report produced by CI, **When** a reviewer opens it, **Then** the log-panel suite's scenarios are listed under "passed" (or "failed"), not under "skipped" or "pending".
2. **Given** any comment, annotation, or commit message in the suite file, **When** a reader searches for references to "#143" as a blocker, **Then** no residual blocked-state comments remain; historical context lives in the PR description and project notes, not in test source.

---

### User Story 3 — Coverage parity with the web-shell suite for user-observable behaviours (Priority: P3)

As a reviewer comparing host surfaces, I need the VS Code log-panel E2E suite to cover the same user-observable behaviours as the web-shell suite at `apps/web-shell/playwright/tests/log-panel.spec.ts` — at minimum: empty state, entry creation on tool run, ordering (most recent first), and selection/deselection — so that feature parity between the two host surfaces is enforced by tests rather than trusted by convention.

**Why this priority**: The current `fixme`'d suite covers three of the four must-haves (empty state, entry creation, ordering) but omits select/deselect. Closing the parity gap is valuable but secondary to simply reactivating existing coverage. This story is separately testable and may be deferred if environmental issues surface during P1/P2 implementation — but the default is to deliver it.

**Independent Test**: Execute the suite and confirm at least one scenario asserts selection class toggles on a log entry after a click, and another asserts the class clears on a second click.

**Acceptance Scenarios**:

1. **Given** at least one log entry is present, **When** the user clicks the entry once, **Then** the entry's rendered state reflects the selected condition as observed in the web-shell parity test.
2. **Given** a selected log entry, **When** the user clicks it a second time, **Then** the entry's rendered state reverts to unselected.
3. **Given** the set of behaviours covered by the web-shell log-panel suite, **When** a reviewer lines them up against the VS Code suite, **Then** every user-observable behaviour (empty state, entry creation, ordering, selection, deselection) is covered in both — or the omission is documented in the spec's Out of Scope section with rationale.

---

### Edge Cases

- What happens when the LogPanel view has not been focused yet (sidebar panel collapsed or Activity view on top)? The suite MUST drive the LogPanel into focus via the shared helper rather than assuming it is already visible.
- What happens when a tool run completes before the Log tab is surfaced? The entry MUST still appear once the panel is focused (no reliance on the panel being open at the moment of creation).
- What happens when the openvscode-server session is slow to activate the extension? The suite MUST rely on the shared timeouts used by sibling suites (no hand-tuned per-scenario waits that mask race conditions).
- What happens if the STAC tree helper regresses? The log-panel suite SHOULD fail loudly at the `openPlotViaStacTree(...)` step with a clear error, not at a downstream LogPanel assertion that makes the root cause harder to diagnose.
- What happens when a future LogPanel change renames `[data-testid="log-panel"]` or `.log-panel__entry`? The suite MUST fail at the assertion, not hang — and the failure message MUST clearly identify the missing selector.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The log-panel suite MUST NOT use `test.describe.fixme` or `test.describe.skip`. It MUST be declared as an active `test.describe(...)` block and included in every default CI E2E run.
- **FR-002**: The three existing scenarios (empty state when no tools have run; running a tool creates a log entry; log entries are shown most recent first) MUST pass in the CI openvscode-server environment.
- **FR-003**: The suite MUST consume the shared fixtures (`tests/e2e/fixtures/base`) and page model (`tests/e2e/models/code-server-page.ts`) used by sibling active E2E specs. It MUST NOT introduce a bespoke helper, bespoke timeout, or bespoke fixture solely for this suite.
- **FR-004**: The suite MUST complete within the per-suite timeout budget inherited from `tests/e2e/playwright.config.ts`, with no scenario-level timeout override unless justified in a comment at the override site.
- **FR-005**: On failure, the suite MUST emit the same diagnostic artefacts as sibling active suites (Playwright trace, screenshot on failure, video if configured globally) — no bespoke artefact capture inside the suite.
- **FR-006**: The suite MUST cover click-to-select and click-to-deselect on a log entry to match the web-shell parity baseline, unless the omission is documented in the Out of Scope section with rationale.
- **FR-007**: The reactivation MUST NOT introduce regressions in adjacent suites. Any changes to shared helpers (page model, fixtures) MUST preserve the public surface consumed by other suites.
- **FR-008**: The suite source MUST NOT retain residual comments referring to the prior blocked state (e.g. "blocked by #143", "Feature 176 decision 9A"). Historical context MUST live in the PR description and project notes, not in the test file.
- **FR-009**: The suite MUST follow the existing naming and header convention used by sibling active suites in `tests/e2e/` (header comment describing the target, fixtures import, `test.describe` block).
- **FR-010**: Selection-state assertions in the two new parity scenarios MUST use class-presence regex matching (`toHaveClass(/selected/)`), mirroring the web-shell `log-panel.spec.ts` pattern, rather than exact-class-string equality (e.g. `toHaveClass('log-panel__entry--selected')`). This maintains coverage parity with the web-shell suite and keeps the assertion resilient to BEM-modifier class renames.
- **FR-011**: The repository MUST include a CI-gated lint check that fails when `tests/e2e/test-log-panel.spec.ts` contains any `test.skip(`, `test.fixme(`, `test.describe.skip(`, or `test.describe.fixme(` call. This prevents silent re-skipping from regressing User Story 2 ("visible pass/fail signal, not silent skips"). Implementation may be either a grep-based step in the Taskfile `lint` target or an ESLint `no-restricted-syntax` rule scoped via overrides to this file — either form satisfies this requirement.

### Key Entities

- **Log-Panel E2E Suite**: The Playwright test file at `tests/e2e/test-log-panel.spec.ts` that exercises the LogPanel webview through the openvscode-server integration path.
- **LogPanel Webview**: The sidebar webview that renders the LogPanel component and responds to the VS Code ↔ webview message bus. Already shipped under Feature #176.
- **Code-Server Page Model**: The shared `CodeServerPage` helper at `tests/e2e/models/code-server-page.ts` that exposes `openPlotViaStacTree(...)`, `getLogPanelFrame()`, `getWebviewFrame()`, `executeCommand(...)`, and related primitives. Stabilised under Feature #143.
- **Web-Shell Parity Baseline**: The comparable Playwright suite at `apps/web-shell/playwright/tests/log-panel.spec.ts` that defines the user-observable behaviour set the VS Code suite aims to mirror.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `test.describe.fixme` or `test.describe.skip` calls remain in `tests/e2e/test-log-panel.spec.ts` after the feature ships (verifiable by grep).
- **SC-002**: The log-panel suite passes green in 10 of the last 10 CI runs on `main` (rolling window) after merge, with no retries beyond the default Playwright retry policy configured for the rest of the E2E job.
- **SC-003**: When a contrived regression is introduced on a spike branch (e.g. removing `[data-testid="log-panel"]` from the LogPanel component), the suite fails within its inherited timeout and emits a screenshot plus trace artefact for the failing scenario — confirming the suite exercises the real integration path and is not silently passing.
- **SC-004**: Running the suite executes at least one assertion against the LogPanel rendered inside the VS Code webview iframe (verifiable by inspecting the Playwright trace for frame navigation into a webview URL).
- **SC-005**: The suite's total wall-clock runtime on the CI runner is ≤ 90 seconds for the expected 4–5 scenarios, measured as a median across 10 consecutive runs. A warning threshold of 85 seconds (median over any rolling 10-run window on `main`) triggers a tracking issue; breach of the 90-second threshold triggers the scenario-consolidation fallback defined in research.md § R2.
- **SC-006**: The suite's scenario list, when diffed against the web-shell log-panel suite, covers the parity baseline (empty state, entry creation, ordering, selection, deselection) with at most one documented omission.

## Assumptions

- Feature #143 has landed: the shared `openPlotViaStacTree(...)` helper completes within 30 s in CI, the STAC tree populates reliably after extension activation, and the 18 previously-skipped suites run green.
- Feature #176 has landed: the LogPanel component renders `[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, and `.log-panel__entry` selectors, and exposes `Debrief Log: Focus on Debrief Log View` via the command palette — all of which the current `fixme`'d suite already references.
- The webview iframe resolution helper (`getLogPanelFrame()`) in `code-server-page.ts` reliably locates the LogPanel frame in openvscode-server following #143's frame-probing improvements.
- Default Playwright retry and timeout policies configured at the project level are appropriate for this suite; no suite-specific overrides are anticipated.

## Out of Scope

- Changes to the LogPanel component, its DOM contract, or its message-handling behaviour. Any such change is a separate feature.
- Rewrites or structural changes to the shared page model, fixtures, or playwright config. Minor additions (e.g. a missing helper method) are permitted but MUST keep the public surface backward compatible.
- Coverage for LogPanel capabilities beyond the web-shell parity baseline — e.g. the edit-face workflow (Feature #175), per-entry tune markers (follow-ups to #176), snapshot-kind discriminator (#208), and manifest-driven category resolution (#207). These have their own backlog items.
- New snapshot/visual-regression testing for the LogPanel. The suite remains behavioural (assertion-driven), matching sibling E2E suites.
- Cross-browser coverage. The suite runs only against the project's standard Playwright browser configuration used by the wider E2E job.

## Dependencies

- **#143** (complete): Fix STAC Tree E2E Test Reliability. Provides the stable `openPlotViaStacTree(...)` helper this suite depends on.
- **#176** (complete): LogPanel UX. Provides the DOM contract, `data-testid` hooks, and command-palette focus entry point this suite asserts against.
