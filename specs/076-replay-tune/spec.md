# Feature Specification: Replay and Parameter Tuning

**Feature Branch**: `076-replay-tune`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "Implement replay and parameter tuning [E02] — parameter editing, positional replay, revert operations (requires #071, #074)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tune a Parameter and See Updated Results (Priority: P1)

An analyst has completed a multi-step analysis (import, calculations, property edits) and realises that one of the calculation parameters was suboptimal. They open the Log Panel, select the entry for the calculation, edit the parameter value inline, and the system automatically re-runs that operation with the new value and then replays all subsequent operations in order. The plot updates to reflect the cascaded changes without the analyst needing to manually re-run anything.

**Why this priority**: This is the core value proposition of the feature — eliminating the tedious manual re-execution workflow. Without parameter tuning, analysts must remember every step they took after the one they want to change, then re-run each one manually. This single capability transforms a multi-minute error-prone process into a single edit action.

**Independent Test**: Can be fully tested by recording a sequence of tool operations, then editing a parameter on one of them and verifying that all subsequent operations re-execute with updated results visible in the plot.

**Acceptance Scenarios**:

1. **Given** a plot with three recorded operations (import, calculate range at 60s interval, calculate bearing), **When** the analyst changes the range calculation's interval parameter from 60s to 30s, **Then** the range calculation re-runs with interval=30s and the bearing calculation re-runs with its original parameters applied to the updated range results.
2. **Given** a plot with a bearing-time plot artifact (v1) produced by a tool, **When** the analyst tunes the frequency parameter from 1804Hz to 2400Hz, **Then** a new artifact version (v2) is created, the previous version (v1) is preserved, and the open artifact view updates in place (when auto-refresh is enabled).
3. **Given** a plot with tunable and non-tunable parameters on an entry, **When** the analyst views the entry's parameters, **Then** tunable parameters show editing affordances and non-tunable parameters are displayed as read-only.

---

### User Story 2 - Revert to a Previous Point (Priority: P2)

An analyst discovers that a series of operations after a certain point were misguided and wants to discard them entirely. They select an entry in the Log Panel and choose "Revert to here." Everything after that entry is permanently discarded and the plot returns to the state at that point.

**Why this priority**: This is the simplest form of history navigation — a clean rollback. It provides an essential safety net, giving analysts confidence to experiment knowing they can always return to a known-good state. While less sophisticated than selective revert, it covers the most common "undo mistake" workflow.

**Independent Test**: Can be tested by recording several operations, reverting to an earlier point, and verifying that subsequent entries are removed and the plot state matches the state at the revert point.

**Acceptance Scenarios**:

1. **Given** a plot with five recorded operations, **When** the analyst selects the third operation and chooses "Revert to here," **Then** operations four and five are permanently removed from the Log, and the plot state matches the state after operation three.
2. **Given** a plot where a revert-to-here has been performed, **When** the analyst inspects the Log, **Then** there is no way to recover the discarded entries (the action is permanent and the analyst was warned before proceeding).

---

### User Story 3 - Selectively Remove One Operation (Priority: P2)

An analyst ran the wrong tool at one point in their workflow but the subsequent operations are still valid. They select the erroneous entry in the Log Panel and choose "Revert this." The system removes that single entry and replays all subsequent entries without it. If a subsequent entry depended on the removed entry's output and fails, the system halts and reports the problem.

**Why this priority**: This enables surgical correction — removing one mistake without losing subsequent work. It shares priority with "Revert to here" because both are essential revert capabilities that complement each other: "Revert to here" for discarding everything after a point, "Revert this" for removing a single step while preserving subsequent work.

**Independent Test**: Can be tested by recording a sequence of independent operations, removing one from the middle, and verifying the others replay successfully. Also tested by removing an operation that later operations depend on, and verifying the system halts with a clear error.

**Acceptance Scenarios**:

1. **Given** a plot with operations A, B, C, D where C and D do not depend on B's output, **When** the analyst reverts operation B, **Then** B is soft-deleted, C and D replay successfully, and the plot state reflects A → C → D.
2. **Given** a plot with operations A, B, C where C uses B's output, **When** the analyst reverts operation B, **Then** the system halts at operation C with a clear message explaining that C failed because it depended on B's output.
3. **Given** a soft-deleted entry, **When** the analyst views the Log, **Then** the deleted entry is visually indicated as removed but recoverable, and a "Restore" action is available.

---

### User Story 4 - Tune Across Snapshot Boundaries (Priority: P3)

An analyst has been working for an extended session with snapshots taken at key milestones. They load earlier history via "Load more" in the Log Panel and discover that a parameter used in a previous snapshot segment was suboptimal. They tune that parameter, and the system reconstructs state from the appropriate snapshot, replays through the tuned entry with the new value, continues through all subsequent entries — crossing snapshot boundaries — until the current working state is fully reconstructed.

**Why this priority**: This is the most complex replay scenario and involves the longest processing time. While powerful, most tuning will occur within the current segment. Cross-snapshot tuning is a "power user" capability that ensures no analytical decision is ever truly locked in, regardless of how many snapshots have been taken since.

**Independent Test**: Can be tested by creating a plot with at least two snapshots and multiple operations in each segment, then tuning a parameter from the first segment and verifying that all operations across both segments replay correctly.

**Acceptance Scenarios**:

1. **Given** a plot with Snapshot A (containing 5 operations) and a current segment (containing 3 operations), **When** the analyst tunes operation 3 from Snapshot A, **Then** the system loads Snapshot A's clean state, replays operations 1-2 with original params, replays operation 3 with the new param value, replays operations 4-5 with original params, crosses the snapshot boundary, and replays the current segment's 3 operations.
2. **Given** a cross-snapshot replay that will take noticeable time, **When** replay begins, **Then** the system shows progress indication and allows the analyst to understand the scope of the replay (number of operations remaining).

---

### User Story 5 - Version Mismatch Halts Replay (Priority: P3)

During replay, the system encounters an entry that was recorded with a different version of a tool than what is currently installed. The system halts replay immediately, reports the mismatch (tool name, recorded version, current version), and lets the analyst decide how to proceed.

**Why this priority**: Version safety is critical for reproducibility but is an error-handling scenario rather than a primary workflow. It is essential that the system never silently re-runs a tool with a different version, as results could differ in subtle ways. The halt-and-report approach gives the analyst full control.

**Independent Test**: Can be tested by recording an operation with tool version X, then simulating a version mismatch and verifying the system halts with a descriptive error message.

**Acceptance Scenarios**:

1. **Given** a Log entry recorded with tool "calculate-range" version 1.2.0 and the currently installed version is 1.3.0, **When** replay reaches this entry, **Then** the system halts and displays "Tool version mismatch: calculate-range was recorded at v1.2.0 but v1.3.0 is currently installed" with options to resolve.
2. **Given** a halted replay due to version mismatch, **When** the analyst reviews the halt message, **Then** they can see which entry caused the halt, the recorded version, the installed version, and the position in the replay sequence.

---

### Edge Cases

- What happens when the analyst tunes a parameter to its current value? The system treats this as a no-op and does not trigger replay.
- What happens when an operation in the replay chain was itself a tune of a previous operation? The system replays using the most recently tuned parameter value for that entry.
- What happens when the analyst attempts to revert the very first operation (e.g., a file import)? The system warns that this will remove all data from the plot and requires explicit confirmation.
- What happens when a tune triggers replay of an entry that previously failed? The system attempts to re-execute it; if it fails again, replay halts at that point with an error report.
- What happens when the analyst tunes a property edit (e.g., changing a colour)? Property edits are modelled as tool invocations and are tunable in the same way — the analyst can change the colour value and all subsequent operations replay.
- What happens during replay if a feature referenced by a subsequent operation no longer exists (because an earlier step in replay removed it)? Replay halts with a dependency error explaining that the referenced feature is missing.
- What happens if the analyst cancels a long-running cross-snapshot replay? The system restores the plot to its pre-replay state with no partial changes applied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow analysts to modify any tunable parameter on any Log entry via the Log Panel, triggering immediate positional replay of all subsequent entries.
- **FR-002**: The system MUST re-execute each operation during replay using the tool name, version, and parameters recorded in the original Log entry (except for the tuned entry, which uses the new parameter value).
- **FR-003**: The system MUST halt replay immediately when the installed tool version does not match the version recorded in the Log entry, displaying a clear mismatch report.
- **FR-004**: The system MUST support "Revert to here" — permanently discarding all Log entries after a selected entry and restoring the plot to the state at that point.
- **FR-005**: The system MUST require explicit user confirmation before executing a "Revert to here" action, warning that the operation is permanent.
- **FR-006**: The system MUST support "Revert this" — soft-deleting a single Log entry and replaying all subsequent entries without it.
- **FR-007**: The system MUST halt "Revert this" replay when a subsequent entry fails due to a dependency on the removed entry, reporting which entry failed and what dependency is missing.
- **FR-008**: The system MUST allow recovery (restoration) of soft-deleted entries.
- **FR-009**: The system MUST support tuning entries from previous snapshot segments by loading the appropriate snapshot, replaying from that point through the tuned entry and all subsequent entries (including crossing snapshot boundaries).
- **FR-010**: The system MUST display appropriate editing affordances for each parameter type (numeric input for Float/Integer, duration picker for Duration, dropdown for Enum, toggle for Boolean, text input with validation for String).
- **FR-011**: The system MUST validate parameter values against their type constraints before starting replay, rejecting invalid values with descriptive messages.
- **FR-012**: The system MUST preserve both original and tuned parameter values in the Log, maintaining full audit history via tune annotations.
- **FR-013**: The system MUST create new versioned artifacts when replaying artifact-producing tools, never overwriting previous artifact versions.
- **FR-014**: The system MUST update open artifact views in place when auto-refresh is enabled, showing the new version after a tool re-run.
- **FR-015**: The system MUST treat parameters as tunable by default, only presenting parameters marked as non-tunable as read-only.
- **FR-016**: The system MUST provide progress indication during replay operations, especially for cross-snapshot replays that may take noticeable time.
- **FR-017**: The system MUST allow the analyst to cancel an in-progress replay, restoring the plot to its pre-replay state without partial changes.

### Key Entities

- **Replay Engine**: The component responsible for sequentially re-invoking tools during replay. Takes a starting point in the timeline, a set of parameter overrides, and re-executes each subsequent entry in order. Halts on any failure (tool version mismatch, missing dependency, execution error).
- **Tune Annotation**: A record attached to a Log entry capturing when a parameter was tuned, which parameter, the previous value, and the new value. Preserves full audit history.
- **Typed Parameter**: A parameter value enriched with type information (Float, Integer, Duration, Enum, Boolean, String) and validation constraints (min/max, allowed values, pattern). Determines the editing affordance presented in the Log Panel.
- **Soft-Deleted Entry**: A Log entry marked as removed but not physically deleted. Skipped during replay but recoverable by the analyst. Visually distinct in the Log Panel.

### Assumptions

- The Log Recording service (#071) is fully implemented and stable, providing the `recordToolResult`, `getTimeline`, and typed parameter infrastructure.
- The Snapshot service (#074) is fully implemented, providing snapshot chain navigation, cross-snapshot timeline assembly, and clean state loading.
- The existing MCP infrastructure supports re-invocation of tools with specified parameters — tools are stateless and deterministic given the same inputs and version.
- The Log Panel (#072) exists and displays the global timeline; this feature extends it with tuning and revert affordances rather than replacing it.

### Dependencies

- **#071 - Log Recording Service**: Provides the entry data model, typed parameters, and timeline assembly.
- **#074 - Snapshots**: Provides snapshot chain navigation and cross-snapshot state reconstruction.
- **#072 - Log Panel**: Provides the UI surface that this feature extends with tuning and revert controls.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Refine a previous analytical decision by changing a parameter, or correct a mistake by reverting an operation, without losing subsequent valid work.
- **Key Decision(s)**:
  1. Which Log entry to modify (tune a parameter, revert this entry, or revert to this point)
  2. What new parameter value to use (for tuning)
  3. Whether to proceed with replay after seeing the scope of affected operations
- **Decision Inputs**: The Log Panel timeline shows the sequence of operations, their parameters (including which are tunable), and the dependencies between them. For cross-snapshot operations, the entry count indicator helps the analyst assess how many operations will need to replay.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1    | Log Panel showing timeline entries | Analyst selects an entry to expand its detail view | Entry detail shows tool name, version, all parameters with values, and action buttons (Tune, Revert this, Revert to here) |
| 2    | Entry detail with parameters displayed | Analyst clicks on a tunable parameter value | Parameter becomes editable with the appropriate type-specific affordance (numeric input, dropdown, toggle, etc.) |
| 3    | Parameter editing active | Analyst enters a new value and confirms | System validates the value against type constraints; if valid, replay begins |
| 4    | Replay in progress | System re-executes operations sequentially | Progress indicator shows current operation and count remaining; plot updates progressively |
| 5    | Replay complete | Analyst reviews updated plot | Log Panel shows updated timeline with tune annotation on the modified entry; artifact views refresh if applicable |

### UI States

- **Empty State**: Not applicable — the tuning/revert actions only appear on existing Log entries. If the Log is empty, no actions are available.
- **Loading State**: During replay, a progress indicator shows which operation is currently executing and how many remain. For cross-snapshot replay, a note indicates that snapshot loading is occurring. The Log Panel remains visible but entry actions are disabled during replay.
- **Error State**: On tool version mismatch — a prominent alert showing the tool name, expected version, and installed version, with the replay halted. On dependency failure during "Revert this" — a message identifying the failing entry and the missing dependency, with options to restore the deleted entry or remove the failing entry too. On parameter validation failure — inline error on the parameter input showing why the value is invalid.
- **Success State**: After successful replay — the Log Panel timeline is updated, the tuned entry shows a tune annotation badge, artifact views are refreshed (if auto-refresh is on), and the plot reflects the cascaded changes. A subtle confirmation (e.g., "Replay complete — 5 operations re-executed") confirms the outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can tune a parameter and see all subsequent operations re-execute in under 5 seconds for a typical analysis chain (10 or fewer operations within the current segment), compared to the previous manual re-run workflow.
- **SC-002**: "Revert to here" restores the plot to the exact state at the selected point with zero data loss from entries prior to the revert point.
- **SC-003**: "Revert this" successfully removes a single entry and replays subsequent independent entries, with 100% halt rate when a dependency failure occurs (no silent failures).
- **SC-004**: Cross-snapshot replay correctly reconstructs state and re-executes operations across at least 3 snapshot boundaries, producing results identical to a fresh analysis with the tuned parameter.
- **SC-005**: Tool version mismatches are detected and reported with zero false negatives — every version discrepancy halts replay before the mismatched tool executes.
- **SC-006**: 100% of parameter type constraints are enforced before replay begins — invalid values are rejected with descriptive messages and no replay computation is wasted.
- **SC-007**: Analysts can cancel an in-progress replay at any point, with the plot fully restored to its pre-replay state within 2 seconds.
