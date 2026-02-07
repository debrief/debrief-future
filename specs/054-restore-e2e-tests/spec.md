# Feature Specification: Restore Skipped E2E Tests

**Feature Branch**: `054-restore-e2e-tests`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Restore skipped E2E tests for VS Code extension load-display, analysis-tool, and error-feedback workflows, per docs/e2e-test-restoration-requirements.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Display Workflow (Priority: P1)

A developer opens a `.rep` file in the Debrief VS Code extension running inside openvscode-server. The extension parses the file via the debrief-io service, stores the result via the debrief-stac service, renders tracks on a Leaflet map, populates a STAC catalog overview panel, and highlights selected tracks. The E2E test suite validates this entire pipeline automatically.

**Why this priority**: This is the foundational workflow that all other user stories depend on. Without loading and displaying data, no analysis or error handling can be tested. Restoring these tests (T014-T017) provides the highest-value coverage and unblocks later phases.

**Independent Test**: Can be fully tested by building the extension VSIX, sideloading it into openvscode-server, starting debrief-io and debrief-stac services, opening `boat1.rep`, and verifying that the map renders tracks and the catalog panel populates. Delivers value by confirming the core data pipeline works end-to-end.

**Acceptance Scenarios**:

1. **Given** openvscode-server is running with the Debrief extension sideloaded and debrief-io/debrief-stac services are reachable, **When** the test opens `boat1.rep` via Quick Open, **Then** a Leaflet map container becomes visible with at least one track feature rendered.
2. **Given** a `.rep` file has been opened and parsed, **When** the STAC catalog panel is checked, **Then** the catalog overview is visible and contains at least one plot entry.
3. **Given** tracks are rendered on the map and listed in the catalog, **When** a user selects a track, **Then** the selected track is visually highlighted.

---

### User Story 2 - Analysis Tool Execution (Priority: P2)

A developer selects track features from loaded data and runs an analysis tool via the VS Code command palette. The debrief-calc service processes the analysis, and results appear in both the STAC catalog and on the map with provenance markers. The E2E tests validate this workflow.

**Why this priority**: Analysis tools are the primary value-add beyond basic data display. Restoring these tests (T018-T021) validates that the calc service integrates correctly and that results flow back through the catalog and map rendering.

**Independent Test**: Can be tested after US1 prerequisites are in place by loading two tracks (`boat1.rep`, `boat2.rep`), selecting features, running the analysis tool command from the command palette, and verifying results appear in the catalog with provenance lineage.

**Acceptance Scenarios**:

1. **Given** two REP files are loaded with tracks rendered on the map and the calc service is running, **When** the user selects features and runs the analysis tool command via command palette, **Then** analysis results appear as entries in the catalog.
2. **Given** an analysis tool has completed, **When** the result is inspected, **Then** provenance lineage markers link the result back to its source data.

---

### User Story 3 - Error Feedback (Priority: P3)

A developer triggers an error condition — either by opening a malformed file or running an incompatible tool — and the extension surfaces the error as a notification toast. The E2E tests validate that errors propagate to the user interface rather than failing silently.

**Why this priority**: Error feedback is essential for usability but depends on the extension's core functionality working first. Restoring these tests (T022-T024) ensures error paths are wired correctly.

**Independent Test**: Can be tested by opening `malformed.rep` (intentionally broken file) and running the incompatible tool command via command palette, then verifying that notification toasts appear with appropriate error messages.

**Acceptance Scenarios**:

1. **Given** the extension is activated, **When** a malformed `.rep` file is opened, **Then** a notification toast appears with an error message describing the problem.
2. **Given** tracks are loaded, **When** the user runs an incompatible tool via command palette, **Then** a notification toast appears indicating the tool cannot be applied to the selected data.

---

### Edge Cases

- What happens when the extension fails to activate within the expected timeout window? The global setup should fail with a clear error message rather than letting tests run against a non-functional extension.
- What happens when a Python service (io, stac, calc) is not reachable? Tests depending on that service should fail with a descriptive timeout error, not hang indefinitely.
- What happens when sample data files are missing from the test workspace? The test setup should fail early with a file-not-found error before test execution begins.
- What happens when DOM selectors in the tests no longer match the extension's actual rendering? Tests should fail with clear selector-not-found errors that point to which selector mismatched.
- What happens when openvscode-server is slow to initialize in CI environments? The global setup should use a configurable timeout with retry logic to accommodate slower environments.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test environment MUST build the Debrief VS Code extension as a VSIX package and sideload it into openvscode-server before test execution begins.
- **FR-002**: The test environment MUST start and verify reachability of debrief-io and debrief-stac Python services before US1 tests run.
- **FR-003**: The test environment MUST start and verify reachability of the debrief-calc Python service before US2 tests run.
- **FR-004**: The global setup MUST wait for extension activation — not just workbench load — before allowing tests to proceed.
- **FR-005**: Sample data files (`boat1.rep`, `boat2.rep`, `malformed.rep`) MUST be present in the test workspace samples directory before tests execute.
- **FR-006**: US1 tests (T014-T017) in `test-load-display.spec.ts` MUST have skip markers removed and all assertions enabled.
- **FR-007**: US2 tests (T018-T021) in `test-analysis-tool.spec.ts` MUST have skip markers removed and all assertions enabled.
- **FR-008**: US3 tests (T022-T024) in `test-error-feedback.spec.ts` MUST have skip markers removed and all assertions enabled.
- **FR-009**: DOM selectors used in test assertions MUST match the extension's actual rendered DOM elements; any mismatches MUST be corrected.
- **FR-010**: All restored tests MUST pass in the CI environment with sandboxed browser flags.
- **FR-011**: Existing working infrastructure (browser download, test runner config, server auto-start, page objects, test fixtures) MUST NOT be modified or broken by the restoration work.

### Key Entities

- **Test File**: A test specification file containing one or more test cases grouped by user story, located in the E2E test directory.
- **Page Object**: A reusable abstraction that encapsulates DOM interaction patterns for the test harness, including command palette access, file opening, and webview iframe navigation.
- **Python Service**: A backend service (io, stac, calc) that the VS Code extension calls to perform data parsing, storage, and analysis operations.
- **Extension Package**: A packaged VS Code extension archive used for sideloading into the test server during setup.
- **Sample Data**: REP format files used as test fixtures to drive the extension's workflows, including valid single-track, multi-track, and intentionally malformed variants.
- **Global Setup**: The initialization script that prepares the test environment — starting servers, installing extensions, copying data — before any test runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 11 previously-skipped E2E tests (T014-T024) pass in the automated test environment without manual intervention.
- **SC-002**: US1 (Load and Display) tests can be restored and pass independently, without requiring US2 or US3.
- **SC-003**: No existing passing tests regress when skipped tests are restored.
- **SC-004**: Each test phase (US1, US2, US3) can be restored and run independently, supporting incremental delivery.
- **SC-005**: The test environment initialization completes reliably, with clear error messages when prerequisites are not met.

## Assumptions

- The Debrief VS Code extension has been implemented sufficiently to register as a `.rep` file handler, render a Leaflet map webview, and render a STAC catalog overview panel. If not yet implemented, those features are prerequisites outside the scope of this spec.
- The Python services (debrief-io, debrief-stac, debrief-calc) exist and expose the interfaces the extension expects. Their implementation is outside the scope of this spec.
- The CI test environment uses containerized services alongside openvscode-server, as recommended in the requirements document.
- The VSIX sideload approach is used for extension installation in the test environment, as it is the preferred option.
- DOM selectors listed in the requirements document are the intended selectors. If the extension's actual DOM differs, selectors in the tests will be updated to match rather than changing the extension.
- The `boat1.rep` and `boat2.rep` sample data files either already exist or will be created as part of this work. The `malformed.rep` file will be created specifically for error testing.

## Dependencies

- **005-e2e-workflow-tests**: The existing E2E infrastructure this feature builds on (test runner config, page objects, global setup, browser download).
- **Debrief VS Code extension**: Must be buildable as a VSIX and functional enough to handle `.rep` files, render maps, and display catalog panels.
- **debrief-io service**: Must parse REP files to GeoJSON.
- **debrief-stac service**: Must store parsed data as STAC Items.
- **debrief-calc service**: Must execute analysis tools (required for US2).
