# Feature Specification: Fix STAC Tree E2E Test Reliability

**Feature Branch**: `143-fix-stac-tree`
**Created**: 2026-03-20
**Status**: Draft
**Input**: User description: "Fix openPlotViaStacTree timeout in CI E2E tests — openPlotViaStacTree() times out (~42s) in every CI run; 8 test suites skipped; STAC tree never populates in openvscode-server despite config being pre-seeded"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CI E2E tests that open plots via STAC tree pass reliably (Priority: P1)

As a developer running CI, when E2E tests need to open a plot for testing (map display, tool execution, selection sync, etc.), the test helper that navigates the STAC tree and opens a plot must complete successfully within a reasonable time, so that all 18 dependent test suites can execute instead of being skipped.

**Why this priority**: This is the core bug — 18 of ~28 E2E test files are skipped because the shared `openPlotViaStacTree()` helper times out every CI run. Fixing this unblocks the majority of E2E coverage.

**Independent Test**: Can be tested by running a single E2E test that calls `openPlotViaStacTree('Exercise Alpha')` in CI and verifying it completes without timeout.

**Acceptance Scenarios**:

1. **Given** the CI environment with openvscode-server, a pre-seeded config file, and a test STAC catalog, **When** a test calls the plot-opening helper with a known plot name, **Then** the STAC tree populates, the plot node is found and clicked, and the webview loads — all within 30 seconds.
2. **Given** the CI environment, **When** the full E2E suite runs, **Then** no test suites are skipped due to STAC tree loading failures (the `.skip` annotations are removed).
3. **Given** the CI environment, **When** the extension activates, **Then** the STAC tree view reads the pre-seeded configuration and populates tree nodes for each registered store without requiring a window reload.

---

### User Story 2 - Diagnostic visibility for STAC tree failures (Priority: P2)

As a developer debugging a test failure, when the STAC tree helper fails to find expected tree nodes, the system should capture diagnostic information (screenshots at each stage, extension output channel logs, config file contents) so the root cause can be identified from CI artifacts.

**Why this priority**: Even after the fix, future regressions or environment changes could break the STAC tree loading. Diagnostics make these failures debuggable without reproducing locally.

**Independent Test**: Can be tested by intentionally misconfiguring the STAC store path and verifying that diagnostic screenshots and logs are captured as CI artifacts.

**Acceptance Scenarios**:

1. **Given** a failing STAC tree load attempt, **When** the helper times out, **Then** at least one diagnostic screenshot is saved showing the state of the sidebar at the point of failure.
2. **Given** a failing STAC tree load attempt, **When** the helper times out, **Then** the extension output channel content is logged (or captured as artifact) showing any config read errors or activation failures.

---

### User Story 3 - Fallback plot-opening mechanism (Priority: P3)

As a developer maintaining E2E tests, if STAC tree navigation proves fundamentally unreliable in the headless CI environment, an alternative mechanism to open plots (e.g., via command invocation) should be available so that tests covering map display, tool execution, and other plot-dependent features can still run.

**Why this priority**: This is the safety net. If Option A (fix tree reliability) cannot achieve consistent results, the test infrastructure needs a fallback that bypasses tree UI navigation entirely.

**Independent Test**: Can be tested by opening a plot via the alternative mechanism and verifying the webview loads with the expected content.

**Acceptance Scenarios**:

1. **Given** the CI environment, **When** a test opens a plot via the fallback mechanism (not tree navigation), **Then** the webview loads with the plot's features displayed on the map within 20 seconds.
2. **Given** the fallback mechanism is available, **When** it is used, **Then** at least one dedicated test still exercises the STAC tree navigation path to maintain coverage of that user flow.

---

### Edge Cases

- What happens when the config file exists but the store path points to a nonexistent directory?
- What happens when the extension activates before the config file is written by global setup?
- What happens when the STAC pane header text differs in case or whitespace across openvscode-server versions?
- What happens when the STAC tree populates but the tree rows are not yet rendered in the DOM (virtual scrolling)?
- What happens when the window reload (fallback path) occurs but the extension fails to reactivate?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plot-opening test helper MUST complete within 30 seconds in the CI environment (down from the current ~42s timeout cascade)
- **FR-002**: The STAC tree view MUST populate with registered stores after extension activation without requiring a manual window reload in CI
- **FR-003**: The test helper MUST capture a diagnostic screenshot when any wait step exceeds its expected duration
- **FR-004**: The test helper MUST log the extension output channel content when tree loading fails
- **FR-005**: The config pre-seeding in global setup MUST complete before the openvscode-server starts serving requests, ensuring the extension reads valid config on first activation
- **FR-006**: All 18 previously-skipped test suites MUST have their `.skip` annotations removed and pass in CI
- **FR-007**: The test helper MUST handle the case where the STAC pane is collapsed and expand it before waiting for tree nodes
- **FR-008**: If tree-based plot opening cannot be made reliable, the test infrastructure MUST provide a command-based alternative that bypasses tree UI navigation

### Key Entities

- **STAC Tree View**: The VS Code tree data provider (`stacTreeProvider`) that reads config, discovers STAC catalogs, and renders store/catalog/plot nodes in the Explorer sidebar
- **Config Service**: Reads `~/.config/debrief/config.json` to discover registered STAC stores; the source of truth for what appears in the tree
- **E2E Page Object** (`CodeServerPage`): The Playwright page model that encapsulates openvscode-server interactions including tree navigation, webview access, and command palette invocation
- **Test Fixture**: The base fixture that intercepts CDN requests and injects webview content via MessagePort

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 18 previously-skipped E2E test suites pass in CI with a success rate of at least 95% across 10 consecutive runs (no flaky failures from STAC tree loading)
- **SC-002**: The plot-opening step completes in under 30 seconds in CI (reduced from the current ~42s timeout cascade)
- **SC-003**: Zero E2E test files contain `.skip` annotations related to STAC tree loading issues
- **SC-004**: When a STAC tree failure does occur, diagnostic artifacts (screenshot + log) are available in CI output within the same test run

## Assumptions

- The openvscode-server version (v1.109.5) will remain the same during implementation; if upgraded, tree view rendering behaviour may change
- The test STAC catalog (`tests/e2e/test-workspace/local-store/catalog.json`) contains at least 2 valid items and is correctly structured
- The config file format (`~/.config/debrief/config.json`) will not change during implementation
- The existing webview content injection via the MessagePort interceptor continues to work for the map view once the plot is opened
- The root cause is most likely timing/activation related (not a fundamental incompatibility with openvscode-server's tree view implementation)
