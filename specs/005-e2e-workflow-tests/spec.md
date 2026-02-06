# Feature Specification: Cross-Service End-to-End Workflow Tests

**Feature Branch**: `005-e2e-workflow-tests`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Add cross-service end-to-end workflow tests (io -> stac -> calc)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Parse-Store-Analyze Workflow (Priority: P1)

As a developer making changes to any of the three core services (io, stac, calc), I need a test that exercises the complete data pipeline — parsing a source file, storing results in a catalog, running an analysis tool on the stored data, and persisting the analysis results — so that I can be confident my changes haven't broken the cross-service contract.

**Why this priority**: This is the primary value of end-to-end tests. Each service has unit tests, but nothing currently validates that data flows correctly across service boundaries. A regression in one service's output format could silently break downstream consumers. This workflow represents the most common real-world usage pattern.

**Independent Test**: Can be fully tested by running the complete io → stac → calc → stac pipeline with a sample REP file and verifying that the final catalog contains both the original parsed features and the analysis results with correct provenance.

**Acceptance Scenarios**:

1. **Given** a valid REP file and an empty catalog, **When** the full workflow runs (parse → store → analyze → persist results), **Then** the catalog contains a plot with both original track features and analysis result features, each with correct provenance metadata.
2. **Given** a valid REP file with multiple tracks, **When** the workflow parses and stores features, **Then** all tracks are present in the plot's feature collection and the spatial/temporal bounds reflect the combined data.
3. **Given** stored features from a parsed REP file, **When** an analysis tool executes on those features, **Then** the analysis results reference the source features through provenance and can be persisted back into the same plot.

---

### User Story 2 - Multi-File Ingestion Workflow (Priority: P2)

As a developer, I need a test that verifies multiple source files can be ingested into the same plot and that analysis tools work correctly on the combined dataset, so that I can trust multi-file scenarios work end-to-end.

**Why this priority**: Real-world usage frequently involves loading multiple REP files into a single plot (e.g., two vessels in an exercise). This scenario exercises batch ingestion and multi-feature analysis that individual service tests don't cover together.

**Independent Test**: Can be tested by parsing two different REP files, adding both sets of features to one plot, running a multi-track analysis tool (range-bearing), and verifying the result references both source tracks.

**Acceptance Scenarios**:

1. **Given** two valid REP files with different tracks, **When** both are parsed and stored in the same plot, **Then** the plot's feature collection contains features from both files and the source assets reference both original files.
2. **Given** a plot with features from two tracks, **When** a multi-track analysis tool runs on the combined selection, **Then** the analysis result is valid and its provenance traces back to features from both source files.

---

### User Story 3 - Error Propagation Across Services (Priority: P3)

As a developer, I need tests that verify errors are handled gracefully when one service in the pipeline encounters a problem, so that failures don't produce silent data corruption or cryptic errors in downstream services.

**Why this priority**: Error propagation across service boundaries is a common source of bugs in pipeline architectures. While lower priority than the happy path, these tests prevent the most damaging class of integration bugs — silent data corruption.

**Independent Test**: Can be tested by feeding invalid or edge-case data through the pipeline and verifying that meaningful error information survives across service boundaries.

**Acceptance Scenarios**:

1. **Given** a REP file with some malformed records, **When** the workflow parses the file, **Then** valid records are stored successfully and parse warnings are preserved in provenance metadata.
2. **Given** stored features with an incompatible kind for a selected analysis tool, **When** the tool is invoked, **Then** the system returns a clear error indicating the kind mismatch without corrupting the existing catalog data.
3. **Given** an analysis tool that produces results, **When** persisting those results to the catalog fails (e.g., disk full simulation), **Then** the original catalog data remains intact and the error is reported with sufficient context for diagnosis.

---

### Edge Cases

- What happens when a REP file produces zero valid features (all records malformed)?
- How does the pipeline handle a feature with geometry that spans the antimeridian (±180° longitude)?
- What happens when analysis results are persisted to a plot that already contains previous analysis results from the same tool?
- How does the system behave when the same REP file is loaded into the same plot twice?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test suite MUST exercise the complete io → stac → calc → stac workflow as a single end-to-end test scenario
- **FR-002**: Tests MUST verify that data parsed by the io service conforms to the schema expected by the stac service's feature ingestion
- **FR-003**: Tests MUST verify that features retrieved from a stac plot conform to the schema expected by the calc service's tool executor
- **FR-004**: Tests MUST verify that analysis results from the calc service conform to the schema expected by the stac service for result persistence
- **FR-005**: Tests MUST validate provenance metadata at each stage of the pipeline, confirming that lineage is traceable from analysis results back to the original source file
- **FR-006**: Tests MUST run using existing test fixture data (REP files and GeoJSON fixtures already present in the project)
- **FR-007**: Tests MUST work entirely offline without requiring network access or external services
- **FR-008**: Tests MUST verify spatial and temporal metadata accuracy — bounding boxes and time ranges in STAC items must reflect the actual feature data
- **FR-009**: Tests MUST include at least one multi-file scenario where features from multiple source files are combined in a single plot
- **FR-010**: Tests MUST include at least one error-propagation scenario where invalid input is handled gracefully across service boundaries
- **FR-011**: Tests MUST be runnable as part of the existing CI pipeline without additional infrastructure or configuration

### Key Entities

- **Workflow Pipeline**: The sequence of service calls (io.parse → stac.add_features → calc.run → stac.add_features) that transforms raw source data into analyzed results stored in a catalog
- **Cross-Service Contract**: The data format agreement between services — io produces GeoJSON features that stac can ingest, stac provides features that calc can analyze, and calc produces results that stac can persist
- **Provenance Chain**: The lineage metadata that traces from a final analysis result back through each transformation to the original source file, including timestamps, tool versions, and source references
- **Test Fixture**: Existing sample data files (REP format, GeoJSON) that represent realistic input for the workflow pipeline

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of end-to-end workflow tests pass when all three services are functioning correctly
- **SC-002**: A deliberate breaking change in any single service's output schema causes at least one end-to-end test to fail, proving the tests catch cross-service regressions
- **SC-003**: Complete provenance chain is verifiable from any analysis result back to its original source file in 100% of test scenarios
- **SC-004**: Tests complete within the existing CI time budget (no more than 30 seconds for the entire end-to-end suite)
- **SC-005**: Zero additional external dependencies required — tests use only existing project fixtures and standard testing infrastructure

## Assumptions

- The three core services (debrief-io, debrief-stac, debrief-calc) are sufficiently implemented and their individual unit tests pass. This feature adds integration testing across their boundaries, not new service functionality.
- Existing test fixture files (boat1.rep, boat2.rep, track-single.geojson, tracks-pair.geojson) provide sufficient data variety for meaningful end-to-end coverage.
- The test suite will use temporary directories for STAC catalogs, cleaned up after each test run, following the same pattern as the existing stac integration tests.
- Error-propagation tests will simulate failures at service boundaries rather than requiring infrastructure-level fault injection (e.g., testing what happens with malformed input rather than simulating disk failures).

## Dependencies

- **debrief-io** service (REP parsing) — must be implemented and passing unit tests
- **debrief-stac** service (catalog operations) — must be implemented and passing unit tests
- **debrief-calc** service (analysis tools) — must be implemented and passing unit tests
- **Shared schemas** — must generate valid data models used by all three services
