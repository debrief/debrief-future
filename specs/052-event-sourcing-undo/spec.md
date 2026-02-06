# Feature Specification: Event-Sourcing Undo with Tunable Provenance

**Feature Branch**: `052-event-sourcing-undo`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Switch UNDO to event-sourcing so analyst can tune items in the PROV log. Some tool definitions will have to include typed config parameters."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replay Analysis from Event Log (Priority: P1)

An analyst runs several analysis tools in sequence (e.g., track statistics, bearing calculation, range analysis). Rather than storing snapshots of the entire session state, each tool invocation is recorded as a discrete event in a provenance log. The analyst can undo and redo by replaying events forward or backward, with the system reconstructing state from the event sequence.

**Why this priority**: This is the foundational architectural change. Without event-sourcing, none of the tuning capabilities are possible. It replaces the current snapshot-based undo with a more powerful and space-efficient event log.

**Independent Test**: Can be fully tested by running a sequence of analysis tools, undoing several steps, and verifying the session state matches the expected state at each point in the event history.

**Acceptance Scenarios**:

1. **Given** an analyst has executed 5 analysis tools in sequence, **When** the analyst undoes 3 steps, **Then** the session state matches the state after the 2nd tool execution, reconstructed from the event log.
2. **Given** an analyst has undone 3 steps, **When** the analyst redoes 2 steps, **Then** the session state matches the state after the 4th tool execution.
3. **Given** an analyst has executed 50 analysis tools (the current history limit), **When** the analyst undoes all 50 steps, **Then** every intermediate state is correctly reconstructed from the event log.
4. **Given** an event log exists from a previous session, **When** the session is reopened, **Then** the full event history is available for undo/redo (history persists across sessions).

---

### User Story 2 - Tune Tool Parameters in Provenance Log (Priority: P1)

An analyst reviews the provenance log and notices that a bearing calculation used a default frequency parameter. The analyst selects that event in the log, modifies the frequency parameter to a different value, and replays from that point forward. All downstream results are recalculated with the updated parameter, and the provenance log reflects the tuned value.

**Why this priority**: This is the primary motivation for switching to event-sourcing. Tuning transforms the provenance log from a passive audit trail into an active analytical workspace where the analyst can refine their analysis iteratively.

**Independent Test**: Can be fully tested by running a tool with specific parameters, then modifying one parameter in the provenance log entry and verifying that the tool re-executes with the new parameter and all downstream results update accordingly.

**Acceptance Scenarios**:

1. **Given** an analyst has run a tool with parameter `interval = 60s`, **When** the analyst changes the parameter to `interval = 30s` in the provenance log entry, **Then** the tool re-executes with the new parameter and the output reflects the change.
2. **Given** tool B depends on the output of tool A, **When** the analyst tunes a parameter on tool A's event, **Then** tool B automatically re-executes using tool A's updated output.
3. **Given** an analyst tunes a parameter to an invalid value (e.g., negative interval), **When** replay is attempted, **Then** the system reports a validation error and the event log retains the previous valid value.
4. **Given** an analyst tunes a parameter, **When** the replay completes, **Then** the provenance log shows the tuned value (not the original) with an annotation indicating the change was a manual tune, preserving audit integrity.

---

### User Story 3 - Typed Config Parameters on Tool Definitions (Priority: P2)

A tool author defines analysis tools with explicit, typed configuration parameters (e.g., `interval: Duration`, `threshold: Float`, `method: Enum[linear, spline]`). These typed parameters enable the system to present appropriate editing affordances when an analyst tunes an event, and to validate parameter values before replay.

**Why this priority**: Typed parameters are an enabler for the tuning experience. Without them, the system cannot validate analyst edits or present meaningful editing affordances. This builds on the existing `ToolParameter` model but extends it with richer type information and validation constraints.

**Independent Test**: Can be fully tested by defining a tool with typed parameters, invoking it, and verifying that the provenance log entry contains the full parameter schema and that invalid parameter values are rejected.

**Acceptance Scenarios**:

1. **Given** a tool defines a parameter `threshold` of type `Float` with `min=0.0` and `max=1.0`, **When** an analyst attempts to set `threshold = 1.5` during tuning, **Then** the system rejects the value with a descriptive validation error.
2. **Given** a tool defines a parameter `method` of type `Enum[linear, spline, cubic]`, **When** the parameter is presented for tuning, **Then** only the valid enum values are available as choices.
3. **Given** a tool defines a parameter `window` of type `Duration` with `default = PT5M`, **When** the tool is invoked without specifying `window`, **Then** the provenance log records `window = PT5M` (the default) so the analyst can later tune it.
4. **Given** a tool has no configurable parameters, **When** the analyst views that event in the provenance log, **Then** no tuning controls are offered for that event.

---

### User Story 4 - STAC-Persisted Snapshots for Replay Efficiency (Priority: P2)

After an expensive operation — such as initial file import — the system captures a snapshot of the full plot state and stores it in the STAC catalog. This snapshot becomes a node in the provenance pipeline: when the system needs to reconstruct state (for undo, redo, or tune-replay), it starts from the nearest snapshot rather than replaying the entire event log from the beginning.

Analysts can also take snapshots manually at any point they consider a stable milestone. Some tools — particularly those that are computationally expensive or destructive — can suggest taking a snapshot before they run, giving the analyst a fast rollback point.

**Why this priority**: Without snapshots, event replay becomes prohibitively slow as the event log grows. Snapshots are the performance mechanism that makes event-sourcing practical for real analytical workflows involving hundreds of operations. They also serve as meaningful waypoints in the analytical narrative.

**Independent Test**: Can be fully tested by importing a file (triggering an automatic snapshot), running several tools, then undoing past the tools and verifying the system restores state from the snapshot rather than replaying the import.

**Acceptance Scenarios**:

1. **Given** an analyst imports a large file (an expensive operation), **When** the import completes, **Then** the system automatically captures a snapshot of the plot state in the STAC store.
2. **Given** a snapshot exists at event 5 and the analyst is at event 20, **When** the analyst undoes to event 7, **Then** the system reconstructs state by loading the snapshot at event 5 and replaying only events 6 and 7 (not all 7 from scratch).
3. **Given** an analyst has completed a phase of analysis they consider stable, **When** the analyst manually takes a snapshot, **Then** the snapshot is stored in the STAC catalog with a label and timestamp, and appears as a node in the provenance log.
4. **Given** a tool is marked as suggesting a pre-execution snapshot, **When** the analyst invokes that tool, **Then** the system offers to take a snapshot before proceeding, and the analyst can accept or decline.
5. **Given** a snapshot was taken at event 10 and the analyst tunes a parameter on event 8, **When** replay begins from the tune point, **Then** the system invalidates the snapshot at event 10 (since it was based on the pre-tune state) and replays from the nearest valid earlier snapshot.

---

### User Story 5 - Persistent Event Log with Provenance Integrity (Priority: P2)

An analyst works on a plot across multiple sessions. The event log — along with any snapshots — is persisted alongside the STAC catalog so that the full analytical history, including tunes, is preserved. When another analyst opens the same plot, they can see the complete provenance chain and understand how results were derived.

**Why this priority**: Persistence transforms the event log from a session convenience into an institutional audit trail. This aligns with the constitutional mandate that "every transformation records lineage."

**Independent Test**: Can be fully tested by running several tools, saving the session, reopening it, and verifying the event log and snapshots are intact and can be replayed.

**Acceptance Scenarios**:

1. **Given** an analyst has built an event log with 10 entries and 2 snapshots, **When** the session is saved and reopened, **Then** all 10 events and both snapshots are present with their original parameters and provenance metadata.
2. **Given** an analyst tunes a parameter and replays, **When** the session is saved, **Then** the persisted event log includes both the original and tuned values with timestamps indicating when each change occurred.
3. **Given** analyst B opens a plot created by analyst A, **When** analyst B views the provenance log, **Then** the complete event history is visible including tool names, parameters, sources, snapshots, and any tune annotations.

---

### User Story 6 - Branch and Compare from Event Log (Priority: P3)

An analyst wants to explore an alternative analysis path without losing the current one. The analyst creates a branch from a specific point in the event log, applies different parameters or tools, and can compare results between the original path and the branch.

**Why this priority**: Branching is a natural extension of event-sourcing that delivers significant analytical value, but it is not required for the core undo-tune workflow. It may be deferred to a follow-up feature.

**Independent Test**: Can be fully tested by creating a branch from an event, running different tools on each branch, and verifying both branches maintain independent event histories with a shared common ancestor.

**Acceptance Scenarios**:

1. **Given** an event log with 5 entries, **When** the analyst creates a branch from event 3, **Then** the branch starts with events 1-3 and the original log retains all 5 events.
2. **Given** two branches exist from a common ancestor, **When** the analyst switches between branches, **Then** the session state reflects the correct event sequence for each branch.
3. **Given** two branches have diverged, **When** the analyst compares them, **Then** the system identifies which events differ and which results changed.

---

### Edge Cases

- What happens when a tuned parameter causes a downstream tool to fail (e.g., tool B cannot process tool A's new output)? The system halts replay at the failing event, reports the error, and allows the analyst to adjust or revert.
- What happens when a tool version has changed since the original event was recorded? The system checks tool version compatibility before replay and warns the analyst if the tool interface has changed.
- What happens when the event log grows very large (thousands of entries)? The system replays from the nearest STAC-persisted snapshot rather than the beginning. Analysts who take snapshots at meaningful milestones keep replay times bounded.
- What happens when a tune invalidates a downstream snapshot? The system marks the snapshot as stale and excludes it from replay. It uses the nearest valid earlier snapshot instead. Stale snapshots may be garbage-collected or rebuilt lazily.
- What happens when a tool suggests a snapshot but the analyst declines? The tool proceeds normally. The suggestion is advisory only — declining does not block execution. The analyst accepts the risk of slower rollback if they later undo past that tool.
- What happens when an analyst tunes an event that has already been tuned? The tune history is preserved — each tune is recorded as a separate provenance entry, enabling the analyst to see the full evolution of a parameter.
- What happens when the analyst performs a new action after undoing several steps? Events after the current position are discarded (or optionally moved to a branch), and the new event is appended at the current position.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record every tool invocation as a discrete, immutable event in a structured event log, containing tool identity, version, input source references, output references, parameters, and timestamp.
- **FR-002**: System MUST reconstruct session state at any point by replaying events from the nearest valid snapshot (or from the beginning of the log if no snapshot exists) up to the target event.
- **FR-003**: System MUST support undo by moving the current position pointer backward in the event log and reconstructing state at the new position.
- **FR-004**: System MUST support redo by moving the current position pointer forward in the event log and reconstructing state at the new position.
- **FR-005**: System MUST allow an analyst to modify (tune) the parameters of any event in the log, provided the tool definition declares those parameters as tunable.
- **FR-006**: System MUST re-execute the tuned event and all downstream dependent events when a parameter is tuned, using the updated parameter values.
- **FR-007**: System MUST validate tuned parameter values against the tool's typed parameter schema before replay.
- **FR-008**: Tool definitions MUST support typed configuration parameters with at minimum: name, type (string, number, boolean, enum, duration), description, default value, and validation constraints (min, max, choices, pattern).
- **FR-009**: System MUST record tune operations in the provenance log as distinct entries that reference the original event, preserving full audit history.
- **FR-010**: System MUST persist the event log alongside the STAC catalog so that event history survives session boundaries.
- **FR-011**: System MUST persist snapshots of plot state in the STAC store. Each snapshot captures the full state at a specific event position and is referenced as a node in the provenance pipeline.
- **FR-012**: System MUST automatically capture a snapshot after expensive operations (such as initial file import) complete.
- **FR-013**: System MUST allow analysts to manually take a snapshot at any point, associating it with the current event position, a label, and a timestamp.
- **FR-014**: Tool definitions MUST be able to declare a "suggest snapshot" advisory, indicating that a snapshot is recommended before the tool runs. The system MUST present this suggestion to the analyst, who may accept or decline.
- **FR-015**: System MUST use the nearest valid snapshot as the starting point for state reconstruction during undo, redo, or tune-replay, replaying only the events between the snapshot and the target position.
- **FR-016**: System MUST invalidate (mark as stale) any snapshot that depends on an event whose parameters have been tuned, preventing replay from an outdated snapshot.
- **FR-017**: System MUST detect and report tool version mismatches when replaying events recorded with a different tool version.
- **FR-018**: System MUST halt replay and report errors when a replayed event fails, without corrupting the event log or the successfully-replayed portion of the state.
- **FR-019**: System MUST maintain backward compatibility with the existing undo/redo interface (undo, redo, canUndo, canRedo) so that existing consumers are unaffected by the architectural change.
- **FR-020**: System MUST support branching from any point in the event log, creating an independent event sequence that shares a common prefix with the parent.
- **FR-021**: Each event in the log MUST record the complete set of parameters used (including defaults), so that every event is independently reproducible.

### Key Entities

- **Event**: A single recorded tool invocation — contains tool ID, tool version, input feature references, output feature references, parameter values, timestamp, and a unique event ID. Events are append-only and immutable once written.
- **Event Log**: An ordered sequence of events representing the analytical history of a plot. Supports a current-position pointer for undo/redo navigation. May contain branches.
- **Tune Entry**: A modification record that references an original event and specifies which parameter was changed, the old value, the new value, and the timestamp of the tune. Preserves audit trail.
- **Snapshot**: A complete capture of plot state at a specific event position, persisted in the STAC store. Created automatically after expensive operations (e.g., file import), manually by the analyst at milestones, or at the advisory suggestion of a tool. Snapshots are provenance nodes — they participate in the event pipeline and are invalidated when upstream events are tuned.
- **Typed Parameter Schema**: The definition of a tool's configurable parameters including name, type, constraints, default, and whether the parameter is tunable. Extends the existing `ToolParameter` model.
- **Branch**: A named fork in the event log originating from a specific event, maintaining an independent sequence of subsequent events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can undo and redo at least 50 consecutive operations with correct state reconstruction at every step.
- **SC-002**: Analysts can tune a parameter on any event and see all downstream results update within a time proportional to the number of downstream events (not the total log length).
- **SC-003**: Invalid parameter values are rejected with descriptive messages before replay begins, preventing wasted computation.
- **SC-004**: Event logs persist across sessions — an analyst can close and reopen a plot and the full event history (including tunes) is available.
- **SC-005**: The existing undo/redo interface continues to work identically for consumers that do not use tuning or branching features.
- **SC-006**: State reconstruction starts from the nearest valid STAC-persisted snapshot, replaying only the events between the snapshot and the target position — not the entire log.
- **SC-007**: Two analysts viewing the same persisted plot see the same provenance history, enabling reproducibility and peer review.
- **SC-008**: Tool authors can define typed parameters with validation constraints, and those constraints are enforced during both initial invocation and tuning.
- **SC-009**: Analysts can manually take a snapshot at any point and later resume replay from it, reducing undo/redo wait times for long analytical sessions.
- **SC-010**: Tools that recommend a pre-execution snapshot present the suggestion clearly; the analyst's decision (accept/decline) does not block tool execution.

## Assumptions

- The existing `ToolParameter` model will be extended (not replaced) with richer type constraints such as min/max, pattern, and duration support.
- Event replay calls the same tool handler function with the same interface — tools do not need to be aware that they are being replayed vs. invoked fresh.
- Snapshots are not created at automatic intervals. They are created in three ways: (1) automatically after expensive operations like file import, (2) manually by the analyst, or (3) at the advisory suggestion of a tool. There is no system-wide "every N events" policy.
- The set of operations considered "expensive" (triggering automatic snapshots) will be defined during planning, starting with file import as the canonical example.
- Tool authors declare the "suggest snapshot" advisory via a flag on the tool definition; this is advisory only and does not change tool execution behavior.
- Branching (User Story 5) is a stretch goal that may be deferred to a follow-up feature if the core event-sourcing and tuning work proves more complex than expected.
- The event log format aligns with STAC conventions and can be stored alongside or within the STAC catalog structure.
- "Tunable" is the default for parameters — tool authors must explicitly mark a parameter as non-tunable if replay with different values would be unsafe or meaningless.
