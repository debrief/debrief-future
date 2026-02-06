# Feature Specification: Restore Previously-Open Plots on VS Code Startup

**Feature Branch**: `052-restore-plots-session`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Restore previously-open plots on VS Code startup"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Plot Restoration (Priority: P1)

A maritime analyst has been working on a single plot throughout the day. They close VS Code to attend a meeting and later reopen it. The plot they had open is automatically restored without any manual action, allowing them to pick up exactly where they left off.

**Why this priority**: This is the core value proposition — eliminating the friction of manually reopening plots after restarting VS Code. A single plot is the most common case and delivers immediate value.

**Independent Test**: Can be fully tested by opening a plot, closing VS Code, reopening VS Code, and confirming the plot reappears automatically.

**Acceptance Scenarios**:

1. **Given** a user has one plot open in VS Code, **When** they close and reopen VS Code, **Then** the same plot is automatically displayed without user intervention.
2. **Given** a user has one plot open and closes VS Code, **When** VS Code reopens and the plot file still exists on disk, **Then** the plot loads and renders correctly as it did before closing.
3. **Given** a user has never opened any plots, **When** they open VS Code for the first time, **Then** no plots are restored and the editor opens in its default state.

---

### User Story 2 - Multiple Plot Restoration (Priority: P2)

An analyst is working with several plots simultaneously — comparing tracks from different exercises or reviewing multiple scenarios. When they close and reopen VS Code, all plots that were open are restored, preserving their multi-plot working context.

**Why this priority**: Analysts frequently work with multiple plots. Restoring all of them is a natural extension of single-plot restoration and significantly increases the value of session persistence.

**Independent Test**: Can be fully tested by opening three or more plots, closing VS Code, reopening it, and verifying all plots reappear.

**Acceptance Scenarios**:

1. **Given** a user has three plots open in VS Code, **When** they close and reopen VS Code, **Then** all three plots are restored automatically.
2. **Given** a user has five plots open, **When** they close and reopen VS Code, **Then** all five plots are restored in the same order they were opened.

---

### User Story 3 - Graceful Handling of Missing Plots (Priority: P3)

An analyst had several plots open, but between sessions another team member moved or deleted one of the plot files from the shared drive. When VS Code reopens, the remaining plots are restored successfully and the missing plot is silently skipped — no error dialogs interrupt the analyst's workflow.

**Why this priority**: While less frequent than normal restoration, graceful degradation is essential for a polished experience. Users should never encounter confusing error messages about missing files during startup.

**Independent Test**: Can be tested by opening two plots, closing VS Code, deleting one plot's files from disk, reopening VS Code, and confirming only the surviving plot is restored with no error messages.

**Acceptance Scenarios**:

1. **Given** a user had two plots open and one plot's files have since been deleted, **When** VS Code reopens, **Then** the surviving plot is restored and no error message is shown for the missing plot.
2. **Given** all previously-open plot files have been deleted or moved, **When** VS Code reopens, **Then** the editor opens in its default state with no errors or warnings.
3. **Given** a plot file has been moved to a different location, **When** VS Code reopens, **Then** the moved plot is skipped silently (no attempt to search for it elsewhere).

---

### User Story 4 - Explicit Plot Closure Clears Session State (Priority: P4)

An analyst finishes working on a plot and explicitly closes it before shutting down VS Code. When VS Code reopens, the explicitly closed plot is not restored — only plots that were still open at the time of shutdown are brought back.

**Why this priority**: Without this behaviour, users would have no way to control which plots are restored. The system must respect the user's intent to close a plot.

**Independent Test**: Can be tested by opening two plots, closing one plot manually, closing VS Code, reopening it, and verifying only the one that was still open is restored.

**Acceptance Scenarios**:

1. **Given** a user has two plots open and closes one of them, **When** they close and reopen VS Code, **Then** only the plot that was still open at shutdown is restored.
2. **Given** a user closes all plots and then closes VS Code, **When** VS Code reopens, **Then** no plots are restored.

---

### Edge Cases

- What happens when the same plot is opened in multiple VS Code windows? Each window should independently track and restore its own set of open plots.
- What happens when the workspace state storage is corrupted or unreadable? The system should fall back to the default state (no plots open) without showing errors.
- What happens when a plot file exists but is unreadable (e.g., permissions changed)? The system should skip it silently, same as a missing file.
- What happens when VS Code crashes instead of closing normally? The persisted state should reflect the last successfully recorded open plots, so restoration still works.
- What happens when the user opens a very large number of plots (e.g., 50+)? The system should restore all of them, though startup time may increase proportionally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist the list of currently-open STAC plot references whenever a plot is opened or closed.
- **FR-002**: The system MUST restore all previously-open plots automatically when VS Code starts, without requiring user action.
- **FR-003**: The system MUST silently skip any plot whose underlying files no longer exist on disk during restoration.
- **FR-004**: The system MUST remove a plot from the persisted list when the user explicitly closes it.
- **FR-005**: The system MUST update the persisted list in real-time (not only at shutdown) so that unexpected closures (crashes) still preserve state.
- **FR-006**: The system MUST work entirely offline — no network access required for persistence or restoration.
- **FR-007**: The system MUST preserve the order in which plots were opened, restoring them in the same sequence.
- **FR-008**: The system MUST handle an empty persisted list gracefully, opening VS Code in its default state.
- **FR-009**: The system MUST handle corrupted or unreadable persistence data by falling back to an empty state without errors.
- **FR-010**: The system MUST scope persisted plot state to the workspace — different workspaces maintain independent plot lists.

### Key Entities

- **Open Plot Reference**: A lightweight record identifying a STAC item that is currently open. Contains sufficient information to locate and reopen the plot (e.g., catalog path, item identifier). Does not include view state such as zoom level or time position.
- **Session State**: The complete set of open plot references for a given workspace at a point in time. Persisted locally so it survives VS Code restarts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users who reopen VS Code see their previously-open plots restored within 3 seconds of startup (for up to 5 plots).
- **SC-002**: 100% of plots that were open at shutdown and still exist on disk are successfully restored.
- **SC-003**: Zero error messages are displayed to the user when previously-open plot files are missing or inaccessible.
- **SC-004**: Session state persists correctly through unexpected closures (crashes) — at least the last known set of open plots is restored.
- **SC-005**: Feature works entirely without network connectivity, using only local storage.
- **SC-006**: Analysts no longer need to manually reopen plots after restarting VS Code, eliminating a repetitive multi-step workflow.

## Assumptions

- The first iteration restores only which plots were open — not view state (zoom, pan, time position, panel visibility). View state restoration may be addressed in a future feature.
- VS Code's built-in workspace state mechanism provides sufficient storage for the list of open plot references.
- A "plot" corresponds to a STAC item in the local catalog, identifiable by a stable reference (catalog path + item ID).
- Users do not need to be prompted before restoration occurs — automatic restoration is the expected behaviour.
- The feature does not need to handle cross-workspace plot references (each workspace is independent).

## Out of Scope

- Restoring map view state (zoom level, pan position)
- Restoring time controller position
- Restoring panel visibility (timeline, tools panel, etc.)
- User prompt or confirmation before restoration
- Syncing session state across machines or workspaces
- Restoring plots opened outside the current workspace
