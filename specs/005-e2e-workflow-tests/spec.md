# Feature Specification: End-to-End Workflow Tests

**Feature Branch**: `005-e2e-workflow-tests`
**Created**: 2026-02-06
**Revised**: 2026-03-06
**Status**: Revised — reflects implemented state
**Input**: User description: "Add cross-service end-to-end workflow tests (io -> stac -> calc)"

## Clarifications

### Session 2026-03-06

- Q: Should VS Code E2E tests be restored (existing `tests/e2e/`), written from scratch, or replaced with webview-only approach? → A: Restore existing `tests/e2e/` skipped tests (unskip, fix selectors, sideload VSIX)
- Q: How should missing/incomplete features discovered during VS Code E2E test restoration be recorded? → A: Use Playwright `test.fixme()` annotation in the test + create a backlog item with cross-reference

## Context

The Debrief platform orchestrates three core Python services (io, stac, calc) into user-facing workflows. While each service has comprehensive unit tests, no test originally exercised the complete user journey — opening a file, seeing tracks on the map, running an analysis tool, and verifying results.

E2E coverage spans **two complementary test surfaces**:

1. **Web-shell** (`apps/web-shell`) — a browser-accessible React application that replicates the VS Code extension's orchestration layer. Playwright tests against the web-shell exercise cross-service workflows without depending on VS Code internals.
2. **VS Code extension** (`tests/e2e/`) — Playwright tests driving openvscode-server with the Debrief extension sideloaded. These tests validate the real extension host environment, including VSIX packaging, extension activation, and command registration.

Testing both surfaces provides higher confidence: the web-shell catches orchestration regressions quickly and cheaply, while the VS Code E2E tests catch extension-specific issues (activation, command palette, webview lifecycle) that the web-shell cannot reach.

### Current State (March 2026)

The web-shell Playwright test suite contains **81 tests across 13 spec files**, all active (none skipped). These tests cover the full io → stac → calc pipeline through browser automation, running in both local development and CI environments.

The VS Code extension E2E suite (`tests/e2e/`) contains **11 tests across 3 spec files**, all currently `.skip()`'d. The scaffolding (page objects, global setup, Chromium extraction) is verified working. Restoration requires: building the VSIX, sideloading into openvscode-server, fixing DOM selectors to match current extension output, and ensuring Python services are reachable. See `docs/e2e-test-restoration-requirements.md` for the documented restoration path. Where test flow reveals missing or incomplete features, these MUST be captured as new backlog items rather than blocking the E2E test PR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Display Workflow (Priority: P1)

As a developer, I need automated tests that verify a user can open a plot from the catalog and see parsed tracks displayed on the map, so that regressions in the file-loading pipeline are caught before they reach users.

**Why this priority**: This is the most fundamental user workflow — the first thing every user does. It exercises the full path from catalog selection through io parsing, stac catalog storage, and map rendering.

**Independent Test**: Covered by `apps/web-shell/playwright/tests/plot-load.spec.ts` (6 tests) and `catalog-browse.spec.ts` (4 tests).

**Acceptance Scenarios**:

1. **Given** the web-shell loaded with sample STAC catalog data, **When** the user double-clicks a timeline entry, **Then** the analysis view opens showing the map with track features rendered as Leaflet paths.
2. **Given** a plot has been opened, **When** the user views the analysis view, **Then** the activity panel, map panel, and back-to-catalog navigation are all visible and functional.
3. **Given** a plot is displayed, **When** the user clicks the back button, **Then** the catalog overview is restored.

---

### User Story 2 - Analysis Tool Execution Workflow (Priority: P2)

As a developer, I need automated tests that verify a user can select features and run an analysis tool with results displayed, so that the complete analysis pipeline is protected from regressions.

**Why this priority**: Running analysis tools on loaded data is the core analytical workflow. This exercises the stac-to-calc round-trip through the real UI orchestration layer.

**Independent Test**: Covered by `apps/web-shell/playwright/tests/tool-execution.spec.ts` (6 tests).

**Acceptance Scenarios**:

1. **Given** a loaded plot with track features visible on the map, **When** the user selects a track from the feature list and a tool becomes active, **Then** clicking the tool's run button produces a result message containing measurement data.
2. **Given** no features are selected, **When** the user views the tools panel, **Then** all tools show as inactive, preventing invalid tool execution.
3. **Given** a tool has produced a result message, **When** the user clicks dismiss, **Then** the result message disappears.

---

### User Story 3 - Selection and Interaction Workflow (Priority: P3)

As a developer, I need automated tests that verify feature selection, time control, and drawing interactions work correctly across the full UI, so that cross-component integration is validated.

**Why this priority**: These interactions exercise the session-state store, selection sync, and temporal state — shared infrastructure that all workflows depend on.

**Independent Test**: Covered by `selection-sync.spec.ts` (5 tests), `time-controller.spec.ts` (14 tests), and `drawing.spec.ts` (7 tests).

**Acceptance Scenarios**:

1. **Given** a loaded plot, **When** the user selects a feature in the feature list, **Then** the selection state propagates to the tools panel, enabling context-sensitive tools.
2. **Given** temporal track data, **When** the user manipulates the time controller, **Then** the map display updates to reflect the time window.
3. **Given** the drawing toolbar, **When** the user creates a shape, **Then** the shape persists on the map and is available for tool operations.

---

### Edge Cases

- What happens when the user opens an extremely large REP file (thousands of positions) — does the interface remain responsive?
- How does the system behave when the STAC catalog's storage location becomes read-only mid-workflow?
- What happens if the user navigates away from the analysis view while a tool is executing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: E2E tests MUST exercise the user workflow across both the web-shell and the VS Code extension (via openvscode-server with sideloaded VSIX)
- **FR-002**: Automated tests MUST interact with real UI components — map panel, feature list, tools panel, time controller, and catalog overview
- **FR-003**: The test environment MUST include sample data files available as pre-loaded STAC catalog entries
- **FR-004**: Tests MUST exercise the complete file-loading workflow: select catalog item → load plot → display tracks on map
- **FR-005**: Tests MUST exercise the complete analysis workflow: select features → invoke calc tool → display results
- **FR-006**: Tests MUST verify that selection state propagates correctly between components (feature list, tools panel, map)
- **FR-007**: Tests MUST be executable in CI without manual intervention, using headless Chromium
- **FR-008**: The test environment MUST work offline without requiring external network access
- **FR-009**: Developers MUST be able to run the same tests locally with a single command
- **FR-010**: Tests MUST cover temporal interaction (time controller) and drawing tools as cross-cutting infrastructure
- **FR-011**: When a VS Code E2E test reveals a missing or incomplete feature, the test MUST be annotated with Playwright `test.fixme()` (not `.skip()`) and a corresponding backlog item MUST be created with a cross-reference between the test and backlog entry

### Key Entities

- **Web Shell**: A browser-accessible React application that mirrors the VS Code extension's orchestration of io, stac, and calc services, providing a testable surface for Playwright automation
- **Playwright Test Suite**: 81 automated browser tests across 13 spec files, exercising user workflows through the web-shell
- **Sample STAC Catalog**: Pre-configured mock catalog data with tracks, annotations, and temporal data for test scenarios
- **Session State Store**: Zustand-based shared state that synchronises selection, temporal, and drawing state across components — the core integration point validated by E2E tests

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The automated test suite exercises the complete user workflow (browse catalog → open plot → view on map → run tool → verify results) without manual intervention
- **SC-002**: A breaking change in any component's output causes at least one E2E test to fail, proving the tests catch cross-component regressions
- **SC-003**: The full E2E test suite completes within 5 minutes in CI
- **SC-004**: Developers can run the same tests locally with a single command (`node run-playwright.mjs` or `pnpm test`)
- **SC-005**: All web-shell test spec files (13) pass with zero skipped tests
- **SC-006**: VS Code E2E tests (`tests/e2e/`) are unskipped and passing for at least the P1 Load and Display workflow; any tests that reveal missing features are documented as backlog items (not skipped silently)
- **SC-007**: The test suite covers at least the three core workflows across both platforms: catalog browse, plot load/display, and tool execution

## Assumptions

- The web-shell replicates the VS Code extension's orchestration logic faithfully enough that testing it validates the real user workflow. The shared components (`@debrief/components`, `@debrief/schemas`, session-state store) are identical between web-shell and VS Code extension.
- Playwright with headless Chromium can interact with all web-shell components, including Leaflet map elements and custom React components.
- The mock STAC data and mock calc service in the web-shell produce outputs structurally equivalent to the real Python services.
- The `run-playwright.mjs` script handles Chromium extraction in both local and CI/cloud environments.

## Dependencies

- **Shared components** (`@debrief/components`) — MapView, FeatureList, ActivityPanel, TimeController
- **Session-state store** (`@debrief/session-state`) — selection, temporal, drawing state
- **Schema types** (`@debrief/schemas`) — generated TypeScript types for GeoJSON features
- **Playwright** — browser automation framework
- **`@sparticuz/chromium`** — headless Chromium for sandboxed environments (CI, cloud)
- **openvscode-server** — VS Code in-browser host for extension E2E tests
- **VSIX build pipeline** — extension must be packaged and sideloaded for VS Code E2E
- **Python services** (debrief-io, debrief-stac, debrief-calc) — must be reachable from openvscode-server environment for VS Code E2E

## Dual-Platform Test Strategy

The web-shell and VS Code E2E suites are **complementary**, not redundant:

| Concern | Web-Shell Tests | VS Code E2E Tests |
|---------|----------------|-------------------|
| Orchestration logic (io → stac → calc) | Yes | Yes |
| Extension activation & commands | No | Yes |
| VSIX packaging correctness | No | Yes |
| Webview lifecycle (dispose, restore) | No | Yes |
| Shared component rendering | Yes | Yes |
| CI speed (lightweight) | Fast | Slower (openvscode-server) |

Both suites use Playwright with headless Chromium. The VS Code E2E tests (`tests/e2e/`) will be restored from their current `.skip()`'d state as part of this feature.
