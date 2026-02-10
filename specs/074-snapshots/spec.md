# Feature Specification: Snapshots with Doubly-Linked Chain

**Feature Branch**: `074-snapshots`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Implement snapshots with doubly-linked chain [E02] — clean-state checkpoints, snapshot assets in STAC (requires #071)"
**Epic**: E02 — PROV Logging Implementation (Phase 4, SRD P4)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Snapshot Checkpoint (Priority: P1)

An analyst has been working on a complex analysis session, accumulating many tool operations recorded as Log entries on features. They want to create a clean checkpoint — archiving the current state so they can continue working with a fresh Log while preserving full access to earlier history. The analyst triggers a snapshot action, and the system saves a clean copy of the plot (with all Log entries stripped from features), links it to the working file in both directions, and resets the working file's Log for fresh recording.

**Why this priority**: This is the foundational capability of the snapshot system. Without the ability to create snapshots and maintain the doubly-linked chain, no other snapshot features (history navigation, cross-snapshot operations) can function. It directly implements SRD P4.

**Independent Test**: Can be fully tested by creating a plot with several Log entries, triggering a snapshot, and verifying: (a) a clean GeoJSON file is saved as a STAC asset with no Log entries on features, (b) the working file's system record has `snapshotLinks.prev` pointing to the snapshot, (c) the snapshot's system record has `snapshotLinks.next` pointing to the working file, and (d) the working file's features have their Log entries cleared.

**Acceptance Scenarios**:

1. **Given** a plot with 10 Log entries distributed across 3 features, **When** the analyst creates a snapshot, **Then** a new GeoJSON file is saved as a STAC asset containing all features with their current geometry and properties but with `properties.provenance` arrays emptied.
2. **Given** a snapshot has been created, **When** the working file's system record is inspected, **Then** `snapshotLinks.prev` contains the snapshot asset filename and the count of Log entries that were in the working file at snapshot time.
3. **Given** a snapshot has been created, **When** the snapshot file's system record is inspected, **Then** `snapshotLinks.next` points back to the working file.
4. **Given** a plot that already has a previous snapshot (Snapshot A), **When** a new snapshot (Snapshot B) is created, **Then** Snapshot B's `prev` points to Snapshot A, Snapshot A's `next` is updated to point to Snapshot B, and the working file's `prev` points to Snapshot B.
5. **Given** a successful snapshot creation, **When** the analyst continues working, **Then** new tool executions create fresh Log entries starting from an empty provenance history on the working file.

---

### User Story 2 - Navigate Earlier History in Log Panel (Priority: P2)

An analyst opens the Log Panel and sees only the entries from the current working session (since the last snapshot). At the bottom of the timeline, a "Show earlier history" indicator shows how many operations were recorded before the snapshot. The analyst clicks it, and entries from the previous snapshot are loaded and appended to the timeline, giving a continuous view of the full analytical history.

**Why this priority**: History navigation is what makes snapshots useful to the analyst beyond mere archival. Without it, snapshots would be invisible and inaccessible. This is the analyst-facing payoff of the doubly-linked chain.

**Independent Test**: Can be fully tested by creating a plot, recording some operations, taking a snapshot, recording more operations, then opening the Log Panel and verifying: (a) only current entries are visible initially, (b) a "Show earlier history" indicator appears with the correct entry count, (c) clicking it loads and displays the previous snapshot's entries appended to the timeline.

**Acceptance Scenarios**:

1. **Given** a plot with a snapshot boundary (previous snapshot has 12 entries, current working file has 5), **When** the Log Panel timeline is assembled, **Then** only the 5 current entries are shown, with a "Show earlier history (12 earlier operations)" indicator at the boundary.
2. **Given** the "Show earlier history" indicator is visible, **When** the analyst clicks it, **Then** the system loads the previous snapshot's GeoJSON, extracts Log entries from its features, and appends them to the timeline in chronological order.
3. **Given** multiple snapshots exist in a chain (A → B → Current), **When** the analyst loads history from B, **Then** a second "Show earlier history" indicator appears for Snapshot A's entries, allowing further navigation.
4. **Given** the analyst has loaded the full history chain, **When** the earliest snapshot has no `prev` link, **Then** no further "Show earlier history" indicator is shown.

---

### User Story 3 - Capture Snapshot from a Specific Entry (Priority: P3)

An analyst has just completed an expensive operation (e.g., a long-running TMA reconstruction) and wants to create a checkpoint at that exact point in the timeline. From the Log Panel, they select the entry and choose "Capture snapshot from here." The system creates a snapshot representing the state as of that entry, with all subsequent entries remaining in the working file's Log.

**Why this priority**: This extends the basic snapshot capability with precision — analysts can checkpoint at meaningful moments rather than only at the current state. Useful for preserving rollback points before branching or experimental work.

**Independent Test**: Can be fully tested by creating a plot with 5 Log entries, selecting entry 3, triggering "Capture snapshot from here", and verifying: (a) the snapshot contains state as of entry 3 (entries 1-3 recorded, features reflect state after entry 3), (b) entries 4-5 remain in the working file's Log, (c) the doubly-linked chain is correctly maintained.

**Acceptance Scenarios**:

1. **Given** a plot with 5 Log entries and no prior snapshots, **When** the analyst selects entry 3 and triggers "Capture snapshot from here", **Then** a snapshot is created containing the plot state as of entry 3, with `provEntryCount` of 3.
2. **Given** a "Capture snapshot from here" action at entry 3, **When** the snapshot is complete, **Then** the working file retains entries 4-5 in its features' provenance arrays, and the system record links to the new snapshot.
3. **Given** a "Capture snapshot from here" action on the most recent entry, **When** the action completes, **Then** the result is identical to a standard snapshot (all entries move to the snapshot, working file starts fresh).

---

### User Story 4 - Cross-Snapshot Timeline Assembly (Priority: P4)

When the analyst has loaded earlier history across snapshot boundaries, the global timeline must present a unified, chronologically sorted view. The timeline assembly algorithm follows backward links through the snapshot chain, collecting and deduplicating entries from each file, producing a seamless view that hides the snapshot boundaries from the analyst's perspective (except for the "Show earlier history" indicators and snapshot boundary markers).

**Why this priority**: This enables downstream features (cross-snapshot tuning in Phase 6, impact tracing in branching) and provides the analyst with a complete audit trail across the full history of their work.

**Independent Test**: Can be fully tested by creating a chain of 3 snapshots, loading the full history, and verifying: (a) all entries appear in correct chronological order, (b) multi-feature operations that span snapshot boundaries are correctly deduplicated, (c) snapshot boundary markers appear at the correct positions.

**Acceptance Scenarios**:

1. **Given** a chain of 3 files (Snapshot A with 8 entries → Snapshot B with 12 entries → Current with 5 entries), **When** full history is loaded and the timeline assembled, **Then** 25 unique entries appear in chronological order (assuming no cross-file duplication of activityIds).
2. **Given** loaded history from multiple snapshots, **When** the timeline is displayed, **Then** snapshot boundary markers appear between the entry groups from each file.
3. **Given** a snapshot taken mid-session, **When** entries from both the snapshot and working file are loaded, **Then** there are no duplicate entries (each operation appears exactly once based on `activityId`).

---

### Edge Cases

- What happens when the analyst creates a snapshot on a plot with no Log entries? A snapshot is still created — the clean file is identical to the working file, and the chain is maintained with `provEntryCount: 0`.
- What happens when the system record does not yet exist on a plot? The snapshot operation creates a system record feature if one is not present, then populates the snapshot links.
- What happens when the snapshot file cannot be written (disk full, permissions)? The operation fails with an error message; no changes are made to the working file or system record (atomic semantics).
- What happens when the analyst takes rapid successive snapshots? Each snapshot is a valid chain link. A snapshot with 0 entries between two snapshots is valid but unusual.
- What happens when loading earlier history and the referenced snapshot file is missing or corrupted? The "Show earlier history" action reports an error ("Previous snapshot file not found") and the timeline shows only the entries that could be loaded. The chain is not modified.
- What happens when the working file has legacy `properties.provenance` values (single objects, not arrays)? The snapshot operation normalises them to arrays before stripping, consistent with the Phase 1 (#071) migration approach.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `createSnapshot()` function in the Log Service that saves the current plot state as a clean GeoJSON file with all `properties.provenance` arrays removed from spatial features.
- **FR-002**: System MUST store snapshot GeoJSON files as assets within the same STAC Item as the working plot file, using a naming convention that includes a timestamp (e.g., `plot-snap-{ISO-timestamp}.geojson`).
- **FR-003**: System MUST maintain a doubly-linked chain between the working file and all snapshots via the system record's `snapshotLinks` property, with `prev` and `next` references containing the asset filename and `provEntryCount`.
- **FR-004**: System MUST update the previous snapshot's `snapshotLinks.next` to point to the new snapshot when a new snapshot is inserted into the chain.
- **FR-005**: System MUST clear the `properties.provenance` arrays on all spatial features in the working file after a snapshot is created, so the working file starts with a fresh Log.
- **FR-006**: System MUST preserve the system record's `properties.provenance` array (file-level events) when clearing spatial feature provenance — snapshot and branch events on the system record are not stripped.
- **FR-007**: System MUST record a file-level provenance entry of type `"snapshot"` on the system record when a snapshot is created, containing the `activityId`, timestamp, and snapshot asset reference.
- **FR-008**: System MUST create a system record feature (Point with empty coordinates, `featureType: "system"`) if one does not already exist when a snapshot operation is performed.
- **FR-009**: System MUST provide a "Capture snapshot from here" action accessible from the Log Panel that creates a snapshot representing the state at a selected Log entry, retaining subsequent entries in the working file.
- **FR-010**: System MUST provide a mechanism for the Log Panel to detect a snapshot boundary (system record has `snapshotLinks.prev` that is not null) and display a "Show earlier history" indicator with the `provEntryCount` from the link.
- **FR-011**: System MUST load the referenced snapshot GeoJSON on demand when the analyst requests earlier history, extract Log entries from the snapshot's features, and append them to the global timeline.
- **FR-012**: System MUST support loading the full snapshot chain by following `prev` links recursively, presenting a "Show earlier history" indicator at each boundary until the chain's beginning is reached.
- **FR-013**: System MUST assemble the cross-snapshot timeline by collecting entries from all loaded files, deduplicating on `activityId`, and sorting by timestamp.
- **FR-014**: System MUST handle the case where the snapshot operation is the first snapshot (no previous snapshot exists) by setting `snapshotLinks.prev` to null on the snapshot and `snapshotLinks.prev` to the snapshot on the working file.
- **FR-015**: System MUST ensure snapshot creation is atomic with respect to the working file — if the snapshot file cannot be written, no changes are made to the working file's system record or feature provenance arrays.
- **FR-016**: System MUST mark the document as dirty after snapshot creation so the updated system record and cleared provenance arrays are persisted on the next save.

### Key Entities

- **Snapshot**: A clean-state copy of the plot's GeoJSON file at a point in time, with all Log entries stripped from spatial features. Stored as a STAC asset alongside the working file. Contains its own system record with doubly-linked chain references.
- **System Record**: A non-spatial GeoJSON Feature (`featureType: "system"`, Point with empty coordinates) that carries plot-level metadata including `snapshotLinks` (prev/next chain), `branches` (branch records), and file-level provenance events (snapshot/branch creation records).
- **Snapshot Links**: The `snapshotLinks` property on the system record, containing `prev` and `next` references. Each reference includes an `asset` filename and `provEntryCount` (the number of Log entries in the referenced file, enabling lazy loading indicators without reading the file).
- **Snapshot Chain**: The doubly-linked list formed by snapshot files and the working file, navigable in both directions — backward for history navigation ("Show earlier history") and forward for impact tracing (identifying downstream analysis affected by corrupted source data).
- **File-Level Provenance**: Entries on the system record's `properties.provenance` array that record plot-level events (snapshot creation, branch creation) as distinct from feature-level Log entries that record tool operations.

## User Interface Flow *(optional — include for UI features)*

### Decision Analysis

- **Primary Goal**: Create clean checkpoints in analytical history and navigate across them seamlessly.
- **Key Decision(s)**:
  1. Whether to take a snapshot now (standard snapshot) or from a specific earlier entry ("Capture snapshot from here")
  2. Whether to load earlier history when a snapshot boundary is encountered
- **Decision Inputs**: The Log Panel timeline shows the current entries with a snapshot boundary indicator and entry count from the previous snapshot. This count helps the analyst decide whether loading earlier history is worth the effort (e.g., "12 earlier operations" vs "200 earlier operations").

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Log Panel showing current entries with snapshot boundary indicator | Analyst reviews current timeline | Timeline shows N entries since last snapshot, with "Show earlier history (M earlier operations)" at the bottom |
| 2 | Log Panel with snapshot boundary | Analyst clicks "Show earlier history" | Previous snapshot's entries are loaded and appended to the timeline with a visual boundary marker |
| 3 | Extended timeline with loaded history | Analyst selects an entry and chooses "Capture snapshot from here" | A snapshot is created at that point; entries after the selected point remain in the working file |
| 4 | Analyst triggers snapshot via menu/command | Analyst chooses "Create Snapshot" action | Current state is saved as a clean snapshot; working file's Log is cleared; confirmation shown |

### UI States

- **Empty State**: When no snapshots exist yet, the Log Panel shows the current entries without any snapshot boundary indicator. The "Create Snapshot" action is still available.
- **Loading State**: When "Show earlier history" is clicked, a loading indicator appears at the snapshot boundary while the previous snapshot file is read from disk and its entries are extracted.
- **Error State**: If a referenced snapshot file cannot be read, the boundary indicator shows "Could not load earlier history — file not found" and the timeline continues with the entries already loaded.
- **Success State**: After loading earlier history, the previous entries appear seamlessly appended to the timeline with a subtle visual boundary marker (e.g., a horizontal rule with the snapshot timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creating a snapshot produces a clean GeoJSON file where 0% of spatial features contain `properties.provenance` entries, verified by inspecting the snapshot file after creation.
- **SC-002**: The snapshot chain is correctly doubly-linked — following `prev` from the working file reaches the snapshot, and following `next` from the snapshot reaches the working file, verified across chains of at least 3 files.
- **SC-003**: After a snapshot, the working file's spatial features have empty `properties.provenance` arrays, enabling a fresh Log session verified by inspecting feature properties.
- **SC-004**: The "Show earlier history" indicator correctly reports the entry count from the previous snapshot without loading the full file, verified by checking the `provEntryCount` field on the system record link.
- **SC-005**: Loading earlier history across 3 snapshot boundaries produces a complete, chronologically ordered timeline with no duplicate entries (deduplicated on `activityId`), verified by timeline assembly test.
- **SC-006**: "Capture snapshot from here" at entry N produces a snapshot with state matching entries 1-N, and the working file retains entries N+1 onward, verified by inspecting both files.
- **SC-007**: Snapshot files are stored as STAC assets within the same STAC Item as the working plot, accessible via standard STAC catalog navigation, verified by inspecting `item.json` after snapshot creation.
- **SC-008**: All existing tool execution and Log recording tests (#071) pass without modification after snapshot feature is added, confirming no regression.

## Assumptions

- **A-001**: Phase 1 (#071, Log Recording Service) is complete before this feature begins, providing `recordToolResult()`, `getTimeline()`, the Log entry schema, and session-state integration.
- **A-002**: The system record feature structure follows the design in the transition plan (Area 5) — Point with empty coordinates, `featureType: "system"`, with `snapshotLinks` and `branches` properties.
- **A-003**: Snapshot files are stored as additional assets in the same STAC Item as the working plot file, not as separate STAC Items. The `stacService` provides methods to write and read asset files within an Item.
- **A-004**: The snapshot naming convention uses an ISO 8601 timestamp with hyphens replacing colons (e.g., `plot-snap-2026-02-09T14-30-00.geojson`) to avoid filesystem issues with colon characters.
- **A-005**: "Capture snapshot from here" reconstructs the state at the selected entry by starting from the current working file's feature data and stripping entries after the selected point. It does not require tool replay — the feature geometry and properties already reflect all operations up to the current point; only the provenance metadata is trimmed.
- **A-006**: Loading earlier history is a read-only operation — the snapshot files are not modified when their entries are loaded for display. Only the working file's system record is modified during snapshot creation.
- **A-007**: The Log Panel integration (User Story 2) assumes the Log Panel (#072) is at least partially implemented. If not, the snapshot boundary detection and "Show earlier history" mechanism will be provided as API capabilities that the Log Panel can consume when available.

## Dependencies

- **#071** (Log Recording Service — specified): Provides the Log Service module, `recordToolResult()`, `getTimeline()`, session-state integration, and the `createSnapshot()` stub that this feature implements. Must be complete before implementation begins.
- **#070** (PROV Schema Foundation — implementing): Provides the LinkML Log Entry schema, system record schema, and expanded ToolResult model. Transitively required via #071.
- **SRD** (`docs/srd-prov-undo.md`): Defines snapshot chain architecture (Sections 4.3-4.5), system record structure (Annex A.4), and snapshot chain mechanics (Annex A.5).
- **Transition Plan** (`docs/architecture/prov-transition-plan.md`): Phase 4 description provides the detailed migration steps, interfaces, and acceptance criteria.

## Out of Scope

- **Branching** (Phase 5, #075): Creating new plots from points in history. This feature provides the snapshot infrastructure that branching builds upon but does not implement branching itself.
- **Replay and parameter tuning** (Phase 6, #076): Re-executing operations with modified parameters. Cross-snapshot replay uses the snapshot chain but is not implemented in this phase.
- **Log Panel implementation** (#072): The full Log Panel UI. This feature provides the data APIs and snapshot boundary detection; the panel's visual implementation is separate.
- **Automatic snapshot scheduling**: The system does not automatically create snapshots based on entry count or time interval. Snapshots are analyst-initiated actions only.
- **Snapshot deletion or chain editing**: Once created, snapshots cannot be removed from the chain. Chain integrity is maintained as an invariant.
- **Snapshot diff or comparison views**: No side-by-side comparison between snapshots is provided. The analyst can load earlier history to see what changed but cannot visually diff two snapshots.
