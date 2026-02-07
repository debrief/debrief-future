# Feature Specification: Tool Results Architecture

**Feature Branch**: `041-document-tool-results`
**Created**: 2026-01-30
**Status**: Draft
**Input**: User description: "Document tool results architecture covering result types, persistence, MCP compliance, and user feedback"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tool Returns Typed Result (Priority: P1)

An analyst runs a calculation tool (e.g., track smoothing) via the frontend or LLM. The tool produces an MCP response containing one or more content items, each classified into one of four top-level types (mutation, addition, deletion, artifact) with Debrief-specific annotations.

**Why this priority**: This is the foundational capability — without typed, annotated results, no downstream persistence or rendering can occur.

**Independent Test**: Can be tested by invoking any calc tool and verifying the response contains a valid MCP content array where each item has required `debrief:resultType`, `debrief:sourceFeatures`, and `debrief:label` annotations.

**Acceptance Scenarios**:

1. **Given** a loaded plot with Track A, **When** the analyst runs a track smoothing tool on Track A, **Then** the tool returns an MCP response with a single content item of result type `mutation/track/smoothed` and source features listing Track A's ID.
2. **Given** a loaded plot with Track A and Track B, **When** the analyst runs a CPA analysis tool, **Then** the tool returns an MCP response with a single content item of result type `addition/analysis/cpa_point` and source features listing both track IDs.
3. **Given** a tool that trims outliers from Track A, **When** the analyst runs it, **Then** the tool returns an MCP response with two content items: a deletion for the removed contacts and an artifact with the outlier report.
4. **Given** a tool execution that fails due to insufficient data, **When** the error is returned, **Then** the response uses MCP error structure with an error category and affected features.

---

### User Story 2 - Result Persisted to STAC Catalog (Priority: P1)

After a tool produces a result, the orchestrator (frontend or LLM) iterates the content array, interprets each item's result type, and calls the appropriate atomic debrief-stac operation. The STAC service exposes simple, storage-focused operations with no knowledge of result types: update features, add features, delete features, and store artifacts. Each operation records provenance and returns the updated FeatureCollection.

**Why this priority**: Persistence is equally critical — results that aren't stored are lost. This story is co-equal with Story 1 as together they form the minimum viable flow.

**Independent Test**: Can be tested by calling each atomic STAC operation independently and verifying the plot's FeatureCollection, item.json, and (for artifacts) the results/ directory are correctly updated.

**Acceptance Scenarios**:

1. **Given** a mutation result for Track A, **When** the orchestrator calls the update features operation, **Then** the corresponding feature in the plot is updated in-place and its provenance records the tool, source features, and timestamp.
2. **Given** an addition result (new CPA point), **When** the orchestrator calls the add features operation, **Then** the new feature is appended to the FeatureCollection.
3. **Given** an artifact result (bearing-time plot image), **When** the orchestrator calls the store artifact operation, **Then** the image file is written to the results directory and the STAC Item gains a new asset entry with role "result" pointing to the file.
4. **Given** a deletion result for three sensor contacts, **When** the orchestrator calls the delete features operation, **Then** those three features are removed from the FeatureCollection.
5. **Given** a multi-result response with a deletion and an artifact, **When** the orchestrator processes the content array, **Then** it calls delete features for the first item and store artifact for the second item, each returning an updated FeatureCollection.

---

### User Story 3 - Frontend Renders Result Changes (Priority: P2)

After each atomic STAC operation returns an updated FeatureCollection, the frontend diffs the old and new collections and applies incremental UI updates. For multi-result responses, the analyst sees changes progressively as each operation completes.

**Why this priority**: Visual feedback is essential for usability but depends on Stories 1 and 2 being in place first.

**Independent Test**: Can be tested by providing two FeatureCollections (before and after) to the diff utility and verifying correct added/removed/modified sets, then confirming the renderer applies changes.

**Acceptance Scenarios**:

1. **Given** a mutation that smoothed Track A, **When** the frontend receives the updated FeatureCollection, **Then** the diff utility reports Track A as modified and the display updates to show the smoothed track.
2. **Given** an addition of a CPA point, **When** the frontend receives the updated FeatureCollection, **Then** the diff utility reports the new feature as added and it appears on the display.
3. **Given** identical old and new FeatureCollections, **When** the diff utility runs, **Then** it returns empty added, removed, and modified sets.
4. **Given** a multi-result response with two operations, **When** the frontend processes each operation sequentially, **Then** the diff utility is called after each atomic operation and the display updates incrementally.

---

### User Story 4 - Hierarchical Type Degradation (Priority: P2)

Different consumers understand different levels of the result type hierarchy. A specialised viewer recognises deep sub-types while a generic consumer or LLM falls back to the top-level type and still provides useful feedback.

**Why this priority**: Enables the extension model for contrib organisations without breaking core functionality.

**Independent Test**: Can be tested by presenting a result with a deep sub-type to three consumers at different hierarchy depths and verifying each handles it appropriately.

**Acceptance Scenarios**:

1. **Given** a result with a contrib-specific deep sub-type, **When** a contrib-aware viewer receives it, **Then** it opens a dedicated viewer for that sub-type.
2. **Given** the same result, **When** the generic Debrief UI receives it, **Then** it shows an appropriate preview matching the mid-level type.
3. **Given** the same result, **When** an LLM receives it, **Then** it reports a human-readable summary matching the top-level type.

---

### User Story 5 - Artifact Notification and Viewing (Priority: P3)

When a tool produces an artifact (image, report, dataset), the analyst receives a notification and can open the artifact in a viewing area at their preferred location.

**Why this priority**: Improves discoverability and usability of non-map artifacts but is not essential for the core compute-persist-render loop.

**Independent Test**: Can be tested by generating an artifact, verifying a notification appears, clicking it, and confirming the artifact opens in the configured location.

**Acceptance Scenarios**:

1. **Given** a bearing-time plot artifact is generated, **When** the frontend processes the result, **Then** a notification appears with the artifact's label.
2. **Given** an artifact notification is visible, **When** the analyst clicks it, **Then** the artifact opens in a viewing area at the user's configured preferred location.

---

### Edge Cases

- What happens when a tool returns an unrecognised top-level result type? The orchestrator rejects that content item — only the four defined types are valid.
- What happens when a tool fails mid-computation? The tool fails fast and returns a structured error response — no partial results.
- What happens when debrief-stac receives a deletion for a feature ID that doesn't exist in the FeatureCollection? This should return an appropriate error indicating the feature was not found.
- What happens when a contrib extension introduces a sub-type that collides with a core sub-type? Core sub-types defined in the schema take precedence; contrib extensions must use unique paths below top-level.
- What happens when a multi-result response has one valid and one invalid content item? Each content item is processed independently; the orchestrator skips invalid items and reports errors without blocking valid ones.
- What happens when a multi-result response contains items with conflicting operations (e.g., adding and deleting the same feature)? Each item is processed sequentially in array order; the final state reflects the last operation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST classify every tool result into exactly one of four top-level types: mutation, addition, deletion, or artifact.
- **FR-002**: System MUST return tool results as MCP-compliant responses containing a content array of one or more items using standard MCP content types.
- **FR-003**: Every content item in a tool result MUST include three required annotations: result type, source features, and a human-readable label.
- **FR-004**: Artifact results MUST additionally include a relative file path annotation for persistence.
- **FR-005**: Deletion results MUST additionally include a list of deleted feature IDs.
- **FR-006**: The result type hierarchy MUST support extension by contrib organisations below the top-level types without requiring registration.
- **FR-007**: Consumers MUST be able to match result types at any depth in the hierarchy and degrade gracefully to shallower matches.
- **FR-008**: The persistence service MUST expose atomic, storage-focused operations (update features, add features, delete features, store artifact) with no knowledge of result types.
- **FR-009**: Each atomic persistence operation MUST record provenance (tool, source features, timestamp) on affected features.
- **FR-010**: The store artifact operation MUST write the artifact file and update the STAC Item asset list.
- **FR-011**: A shared diff utility MUST compute added, removed, and modified features between two FeatureCollections.
- **FR-016**: The orchestrator MUST iterate the content array of a tool response and call the appropriate atomic STAC operation for each content item based on its result type.
- **FR-017**: The orchestrator MUST process content items sequentially in array order, calling diff and updating the display after each atomic operation.
- **FR-012**: Failed tool executions MUST return structured error responses with an error category and affected features.
- **FR-013**: Tools MUST NOT return partial results — they fail fast on first error.
- **FR-014**: The result type schema MUST be defined in a master schema language and generate types for both service and frontend languages.
- **FR-015**: Top-level result types MUST be schema-validated; sub-types below top-level are convention-based for contrib extensions.

### Key Entities

- **Tool Result**: The output of a calculation tool, classified by type (mutation/addition/deletion/artifact), carrying content and annotations.
- **Result Type Hierarchy**: A slash-delimited path (e.g., `mutation/track/smoothed`) with four fixed top-level categories and extensible sub-categories.
- **Annotation Set**: Metadata attached to tool responses, including result type, source features, label, and type-specific fields.
- **FeatureCollection**: The spatial document containing all features for a plot, updated by the persistence service on each tool result.
- **STAC Item**: The metadata document listing source and result assets for a plot.
- **Provenance Record**: Lineage information stored on features linking each to its source data, tool, and transformation timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every tool invocation returns a result classifiable into one of four top-level types with 100% accuracy — no unclassifiable results.
- **SC-002**: All tool results pass content type validation with no annotation omissions.
- **SC-003**: After any tool result is persisted, the updated FeatureCollection accurately reflects the change and provenance is recorded.
- **SC-004**: The diff utility correctly identifies all changes between two FeatureCollections with zero false positives or false negatives.
- **SC-005**: A consumer unfamiliar with a deep sub-type can still process the result using a shallower type match, with no errors or data loss.
- **SC-006**: Artifact files are retrievable from the results directory and discoverable via STAC Item asset entries after persistence.
- **SC-007**: Tool errors are returned in a structured format enabling programmatic error handling without parsing free-text messages.

## Assumptions

- Persistence service write operations are assumed to succeed (persistence failure handling is out of scope).
- Provenance format compliance details are deferred to a later specification.
- Error category enumeration is initially limited to three categories (invalid input, algorithm failure, resource not found) and will be expanded later.
- The diff utility is shared across all frontend implementations.
- Multi-result content items are processed sequentially in array order by the orchestrator.
- The persistence service (debrief-stac) has no knowledge of result types — the orchestrator is responsible for interpreting result types and calling the appropriate atomic operation.
