# Feature Specification: Split Undo/Redo — UI-Only Undo, Data Changes via Log

**Feature Branch**: `073-undo-redo-split`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Split undo/redo: UI-only undo, data changes via Log [E02] — narrow StateSnapshot, remove featureCollectionUri and savePath (requires #071)"
**Epic**: E02 — PROV Logging Implementation (Phase 3, SRD P3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Undo Only Reverses Display State (Priority: P1)

An analyst pans the map, changes the time filter, and hides a track layer. They press Ctrl+Z three times and see each display change reversed in order: the layer reappears, the time filter reverts, and the map pans back to its previous position. At no point does pressing Ctrl+Z change which plot or feature collection is loaded — that is a data operation managed by the Log.

**Why this priority**: This is the core behaviour change. If undo/redo no longer touches data-change fields, the separation between UI history and data provenance is enforced. Everything else depends on this boundary being correct.

**Independent Test**: Can be fully tested by performing a series of display-state changes (pan, zoom, time, visibility, selection), pressing Ctrl+Z repeatedly, and verifying that only those display-state fields revert — with no side-effects on loaded data.

**Acceptance Scenarios**:

1. **Given** an analyst has changed the viewport (pan/zoom), **When** they press Ctrl+Z, **Then** the viewport reverts to its previous position and no other state changes.
2. **Given** an analyst has toggled a track's visibility, **When** they press Ctrl+Z, **Then** the track's visibility is restored without affecting the loaded feature collection.
3. **Given** an analyst has changed the current time, time filter, step size, playback rate, or display mode, **When** they press Ctrl+Z, **Then** only the changed temporal field reverts.
4. **Given** an analyst has changed their selection, **When** they press Ctrl+Z, **Then** only the selection reverts.

---

### User Story 2 - Tool Execution Not Undoable via Ctrl+Z (Priority: P2)

An analyst runs a distance calculation tool. The result is recorded in the Log. The analyst presses Ctrl+Z. The tool result remains — Ctrl+Z does not remove it. Instead, the analyst would use the Log Panel (feature #072) to review, revert, or tune past tool executions.

**Why this priority**: Preventing accidental data loss through Ctrl+Z is a critical safety property. Tool results represent analytical work that must be preserved in the provenance chain, not discarded by a casual keyboard shortcut.

**Independent Test**: Can be tested by executing a tool that modifies data (e.g., a calculation that writes results), pressing Ctrl+Z, and verifying the tool's output is still present and that only the most recent UI state change (if any) was undone.

**Acceptance Scenarios**:

1. **Given** a tool execution has produced results and the Log has recorded the operation, **When** the analyst presses Ctrl+Z, **Then** the tool results remain intact and the undo only affects the most recent UI-state change (if any exists in the undo stack).
2. **Given** the analyst has made no UI-state changes since the tool execution, **When** they press Ctrl+Z, **Then** nothing happens (undo stack is empty or top entry is unrelated).

---

### User Story 3 - Existing Undo Behaviour Preserved for UI Actions (Priority: P3)

An analyst performs a sequence of 55 display-state changes (panning, zooming, toggling visibility, changing time). They press Ctrl+Z 50 times and reach the limit of the undo history. Ctrl+Z is then disabled (greyed out / no-op). They press Ctrl+Y (redo) and the changes replay forward. The 50-step limit, duplicate suppression, and ephemeral-field exclusion all continue to work exactly as before.

**Why this priority**: Regression safety. The narrowing of StateSnapshot must not break any existing undo/redo mechanics — limits, deduplication, ephemeral exclusion, and redo stack clearing on new changes must all remain intact.

**Independent Test**: Can be tested by running the existing undo test suite with the narrower snapshot and verifying all tests pass without modification to test logic (only snapshot field lists may change).

**Acceptance Scenarios**:

1. **Given** the analyst has made more than 50 UI-state changes, **When** they press Ctrl+Z 50 times, **Then** undo stops (history exhausted) and the remaining earlier changes are not reachable.
2. **Given** the analyst has undone several changes, **When** they make a new UI-state change, **Then** the redo stack is cleared.
3. **Given** a playback-state change occurs (ephemeral field), **When** the analyst checks the undo stack, **Then** no new entry was created for that change.

---

### Edge Cases

- What happens if the analyst presses Ctrl+Z immediately after a tool execution with no prior UI changes? The undo stack is empty for the current session context; nothing happens.
- What happens to existing undo history that contains featureCollectionUri snapshots from before the upgrade? The undo history is in-memory only (not persisted), so it is always empty on session start. No migration is needed.
- What happens if the dirty-tracking flag is set by a field that was removed from the snapshot? `featureCollectionUri` is removed from `DIRTY_TRIGGER_FIELDS`; dirty tracking for data changes moves to the Log Service's `markDirty()` call instead.
- What happens to savePath when the analyst saves a file? `savePath` continues to exist in the store as metadata; it is simply no longer part of the undo snapshot. Saving a file sets `savePath` and clears `dirty`, but neither action creates an undo entry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The undo/redo snapshot MUST include only UI-state fields: current time, time range, time filter, step size, playback rate, display mode, viewport, rotation, selection, and hidden feature IDs (10 fields total).
- **FR-002**: The undo/redo snapshot MUST NOT include `featureCollectionUri` (data-change field) or `savePath` (metadata field).
- **FR-003**: Pressing Ctrl+Z MUST only revert the most recent UI-state change; it MUST NOT alter loaded data, tool results, or file metadata.
- **FR-004**: Pressing Ctrl+Y (redo) MUST only replay the most recently undone UI-state change.
- **FR-005**: The undo history MUST continue to enforce a maximum of 50 entries.
- **FR-006**: The undo system MUST continue to suppress duplicate snapshots (no entry created if no tracked field changed).
- **FR-007**: The undo system MUST continue to exclude ephemeral fields (e.g., playback state) from triggering new history entries.
- **FR-008**: `featureCollectionUri` MUST be removed from the set of fields that trigger dirty-state tracking in the undo middleware; dirty tracking for data changes MUST be handled by the Log Service's `markDirty()` callback instead.
- **FR-009**: All existing undo/redo tests MUST pass after the snapshot is narrowed, with only snapshot field-list updates (no logic changes to test assertions).
- **FR-010**: The `featureCollectionUri` and `savePath` fields MUST continue to exist in the session store for their original purposes (referencing loaded data, recording save location); they are merely excluded from the undo snapshot.

### Key Entities

- **StateSnapshot**: The set of fields captured at each undo checkpoint. Currently 12 fields; narrowed to 10 by removing `featureCollectionUri` and `savePath`. Stored in an in-memory stack (not persisted).
- **Undo History**: A pair of stacks (past and future) holding up to 50 `StateSnapshot` entries each. Managed outside the reactive store to avoid triggering subscriptions.
- **Dirty-Trigger Fields**: The set of field names whose changes mark the session as "dirty" (unsaved). `featureCollectionUri` is removed from this set; the Log Service takes over dirty-triggering for data changes.
- **Log Entry**: A provenance record created by the Log Service (feature #071) for each tool execution or data modification. This is the replacement audit trail for changes that were previously (incorrectly) tracked in undo history.

## Assumptions

- The Log Recording Service (#071) is operational and recording tool-execution results before this feature is implemented. This is a hard dependency — without the Log, data changes would have no audit trail after being removed from undo.
- The undo history is purely in-memory and discarded on session close. No migration of persisted undo state is required.
- The `savePath` field is not referenced by any undo/redo restore logic beyond its inclusion in the snapshot interface. Removing it from the snapshot has no side-effects on save/load workflows.
- The `featureCollectionUri` field is set via `setFeatureCollectionUri()` which is called during plot loading. After this change, loading a different plot will not create an undo entry, which is the desired behaviour per the SRD.

## Dependencies

- **#071 — Log Recording Service** (hard prerequisite): Must be recording data changes before they are removed from undo. Without this, tool execution results would have no audit trail.
- **#070 — PROV Schema Foundation** (transitive via #071): Log entry schema must be defined.
- **#072 — Log Panel** (soft, downstream): The Log Panel provides the UI for reviewing and reverting data changes. Not required for this feature to ship, but completes the user experience.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pressing Ctrl+Z after any combination of UI-state changes reverts exactly one UI-state change, with zero effect on loaded data or tool results — verified across all 10 tracked fields.
- **SC-002**: 100% of existing undo/redo unit tests pass after the snapshot narrowing, with no changes to test assertion logic.
- **SC-003**: The undo/redo snapshot contains exactly 10 fields (down from 12) — verified by a new unit test that asserts the snapshot field set.
- **SC-004**: Tool execution followed by Ctrl+Z does not remove or alter the tool's output — verified by an integration-level test that executes a tool, presses undo, and confirms the result persists.
- **SC-005**: The 50-step history limit, duplicate suppression, and ephemeral-field exclusion all continue to function identically — verified by existing regression tests.
