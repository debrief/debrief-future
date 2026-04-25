# Feature Specification: VS Code E2E Webview Reliability

**Feature Branch**: `142-vscode-e2e-webview-reliability`
**Created**: 2026-03-18
**Status**: Implementation complete (2026-04-25) — pending /speckit.pr (T032)
**Input**: User description: "VS Code E2E webview reliability — research sprint: `resolveWebviewView` never fires in openvscode-server, causing ~15 test files (~50+ tests) to self-skip; research sprint to find reliable approach for real extension webview content in headless Playwright CI"

## Context

The Debrief VS Code extension has 18 E2E test files in `tests/e2e/`, but ~15 of them self-skip because the webview `#active-frame` iframe is never reliably populated inside openvscode-server's headless Playwright environment. The extension's `resolveWebviewView()` callback — where the real React/Leaflet content is generated — is never called by openvscode-server, even after three earlier blockers (service worker conflict, CSP hash mismatch, origin hash guard) were patched.

The web-shell E2E suite (81 tests, 13 spec files) provides orchestration coverage, but it cannot validate extension-specific concerns: VSIX packaging, extension activation, command registration, webview lifecycle, or the extension-to-webview MessagePort communication boundary.

This is a **research sprint** — the primary deliverable is a validated, reliable approach for making the VS Code extension's real webview content render inside Playwright-controlled openvscode-server (or an alternative host) in headless cloud CI.

### Known Root Cause

Four blockers were identified in `docs/project_notes/webview-e2e-research.md`:

1. **Service Worker Conflict** — patched (disableServiceWorker = true)
2. **CSP Hash Mismatch** — patched (CSP meta tag commented out)
3. **Origin Hash Guard** — patched (guard removed in workbench.js)
4. **`resolveWebviewView` Never Called** — **UNRESOLVED**. The webview container is created, the iframe loads, `webview-ready` is processed, but `setHtml()` / `fb("content")` is never called. This appears to be an openvscode-server-specific bug in the webview view lifecycle.

### Why the Current Workaround is Insufficient

The MessagePort injection in `webview-injector.ts` can push arbitrary HTML into `#active-frame`, but the skipped tests need the real extension content (MapView, FeatureList, TimeController, ToolsPanel, ActivityPanel). The real content depends on VS Code extension API context (`vscode.postMessage`, `getState`/`setState`) and bidirectional MessagePort communication with the extension host. Mocking all of this at the injection level defeats the purpose of E2E testing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Root Cause Investigation (Priority: P1)

As a platform developer, I need the root cause of `resolveWebviewView` not firing in openvscode-server to be identified with evidence, so that I can determine which solution approach is viable.

**Why this priority**: Without understanding why `resolveWebviewView` is not called, all solution attempts are guesswork. This investigation unlocks every subsequent story.

**Independent Test**: Can be tested by producing a documented root cause analysis with evidence (console logs, debugger traces, or source code references) that explains exactly where the webview view lifecycle breaks.

**Acceptance Scenarios**:

1. **Given** openvscode-server running with the Debrief extension sideloaded, **When** the sidebar panel is revealed, **Then** the investigation identifies the exact code path where `resolveWebviewView` should be called but isn't, with file/line references.
2. **Given** the root cause is identified, **When** a candidate fix is applied, **Then** `resolveWebviewView` fires and the extension's real HTML content appears in the webview iframe.
3. **Given** the root cause analysis is complete, **When** reviewed by a developer unfamiliar with the issue, **Then** they can reproduce the problem and verify the fix using documented steps.

---

### User Story 2 - Solution Validation (Priority: P2)

As a platform developer, I need at least one candidate solution validated end-to-end — real extension webview content renders in headless Playwright — so that the ~15 skipped test files can be activated.

**Why this priority**: Once the root cause is understood, a solution must be proven to work in the actual CI environment (headless, no display server except xvfb, GitHub Actions ubuntu-latest).

**Independent Test**: Can be tested by running a single previously-skipped test (e.g., `test-load-display.spec.ts`) with the solution applied and confirming it passes — the webview shows real extension content, not placeholder HTML.

**Acceptance Scenarios**:

1. **Given** the validated solution is applied to the E2E test environment, **When** `test-load-display.spec.ts` runs against openvscode-server, **Then** the real extension webview content (MapView with Leaflet map) renders inside `#active-frame`.
2. **Given** the solution works locally, **When** the same approach runs in CI (GitHub Actions ubuntu-latest, headless Chromium, no Docker), **Then** the test passes with the same result.
3. **Given** the solution requires patches, **When** openvscode-server is upgraded to a new version, **Then** the patches are version-pinned and the upgrade path is documented.

---

### User Story 3 - Test Suite Activation (Priority: P3)

As a platform developer, I need at least 5 previously-skipped test files unskipped and passing in CI, so that the VS Code extension has real automated E2E coverage.

**Why this priority**: The solution must scale beyond a single test file to prove it works across different webview interaction patterns (map rendering, tool execution, selection sync, etc.).

**Independent Test**: Can be tested by running the full VS Code E2E suite and confirming at least 5 previously-skipped spec files now pass or use `test.fixme()` for legitimately missing features.

**Acceptance Scenarios**:

1. **Given** the validated solution is integrated into the E2E infrastructure, **When** the full VS Code E2E suite runs, **Then** at least 5 previously-skipped spec files execute their tests (pass or `test.fixme()`).
2. **Given** a test reveals a missing extension feature during activation, **When** the test is annotated, **Then** it uses `test.fixme()` (not `.skip()`) with a backlog cross-reference.
3. **Given** the CI workflow `e2e.yml` is updated, **When** a PR is opened, **Then** both web-shell and VS Code E2E suites run as parallel CI jobs and complete within the 25-minute timeout.

---

### Edge Cases

- What happens if openvscode-server upgrades break the patches — is there a fallback or version pin?
- How does the solution handle webview disposal and re-creation during test navigation?
- What happens if the extension takes longer than expected to activate — is there a reliable readiness signal?
- How does the solution behave when multiple webview panels are open simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The research sprint MUST identify the root cause of `resolveWebviewView` not firing in openvscode-server with evidence (source code references, debug traces, or console output)
- **FR-002**: At least one candidate solution MUST be validated end-to-end: real extension webview content (React/Leaflet components) renders in `#active-frame` inside Playwright-controlled openvscode-server
- **FR-003**: The validated solution MUST work in CI (GitHub Actions ubuntu-latest, headless Chromium via Playwright, no Docker required)
- **FR-004**: The validated solution MUST work in cloud development sessions (Claude Code environment with `@sparticuz/chromium`)
- **FR-005**: At least 5 previously-skipped test files MUST be unskipped and passing (or using `test.fixme()` for legitimately missing features)
- **FR-006**: Any patches to openvscode-server or workbench.js MUST be version-pinned and documented with an upgrade path
- **FR-007**: The solution MUST NOT require Docker — the E2E tests must run with a direct openvscode-server binary on the CI runner
- **FR-008**: The CI workflow (`e2e.yml`) MUST be updated to use the validated approach
- **FR-009**: The solution MUST preserve the existing web-shell E2E suite — no regressions in the 81 existing tests
- **FR-010**: Tests that reveal missing extension features MUST use `test.fixme()` (not `.skip()`) with backlog cross-references
- **FR-011**: The research findings MUST be documented in `docs/project_notes/webview-e2e-research.md` with reproduction steps and evidence

### Key Entities

- **openvscode-server**: The browser-accessible VS Code host used to run the extension in headless CI. Currently pinned at v1.109.5.
- **Webview View Provider**: The VS Code API (`WebviewViewProvider.resolveWebviewView`) that the extension implements to render its sidebar content. This callback is the broken link in the chain.
- **`#active-frame` iframe**: The DOM element inside the webview container where the extension's HTML content should render. Currently empty because `resolveWebviewView` never fires.
- **`patch-webview.sh`**: Existing script that applies patches 1-3 to openvscode-server. Will need updating with the solution for blocker 4.
- **`webview-injector.ts`**: Existing test helper that intercepts the `webview-ready` MessagePort. May need modification or replacement depending on solution approach.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Root cause of `resolveWebviewView` not firing is identified and documented with evidence that another developer can verify independently
- **SC-002**: At least one candidate solution produces real extension webview content (not placeholder HTML) visible in Playwright screenshots taken during test execution
- **SC-003**: The validated solution passes in CI (GitHub Actions) without manual intervention or Docker
- **SC-004**: At least 5 of the 15 previously-skipped test files are unskipped and execute their assertions (pass or `test.fixme()`)
- **SC-005**: The full E2E suite (web-shell + VS Code) completes within the 25-minute CI timeout
- **SC-006**: All patches are version-pinned with documented upgrade steps, so a future openvscode-server upgrade has a clear migration path

## Assumptions

- The `resolveWebviewView` failure is specific to openvscode-server's webview view lifecycle, not a fundamental limitation of testing VS Code extensions in browsers
- An openvscode-server upgrade or targeted patch can fix the webview view lifecycle without introducing new regressions
- The existing patching approach (`patch-webview.sh`) can be extended to accommodate blocker 4
- The Debrief extension itself correctly implements `WebviewViewProvider` — the bug is in the host, not the extension
- Real Python services (debrief-io, debrief-stac, debrief-calc) are not required for validating the webview rendering fix — they are needed for full E2E test content but the rendering fix can be validated independently

## Dependencies

- **#005** (complete) — Original E2E workflow tests infrastructure (test files, page objects, Playwright config, CI workflow)
- **#135** (subsumed) — Log Panel webview loading failure is a symptom of the same root cause
- **openvscode-server** — The host platform under investigation; solution may require upgrading or switching to an alternative
- **Playwright** — Browser automation framework, already integrated
- **`@sparticuz/chromium`** — Bundled Chromium for cloud/CI environments, already integrated

## Research Questions

The following questions guide the investigation. Not all need answers — the sprint succeeds when at least one viable solution is found:

1. Can `resolveWebviewView` be made to fire via further patching of `workbench.js`?
2. Does a newer openvscode-server version (1.95+) fix the webview view lifecycle?
3. Would code-server exhibit the same `resolveWebviewView` bug or have a different lifecycle path?
4. Can the extension's activation explicitly trigger `resolveWebviewView` (e.g., via `vscode.commands.executeCommand`)?
5. Would `@vscode/test-web` or running real VS Code in xvfb provide a more reliable alternative?
6. Would a hybrid approach (extension host in openvscode-server, webview DOM in web-shell) be an acceptable compromise?

## Candidate Solutions

| # | Approach | Effort | Fidelity | Notes |
|---|----------|--------|----------|-------|
| A | Patch workbench.js to trigger resolveWebviewView | Medium | High | May break on version upgrades |
| B | Upgrade openvscode-server to latest | Low | High | Only if the bug is fixed upstream |
| C | Switch to code-server | Medium | High | Different patching, may have same issue |
| D | Use real VS Code in xvfb | High | Highest | Best fidelity, hardest CI setup |
| E | Extension-side workaround (explicit view reveal) | Low | High | If a command can force resolution |
| F | Accept hybrid: webview DOM in web-shell only | Low | Medium | Already working, reduces VS Code E2E scope |
