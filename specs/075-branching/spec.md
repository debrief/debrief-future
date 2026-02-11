# Feature Specification: Branching from History Point

**Feature Branch**: `075-branching`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Implement branching from history point (SRD P5)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Branch from a Log Entry (Priority: P1)

An analyst has completed several analysis steps on a plot and wants to explore an alternative approach from an earlier point. The analyst opens the Log Panel, selects the entry representing the desired branch point, and chooses "Branch from here." The system creates a new, independent plot whose state matches that point in history, with the Log trimmed to include only entries up to and including the branch point. The analyst can then continue working on the branch plot without affecting the original.

**Why this priority**: This is the core value of the feature. Without the ability to create a branch, none of the other stories are possible. It enables "what if" exploration, which is the primary analyst need.

**Independent Test**: Can be fully tested by creating a plot with several Log entries, branching from a mid-point entry, and verifying the branch plot contains the correct state and trimmed Log.

**Acceptance Scenarios**:

1. **Given** a plot with 5 Log entries, **When** the analyst selects entry 3 and chooses "Branch from here," **Then** a new plot is created containing the state at entry 3 with a Log containing only entries 1-3.
2. **Given** a plot with Log entries, **When** branching succeeds, **Then** the original plot remains unchanged with all its original entries intact.
3. **Given** a plot with Log entries, **When** branching succeeds, **Then** the new branch plot is stored as a separate item in the data store.

---

### User Story 2 - Two-Way Navigation Between Source and Branch (Priority: P2)

After creating a branch, the analyst needs to navigate between the source plot and the branch plot to compare results. Both the source and branch plots record their relationship, enabling the analyst to switch between them. From either plot, the analyst can see which branches exist and navigate to them.

**Why this priority**: Without navigation, branching has limited utility. The analyst must be able to move between source and branch to compare alternative analyses, which is the reason branching exists.

**Independent Test**: Can be fully tested by creating a branch, then verifying that both source and branch plots list each other as linked, and that selecting a link navigates to the other plot.

**Acceptance Scenarios**:

1. **Given** a source plot and a branch created from it, **When** the analyst views the source plot's branch records, **Then** the branch is listed with its name, branch point, and creation time.
2. **Given** a branch plot, **When** the analyst views its branch records, **Then** the source plot is listed as the origin with the branch point identified.
3. **Given** a source plot with multiple branches, **When** the analyst views the branch records, **Then** all branches are listed with their respective branch points.

---

### User Story 3 - Branch from a Point Before the Current Snapshot (Priority: P3)

An analyst has been working for a long time and taken snapshots along the way. They now want to branch from a point that lies before the most recent snapshot. The system reconstructs the state at the desired point by loading the appropriate snapshot and replaying Log entries up to the branch point, then creates the branch plot from that reconstructed state.

**Why this priority**: This extends branching to work across the full history, not just the current Log segment. Without this capability, branching is limited to recent entries, which reduces its value for long-running analyses.

**Independent Test**: Can be fully tested by creating a plot with a snapshot boundary, loading earlier history in the Log Panel, branching from a pre-snapshot entry, and verifying the branch plot contains the reconstructed state.

**Acceptance Scenarios**:

1. **Given** a plot with a snapshot boundary and entries before that boundary, **When** the analyst selects a pre-snapshot entry and chooses "Branch from here," **Then** the system reconstructs state from the snapshot and creates a correct branch plot.
2. **Given** a branch from a pre-snapshot point, **When** the branch is created, **Then** the branch plot's Log contains only entries up to the branch point (from the earlier snapshot segment).

---

### Edge Cases

- What happens when the analyst tries to branch from the very first entry in the Log (the initial import)?
  - The branch plot should contain only that single entry and the state resulting from it.
- What happens when the analyst tries to branch from the most recent (current) entry?
  - The branch plot should be a full duplicate of the current state with the complete Log.
- What happens when branching requires state reconstruction and a tool referenced in the Log is no longer available?
  - The system should halt and report which tool is missing, allowing the analyst to resolve the issue before proceeding.
- What happens when the source plot already has existing branches and the analyst creates another branch from a different point?
  - The new branch is appended to the source's branch records; existing branches are unaffected.
- What happens when a branch plot itself is branched?
  - A branch can be created from any plot, including other branches. The new branch links back to its immediate source (the branch plot), not to the original root plot.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a new, independent plot when the analyst chooses "Branch from here" on a Log entry.
- **FR-002**: The branch plot MUST contain the plot state as it was at the selected branch point, with all features and their properties matching that historical state.
- **FR-003**: The branch plot's Log MUST be trimmed to contain only entries up to and including the selected branch point.
- **FR-004**: The source plot MUST record the branch relationship in its system record, including the branch identifier, the activity ID of the branch point, the creation timestamp, and a reference to the branch plot's storage location.
- **FR-005**: The branch plot MUST record the reverse relationship in its own system record, referencing the source plot and the branch point.
- **FR-006**: Both source and branch plots MUST remain fully independent after branching — changes to one MUST NOT affect the other.
- **FR-007**: System MUST support branching from any entry in the full Log history, including entries that lie before the current snapshot boundary.
- **FR-008**: When branching from a pre-snapshot point, the system MUST reconstruct state by loading the appropriate snapshot and replaying Log entries up to the branch point.
- **FR-009**: System MUST store the branch plot as a new item in the data store, within the same collection as the source plot.
- **FR-010**: System MUST support multiple branches from a single source plot, each from a potentially different branch point.
- **FR-011**: System MUST support branching from a branch plot (nested branching), with links referencing the immediate source rather than the root.
- **FR-012**: The "Branch from here" action MUST be available on any Log entry displayed in the Log Panel.
- **FR-013**: If state reconstruction fails (e.g., due to a missing tool or version mismatch), the system MUST halt the branch operation and report the failure reason to the analyst.
- **FR-014**: The system MUST record a provenance entry of type "branch" on both the source and branch plot's system records, capturing the branch event as part of file-level provenance.

### Key Entities

- **Branch Record**: A record on the source plot's system feature that identifies a branch, including the branch identifier, the activity ID of the branch point, the creation timestamp, and a reference to the branch plot's storage location.
- **Branch Link (Reverse)**: A record on the branch plot's system feature that identifies the source plot, including the activity ID of the branch point and a reference to the source plot's storage location.
- **Branch Plot**: A new, independent plot created by the branching operation. Contains the reconstructed state at the branch point and a trimmed Log.
- **System Record**: A non-spatial feature in each plot's data that carries plot-level metadata including snapshot links, branch records, and file-level provenance.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Explore an alternative analysis path without losing current work.
- **Key Decision(s)**:
  1. Which point in history to branch from (which Log entry represents the desired starting state).
  2. Whether to switch to the branch plot immediately after creation or remain on the source plot.
- **Decision Inputs**: The Log Panel timeline shows all recorded operations with timestamps, tool names, parameters, and affected features. The analyst reviews this timeline to identify the entry that represents the desired branch point.

### Screen Progression

| Step | Screen/State                     | User Action                                   | Result                                                                                |
|------|----------------------------------|-----------------------------------------------|---------------------------------------------------------------------------------------|
| 1    | Log Panel showing timeline       | Analyst selects a Log entry                   | Entry is highlighted; contextual actions become available                              |
| 2    | Entry selected with actions      | Analyst clicks "Branch from here"             | System begins creating the branch plot; progress indicator appears                    |
| 3    | Branch creation in progress      | Analyst waits (or cancels if supported)        | State is reconstructed and new plot is created in the data store                      |
| 4    | Branch creation complete         | Analyst sees confirmation with link to branch | Branch plot is available; source plot's branch records are updated                    |
| 5    | Branch plot opened (if selected) | Analyst begins alternative analysis           | Branch plot is active with trimmed Log; two-way navigation is available               |

### UI States

- **Empty State**: The "Branch from here" action is not shown when no Log entry is selected.
- **Loading State**: A progress indicator is displayed during state reconstruction and branch creation, particularly for pre-snapshot branches that require replay.
- **Error State**: If branch creation fails (e.g., missing tool for state reconstruction), a message describes the failure and identifies the problematic entry or tool. The source plot remains unchanged.
- **Success State**: A confirmation message indicates the branch was created, with the branch name and a link to open the branch plot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can create a branch from any Log entry and receive a new independent plot within a reasonable time (under 30 seconds for plots with fewer than 50 Log entries).
- **SC-002**: 100% of branch plots contain the correct state at the branch point, verified by comparing feature properties and Log entries against the source plot's history.
- **SC-003**: Both source and branch plots maintain accurate two-way links that enable navigation between them without data loss or broken references.
- **SC-004**: Branching from pre-snapshot points produces the same result as branching from the equivalent point in an un-snapshotted history (state reconstruction is faithful).
- **SC-005**: Source plots with multiple branches maintain all branch records correctly, with no corruption when new branches are added.
- **SC-006**: Analysts can identify all branches created from a given plot and navigate to any of them within 2 clicks from the source plot.

## Assumptions

- Feature #074 (Snapshots) is complete and provides the snapshot infrastructure, including doubly-linked snapshot chains, state reconstruction from snapshots, and snapshot asset storage in the data store.
- Feature #071 (Log Recording Service) is complete and provides `recordToolResult()` and `getTimeline()` functionality.
- The Log Panel (Feature #072) exists and displays the timeline of Log entries with selectable entries and contextual actions.
- The system record feature (from Feature #070 Schema Foundation) is present on every plot, with support for `branches[]` and `provenance[]` arrays.
- State reconstruction for pre-snapshot branches reuses the same replay mechanism defined for cross-snapshot tuning (SRD Section 4.5).
- Branch plots are stored as separate items within the same collection in the data store (consistent with STAC catalog structure).

## Dependencies

- **#074 (Snapshots)**: Required for state reconstruction from snapshot chains. Branching from pre-snapshot points depends on the snapshot infrastructure.
- **#071 (Log Recording Service)**: Required for Log entries that define branch points. The `branchFrom()` method is part of the Log Service API.
- **#072 (Log Panel)**: Required for the "Branch from here" UI action. The Log Panel provides the entry selection and action trigger.
- **#070 (Schema Foundation)**: Required for the system record structure that stores branch metadata (branch records, file-level provenance).

## Out of Scope

- **Merging branches**: Combining changes from a branch back into the source plot is not part of this feature. Branches are independent once created.
- **Branch comparison view**: A side-by-side comparison view for source and branch plots is a separate feature. This feature provides only navigation links.
- **Branch naming or labelling**: Branches receive system-generated identifiers. User-defined branch names or labels are deferred.
- **Branch deletion**: Removing a branch plot or cleaning up branch records is not included.
- **Replay and parameter tuning (SRD P6)**: The replay engine used for state reconstruction in this feature is the same infrastructure, but the full parameter tuning and replay workflow is a separate feature (#076).
