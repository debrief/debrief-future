# Feature Specification: End-to-End Workflow Tests

**Feature Branch**: `005-e2e-workflow-tests`
**Created**: 2026-02-06 (revised)
**Status**: Draft
**Input**: User description: "Add cross-service end-to-end workflow tests (io -> stac -> calc)"

## Context

The Debrief VS Code extension orchestrates the three core Python services (io, stac, calc) into user-facing workflows. While each service has comprehensive unit tests, no test currently exercises the complete user journey — opening a file, seeing tracks on the map, running an analysis tool, and verifying results in the catalog. The Python services have no orchestration layer of their own; the VS Code extension's TypeScript code is the real production glue.

To test the actual end-to-end flow, VS Code must be accessible in a browser so that automated browser tests can interact with its real UI components (panels, webviews, tree views, commands). A browser-hosted VS Code instance (such as code-server) provides this: the VS Code UI renders as real DOM elements, enabling automated tests to drive the same workflows that users perform.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Display Workflow (Priority: P1)

As a developer, I need an automated test that verifies a user can open a REP file in VS Code and see the parsed tracks displayed on the map, so that regressions in the file-loading pipeline are caught before they reach users.

**Why this priority**: This is the most fundamental user workflow — the first thing every user does. It exercises the full path from file open through io parsing, stac catalog storage, and map rendering. If this breaks, nothing else works.

**Independent Test**: Can be tested by opening a sample REP file in the browser-hosted VS Code instance and verifying that the map panel shows track features at the expected locations.

**Acceptance Scenarios**:

1. **Given** a browser-hosted VS Code instance with the Debrief extension installed and a sample REP file in the workspace, **When** the user opens the REP file, **Then** the map panel displays track lines corresponding to the vessels in the file.
2. **Given** a REP file with multiple tracks has been opened, **When** the user inspects the STAC catalog panel, **Then** a new plot is listed containing features for each track, with correct spatial and temporal bounds.
3. **Given** a REP file has been loaded, **When** the user selects a track on the map, **Then** the track is visually highlighted and its properties (vessel name, time range) are shown.

---

### User Story 2 - Analysis Tool Execution Workflow (Priority: P2)

As a developer, I need an automated test that verifies a user can select features and run an analysis tool, with results stored in the catalog and visible in the interface, so that the complete analysis pipeline is protected from regressions.

**Why this priority**: Running analysis tools on loaded data is the core analytical workflow. This story exercises the stac-to-calc-to-stac round-trip through the real extension UI — the path that has no Python-level orchestration and can only be tested through the extension.

**Independent Test**: Can be tested by loading a REP file, selecting a track, executing a tool via the VS Code command palette or context menu, and verifying the result appears in both the catalog panel and on the map.

**Acceptance Scenarios**:

1. **Given** a loaded plot with track features visible on the map, **When** the user selects a track and executes a single-track analysis tool, **Then** the analysis result appears as a new feature in the catalog and the tool's output is displayed.
2. **Given** a loaded plot with two tracks from different source files, **When** the user selects both tracks and runs a multi-track analysis tool, **Then** the result reflects data from both tracks and provenance traces back to both source files.
3. **Given** an analysis tool has produced results, **When** the user inspects the plot in the catalog panel, **Then** the plot contains both the original track features and the analysis result features, with the total feature count increased.

---

### User Story 3 - Error Feedback Workflow (Priority: P3)

As a developer, I need an automated test that verifies meaningful error messages are shown to users when something goes wrong in the workflow, so that failures are communicated clearly rather than silently swallowed.

**Why this priority**: Error handling across service boundaries is where silent failures are most likely. A parsing error in io, a schema mismatch in stac, or a kind-mismatch in calc must all surface as user-visible feedback. This can only be verified through the actual UI.

**Independent Test**: Can be tested by attempting to load an invalid file or running an incompatible tool, and verifying that VS Code displays an appropriate error notification.

**Acceptance Scenarios**:

1. **Given** a malformed REP file in the workspace, **When** the user attempts to open it, **Then** VS Code displays an error notification explaining what went wrong, and no corrupt data is added to the catalog.
2. **Given** a loaded track, **When** the user attempts to run an analysis tool that requires a different feature kind, **Then** the system displays a clear message about the incompatibility rather than a generic error.

---

### Edge Cases

- What happens when the user opens an extremely large REP file (thousands of positions) — does the interface remain responsive?
- How does the system behave when the STAC catalog's storage location becomes read-only mid-workflow?
- What happens if the user closes the map panel while a file is loading?
- How does the system handle re-opening a file that is already loaded in the current plot?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a browser-accessible VS Code environment with the Debrief extension pre-installed and functional
- **FR-002**: Automated tests MUST be able to interact with VS Code's real UI components — panels, tree views, webview content (map), command palette, and notification areas
- **FR-003**: The test environment MUST include sample data files (REP format) available in the workspace for test scenarios
- **FR-004**: Tests MUST exercise the complete file-loading workflow: open file → parse via io service → store in stac catalog → display on map
- **FR-005**: Tests MUST exercise the complete analysis workflow: select features → invoke calc tool → persist results to catalog → display results
- **FR-006**: Tests MUST verify that provenance metadata is maintained through the full workflow, traceable from analysis results back to the original source file
- **FR-007**: Tests MUST verify that errors from any service in the pipeline surface as user-visible feedback in the VS Code interface
- **FR-008**: The test environment MUST work offline without requiring external network access
- **FR-009**: Tests MUST be executable in CI without manual intervention
- **FR-010**: The test environment MUST be startable both locally (for developer use) and in containers (for CI reproducibility)

### Key Entities

- **Browser-Hosted VS Code**: A VS Code instance accessible via a web browser, rendering the full editor UI as DOM elements that automated tests can interact with
- **Test Harness**: The automated test infrastructure that launches the environment, drives browser interactions, and asserts outcomes
- **Workflow Under Test**: The user-facing sequence of actions (open file → view data → run tool → see results) that exercises all three Python services through the VS Code extension's orchestration layer
- **Sample Workspace**: A pre-configured VS Code workspace containing sample REP files and an initialised STAC catalog for test scenarios

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The automated test suite exercises the complete user workflow (load file → view on map → run tool → verify results) without manual intervention
- **SC-002**: A breaking change in any single service's output causes at least one e2e test to fail, proving the tests catch cross-service regressions
- **SC-003**: Tests verify that provenance is traceable from analysis results to original source files in 100% of test scenarios
- **SC-004**: The full e2e test suite completes within 5 minutes in CI
- **SC-005**: Developers can run the same tests locally with a single command
- **SC-006**: Error scenarios produce user-visible feedback — no silent failures in any tested workflow

## Assumptions

- The VS Code extension is sufficiently implemented to orchestrate the io → stac → calc workflow through its UI. Specifically, file loading (spec 043) and tool execution (spec 001) must be functional before e2e tests can exercise them.
- A browser-hosted VS Code solution (such as code-server) can load and run the Debrief extension, including webview-based panels like the map view.
- Browser automation tools can interact with VS Code's DOM structure, including webview iframe content, to drive user workflows and assert outcomes. Most test interactions will target webview components (map panel, catalog panel, tool UI) whose DOM structure is controlled by the Debrief project — not VS Code's internal chrome. This significantly reduces the risk of test brittleness from VS Code DOM changes between versions.
- The test environment can run both locally for development and in containers for CI, using the same test scripts in both modes.

## Dependencies

- **VS Code extension** — must implement the file-loading and tool-execution workflows (specs 043, 001)
- **Browser-hosted VS Code solution** — must support extension installation and webview rendering
- **Browser automation tool** — must support DOM interaction within the VS Code web interface, including iframe-embedded webviews
- **All three Python services** (io, stac, calc) — must be installed and functional within the test environment
- **Sample data** — REP files and initialised STAC catalog available in the test workspace
