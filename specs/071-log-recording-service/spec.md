# Feature Specification: Log Recording Service

**Feature Branch**: `071-log-recording-service`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Implement Log Recording service [E02] -- TypeScript Log Service, recordToolResult, getTimeline, session-state integration"
**Epic**: E02 -- PROV Logging Implementation (Phase 1)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Every Tool Execution (Priority: P1)

An analyst runs an analysis tool (e.g., calculate range between two tracks). The system automatically records this operation as a Log entry on every affected feature. The analyst does not need to do anything extra -- the recording happens transparently as part of the existing tool execution workflow. Later, when the analyst saves the plot, the Log entries are persisted alongside the feature data.

**Why this priority**: This is the core capability of Phase 1. Without automatic recording, no downstream features (Log Panel, replay, branching) can function. It is also the SRD P1 requirement.

**Independent Test**: Can be fully tested by executing a tool, then inspecting the affected features' `properties.provenance` arrays to verify that a correctly structured Log entry was appended with a shared `activityId`, timestamp, tool identity, parameters, and input/output references.

**Acceptance Scenarios**:

1. **Given** an analyst has two tracks selected and runs "calculate range", **When** the tool completes successfully, **Then** both tracks' `properties.provenance` arrays contain a new Log entry sharing the same `activityId`.
2. **Given** a tool execution that creates a new result feature, **When** the Log entry is recorded, **Then** the entry's `generated` field references the new feature's ID, and the new feature also receives the Log entry.
3. **Given** a tool execution that produces an artifact file, **When** the Log entry is recorded, **Then** the entry's `generated` field contains the versioned artifact path and `generatedResultId` contains the stable result ID.
4. **Given** a successful tool execution, **When** the Log entry is written to session state, **Then** the document is marked as dirty so the next save persists the new entries.
5. **Given** the existing tool execution workflow, **When** the analyst runs a tool, **Then** the analyst's experience is unchanged -- same notifications, same result display, same save behaviour.

---

### User Story 2 - Assemble Global Timeline (Priority: P2)

An analyst (or the future Log Panel) requests the global timeline of operations performed on the current plot. The system collects Log entries from all features, deduplicates multi-feature operations (which share an `activityId`), and returns a single sorted list. This gives a complete, chronological view of every change made to the plot.

**Why this priority**: The timeline is the data foundation for the Log Panel (Phase 2) and for all replay/revert operations (Phase 6). Without it, there is no way to present or navigate analytical history.

**Independent Test**: Can be fully tested by recording several tool executions (including multi-feature operations), calling the timeline assembly function, and verifying the result is sorted by timestamp with each multi-feature operation appearing exactly once.

**Acceptance Scenarios**:

1. **Given** a plot with 3 features, each carrying 2 Log entries (some shared across features via activityId), **When** the timeline is assembled, **Then** the result contains one entry per unique `activityId`, sorted ascending by timestamp.
2. **Given** two operations recorded at different times, **When** the timeline is assembled, **Then** the earlier operation appears before the later one.
3. **Given** a plot with no Log entries on any features, **When** the timeline is assembled, **Then** an empty list is returned.

---

### User Story 3 - Expanded ToolResult Parsing (Priority: P3)

A tool returns an expanded ToolResult from the Python service (with new fields like `modifiedFeatures`, `createdAssets`, `parameters`, and `toolVersion` as defined in Phase 0). The TypeScript layer correctly parses these new fields from the MCP response and passes them to the Log Service for recording. Tools that have not yet been updated to populate the new fields still work -- the Log Service uses reasonable fallbacks (e.g., inferring affected features from the existing result data).

**Why this priority**: The expanded contract is the bridge between Python tools and the Log Service. Getting the parsing right ensures accurate Log entries. However, since many tools will not yet populate the new fields, graceful fallback is equally important.

**Independent Test**: Can be fully tested by constructing MCP responses with and without the new fields, parsing them through the updated TypeScript layer, and verifying the Log Service receives correctly structured data in both cases.

**Acceptance Scenarios**:

1. **Given** an MCP response with `modifiedFeatures` and typed `parameters`, **When** parsed by the TypeScript layer, **Then** the Log Service receives structured change tracking data that maps directly to Log entry fields.
2. **Given** an MCP response without the new expanded fields (legacy tool), **When** parsed by the TypeScript layer, **Then** the Log Service still records a valid Log entry using the tool ID, duration, and available feature information.
3. **Given** an MCP response with `createdAssets` containing a `resultId` and versioned `path`, **When** the Log entry is created, **Then** the entry's `generatedResultId` and `generated` fields are correctly populated.

---

### User Story 4 - Transparent Integration (Priority: P4)

The Log Service integrates seamlessly with the existing session-state architecture. Log entries are written to features within the Zustand store, dirty tracking detects the change, and the standard save workflow persists everything. No new persistence mechanisms or save workflows are introduced. The web-shell frontend also correctly handles the expanded ToolResult fields.

**Why this priority**: Integration correctness prevents regressions. The analyst must not notice any change in their workflow -- the Log recording is entirely behind the scenes.

**Independent Test**: Can be fully tested by running a tool execution end-to-end, verifying dirty flag is set, triggering a save, and confirming the saved file contains the Log entries on the appropriate features.

**Acceptance Scenarios**:

1. **Given** a Log entry has been written to a feature in session state, **When** the dirty tracking system evaluates state, **Then** the document is marked dirty.
2. **Given** a dirty document with new Log entries, **When** the analyst saves (Ctrl+S), **Then** the saved GeoJSON file contains the new `properties.provenance` arrays on the affected features.
3. **Given** the web-shell frontend receives an expanded ToolResult, **When** it processes the result, **Then** it handles the new fields without errors (even if it does not yet use them for logging).

---

### Edge Cases

- What happens when a tool execution fails? No Log entry should be recorded for failed operations -- only successful data changes are logged.
- What happens when a tool modifies zero features (read-only analysis that only produces a result feature)? A Log entry is recorded on the newly created result feature only.
- What happens when multiple tool executions occur in rapid succession? Each execution receives a unique `activityId` and timestamp; entries are ordered correctly in the timeline even if timestamps are close.
- What happens when features already have `properties.provenance` entries from a previous session? New entries are appended to the existing array without disturbing prior entries.
- What happens when a feature has a legacy `properties.provenance` that is a single object (not an array)? The system wraps it in an array before appending, consistent with Phase 0's migration approach.
- What happens when the expanded ToolResult fields are partially populated (e.g., `parameters` present but `modifiedFeatures` absent)? The Log Service uses whatever fields are available and falls back to defaults for missing ones.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Log Service module that accepts a ToolResult and produces one or more PROV-aligned Log entries conforming to the schema defined in Phase 0 (#070).
- **FR-002**: System MUST assign a unique `activityId` (UUID) to each recording operation, sharing the same `activityId` across all features affected by that operation.
- **FR-003**: System MUST assign an ISO 8601 timestamp to each Log entry at the time of recording.
- **FR-004**: System MUST write Log entries to the `properties.provenance` array of each affected feature in the session-state store.
- **FR-005**: System MUST append entries to existing `properties.provenance` arrays without modifying or removing prior entries (append-only semantics).
- **FR-006**: System MUST handle legacy `properties.provenance` values that are single objects (not arrays) by wrapping them in an array before appending.
- **FR-007**: System MUST provide a `getTimeline()` function that collects all Log entries from all features, deduplicates on `activityId`, and returns them sorted by timestamp (ascending).
- **FR-008**: System MUST mark the document as dirty after writing Log entries, ensuring the standard save workflow persists the changes.
- **FR-009**: System MUST NOT record Log entries for failed tool executions (where `success` is false).
- **FR-010**: System MUST map the expanded ToolResult fields (`modifiedFeatures`, `createdFeatures`, `createdAssets`, `parameters`, `toolVersion`) to the corresponding Log entry fields (`wasGeneratedBy`, `used`, `generated`, `generatedResultId`, `executionDuration`).
- **FR-011**: System MUST gracefully handle ToolResults that lack the expanded fields (legacy tools) by constructing a valid Log entry from the available information (tool ID, duration, result features).
- **FR-012**: System MUST update the TypeScript type definitions for ToolExecutionResult to include the expanded fields from the Phase 0 contract.
- **FR-013**: System MUST update the MCP response parsing logic to extract the new expanded ToolResult fields when present in annotations.
- **FR-014**: System MUST integrate the Log Service call into the existing tool execution command so that every successful tool execution is automatically recorded.
- **FR-015**: System MUST NOT alter the analyst's visible workflow -- same notifications, result display, and save behaviour as before.
- **FR-016**: System MUST update the web-shell tool service to handle expanded ToolResult fields without errors.
- **FR-017**: System MUST stub future Log Service methods (`tuneEntry`, `revertTo`, `revertThis`, `createSnapshot`, `branchFrom`) as not-yet-implemented, reserving the interface for later phases.
- **FR-018**: System MUST convert `duration_ms` (float, milliseconds) from the ToolResult to `executionDuration` (ISO 8601 duration format, e.g., `PT0.3S`) in the Log entry.
- **FR-019**: System MUST set the `tune` field to `null` on all Log entries created in this phase.

### Key Entities

- **Log Service**: A TypeScript module responsible for wrapping ToolResults in PROV-aligned Log entries, writing them to features in session state, and assembling the global timeline. It is a session-state concern, not a Python service.
- **Log Entry**: A PROV-aligned provenance record stored in `feature.properties.provenance[]`. Contains activity identity, timestamp, generator information (tool, version, typed parameters), input references (`used`), output references (`generated`), execution duration, and tuning annotation (null in this phase). Schema defined by Phase 0.
- **Expanded ToolResult**: The contract returned by Python tool services after Phase 0. Contains structured change tracking: `modifiedFeatures`, `createdFeatures`, `createdAssets`, `parameters`, `toolVersion`, in addition to the original fields (`tool`, `success`, `features`, `error`, `duration_ms`).
- **Global Timeline**: A runtime-assembled chronological list of all Log entries across all features in the current plot. Deduplicated on `activityId` so multi-feature operations appear once. Not persisted -- assembled on demand from per-feature provenance arrays.
- **Activity ID**: A UUID that uniquely identifies a single operation. When one tool execution affects multiple features, the same `activityId` links the Log entries written to each feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful tool executions produce a Log entry on every affected feature, verified by running at least 3 different tool types and inspecting feature provenance arrays.
- **SC-002**: The global timeline correctly deduplicates multi-feature operations -- a tool affecting N features produces exactly 1 timeline entry, verified by running a multi-feature tool and calling `getTimeline()`.
- **SC-003**: The global timeline returns entries in chronological order, verified by recording 5+ operations at different times and confirming ascending timestamp order.
- **SC-004**: The document dirty flag is set within one event cycle after Log entries are written, verified by observing dirty state after a tool execution completes.
- **SC-005**: All existing tool execution tests pass without modification, confirming no regression in the analyst's workflow.
- **SC-006**: Log entries conform to the Phase 0 PROV-aligned schema, verified by validating recorded entries against the LinkML-generated JSON Schema.
- **SC-007**: ToolResults lacking expanded fields (legacy format) still produce valid Log entries, verified by executing a tool that does not populate the new fields and confirming a well-formed entry is created.
- **SC-008**: Failed tool executions produce zero Log entries, verified by triggering a tool failure and confirming no provenance entries were added.

## Assumptions

- **A-001**: Phase 0 (#070) is complete before this feature begins implementation, providing the LinkML Log Entry schema, expanded ToolResult Pydantic model, and unified provenance format.
- **A-002**: The `activityId` uses UUID v4 format, consistent with Phase 0's approach. No specific prefix is mandated.
- **A-003**: The Log Service module resides within or alongside the `session-state` package, as it is tightly coupled to session-state concerns (Zustand store access, dirty tracking).
- **A-004**: Dirty tracking uses explicit `markDirty()` calls from the Log Service rather than field-level change detection, because Log entries mutate feature properties in-place (object identity of store fields does not change).
- **A-005**: Persistence relies on the existing save-on-dirty workflow (full GeoJSON serialisation on Ctrl+S). No incremental save mechanism is introduced in this phase.
- **A-006**: The `tune` field is always `null` in this phase. Tuning, replay, and revert operations are implemented in Phase 6 (#076).
- **A-007**: The Log Service stubs for future methods (`tuneEntry`, `revertTo`, `revertThis`, `createSnapshot`, `branchFrom`) throw "not implemented" errors, reserving the interface for Phases 4-6.
- **A-008**: The web-shell frontend receives and handles the expanded ToolResult fields but does not perform Log recording in this phase. Web-shell logging is a future consideration.

## Dependencies

- **#070** (PROV Schema Foundation -- implementing): Provides the LinkML Log Entry schema, expanded ToolResult Python model, unified provenance format, and system record schema. This feature cannot begin implementation until #070 is complete.
- **SRD** (`docs/srd-prov-undo.md`): Defines the Log Service architecture (Annex A.2), Log Entry data model (Annex A.3), ToolResult contract (Annex A.8), and global timeline assembly algorithm (Annex A.9).
- **Transition Plan** (`docs/architecture/prov-transition-plan.md`): Provides the Phase 1 migration checklist, affected file inventory, and session-state integration design (Areas 2 and 7).

## Out of Scope

- **Log Panel** (Phase 2, #072): The VS Code activity panel for viewing and interacting with the timeline. This phase provides the data; the panel is separate.
- **Undo/redo split** (Phase 3, #073): Narrowing the StateSnapshot to UI-only fields. This phase does not modify the undo system.
- **Snapshots, branching, replay** (Phases 4-6, #074-#076): These capabilities use the Log Service API but are not implemented in this phase (stubs only).
- **System record creation**: Adding a system record feature to new plots may be addressed in this phase if needed for integration, but the primary scope is Log recording on existing spatial features.
- **Updating individual tool implementations**: Tools will be updated incrementally to populate the new ToolResult fields. The Log Service must work with both expanded and legacy ToolResult formats.
